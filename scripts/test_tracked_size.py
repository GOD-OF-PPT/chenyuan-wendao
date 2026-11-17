import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('tracked_size', Path(__file__).with_name('check-tracked-size.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class TrackedSizeTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.git('init', '-q')
        (self.root / 'one').mkdir()
        (self.root / 'one/a.txt').write_bytes(b'12345')
        (self.root / 'one/b.txt').write_bytes(b'12345')
        self.git('add', '.')

    def git(self, *args):
        return subprocess.check_output(['git', *args], cwd=self.root, stderr=subprocess.PIPE)

    def test_duplicate_blobs_count_once_for_each_tracked_path(self):
        report = module.check(self.root, limit=11)
        self.assertEqual(report['trackedBytes'], 10)
        self.assertEqual(report['folders'], {'one': 10})

    def test_exact_limit_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'budget'):
            module.check(self.root, limit=10)

    def test_untracked_and_unstaged_contents_do_not_misstate_index_size(self):
        (self.root / 'untracked').write_bytes(b'x' * 100)
        (self.root / 'one/a.txt').write_bytes(b'x' * 100)
        self.assertEqual(module.check(self.root, limit=11)['trackedBytes'], 10)
        self.git('add', 'one/a.txt')
        with self.assertRaisesRegex(ValueError, 'budget'):
            module.check(self.root, limit=11)

    def test_staged_removal_is_not_counted(self):
        self.git('rm', '--cached', '-q', 'one/a.txt')
        self.assertEqual(module.check(self.root, limit=6)['trackedBytes'], 5)

    def test_symlink_cannot_hide_external_contents(self):
        (self.root / 'link').symlink_to('one/a.txt')
        self.git('add', 'link')
        with self.assertRaisesRegex(ValueError, 'regular'):
            module.check(self.root)


if __name__ == '__main__':
    unittest.main()
