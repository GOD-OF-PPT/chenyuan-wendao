"""Exercise live Markdown and Git-history link failures in an isolated repository."""
import importlib.util
import subprocess
import tempfile
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('doc_links', Path(__file__).with_name('check-doc-links.py'))
doc_links = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(doc_links)


class DocumentLinks(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix='chenyuan-doc-links-')
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.git('init', '--quiet')

    def git(self, *args):
        return subprocess.check_output(['git', *args], cwd=self.root).decode().strip()

    def write(self, name, text):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding='utf-8')

    def track(self):
        self.git('add', '.')

    def test_live_paths_anchors_and_reference_definitions_are_checked_but_examples_are_not(self):
        self.write('guide.md', '# 起步\n\n# 起步\n')
        self.write('README.md', '# 开发\n[开始][guide]\n[guide]: guide.md#起步-1\n'
                   '```md\n[example](missing.png)\n```\n<!-- [old](gone.md) -->\n')
        self.track()
        self.assertTrue(doc_links.check(self.root)['passed'])
        self.write('README.md', '[bad](missing.md)\n[bad](guide.md#不存在)\n[bad][undefined]\n[escape](../outside.md)\n')
        reasons = {e['reason'] for e in doc_links.check(self.root)['errors']}
        self.assertEqual(reasons, {'local target missing', 'heading anchor missing',
                                  'reference definition missing', 'local link escapes repository'})

    def test_deleted_history_is_bound_to_an_actual_immutable_git_object(self):
        self.write('old/记录.md', '# 来路\n')
        self.track()
        self.git('-c', 'user.name=Doc Check', '-c', 'user.email=doc-check@example.invalid',
                 'commit', '--quiet', '-m', 'fixture')
        commit = self.git('rev-parse', 'HEAD')
        self.git('rm', '--quiet', 'old/记录.md')
        prefix = f'https://github.com/{doc_links.REPOSITORY}/blob/{commit}/old/'
        self.write('README.md', f'[旧](<{prefix}记录.md#来路>)\n')
        self.track()
        result = doc_links.check(self.root)
        self.assertTrue(result['passed'], result)
        self.assertEqual(result['pinnedGitLinks'], 1)
        self.write('README.md', f'[伪旧](<{prefix}missing.md>)\n')
        result = doc_links.check(self.root)
        self.assertEqual(result['errors'][0]['reason'], 'pinned Git object missing or wrong kind')

    def test_missing_target_in_a_reference_definition_fails_without_fetching_external_sites(self):
        self.write('README.md', '[read][target]\n[target]: absent.md\n[external](https://example.invalid/not-fetched)\n')
        self.track()
        result = doc_links.check(self.root)
        self.assertFalse(result['passed'])
        self.assertEqual(result['errors'][0]['target'], 'absent.md')
        self.assertEqual(result['externalLinksNotFetched'], 1)

    def test_inline_syntax_examples_are_literal_while_balanced_destinations_remain_live(self):
        self.write('folder/name(with).md', '# Real\n')
        self.write('README.md', 'Use `[example](missing.md)` and ``[example][absent]`` as literal examples.\n'
                   '[`actual`](folder/name(with).md#real)\n[escaped](folder/name\\(with\\).md)\n')
        self.track()
        result = doc_links.check(self.root)
        self.assertTrue(result['passed'], result)
        self.assertEqual(result['localLinks'], 2)
        self.write('README.md', '[actual](folder/missing(with).md)\n')
        result = doc_links.check(self.root)
        self.assertEqual(result['errors'][0]['target'], 'folder/missing(with).md')


if __name__ == '__main__':
    unittest.main()
