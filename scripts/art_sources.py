"""Restore exact archived art originals; never overwrite a local source."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = 'docs/assets/archived-sources.json'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def prepare(root=ROOT):
    root = Path(root).resolve()
    document = json.loads((root / MANIFEST).read_text(encoding='utf-8'))
    require(set(document) == {'format', 'version', 'commit', 'backupBranch', 'files'} and
            document['format'] == 'chenyuan-archived-art-sources' and
            type(document['version']) is int and document['version'] == 1,
            'Invalid archived source manifest')
    commit = document['commit']
    require(type(commit) is str and re.fullmatch('[0-9a-f]{40}', commit), 'Expected a pinned source commit')
    require(type(document['files']) is list and document['files'], 'Missing archived source inventory')
    records = {}
    for row in document['files']:
        require(type(row) is dict and set(row) == {'path', 'blob', 'sha256', 'bytes'}, 'Invalid source record')
        name = row['path']
        require(type(name) is str and '\\' not in name and ':' not in name and
                str(PurePosixPath(name)) == name and '..' not in PurePosixPath(name).parts and
                name.startswith(('art/production/', 'art/redesign/')) and name.endswith('.png'),
                'Invalid archived source path')
        require(name not in records, 'Duplicate archived source path: ' + name)
        require(type(row['bytes']) is int and row['bytes'] > 0 and
                type(row['blob']) is str and re.fullmatch('[0-9a-f]{40}', row['blob']) and
                type(row['sha256']) is str and re.fullmatch('[0-9a-f]{64}', row['sha256']),
                'Invalid source identity: ' + name)
        records[name] = row

    def git(*args):
        return subprocess.check_output(['git', *args], cwd=root, stderr=subprocess.PIPE)

    try:
        tree = git('ls-tree', '-r', '-z', commit, '--', 'art')
    except subprocess.CalledProcessError as error:
        raise ValueError('Archived commit unavailable. Fetch the backup first: git fetch origin '
                         'codex/backup-main-before-size-reduction-20261117') from error
    originals = {}
    for entry in tree.split(b'\0'):
        if not entry:
            continue
        meta, raw_name = entry.split(b'\t', 1)
        mode, kind, oid = meta.decode().split()
        name = raw_name.decode('utf-8')
        if name.endswith('.png'):
            require(mode == '100644' and kind == 'blob', 'Archived source must be a regular file')
            originals[name] = oid
    require(originals == {name: row['blob'] for name, row in records.items()},
            'Archive manifest differs from the complete pinned PNG source tree')

    def target(name):
        path = root / name
        require(not any(parent.is_symlink() for parent in [path, *path.parents] if parent != root),
                'Refusing source symlink: ' + name)
        require(path.resolve().is_relative_to(root), 'Source escapes repository: ' + name)
        return path

    def verify(raw, row):
        require(len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256'],
                'Archived source checksum differs: ' + row['path'])

    # Check every existing file before creating any missing ones. Local edits fail closed.
    missing = []
    for name, row in records.items():
        path = target(name)
        if path.exists():
            require(path.is_file(), 'Source is not a regular file: ' + name)
            verify(path.read_bytes(), row)
        else:
            missing.append(name)
    for name in missing:
        row = records[name]
        raw = git('cat-file', 'blob', row['blob'])
        verify(raw, row)
        path = target(name)
        path.parent.mkdir(parents=True, exist_ok=True)
        descriptor, name_on_disk = tempfile.mkstemp(dir=path.parent, prefix='.restore-art-')
        temporary = Path(name_on_disk)
        try:
            with os.fdopen(descriptor, 'wb') as stream:
                stream.write(raw)
                stream.flush()
                os.fsync(stream.fileno())
            temporary.chmod(0o644)
            # Publish only a complete, closed file, without replacing a racing local edit.
            os.link(temporary, path)
        finally:
            temporary.unlink()
    return {'format': 'chenyuan-art-source-restore', 'commit': commit,
            'verified': len(records), 'restored': len(missing),
            'bytes': sum(row['bytes'] for row in records.values())}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    args = parser.parse_args()
    print(json.dumps(prepare(args.root)))
