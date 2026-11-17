import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from art_sources import MANIFEST, prepare


class ArtSourcesTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.git('init', '-q')
        self.git('config', 'user.name', 'Archive fixture')
        self.git('config', 'user.email', 'fixture@example.invalid')
        self.data = {'art/production/first.png': b'original-first\x00\xff',
                     'art/redesign/second.png': b'original-second\x00\xfe'}
        for name, raw in self.data.items():
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
        self.git('add', 'art')
        self.git('commit', '-qm', 'Preserve original source bytes')
        self.commit = self.git('rev-parse', 'HEAD').decode().strip()
        self.document = {'format': 'chenyuan-archived-art-sources', 'version': 1,
                         'commit': self.commit, 'backupBranch': 'backup', 'files': [
            {'path': name, 'blob': self.git('rev-parse', f'{self.commit}:{name}').decode().strip(),
             'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw)}
            for name, raw in self.data.items()]}
        self.save()
        for name in self.data:
            (self.root / name).unlink()

    def git(self, *args):
        return subprocess.check_output(['git', *args], cwd=self.root, stderr=subprocess.PIPE)

    def save(self):
        target = self.root / MANIFEST
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(self.document))

    def test_restores_all_originals_and_second_run_is_read_only(self):
        self.assertEqual(prepare(self.root)['restored'], 2)
        before = {}
        for name, raw in self.data.items():
            path = self.root / name
            self.assertEqual(path.read_bytes(), raw)
            before[name] = path.stat().st_mtime_ns
        self.assertEqual(prepare(self.root)['restored'], 0)
        self.assertEqual(before, {name: (self.root / name).stat().st_mtime_ns for name in self.data})

    def test_bad_local_source_blocks_all_writes(self):
        path = self.root / 'art/redesign/second.png'
        path.write_bytes(b'local edit')
        with self.assertRaisesRegex(ValueError, 'checksum differs'):
            prepare(self.root)
        self.assertEqual(path.read_bytes(), b'local edit')
        self.assertFalse((self.root / 'art/production/first.png').exists())

    def test_wrong_archive_hash_is_rejected(self):
        self.document['files'][0]['sha256'] = '0' * 64
        self.save()
        with self.assertRaisesRegex(ValueError, 'checksum differs'):
            prepare(self.root)
        self.assertFalse((self.root / self.document['files'][0]['path']).exists())

    def test_partial_inventory_cannot_silently_lose_an_original(self):
        self.document['files'].pop()
        self.save()
        with self.assertRaisesRegex(ValueError, 'complete pinned PNG'):
            prepare(self.root)

    def test_wrong_blob_cannot_change_pinned_source_identity(self):
        self.document['files'][0]['blob'] = self.document['files'][1]['blob']
        self.save()
        with self.assertRaisesRegex(ValueError, 'complete pinned PNG'):
            prepare(self.root)

    def test_missing_commit_has_actionable_fetch_error(self):
        self.document['commit'] = '0' * 40
        self.save()
        with self.assertRaisesRegex(ValueError, 'git fetch origin codex/backup-main'):
            prepare(self.root)

    def test_duplicate_record_is_rejected(self):
        self.document['files'].append(self.document['files'][0])
        self.save()
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            prepare(self.root)

    def test_path_escapes_absolute_and_runtime_paths_are_rejected(self):
        for name in ['art/production/../../escape.png', '/art/production/source.png',
                     'art/production/./source.png', 'web/public/art/source.png',
                     'art/production/C:source.png', 'art/production/a\\source.png']:
            with self.subTest(name=name):
                self.document['files'][0]['path'] = name
                self.save()
                with self.assertRaisesRegex(ValueError, 'source path'):
                    prepare(self.root)

    def test_boolean_is_not_a_byte_count(self):
        self.document['files'][0]['bytes'] = True
        self.save()
        with self.assertRaisesRegex(ValueError, 'source identity'):
            prepare(self.root)

    def test_source_symlink_is_rejected(self):
        target = self.root / 'local-original'
        target.write_bytes(self.data['art/production/first.png'])
        (self.root / 'art/production/first.png').symlink_to(target)
        with self.assertRaisesRegex(ValueError, 'symlink'):
            prepare(self.root)

    def test_parent_symlink_is_rejected(self):
        parent = self.root / 'art/production'
        parent.rmdir()
        target = self.root / 'other-directory'
        target.mkdir()
        parent.symlink_to(target, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'symlink'):
            prepare(self.root)
        self.assertEqual(list(target.iterdir()), [])

    def test_concurrent_local_edit_is_never_overwritten(self):
        def race(source, target):
            target.write_bytes(b'concurrent local edit')
            raise FileExistsError(str(target))
        with patch('art_sources.os.link', side_effect=race):
            with self.assertRaises(FileExistsError):
                prepare(self.root)
        self.assertEqual((self.root / 'art/production/first.png').read_bytes(), b'concurrent local edit')
        self.assertEqual(list(self.root.rglob('.restore-art-*')), [])


if __name__ == '__main__':
    unittest.main()
