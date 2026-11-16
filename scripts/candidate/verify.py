"""Verify candidate bytes and safe paths; this is integrity checking, not a publisher signature."""
from pathlib import Path, PurePosixPath
import argparse
import hashlib
import json
import re
import stat
import zipfile

MAX_TOTAL = 512 * 1024 * 1024
MAX_FILE = 256 * 1024 * 1024


def digest(data):
    return hashlib.sha256(data).hexdigest()


def safe_name(name):
    p = PurePosixPath(name)
    if not name or len(name) > 240 or p.is_absolute() or str(p) != name or any(x in ('.', '..') for x in p.parts) or any(x in name for x in ('\\', '\x00', ':', '\n', '\r')):
        raise ValueError('Unsafe candidate path: ' + repr(name))
    return name


def verify_archive(filename, extract=None):
    filename = Path(filename)
    with zipfile.ZipFile(filename) as archive:
        members = archive.infolist()
        names = [safe_name(x.filename) for x in members]
        if len(names) != len(set(names)) or len(names) > 2000:
            raise ValueError('Duplicate or excessive archive entries')
        if sum(x.file_size for x in members) > MAX_TOTAL:
            raise ValueError('Excessive expanded candidate size')
        for member in members:
            if member.is_dir() or stat.S_IFMT(member.external_attr >> 16) not in (0, stat.S_IFREG) or member.file_size > MAX_FILE or member.flag_bits & 1:
                raise ValueError('Unsupported archive entry: ' + member.filename)
        if archive.getinfo('manifest.json').file_size > 1_000_000 or archive.getinfo('checksums.sha256').file_size > 1_000_000:
            raise ValueError('Excessive candidate control file')
        manifest = json.loads(archive.read('manifest.json'))
        if manifest.get('format') != 'chenyuan-candidate' or manifest.get('version') != 1:
            raise ValueError('Unsupported candidate manifest')
        source = manifest['source']
        if not all(re.fullmatch('[a-f0-9]{40}', source[k]) for k in ('commit', 'buildCommit', 'tree')):
            raise ValueError('Invalid source identity')
        inventory = manifest['inventory']
        if not isinstance(inventory, list) or len({x['path'] for x in inventory}) != len(inventory):
            raise ValueError('Invalid inventory')
        expected = {}
        for item in inventory:
            name = safe_name(item['path'])
            if name in ('manifest.json', 'checksums.sha256') or not isinstance(item['bytes'], int) or isinstance(item['bytes'], bool) or not 0 <= item['bytes'] <= MAX_FILE or not re.fullmatch('[a-f0-9]{64}', item['sha256']):
                raise ValueError('Invalid file descriptor')
            expected[name] = item
        if set(names) != set(expected) | {'manifest.json', 'checksums.sha256'}:
            raise ValueError('Missing or unlisted candidate file')
        for name, item in expected.items():
            data = archive.read(name)
            if len(data) != item['bytes'] or digest(data) != item['sha256']:
                raise ValueError('Candidate hash mismatch: ' + name)
        checks = {**{name: item['sha256'] for name, item in expected.items()}, 'manifest.json': digest(archive.read('manifest.json'))}
        checksum_text = ''.join(checks[name] + '  ' + name + '\n' for name in sorted(checks))
        if archive.read('checksums.sha256').decode('utf-8') != checksum_text:
            raise ValueError('Checksum list differs')
        runtime = {x['path']: x for x in manifest['runtime']['files']}
        web = {name.removeprefix('web/'): item for name, item in expected.items() if name.startswith('web/')}
        if set(runtime) != set(web) or sum(x['bytes'] for x in runtime.values()) != manifest['runtime']['bytes'] or manifest['runtime']['bytes'] > 15_000_000:
            raise ValueError('Runtime inventory or budget differs')
        for name, item in runtime.items():
            if item['sha256'] != web[name]['sha256'] or item['bytes'] != web[name]['bytes']:
                raise ValueError('Runtime descriptor differs')
        required = {'web/index.html', 'source.bundle', 'README.md', 'KNOWN_ISSUES.md', 'SAVE_COMPATIBILITY.md', 'CHANGELOG.md', 'PLAYTEST_FORM.md', 'ASSET_SOURCES.md', 'asset-manifest.json', 'serve.py', 'verify.py'}
        if not required <= set(expected):
            raise ValueError('Incomplete delivery contents')
        review = manifest.get('reviewRecord')
        if review is not None:
            if not isinstance(review, dict) or set(review) != {'path', 'sha256', 'scope'} or review['path'] != 'ENGINEERING_REVIEW.md' or review['scope'] != 'agent-engineering-review-record' or not re.fullmatch('[a-f0-9]{64}', str(review['sha256'])):
                raise ValueError('Invalid engineering review descriptor')
            descriptor = expected.get(review['path'])
            if descriptor is None or descriptor['sha256'] != review['sha256']:
                raise ValueError('Missing or inconsistent engineering review record')
        if extract is not None:
            dest = Path(extract)
            if dest.exists() and (dest.is_symlink() or any(dest.iterdir())):
                raise ValueError('Refusing to replace existing extraction directory')
            dest.mkdir(parents=True, exist_ok=True)
            for name in names:
                target = dest / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(archive.read(name))
        return {'format': 'chenyuan-candidate-integrity', 'version': 1, 'archiveSha256': digest(filename.read_bytes()), 'source': source, 'files': len(names), 'runtimeFiles': len(runtime), 'runtimeBytes': manifest['runtime']['bytes'], 'summary': manifest['validation'], 'scope': 'Inventory, safe extraction and bytes; not a publisher signature or a substitute for replay, browser and human evidence.'}


def verify_directory(directory, archive):
    directory = Path(directory)
    proof = verify_archive(archive)
    with zipfile.ZipFile(archive) as packed:
        files = {}
        for file in directory.rglob('*'):
            if file.is_symlink():
                raise ValueError('Extracted candidate symlink')
            if file.is_file():
                files[file.relative_to(directory).as_posix()] = file
        if set(files) != set(packed.namelist()):
            raise ValueError('Extracted candidate file set differs')
        for name, file in files.items():
            if file.read_bytes() != packed.read(name):
                raise ValueError('Extracted candidate differs: ' + name)
    return proof


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('archive')
    parser.add_argument('--extract')
    parser.add_argument('--directory')
    args = parser.parse_args()
    print(json.dumps(verify_directory(args.directory, args.archive) if args.directory else verify_archive(args.archive, args.extract), ensure_ascii=False))
