"""Exercise the actual package notes and keep dependency-only CI changes bounded."""
from pathlib import Path
import hashlib
import importlib.util
import json
import re
from unittest.mock import patch
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
            first = {p.name: p.read_text(encoding='utf-8') for p in stage.iterdir()}
            PACKAGER.write_candidate_notes(stage, source, versions)
            self.assertEqual(first, {p.name: p.read_text(encoding='utf-8') for p in stage.iterdir()})
            self.assertEqual(json.dumps([source, versions], sort_keys=True), frozen)
            return first

    def test_real_renderer_binds_supplied_source_and_versions_without_packaging(self):
        readme = self.notes()['README.md']
        for value in ['a' * 40, 'b' * 40, 'fixture-content', 'fixture-unbalanced']:
            self.assertIn(value, readme)
        self.assertIn('不是当前放置版最终评审', readme)

    def test_database_notes_match_formal_db_and_keep_original_retry_ownership(self):
        note = self.notes()['SAVE_COMPATIBILITY.md']
        db = re.search(r'export const FULL_DB_VERSION = (\d+);', (ROOT / 'web/src/full-persistence.ts').read_text(encoding='utf-8')).group(1)
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

    def test_current_ci_installs_resource_dependencies_and_retains_actual_reports(self):
        core = (ROOT / '.github/workflows/core.yml').read_text(encoding='utf-8')
        self.assertIn(DEPENDENCY_STEP, core)
        self.assertLess(core.index(DEPENDENCY_STEP), core.index('npm run validate:core'))
        for filename in ['core.yml', 'playable.yml']:
            text = (ROOT / '.github/workflows' / filename).read_text(encoding='utf-8')
            self.assertRegex(text, r'(?m)^  pull_request:')
            self.assertIn('contents: read', text)
            self.assertIn('persist-credentials: false', text)
            self.assertIn('fetch-depth: 0', text)
            self.assertIn('ref: ${{ github.event.pull_request.head.sha || github.sha }}', text)
            self.assertIn("node-version: '24.22.1'", text)
            self.assertIn('if: always()', text)
            self.assertIn('actions/upload-artifact@', text)
            self.assertNotRegex(text, r'(?m) *browser: \[.*(?:firefox|webkit)')
            self.assertNotIn('run test:performance', text)
            for action in re.findall(r'uses: ([^\n]+)', text):
                self.assertRegex(action, r'^[^@]+@[a-f0-9]{40}$')
        current = (ROOT / '.github/workflows/playable.yml').read_text(encoding='utf-8')
        self.assertIn('{suite: q13, label: q13', current)
        self.assertIn('{suite: native, label: native', current)
        for number in range(1, 5):
            self.assertIn(f"{{suite: normal, label: normal-{number}of4, shard: '--shard={number}/4'}}", current)
        self.assertIn('check-current-browser-shards.mjs', current)
        self.assertIn('needs: behavior', current)
        self.assertIn('npx playwright install --with-deps chromium', current)
        self.assertIn('node scripts/check-current-browser.mjs ${{ matrix.suite }}', current)
        self.assertIn('npm --prefix web run build', current)
        self.assertIn('artifacts/current-${{ matrix.label }}', current)
        self.assertNotIn('package-candidate.py', current)

    def test_paused_full_matrix_remains_explicitly_archived(self):
        archive = ROOT / 'docs/quality-20261112/historical-workflows'
        old = (archive / 'playable.yml').read_text(encoding='utf-8')
        self.assertIn('browser: [chromium, firefox, webkit]', old)
        for gate in ['test:performance', 'check-journey-coverage', 'check-recovery-coverage',
                     'package-candidate.py', 'reproduce-candidate.py', 'candidate:receipt']:
            self.assertIn(gate, old)
        self.assertIn('延期', (archive / 'README.md').read_text(encoding='utf-8'))

    def exercise_package_to_notes(self, fault=None):
        class ReachedNotes(Exception):
            pass
        captured = {}
        with tempfile.TemporaryDirectory(prefix='chenyuan-package-behavior-') as folder:
            root = Path(folder)
            for name, data in {'web/dist/index.html': 'fixture runtime',
                               'web/src/full-persistence.ts': 'export const FULL_DB_VERSION = 10;',
                               'scripts/candidate/serve.py': '# fixture server',
                               'scripts/candidate/verify.py': '# fixture verifier',
                               'evidence.json': 'unchanged evidence'}.items():
                target = root / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(data, encoding='utf-8')
            evidence = root / 'evidence.json'
            inputs = {'source': {'source': 'a' * 40, 'tree': 'b' * 40},
                      'versions': {'version': 2, 'schemaVersion': 2, 'contentVersion': 'fixture', 'balanceVersion': 'unbalanced'},
                      'files': [{'from': str(evidence), 'to': 'evidence/result.json',
                                 'bytes': evidence.stat().st_size,
                                 'sha256': hashlib.sha256(evidence.read_bytes()).hexdigest()}]}
            if fault == 'changed-evidence':
                evidence.write_text('changed after validation', encoding='utf-8')
            def validated(*args):
                Path(args[-1]).write_text(json.dumps(inputs), encoding='utf-8')
                return 'synthetic validated input; not candidate evidence'
            bundles = []
            def bundle(destination, source):
                bundles.append(source)
                destination.write_bytes(str(len(bundles)).encode() if fault == 'different-bundle' else b'same fixture bundle')
            render = PACKAGER.write_candidate_notes
            def notes(stage, source, versions):
                render(stage, source, versions)
                captured.update(source=source, versions=versions,
                                files={p.name for p in stage.iterdir()},
                                readme=(stage / 'README.md').read_text(encoding='utf-8'),
                                evidence=(stage / 'evidence/result.json').read_bytes())
                raise ReachedNotes()
            with patch.multiple(PACKAGER, ROOT=root, run=validated,
                                source_bundle=bundle, write_candidate_notes=notes):
                with self.assertRaises(ValueError if fault else ReachedNotes):
                    PACKAGER.package(root / 'reports', root / 'journeys', root / 'output')
            self.assertEqual(len(bundles), 0 if fault == 'changed-evidence' else 2)
            if fault:
                self.assertEqual(captured, {})
            else:
                self.assertEqual(captured['source'], inputs['source'])
                self.assertEqual(captured['versions'], inputs['versions'])
                self.assertTrue(NOTE_FILES.issubset(captured['files']))
                self.assertIn('a' * 40, captured['readme'])
                self.assertEqual(captured['evidence'], b'unchanged evidence')

    def test_actual_assembly_renders_notes_after_verified_input_and_equal_bundles(self):
        self.exercise_package_to_notes()

    def test_assembly_rejects_changed_evidence_before_rendering_notes(self):
        self.exercise_package_to_notes('changed-evidence')

    def test_assembly_rejects_different_source_bundle_before_rendering_notes(self):
        self.exercise_package_to_notes('different-bundle')


if __name__ == '__main__':
    unittest.main()
