import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from PIL import Image
from current_assets import validate

ROOT = Path(__file__).resolve().parents[2]


class CurrentAssetTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='chenyuan-current-assets-')
        self.root = Path(self.temp.name)
        for folder in ['art', 'web/public/art', 'web/src', 'docs/v0.3/reference']:
            (self.root / folder).mkdir(parents=True)
        image = Image.new('RGBA', (8, 8), (12, 120, 90, 255))
        image.putpixel((0, 0), (0, 0, 0, 0))
        for name in ['art/original.png', 'web/public/art/object.png']:
            image.save(self.root / name)
        (self.root / 'art/prompt.txt').write_text('Owned fixture prompt', encoding='utf-8')
        (self.root / 'art/receipt.json').write_text('{"fixture":true}', encoding='utf-8')
        (self.root / 'web/src/App.vue').write_text('<template><main>Game</main></template>\n', encoding='utf-8')
        def row(name):
            data = (self.root / name).read_bytes()
            return {'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
        runtime = {**row('web/public/art/object.png'), 'dimensions': {'width': 8, 'height': 8}, 'alpha': True}
        self.manifest = {'format': 'chenyuan-art-inventory', 'version': 1, 'assets': [{**runtime, 'exportedPath': runtime['path'], 'id': 'object', 'category': 'item', 'status': 'production', 'sourceReference': ['art/prompt.txt'], 'rights': {'productionUseApproved': True, 'evidenceReferences': ['art/receipt.json']}}]}
        self.export = {'assets': [{'source': {**row('art/original.png'), 'dimensions': {'width': 8, 'height': 8}}, 'runtime': runtime, 'receipt': row('art/receipt.json'), 'prompt': row('art/prompt.txt')}], 'budgets': {'maxRuntimeBytes': 2000}, 'files': [{'path': 'web/src/App.vue', 'sha256': 'f' * 64, 'bytes': 1}]}
        self.save()

    def tearDown(self):
        self.temp.cleanup()

    def save(self):
        for name, value in [('art/asset-manifest.json', self.manifest), ('art/export.json', self.export)]:
            (self.root / name).write_text(json.dumps(value), encoding='utf-8', newline='\n')

    def test_actual_repository_covers_all_public_images_and_no_ui_source_pin(self):
        result = validate(ROOT)
        actual = [p for p in (ROOT / 'web/public/art').rglob('*') if p.is_file()]
        self.assertEqual(result['runtimeImages'], len(actual))
        self.assertFalse(result['uiSourcePinned'])

    def test_source_whitespace_does_not_change_asset_facts_or_require_a_new_hash(self):
        before = validate(self.root)
        source = self.root / 'web/src/App.vue'
        source.write_text(source.read_text(encoding='utf-8') + '\n' * 2000, encoding='utf-8')
        self.assertEqual(validate(self.root), before)

    def test_modified_image_bytes_and_provenance_are_refused(self):
        for name, expected in [('web/public/art/object.png', 'Image checksum'), ('art/receipt.json', 'Provenance checksum'), ('art/prompt.txt', 'Provenance checksum')]:
            path = self.root / name
            original = path.read_bytes()
            path.write_bytes(original + b'changed')
            with self.subTest(name=name), self.assertRaisesRegex(AssertionError, expected):
                validate(self.root)
            path.write_bytes(original)

    def test_resigned_wrong_geometry_alpha_and_pixel_facts_are_refused(self):
        original = copy.deepcopy(self.export)
        for field, value in [('dimensions', {'width': 9, 'height': 8}), ('alpha', False), ('rgbaSHA256', '0' * 64), ('alphaBBox16', [0, 0, 1, 1])]:
            self.export = copy.deepcopy(original)
            self.export['assets'][0]['runtime'][field] = value
            self.save()
            with self.subTest(field=field), self.assertRaisesRegex(AssertionError, 'Image dimensions|Image alpha|Decoded image'):
                validate(self.root)

    def test_unregistered_image_missing_export_and_forbidden_font_are_refused(self):
        image = self.root / 'web/public/art/unknown.png'
        image.write_bytes((self.root / 'web/public/art/object.png').read_bytes())
        with self.assertRaisesRegex(AssertionError, 'Unregistered'):
            validate(self.root)
        image.unlink()
        font = self.root / 'web/public/art/private.woff2'
        font.write_bytes(b'not a font, still forbidden')
        with self.assertRaisesRegex(AssertionError, 'Forbidden'):
            validate(self.root)
        font.unlink()
        (self.root / 'web/public/art/object.png').unlink()
        with self.assertRaisesRegex(AssertionError, 'Missing or external'):
            validate(self.root)

    def test_absolute_traversing_and_windows_drive_paths_are_refused(self):
        original = copy.deepcopy(self.export)
        for name in ['../outside.png', '/outside.png', 'art/../../outside.png', 'art/C:outside.png', 'art\\outside.png']:
            self.export = copy.deepcopy(original)
            self.export['assets'][0]['source']['path'] = name
            self.save()
            with self.subTest(name=name), self.assertRaisesRegex(AssertionError, 'Invalid asset path|outside asset roots'):
                validate(self.root)

    def test_image_budgets_and_json_integer_types_stay_real(self):
        self.export['budgets']['maxRuntimeBytes'] = 1
        self.save()
        with self.assertRaisesRegex(AssertionError, 'budget exceeded'):
            validate(self.root)
        self.export['budgets']['maxRuntimeBytes'] = True
        self.save()
        with self.assertRaisesRegex(AssertionError, 'Invalid image budget'):
            validate(self.root)
        self.export['budgets']['maxRuntimeBytes'] = 2000
        self.manifest['version'] = True
        self.save()
        with self.assertRaisesRegex(AssertionError, 'Invalid asset inventory'):
            validate(self.root)

    def test_reused_images_keep_integrity_without_consuming_the_new_asset_budget(self):
        path = self.root / 'web/public/art/shared.png'
        path.write_bytes((self.root / 'web/public/art/object.png').read_bytes())
        self.export['reusedAssets'] = [{**self.export['assets'][0]['runtime'], 'path': 'web/public/art/shared.png'}]
        self.export['budgets']['maxRuntimeBytes'] = path.stat().st_size
        self.save()
        self.assertEqual(validate(self.root)['runtimeImages'], 2)
        path.write_bytes(path.read_bytes() + b'changed')
        with self.assertRaisesRegex(AssertionError, 'Image checksum'):
            validate(self.root)

    def test_resigned_svg_cannot_introduce_scripts_or_external_references(self):
        (self.root / 'web/public/art/object.png').unlink()
        for content in ['<script/>', '<path onload="alert(1)"/>', '<use href="https://example.test/object.svg"/>']:
            raw = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8">' + content + '</svg>').encode()
            (self.root / 'web/public/art/object.svg').write_bytes(raw)
            values = {'path': 'web/public/art/object.svg', 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(), 'dimensions': {'width': 8, 'height': 8}, 'alpha': True}
            self.manifest['assets'][0].update(values, exportedPath=values['path'])
            self.export['assets'][0]['runtime'] = values
            self.save()
            with self.subTest(content=content), self.assertRaisesRegex(AssertionError, 'Executable SVG|External SVG'):
                validate(self.root)

    def test_reference_status_and_missing_provenance_cannot_claim_production(self):
        self.manifest['assets'][0]['rights']['productionUseApproved'] = False
        self.save()
        with self.assertRaisesRegex(AssertionError, 'Reference is not production'):
            validate(self.root)
        self.manifest['assets'][0]['rights']['productionUseApproved'] = True
        self.manifest['assets'][0]['category'] = 'reference'
        self.save()
        with self.assertRaisesRegex(AssertionError, 'Reference is not production'):
            validate(self.root)


if __name__ == '__main__':
    unittest.main()
