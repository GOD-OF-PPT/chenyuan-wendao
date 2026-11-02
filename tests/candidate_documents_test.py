"""Exercise the actual package notes and keep dependency-only CI changes bounded."""
from pathlib import Path
import ast
import hashlib
import importlib.util
import json
import re
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('candidate_notes', ROOT / 'scripts/package-candidate.py')
PACKAGER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PACKAGER)
NOTE_FILES = {'README.md', 'SAVE_COMPATIBILITY.md', 'KNOWN_ISSUES.md', 'CHANGELOG.md', 'PLAYTEST_FORM.md'}
DEPENDENCY_STEP = '''      - name: Install locked resource-check dependencies
        run: |
          python3 -m venv "$RUNNER_TEMP/chenyuan-art-venv"
          "$RUNNER_TEMP/chenyuan-art-venv/bin/python3" -m pip install --disable-pip-version-check -r art/requirements.txt
          "$RUNNER_TEMP/chenyuan-art-venv/bin/python3" -c "import sys, PIL; print(sys.version); print('Pillow', PIL.__version__)"
          echo "$RUNNER_TEMP/chenyuan-art-venv/bin" >> "$GITHUB_PATH"
'''


class Notes(unittest.TestCase):
    def notes(self):
        with tempfile.TemporaryDirectory(prefix='chenyuan-notes-only-') as folder:
            stage = Path(folder)
            source = {'source': 'a' * 40, 'tree': 'b' * 40}
            versions = {'format': 'chenyuan-full', 'version': 2, 'schemaVersion': 2,
                        'contentVersion': 'fixture-content', 'balanceVersion': 'fixture-unbalanced'}
            frozen = json.dumps([source, versions], sort_keys=True)
            PACKAGER.write_candidate_notes(stage, source, versions)
            self.assertEqual({p.name for p in stage.iterdir()}, NOTE_FILES)
            first = {p.name: p.read_text() for p in stage.iterdir()}
            PACKAGER.write_candidate_notes(stage, source, versions)
            self.assertEqual(first, {p.name: p.read_text() for p in stage.iterdir()})
            self.assertEqual(json.dumps([source, versions], sort_keys=True), frozen)
            return first

    def test_real_renderer_binds_supplied_source_and_versions_without_packaging(self):
        readme = self.notes()['README.md']
        for value in ['a' * 40, 'b' * 40, 'fixture-content', 'fixture-unbalanced']:
            self.assertIn(value, readme)
        self.assertIn('不是当前放置版最终评审', readme)

    def test_database_notes_match_formal_db_and_keep_original_retry_ownership(self):
        note = self.notes()['SAVE_COMPATIBILITY.md']
        db = re.search(r'export const FULL_DB_VERSION = (\d+);', (ROOT / 'web/src/full-persistence.ts').read_text()).group(1)
        self.assertIn('数据库v' + db, note)
        self.assertNotIn('数据库v3', note)
        for phrase in ['不降级', '原件', 'commandId/runId/expectedRevision', '原意图', '离线', '原子']:
            self.assertIn(phrase, note)

    def test_reader_distinguishes_running_package_from_source_validation_dependencies(self):
        readme = self.notes()['README.md']
        for phrase in ['Python 3.10+', 'python3 serve.py', '本机HTTP运行不依赖Pillow',
                       'art/requirements.txt', 'python3 -m venv', 'npm ci --ignore-scripts',
                       'npm --prefix web ci --ignore-scripts', 'source.bundle', 'verify.py candidate.zip', '即时原子确认', '不加假倒计时']:
            self.assertIn(phrase, readme)

    def test_known_issues_do_not_certify_paused_or_human_work(self):
        note = self.notes()['KNOWN_ISSUES.md']
        for phrase in ['兼容', '环境性能', '暂停', '完整同源', '原门槛', 'ART17',
                       'J01', 'ART28-OBS-01', 'COMPAT-OBS-1200-01', '输入补录', '真人', '长期平衡']:
            self.assertIn(phrase, note)
        self.assertNotIn('Goal2 T03独立CI按原预算通过', note)

    def test_idle_playtest_remains_blank_and_does_not_reward_wall_time(self):
        notes = self.notes()
        for phrase in ['长期', '有限', '逐周期', '保存后']:
            self.assertIn(phrase, notes['CHANGELOG.md'])
        form = notes['PLAYTEST_FORM.md']
        for phrase in ['空白模板', '尚未执行', '约30分钟', '不规定到达任何境界',
                       '不按现实分钟发奖励', '匿名', '不是正常新档', '本段安排', '暂停']:
            self.assertIn(phrase, form)

    def test_every_actual_core_consumer_installs_resource_dependency_before_running(self):
        expected = {'.github/workflows/core.yml': 1, '.github/workflows/playable.yml': 2}
        for file, count in expected.items():
            text = (ROOT / file).read_text()
            self.assertEqual(text.count(DEPENDENCY_STEP), count, file)
            for job in re.split(r'^  [a-z]+:\n', text, flags=re.M)[1:]:
                if 'npm run validate:core' in job:
                    self.assertIn(DEPENDENCY_STEP, job)
                    self.assertLess(job.index(DEPENDENCY_STEP), job.index('npm run validate:core'))

    def test_workflows_retain_all_original_gates_permissions_triggers_and_timeouts(self):
        before = {'core.yml': '5ca0428f2a595b9724bc04cb213e713ade6fad302ec740d06491ea93f8702b22', 'playable.yml': 'eb37740f0233850449f9c3973dce65777525b860b536d609bc237cfb12912815'}
        for file, digest in before.items():
            text = (ROOT / '.github/workflows' / file).read_text().replace(DEPENDENCY_STEP, '')
            self.assertEqual(hashlib.sha256(text.encode()).hexdigest(), digest, file)

    def test_actual_assembly_calls_renderer_and_keeps_all_non_document_operations(self):
        tree = ast.parse((ROOT / 'scripts/package-candidate.py').read_text())
        class RemoveNotes(ast.NodeTransformer):
            def visit_Expr(self, node):
                call = node.value
                if isinstance(call, ast.Call):
                    if isinstance(call.func, ast.Name) and call.func.id == 'write_candidate_notes':
                        self.asserted_call = True
                        return None
                    if isinstance(call.func, ast.Attribute) and call.func.attr == 'write_text':
                        target = call.func.value
                        if isinstance(target, ast.BinOp) and isinstance(target.right, ast.Constant) and target.right.value in NOTE_FILES:
                            return None
                return self.generic_visit(node)
        expected = {'run': '117a39ae6c161d538b3358b7caf5f0eeaaf3cb33d30cc22a8522db846c82379c',
                    'file_info': '38b09b33eb13f78eaad3681ac92b431f44d064b639c1e91508dee5e22bc315dc',
                    'source_bundle': 'e92449f0c7679b59d0e9931dbc55037373859ea2401287b1f576a5e230be9c8d',
                    'archive_tree': 'b77b7708de0eee6f77d102b1dd73e493c3ef57b9b064bc47c0cd2165b3d727a2',
                    'package': 'ee8e726a514205e3fa2f01e5eaf9ef6d1ba08ea99073a9908723685625a086b4'}
        strip = RemoveNotes()
        for node in tree.body:
            if isinstance(node, ast.FunctionDef) and node.name in expected:
                self.assertEqual(hashlib.sha256(ast.dump(strip.visit(node), include_attributes=False).encode()).hexdigest(), expected[node.name], node.name)
        self.assertTrue(getattr(strip, 'asserted_call', False), 'actual package must call the tested renderer')


if __name__ == '__main__':
    unittest.main()
