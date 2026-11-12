"""File-alias inputs for confinement tests on hosts without symlink privileges.

Capable hosts use native file symlinks. Else only the selected file's filesystem
resolution/is-link result is substituted; sibling paths and the real validator
remain unchanged. This is a unit filesystem seam, not native symlink evidence.
"""
from contextlib import contextmanager
import errno
from pathlib import Path
from unittest.mock import patch


@contextmanager
def external_file_link(link, target, fixture_root):
    link, target, fixture_root = Path(link), Path(target), Path(fixture_root).resolve()
    parent = link.parent.resolve()
    if parent == fixture_root or not parent.is_relative_to(fixture_root):
        raise ValueError('Alias parent must be inside the owned fixture')
    if link.exists() or link.is_symlink():
        raise ValueError('Alias destination must be absent')
    native = True
    try:
        link.symlink_to(target)
    except OSError as error:
        if error.errno not in {errno.EPERM, errno.EACCES} and getattr(error, 'winerror', None) != 1314:
            raise
        native = False
        with link.open('xb') as output:
            output.write(target.read_bytes())

    original_resolve, original_is_link = Path.resolve, Path.is_symlink
    selected = link.absolute()
    seen = False

    def resolve(path, *args, **kwargs):
        nonlocal seen
        if path.absolute() == selected:
            seen = True
            return original_resolve(path if native else target, *args, **kwargs)
        return original_resolve(path, *args, **kwargs)

    def is_link(path):
        nonlocal seen
        if path.absolute() == selected:
            seen = True
            return original_is_link(path) if native else True
        return original_is_link(path)

    with patch.object(Path, 'resolve', resolve), patch.object(Path, 'is_symlink', is_link):
        yield 'file-symlink' if native else 'single-file-resolution-seam'
    if not seen:
        raise AssertionError('The intended aliased file was never inspected')
