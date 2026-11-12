from pathlib import Path
import hashlib
import importlib.util
import json
import os
import subprocess
import tempfile
import threading
import unittest
from unittest.mock import patch
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('legacy_fixtures', ROOT / 'scripts/legacy_fixtures.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class LegacyFixtures(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='chenyuan-legacy-fixtures-')
        self.root = Path(self.temp.name) / 'workspace'
        self.root.mkdir()
        self.fixtures = Path(self.temp.name) / 'fixtures'
        self.fixtures.mkdir()

    def tearDown(self):
        self.temp.cleanup()

    def archive(self, entries):
        with zipfile.ZipFile(self.fixtures / 'inputs.zip', 'w') as output:
            for path, data in entries.items():
                output.writestr(path, data)
        manifest = {'archiveSHA256': hashlib.sha256((self.fixtures / 'inputs.zip').read_bytes()).hexdigest(),
                    'files': [{'path': path, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
                              for path, data in entries.items()]}
        (self.fixtures / 'manifest.json').write_text(json.dumps(manifest), encoding='utf-8')

    def test_actual_archive_is_complete_offline_and_idempotent(self):
        manifest = json.loads((module.FIXTURES / 'manifest.json').read_text())
        self.assertEqual(module.prepare(self.root), len(manifest['files']))
        self.assertEqual(module.prepare(self.root), 0)
        for row in manifest['files']:
            self.assertEqual(hashlib.sha256((self.root / row['path']).read_bytes()).hexdigest(), row['sha256'])

    def test_conflicting_file_is_retained_and_nothing_else_is_written(self):
        self.archive({'goal-4/before/source.vue': b'baseline', 'goal-4/other.json': b'{}'})
        target = self.root / 'goal-4/before/source.vue'
        target.parent.mkdir(parents=True)
        target.write_bytes(b'local work')
        with self.assertRaisesRegex(ValueError, 'Conflicting'):
            module.prepare(self.root, self.fixtures)
        self.assertEqual(target.read_bytes(), b'local work')
        self.assertFalse((self.root / 'goal-4/other.json').exists())

    def test_archive_and_payload_tampering_are_refused_before_write(self):
        self.archive({'goal-4/before/source.vue': b'baseline'})
        archive = self.fixtures / 'inputs.zip'
        archive.write_bytes(archive.read_bytes() + b'changed')
        with self.assertRaisesRegex(ValueError, 'checksum'):
            module.prepare(self.root, self.fixtures)
        self.assertEqual(list(self.root.iterdir()), [])

    def test_absolute_traversing_and_non_goal_paths_are_refused(self):
        for path in ['goal-4/../../outside', '/goal-4/input', 'goal-4\\input', 'src/overwrite.ts']:
            with self.subTest(path=path):
                self.archive({path: b'bad'})
                with self.assertRaisesRegex(ValueError, 'path'):
                    module.prepare(self.root, self.fixtures)
        self.assertEqual(list(self.root.iterdir()), [])

    def test_directory_links_cannot_redirect_inputs_outside_workspace(self):
        self.archive({'goal-4/input.txt': b'baseline'})
        outside = Path(self.temp.name) / 'outside'
        outside.mkdir()
        link = self.root / 'goal-4'
        if os.name == 'nt':
            subprocess.run(['cmd', '/c', 'mklink', '/J', str(link), str(outside)],
                           check=True, capture_output=True)
        else:
            link.symlink_to(outside, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'link'):
            module.prepare(self.root, self.fixtures)
        self.assertEqual(list(outside.iterdir()), [])

    def test_parallel_start_never_observes_a_partially_written_target(self):
        self.archive({'goal-4/input.txt': b'complete payload' * 1000})
        ready, release = threading.Event(), threading.Event()
        original_link = module.os.link
        failures = []

        def delayed_link(source, target):
            if threading.current_thread().name == 'first-fixture-start':
                ready.set()
                if not release.wait(5):
                    raise TimeoutError('Second fixture start did not finish')
            return original_link(source, target)

        def first_start():
            try:
                module.prepare(self.root, self.fixtures)
            except Exception as error:
                failures.append(error)

        with patch.object(module.os, 'link', delayed_link):
            first = threading.Thread(target=first_start, name='first-fixture-start')
            first.start()
            try:
                self.assertTrue(ready.wait(5))
                module.prepare(self.root, self.fixtures)
            finally:
                release.set()
                first.join(5)
        self.assertFalse(first.is_alive())
        self.assertEqual(failures, [])
        self.assertEqual((self.root / 'goal-4/input.txt').read_bytes(), b'complete payload' * 1000)


if __name__ == '__main__':
    unittest.main()
