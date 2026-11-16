"""Materialize only the historical inputs still consumed by legacy checks.

The deleted process directories are not source. Their small, explicit input closure
is a versioned fixture archive until the corresponding checks become behavioral.
Never replace a conflicting local file or follow a link outside the target root.
"""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import tempfile
import zipfile

FIXTURES = Path(__file__).resolve().parents[1] / 'tests/fixtures/legacy-goals'


def prepare(root, fixtures=FIXTURES):
    root = Path(root).resolve()
    manifest = json.loads((fixtures / 'manifest.json').read_text(encoding='utf-8'))
    data = (fixtures / 'inputs.zip').read_bytes()
    if hashlib.sha256(data).hexdigest() != manifest['archiveSHA256']:
        raise ValueError('Historical fixture archive checksum mismatch')
    rows = manifest['files']
    paths = [row['path'] for row in rows]
    if len(set(paths)) != len(paths):
        raise ValueError('Duplicate historical fixture path')
    for path in paths:
        relative = PurePosixPath(path)
        if (relative.is_absolute() or '..' in relative.parts or '\\' in path
                or not relative.parts or relative.parts[0] not in {'goal-1', 'goal-2', 'goal-3', 'goal-4'}):
            raise ValueError('Invalid historical fixture path')
    pending = []
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        if sorted(archive.namelist()) != sorted(paths):
            raise ValueError('Historical fixture inventory mismatch')
        for row in rows:
            relative = PurePosixPath(row['path'])
            target = root.joinpath(*relative.parts)
            for part in [target, *target.parents]:
                if part == root:
                    break
                if part.is_symlink() or (hasattr(part, 'is_junction') and part.is_junction()):
                    raise ValueError('Historical fixture path follows a link')
            payload = archive.read(row['path'])
            if len(payload) != row['bytes'] or hashlib.sha256(payload).hexdigest() != row['sha256']:
                raise ValueError('Historical fixture content mismatch: ' + row['path'])
            if target.exists():
                if not target.is_file() or target.read_bytes() != payload:
                    raise ValueError('Conflicting historical fixture retained: ' + str(target))
            else:
                pending.append((target, payload))
    # Validate the complete archive and existing files before creating any inputs.
    for target, payload in pending:
        target.parent.mkdir(parents=True, exist_ok=True)
        # Publish a complete file exclusively. Another starting test process must
        # never observe an empty/partial target and mistake it for local work.
        with tempfile.NamedTemporaryFile(dir=target.parent, prefix='.legacy-input-', delete=False) as staging:
            temporary = Path(staging.name)
            staging.write(payload)
        try:
            os.link(temporary, target)
        except FileExistsError:
            if target.is_symlink() or target.read_bytes() != payload:
                raise ValueError('Concurrent historical fixture conflict: ' + str(target))
        finally:
            temporary.unlink()
    return len(pending)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    print('Historical test inputs prepared:', prepare(args.root))
