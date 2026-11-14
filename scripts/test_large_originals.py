"""Real isolated Git/LFS storage roundtrips and rejected asset paths/proofs."""
import hashlib
import importlib.util
import io
import json
import random
import subprocess
import tempfile
import unittest
from pathlib import Path
from PIL import Image, __version__ as PILLOW_VERSION

SPEC = importlib.util.spec_from_file_location('large_originals', Path(__file__).with_name('check-large-originals.py'))
policy = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(policy)


class LargeOriginals(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        source = io.BytesIO()
        Image.frombytes('RGB', (640, 640), random.Random(20).randbytes(640*640*3)).save(source, format='PNG')
        cls.raw = source.getvalue()
        assert len(cls.raw) > policy.THRESHOLD

    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix='chenyuan-lfs-policy-')
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.git('init', '--quiet')
        self.git('config', 'user.name', 'Asset Test')
        self.git('config', 'user.email', 'asset-test@example.invalid')
        self.write('art/old.png', self.raw)
        self.write(policy.MANIFEST, json.dumps({'format': 'chenyuan-large-originals', 'version': 1, 'originals': []}))
        self.git('add', '.')
        self.git('commit', '--quiet', '-m', 'published assets')
        self.base = self.git('rev-parse', 'HEAD').decode().strip()

    def git(self, *args, data=None):
        return subprocess.check_output(['git', *args], cwd=self.root, input=data, stderr=subprocess.PIPE)

    def write(self, name, data):
        p = self.root / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data.encode() if isinstance(data, str) else data)

    def check(self):
        return policy.validate(self.root, self.base)

    def manifest(self, records):
        self.write(policy.MANIFEST, json.dumps({'format': 'chenyuan-large-originals', 'version': 1, 'originals': records}))
        self.git('add', policy.MANIFEST)

    def lfs_original(self):
        self.git('lfs', 'install', '--local')
        name = 'art/large-originals/new.png'
        self.write('.gitattributes', 'art/large-originals/**/*.png filter=lfs diff=lfs merge=lfs -text\n')
        self.write(name, self.raw)
        self.write('docs/assets/prompt.md', '# Test original\nDeterministically generated test pixels, not a production illustration.\n')
        self.write('docs/assets/receipt.json', json.dumps({'sourceSha256': policy.sha(self.raw),
            'source': 'isolated test procedural image', 'rights': 'test fixture only'}))
        output = io.BytesIO()
        with Image.open(io.BytesIO(self.raw)) as image:
            image.resize((16,16),Image.Resampling.LANCZOS).save(output, format='WEBP', lossless=True,quality=100,method=6)
        exported = output.getvalue()
        self.write('web/public/art/test.webp', exported)
        self.write('web/src/test.ts', "export const art = 'art/test.webp';\n")
        self.write('docs/assets/export.json', json.dumps({'format':'chenyuan-image-export','version':1,'source':name,
            'sourceSha256':policy.sha(self.raw),'pillowVersion':PILLOW_VERSION,'outputs':[{'path':'web/public/art/test.webp',
                'width':16,'height':16,'lossless':True,'quality':100,'method':6}]}))
        record = {'path': name, 'sha256': policy.sha(self.raw), 'bytes': len(self.raw),
            'width': 640, 'height': 640, 'hasAlpha': False, 'alphaBBox': None,
            'prompt': 'docs/assets/prompt.md', 'receipt': 'docs/assets/receipt.json',
            'exportRecipe': 'docs/assets/export.json', 'exports': [{'path': 'web/public/art/test.webp',
                'sha256': policy.sha(exported), 'bytes': len(exported), 'consumer': 'web/src/test.ts'}]}
        self.manifest([record])
        self.git('add', '.')
        return record

    def test_published_large_bytes_are_preserved_but_new_and_changed_ordinary_blobs_are_rejected(self):
        passed = self.check()
        self.assertEqual(len(passed['preservedLargeOriginals']), 1)
        self.write('art/new.png', self.raw)
        self.git('add', 'art/new.png')
        with self.assertRaisesRegex(policy.StoragePolicyError, 'New/changed large'):
            self.check()
        self.git('rm', '--cached', '--quiet', 'art/new.png')
        self.write('art/old.png', self.raw+b'changed')
        self.git('add', 'art/old.png')
        with self.assertRaisesRegex(policy.StoragePolicyError, 'New/changed large'):
            self.check()

    def test_real_lfs_clean_smudge_roundtrip_binds_source_and_small_runtime_bytes(self):
        record = self.lfs_original()
        pointer = self.git('show', ':'+record['path'])
        self.assertIsNotNone(policy.POINTER.fullmatch(pointer))
        self.assertLess(len(pointer), 200)
        restored = self.git('lfs', 'smudge', data=pointer)
        self.assertEqual(restored, self.raw)
        result = self.check()
        self.assertEqual(result['lfsOriginals'], [{'path': record['path'], 'sha256': record['sha256'], 'bytes': len(self.raw)}])
        self.assertFalse(result['objectsUploaded'])
        self.assertEqual(self.git('rev-parse', 'HEAD').decode().strip(), self.base)

    def test_unfetched_or_altered_original_never_passes_as_a_picture(self):
        record = self.lfs_original()
        pointer = self.git('show', ':'+record['path'])
        for bad in [pointer, self.raw+b'changed']:
            self.write(record['path'], bad)
            with self.assertRaisesRegex(policy.StoragePolicyError, 'git lfs pull'):
                self.check()
        (self.root / record['path']).unlink()
        with self.assertRaisesRegex(policy.StoragePolicyError, 'Missing downloaded'):
            self.check()

    def test_missing_source_receipt_pixels_export_recipe_and_consumer_are_independently_rejected(self):
        record = self.lfs_original()
        for change, message in [({'receipt': 'docs/assets/missing.json'}, 'Missing regular'),
                ({'width': True}, 'pixels differ'), ({'hasAlpha': True}, 'alpha presence'),
                ({'exportRecipe': record['prompt']}, 'Invalid JSON'), ({'exports': []}, 'no deterministic')]:
            changed = {**record, **change}
            self.manifest([changed])
            with self.assertRaisesRegex(policy.StoragePolicyError, message):
                self.check()
        self.manifest([record])
        self.write('web/src/test.ts', "export const unrelated = 'art/other.webp';\n")
        self.git('add', 'web/src/test.ts')
        with self.assertRaisesRegex(policy.StoragePolicyError, 'Missing actual runtime'):
            self.check()

    def test_matching_hashes_do_not_replace_actual_deterministic_reproduction(self):
        record = self.lfs_original()
        stream=io.BytesIO()
        Image.new('RGB',(16,16),'red').save(stream,format='WEBP',lossless=True)
        different=stream.getvalue()
        self.write('web/public/art/test.webp',different)
        self.git('add','web/public/art/test.webp')
        record['exports'][0]['bytes']=len(different)
        record['exports'][0]['sha256']=policy.sha(different)
        self.manifest([record])
        with self.assertRaisesRegex(policy.StoragePolicyError,'does not reproduce'):
            self.check()

    def test_broken_pointer_or_attributes_cannot_hide_an_ordinary_blob(self):
        record = self.lfs_original()
        pointer = self.git('show', ':'+record['path'])
        # Directly exercise corrupt Git index data; working image remains intact.
        oid = self.git('hash-object', '-w', '--stdin', data=pointer+b'extension\n').decode().strip()
        self.git('update-index', '--cacheinfo', '100644', oid, record['path'])
        with self.assertRaisesRegex(policy.StoragePolicyError, 'malformed indexed LFS'):
            self.check()
        self.git('add', record['path'])
        self.write('.gitattributes', '')
        self.git('add', '.gitattributes')
        with self.assertRaisesRegex(policy.StoragePolicyError, 'indexed LFS attributes'):
            self.check()

    def test_runtime_pointer_and_undeclared_lfs_original_are_rejected(self):
        record = self.lfs_original()
        self.manifest([])
        with self.assertRaisesRegex(policy.StoragePolicyError, 'Missing source/export'):
            self.check()
        self.manifest([record])
        pointer = self.git('show', ':'+record['path'])
        self.write('web/public/false.png', pointer)
        self.git('add', 'web/public/false.png')
        with self.assertRaisesRegex(policy.StoragePolicyError, 'never production assets'):
            self.check()

    def test_metadata_duplicate_keys_and_boolean_numbers_do_not_silently_pass(self):
        self.write(policy.MANIFEST,'{"format":"chenyuan-large-originals","version":1,"version":1,"originals":[]}')
        self.git('add',policy.MANIFEST)
        with self.assertRaisesRegex(policy.StoragePolicyError,'Duplicate JSON'):
            self.check()
        self.manifest([])
        record=self.lfs_original()
        record['alphaBBox']=[False,False,640,640]
        self.manifest([record])
        with self.assertRaisesRegex(policy.StoragePolicyError,'alpha bound types'):
            self.check()


if __name__ == '__main__':
    unittest.main()
