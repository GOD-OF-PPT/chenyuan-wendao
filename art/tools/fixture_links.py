"""Real filesystem aliases for confinement tests, including unprivileged Windows.

Keep file symlinks on capable hosts. Otherwise mirror the owned fixture parent
outside its root and alias that parent, so the tested file still exists, retains
its bytes, and resolves outside the fixture. No validator is mocked or skipped.
"""
from contextlib import contextmanager
import errno
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import uuid


@contextmanager
def external_file_link(link, target, fixture_root):
    link, target, fixture_root = Path(link), Path(target), Path(fixture_root).resolve()
    parent = link.parent.resolve()
    if parent == fixture_root or not parent.is_relative_to(fixture_root):
        raise ValueError('Alias parent must be inside the owned fixture')
    if link.exists() or link.is_symlink():
        raise ValueError('Alias destination must be absent')
    try:
        link.symlink_to(target)
    except OSError as error:
        if error.errno not in {errno.EPERM, errno.EACCES} and getattr(error, 'winerror', None) != 1314:
            raise
    else:
        yield 'file-symlink'
        return

    payload = target.read_bytes()
    with tempfile.TemporaryDirectory(prefix='chenyuan-external-parent-') as folder:
        shadow = Path(folder) / 'parent'
        shutil.copytree(parent, shadow, symlinks=True)
        (shadow / link.name).write_bytes(payload)
        backup = parent.with_name('.' + parent.name + '.before-link-' + uuid.uuid4().hex)
        if not backup.is_relative_to(fixture_root) or backup.exists():
            raise ValueError('Invalid owned fixture backup')
        parent.rename(backup)
        try:
            if os.name == 'nt':
                subprocess.run(['cmd', '/c', 'mklink', '/J', str(parent), str(shadow)],
                               check=True, capture_output=True)
            else:
                os.symlink(shadow, parent, target_is_directory=True)
            yield 'parent-alias'
        finally:
            if parent.is_symlink() or (hasattr(parent, 'is_junction') and parent.is_junction()):
                if parent.resolve() != shadow.resolve():
                    raise ValueError('Owned fixture alias was replaced')
                if os.name == 'nt':
                    os.rmdir(parent)  # Remove the junction entry, never its target.
                else:
                    parent.unlink()
            backup.rename(parent)
            # Old callers explicitly unlink the alias and restore their original
            # bytes after checking rejection. Keep that cleanup shape portable.
            if not link.exists():
                link.write_bytes(payload)
