import errno
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from fixture_links import external_file_link


class FixtureLinkTests(unittest.TestCase):
    def test_denied_file_symlink_uses_a_real_external_parent_and_restores_siblings(self):
        with tempfile.TemporaryDirectory(prefix='chenyuan-link-test-') as folder:
            root = Path(folder) / 'fixture'
            parent = root / 'sources'
            parent.mkdir(parents=True)
            (parent / 'sibling.txt').write_bytes(b'untouched')
            outside = Path(folder) / 'outside.txt'
            outside.write_bytes(b'exact source')
            link = parent / 'source.txt'
            with patch.object(Path, 'symlink_to', side_effect=PermissionError(errno.EPERM, 'test-only file-link denial')):
                with external_file_link(link, outside, root) as mode:
                    self.assertEqual(mode, 'parent-alias')
                    self.assertTrue(link.is_file())
                    self.assertEqual(link.read_bytes(), outside.read_bytes())
                    self.assertFalse(link.resolve().is_relative_to(root.resolve()))
                    self.assertEqual((parent / 'sibling.txt').read_bytes(), b'untouched')
            self.assertTrue(parent.resolve().is_relative_to(root.resolve()))
            self.assertEqual((parent / 'sibling.txt').read_bytes(), b'untouched')
            self.assertEqual(outside.read_bytes(), b'exact source')

    def test_unowned_parent_is_rejected_before_any_rename(self):
        with tempfile.TemporaryDirectory(prefix='chenyuan-link-test-') as folder:
            root = Path(folder) / 'fixture'
            root.mkdir()
            outside = Path(folder) / 'outside.txt'
            outside.write_bytes(b'retain')
            with self.assertRaisesRegex(ValueError, 'owned fixture'):
                with external_file_link(Path(folder) / 'alias.txt', outside, root):
                    self.fail('Invalid alias accepted')
            self.assertEqual(outside.read_bytes(), b'retain')
