from pathlib import Path
import hashlib
import importlib.util
import json
import stat
import subprocess
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('verify_candidate', ROOT / 'scripts/candidate/verify.py')
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)


def fixture(path, change=lambda files: None, review_record=False):
    files = {name: b'fixture only, not a deliverable' for name in ['web/index.html', 'source.bundle', 'README.md', 'KNOWN_ISSUES.md', 'SAVE_COMPATIBILITY.md', 'CHANGELOG.md', 'PLAYTEST_FORM.md', 'ASSET_SOURCES.md', 'asset-manifest.json', 'serve.py', 'verify.py']}
    if review_record:
        files['ENGINEERING_REVIEW.md'] = b'agent review fixture only, not acceptance'
    inventory = [{'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()} for name, data in sorted(files.items())]
    manifest = {'format': 'chenyuan-candidate', 'version': 1, 'source': {'commit': 'a' * 40, 'buildCommit': 'a' * 40, 'tree': 'b' * 40}, 'inventory': inventory, 'runtime': {'files': [{'path': 'index.html', 'bytes': len(files['web/index.html']), 'sha256': hashlib.sha256(files['web/index.html']).hexdigest()}], 'bytes': len(files['web/index.html'])}, 'validation': {'fixtureOnly': True}}
    if review_record:
        manifest['reviewRecord'] = {'path': 'ENGINEERING_REVIEW.md', 'sha256': hashlib.sha256(files['ENGINEERING_REVIEW.md']).hexdigest(), 'scope': 'agent-engineering-review-record'}
    files['manifest.json'] = (json.dumps(manifest) + '\n').encode()
    checks = {name: hashlib.sha256(data).hexdigest() for name, data in files.items()}
    files['checksums.sha256'] = ''.join(checks[name] + '  ' + name + '\n' for name in sorted(checks)).encode()
    change(files)
    with zipfile.ZipFile(path, 'w') as archive:
        for name, data in files.items():
            archive.writestr(name, data)
    return files


class CandidateIntegrity(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='chenyuan-integrity-unit-')
        self.root = Path(self.temp.name)
        self.archive = self.root / 'fixture.zip'

    def tearDown(self):
        self.temp.cleanup()

    def test_integrity_scope_and_safe_extraction(self):
        fixture(self.archive)
        proof = verify.verify_archive(self.archive, self.root / 'unpacked')
        self.assertEqual(proof['runtimeFiles'], 1)
        self.assertIn('not a publisher signature', proof['scope'])
        verify.verify_directory(self.root / 'unpacked', self.archive)

    def test_changed_missing_and_unlisted_data_fail(self):
        for change in [lambda files: files.update({'web/index.html': b'changed'}), lambda files: files.pop('README.md'), lambda files: files.update({'private.txt': b'not listed'})]:
            fixture(self.archive, change)
            with self.assertRaises((ValueError, KeyError)):
                verify.verify_archive(self.archive)

    def test_optional_review_record_binds_registered_bytes_and_keeps_legacy_v1_valid(self):
        fixture(self.archive)
        verify.verify_archive(self.archive)
        fixture(self.archive, review_record=True)
        verify.verify_archive(self.archive)
        for variant in ['missing', 'hash', 'path', 'scope']:
            def change(files):
                manifest = json.loads(files['manifest.json'])
                if variant == 'missing':
                    files.pop('ENGINEERING_REVIEW.md')
                    manifest['inventory'] = [item for item in manifest['inventory'] if item['path'] != 'ENGINEERING_REVIEW.md']
                elif variant == 'hash':
                    manifest['reviewRecord']['sha256'] = '0' * 64
                elif variant == 'path':
                    manifest['reviewRecord']['path'] = 'README.md'
                else:
                    manifest['reviewRecord']['scope'] = 'human-approved'
                files['manifest.json'] = (json.dumps(manifest) + '\n').encode()
                checks = {name: hashlib.sha256(data).hexdigest() for name, data in files.items() if name != 'checksums.sha256'}
                files['checksums.sha256'] = ''.join(checks[name] + '  ' + name + '\n' for name in sorted(checks)).encode()
            fixture(self.archive, change, review_record=True)
            with self.assertRaisesRegex(ValueError, 'review'):
                verify.verify_archive(self.archive)

    def test_unsafe_paths_and_symlink_entries_fail(self):
        fixture(self.archive)
        for name in ['../escaped', '/absolute', 'a/../escaped', 'C:/drive', 'back\\slash']:
            with self.assertRaises(ValueError):
                verify.safe_name(name)
        with zipfile.ZipFile(self.archive, 'a') as archive:
            entry = zipfile.ZipInfo('link')
            entry.create_system = 3
            entry.external_attr = (stat.S_IFLNK | 0o777) << 16
            archive.writestr(entry, '../outside')
        with self.assertRaises(ValueError):
            verify.verify_archive(self.archive)

    def test_duplicate_archive_entries_fail(self):
        fixture(self.archive)
        with zipfile.ZipFile(self.archive, 'a') as archive:
            archive.writestr('README.md', b'duplicate')
        with self.assertRaises(ValueError):
            verify.verify_archive(self.archive)

    def test_modified_extraction_and_existing_user_directory_are_retained(self):
        fixture(self.archive)
        target = self.root / 'unpacked'
        verify.verify_archive(self.archive, target)
        (target / 'README.md').write_text('user change')
        with self.assertRaises(ValueError):
            verify.verify_directory(target, self.archive)
        with self.assertRaises(ValueError):
            verify.verify_archive(self.archive, target)
        self.assertEqual((target / 'README.md').read_text(), 'user change')

    def test_source_bundle_contains_selected_committed_history_without_worktree_files_or_other_refs(self):
        package_spec = importlib.util.spec_from_file_location('package_candidate', ROOT / 'scripts/package-candidate.py')
        package = importlib.util.module_from_spec(package_spec)
        package_spec.loader.exec_module(package)
        head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
        artifact_root = ROOT / 'artifacts'
        artifact_root.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='bundle-unit-', dir=artifact_root) as private:
            private = Path(private)
            (private / 'untracked-private.txt').write_text('not in committed source')
            first, second = self.root / 'first.bundle', self.root / 'second.bundle'
            package.source_bundle(first, {'source': head, 'head': head})
            package.source_bundle(second, {'source': head, 'head': head})
            self.assertEqual(hashlib.sha256(first.read_bytes()).digest(), hashlib.sha256(second.read_bytes()).digest())
            refs = subprocess.check_output(['git', 'bundle', 'list-heads', str(first)], text=True).splitlines()
            self.assertTrue(all(line.split()[1] in ('HEAD', 'refs/heads/candidate') for line in refs))
            clone = self.root / 'source'
            subprocess.run(['git', 'clone', '--quiet', '--branch', 'candidate', str(first), str(clone)], check=True)
            self.assertEqual(subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=clone, text=True).strip(), head)
            subprocess.run(['git', 'cat-file', '-e', 'd3f48ef7df6269133c2875d9b6ca035c0a30ca41:src/full/engine.ts'], cwd=clone, check=True)
            self.assertFalse((clone / 'node_modules').exists())
            self.assertFalse((clone / 'artifacts' / private.name / 'untracked-private.txt').exists())


if __name__ == '__main__':
    unittest.main()
