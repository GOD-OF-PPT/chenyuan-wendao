"""Require the complete indexed file contents to stay below 100 decimal MB."""
import collections
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
LIMIT = 100_000_000


def check(root=ROOT, limit=LIMIT):
    rows = []
    for entry in subprocess.check_output(['git', 'ls-files', '-s', '-z'], cwd=root).split(b'\0'):
        if not entry:
            continue
        meta, name = entry.split(b'\t', 1)
        mode, oid, stage = meta.decode().split()
        if stage != '0' or mode not in {'100644', '100755'}:
            raise ValueError('Expected regular, merged tracked files: ' + name.decode())
        rows.append((name.decode(), oid))
    ids = sorted({oid for _, oid in rows})
    sizes = {}
    output = subprocess.check_output(['git', 'cat-file', '--batch-check'], cwd=root,
                                     input=('\n'.join(ids) + '\n').encode())
    for line in output.decode().splitlines():
        oid, kind, size = line.split()
        if kind != 'blob':
            raise ValueError('Expected tracked file blob')
        sizes[oid] = int(size)
    folders = collections.Counter()
    for name, oid in rows:
        folders[name.split('/')[0] if '/' in name else '(root files)'] += sizes[oid]
    total = sum(folders.values())
    if total >= limit:
        raise ValueError(f'Tracked contents exceed the <{limit} byte budget: {total}')
    return {'format': 'chenyuan-tracked-size', 'limitBytes': limit, 'trackedBytes': total,
            'files': len(rows), 'folders': dict(sorted(folders.items())), 'passed': True}


if __name__ == '__main__':
    print(json.dumps(check()))
