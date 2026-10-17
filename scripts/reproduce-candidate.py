"""Clean-source restoration/build proof for one immutable candidate archive."""
from pathlib import Path
import argparse
import hashlib
import importlib.util
import json
import os
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('candidate_verify', ROOT / 'scripts/candidate/verify.py')
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)


def reproduce(output):
    output = Path(output).resolve()
    archive, runtime = output / 'candidate.zip', output / 'runtime'
    proof = verify.verify_directory(runtime, archive)
    manifest = json.loads((runtime / 'manifest.json').read_text())
    logs = output / 'reproduction-logs'
    logs.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='chenyuan-clean-source-') as temp:
        source = Path(temp) / 'source'
        commands = [(['git', 'clone', '--quiet', '--branch', 'candidate', str(runtime / 'source.bundle'), str(source)], Path(temp)), (['git', 'rev-parse', 'HEAD'], source)]
        results = []

        def run(args, cwd, name):
            result = subprocess.run(args, cwd=cwd, capture_output=True, text=True)
            text = result.stdout + result.stderr
            (logs / (name + '.log')).write_text(text)
            results.append({'id': name, 'command': args[0], 'args': args[1:], 'exitCode': result.returncode, 'logSha256': hashlib.sha256(text.encode()).hexdigest()})
            if result.returncode:
                raise RuntimeError(name + '\n' + text[-5000:])
            return result.stdout.strip()

        run(*commands[0], 'clone')
        if run(*commands[1], 'head') != manifest['source']['commit']:
            raise ValueError('Restored source commit differs')
        if run(['git', 'rev-parse', 'HEAD^{tree}'], source, 'tree') != manifest['source']['tree']:
            raise ValueError('Restored source tree differs')
        for index, revision in enumerate(manifest['source']['requiredHistory']):
            run(['git', 'cat-file', '-e', revision + ':src/full/engine.ts'], source, 'history-' + str(index))
        if (source / 'node_modules').exists() or (source / 'web/node_modules').exists():
            raise ValueError('Source bundle carried installed dependencies')
        run(['npm', 'run', 'validate:core'], source, 'core')
        run(['npm', '--prefix', 'web', 'ci', '--ignore-scripts', '--no-audit', '--no-fund'], source, 'web-install')
        run(['npm', '--prefix', 'web', 'run', 'build'], source, 'web-build')
        actual = {f.relative_to(source / 'web/dist').as_posix(): {'bytes': f.stat().st_size, 'sha256': hashlib.sha256(f.read_bytes()).hexdigest()} for f in (source / 'web/dist').rglob('*') if f.is_file()}
        expected = {f['path']: {'bytes': f['bytes'], 'sha256': f['sha256']} for f in manifest['runtime']['files']}
        if actual != expected:
            raise ValueError('Clean source build differs from candidate runtime')
        if run(['git', 'status', '--porcelain'], source, 'clean'):
            raise ValueError('Clean reproduction modified tracked source')
    report = {'format': 'chenyuan-candidate-reproduction', 'version': 1, 'archiveSha256': proof['archiveSha256'], 'source': manifest['source'], 'passed': True, 'freshClone': True, 'noBundledDependencies': True, 'historyAvailable': manifest['source']['requiredHistory'], 'runtimeFiles': len(expected), 'runtimeBytes': manifest['runtime']['bytes'], 'payloadMatches': True, 'commands': results}
    (output / 'reproduction.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({key: value for key, value in report.items() if key != 'commands'}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('output', nargs='?', default=os.environ.get('CANDIDATE_OUTPUT'))
    args = parser.parse_args()
    if not args.output:
        parser.error('candidate output is required')
    reproduce(args.output)
