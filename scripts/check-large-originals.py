#!/usr/bin/env python3
"""Check indexed original storage without rewriting history or uploading objects."""
import argparse
import hashlib
import io
import json
import re
import subprocess
from pathlib import Path, PurePosixPath
from PIL import Image, __version__ as PILLOW_VERSION

ROOT = Path(__file__).resolve().parents[1]
BASELINE = 'd7380917f4c24cc13c631f2ee622d0c5bd5d10f5'
THRESHOLD = 1024 * 1024
ORIGINALS = 'art/large-originals/'
MANIFEST = 'docs/assets/large-originals.json'
RASTER = {'.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff', '.bmp'}
POINTER = re.compile(rb'version https://git-lfs.github.com/spec/v1\noid sha256:([0-9a-f]{64})\nsize ([1-9][0-9]*)\n')


class StoragePolicyError(ValueError):
    pass


def require(value, message):
    if not value:
        raise StoragePolicyError(message)


def sha(value):
    return hashlib.sha256(value).hexdigest()


def path_name(value):
    require(type(value) is str and value and '\\' not in value and ':' not in value,
            'Invalid asset path')
    path = PurePosixPath(value)
    require(not path.is_absolute() and '..' not in path.parts and str(path) == value,
            'Asset path must be a canonical repository path')
    return value


def indexed(root):
    output = subprocess.check_output(['git', 'ls-files', '-s', '-z'], cwd=root)
    rows = {}
    for line in output.split(b'\0'):
        if not line:
            continue
        meta, raw = line.split(b'\t', 1)
        mode, oid, stage = meta.decode().split()
        name = raw.decode('utf-8')
        require(stage == '0' and name not in rows, 'Unmerged index: ' + name)
        rows[name] = {'mode': mode, 'oid': oid}
    oids = sorted({r['oid'] for r in rows.values() if r['mode'] != '160000'})
    info = subprocess.check_output(['git', 'cat-file', '--batch-check'], cwd=root,
                                   input=('\n'.join(oids) + '\n').encode()).decode().splitlines()
    sizes = {}
    for line in info:
        oid, kind, size = line.split()
        require(kind == 'blob', 'Expected indexed file blob')
        sizes[oid] = int(size)
    for row in rows.values():
        row['size'] = sizes.get(row['oid'], 0)
    return rows


def validate(root=ROOT, baseline=BASELINE):
    root = Path(root).resolve()
    rows = indexed(root)
    require(re.fullmatch(r'[0-9a-f]{40}', baseline), 'Baseline must be a fixed full Git commit')
    old = {}
    for line in subprocess.check_output(['git', 'ls-tree', '-rz', baseline, '--', 'art'], cwd=root).split(b'\0'):
        if line:
            meta, raw = line.split(b'\t', 1)
            old[raw.decode('utf-8')] = meta.decode().split()[2]

    def blob(name, limit=512_000):
        name = path_name(name)
        row = rows.get(name)
        require(row is not None and row['mode'] in {'100644', '100755'}, 'Missing regular indexed file: ' + name)
        require(row['size'] <= limit, 'Unexpected large metadata/runtime export: ' + name)
        return subprocess.check_output(['git', 'cat-file', 'blob', row['oid']], cwd=root)

    def metadata(name):
        raw = blob(name)
        def unique(pairs):
            result = {}
            for key, value in pairs:
                require(key not in result, 'Duplicate JSON metadata field: ' + name)
                result[key] = value
            return result
        try:
            return json.loads(raw.decode('utf-8'), object_pairs_hook=unique)
        except StoragePolicyError:
            raise
        except (ValueError, UnicodeError) as error:
            raise StoragePolicyError('Invalid JSON metadata: ' + name) from error

    document = metadata(MANIFEST)
    require(type(document) is dict and set(document) == {'format', 'version', 'originals'} and
            document['format'] == 'chenyuan-large-originals' and type(document['version']) is int and
            document['version'] == 1 and type(document['originals']) is list, 'Invalid large-original manifest')
    records = {}
    for record in document['originals']:
        require(type(record) is dict and set(record) == {'path', 'sha256', 'bytes', 'width', 'height', 'hasAlpha',
                'alphaBBox', 'prompt', 'receipt', 'exportRecipe', 'exports'}, 'Invalid original record fields')
        name = path_name(record['path'])
        require(name.startswith(ORIGINALS) and PurePosixPath(name).suffix.lower() in RASTER,
                'Large original must use the designated raster directory')
        require(name not in records, 'Duplicate original record: ' + name)
        records[name] = record

    originals, grandfathered, art_bytes = [], [], 0
    for name, row in rows.items():
        if not name.startswith(('art/', 'web/public/')):
            continue
        require(row['mode'] in {'100644', '100755'}, 'Asset cannot be a symlink/submodule: ' + name)
        if name.startswith('art/'):
            art_bytes += row['size']
        prefix = blob(name, 1024) if row['size'] <= 1024 and row['mode'] == '100644' else b''
        pointer_like = prefix.startswith(b'version https://git-lfs.github.com/')
        designated = name.startswith(ORIGINALS) and PurePosixPath(name).suffix.lower() in RASTER
        if designated or pointer_like:
            require(name.startswith(ORIGINALS) and designated, 'LFS pointers are originals only; never production assets: ' + name)
            match = POINTER.fullmatch(prefix)
            require(match is not None, 'Missing/malformed indexed LFS pointer: ' + name)
            oid, size = match[1].decode(), int(match[2])
            require(size > THRESHOLD, 'Small raster belongs in ordinary reviewed asset storage: ' + name)
            require(name in records, 'Missing source/export record for LFS original: ' + name)
            record = records[name]
            require(type(record['bytes']) is int and record['bytes'] == size and record['sha256'] == oid,
                    'LFS pointer and recorded original differ: ' + name)
            attrs = subprocess.check_output(['git', 'check-attr', '--cached', '-z', 'filter', 'diff', 'merge', 'text', '--', name], cwd=root).split(b'\0')
            actual = {attrs[i+1].decode(): attrs[i+2].decode() for i in range(0, len(attrs)-1, 3)}
            require(actual == {'filter': 'lfs', 'diff': 'lfs', 'merge': 'lfs', 'text': 'unset'},
                    'Original must have indexed LFS attributes: ' + name)
            file = root / name
            require(file.is_file() and not file.is_symlink() and file.resolve().is_relative_to(root),
                    'Missing downloaded original: ' + name)
            raw = file.read_bytes()
            require(len(raw) == size and sha(raw) == oid,
                    'Original is absent, altered, or still a pointer; run git lfs pull: ' + name)
            with Image.open(io.BytesIO(raw)) as image:
                image.load()
                require(type(record['width']) is int and type(record['height']) is int and
                        image.size == (record['width'], record['height']), 'Original pixels differ: ' + name)
                has_alpha = 'A' in image.getbands() or 'transparency' in image.info
                require(type(record['hasAlpha']) is bool and record['hasAlpha'] == has_alpha,
                        'Original alpha presence differs: ' + name)
                alpha_box = image.convert('RGBA').getchannel('A').getbbox() if has_alpha else None
                alpha = list(alpha_box) if alpha_box else None
                require(record['alphaBBox'] is None or (type(record['alphaBBox']) is list and len(record['alphaBBox']) == 4 and
                        all(type(n) is int and n >= 0 for n in record['alphaBBox'])), 'Invalid alpha bound types: ' + name)
                require(record['alphaBBox'] == alpha, 'Original alpha bounds differ: ' + name)
            require(blob(record['prompt']).strip(), 'Prompt/original-making note is empty: ' + name)
            receipt = metadata(record['receipt'])
            require(type(receipt) is dict and receipt.get('sourceSha256') == oid and
                    all(type(receipt.get(k)) is str and receipt[k].strip() for k in ['source', 'rights']),
                    'Receipt must bind actual source bytes and usage provenance: ' + name)
            recipe = metadata(record['exportRecipe'])
            require(type(recipe) is dict and set(recipe) == {'format', 'version', 'source', 'sourceSha256', 'pillowVersion', 'outputs'} and
                    recipe['format'] == 'chenyuan-image-export' and type(recipe['version']) is int and recipe['version'] == 1 and
                    recipe['source'] == name and recipe['sourceSha256'] == oid and recipe['pillowVersion'] == PILLOW_VERSION and
                    type(recipe['outputs']) is list, 'Export recipe must bind source, supported format and actual Pillow version: ' + name)
            outputs = {}
            for output in recipe['outputs']:
                require(type(output) is dict and set(output) == {'path', 'width', 'height', 'lossless', 'quality', 'method'} and
                        type(output['width']) is int and 0 < output['width'] <= record['width'] and
                        type(output['height']) is int and 0 < output['height'] <= record['height'] and
                        type(output['lossless']) is bool and type(output['quality']) is int and 0 <= output['quality'] <= 100 and
                        type(output['method']) is int and 0 <= output['method'] <= 6, 'Invalid deterministic export options: ' + name)
                target = path_name(output['path'])
                require(target.startswith('web/public/art/') and target.endswith('.webp') and target not in outputs,
                        'Invalid/duplicate WebP export target: ' + name)
                with Image.open(io.BytesIO(raw)) as image:
                    image = image.convert('RGBA' if has_alpha else 'RGB').resize((output['width'], output['height']), Image.Resampling.LANCZOS)
                    stream = io.BytesIO()
                    image.save(stream, format='WEBP', lossless=output['lossless'], quality=output['quality'], method=output['method'])
                    outputs[target] = stream.getvalue()
            require(type(record['exports']) is list and record['exports'], 'Original has no deterministic exports: ' + name)
            seen = set()
            for export in record['exports']:
                require(type(export) is dict and set(export) == {'path', 'sha256', 'bytes', 'consumer'}, 'Invalid export record')
                runtime = path_name(export['path'])
                require(runtime.startswith('web/public/art/') and runtime not in seen,
                        'Export must be a unique runtime asset: ' + runtime)
                seen.add(runtime)
                data = blob(runtime)
                require(type(export['bytes']) is int and len(data) == export['bytes'] and sha(data) == export['sha256'] and
                        not POINTER.fullmatch(data), 'Export bytes differ or contain an LFS pointer: ' + runtime)
                consumer = path_name(export['consumer'])
                require(consumer.startswith('web/src/'), 'Export consumer must be current UI source')
                path = runtime.removeprefix('web/public/').encode()
                require(path in blob(consumer), 'Missing actual runtime consumer reference: ' + runtime)
                require(outputs.get(runtime) == data, 'Deterministic source export does not reproduce runtime bytes: ' + runtime)
            require(set(outputs) == seen, 'Recipe/manifest export sets differ: ' + name)
            originals.append({'path': name, 'sha256': oid, 'bytes': size})
        elif name.startswith('art/') and row['size'] > THRESHOLD:
            require(old.get(name) == row['oid'], 'New/changed large original cannot be an ordinary Git blob; use art/large-originals and Git LFS: ' + name)
            grandfathered.append({'path': name, 'oid': row['oid'], 'bytes': row['size']})
    require(set(records) == {r['path'] for r in originals}, 'Manifest contains an absent/non-LFS original')
    return {'format': 'chenyuan-large-original-storage', 'version': 1, 'baseline': baseline,
            'newOrdinaryThresholdBytes': THRESHOLD, 'indexedArtFiles': sum(n.startswith('art/') for n in rows),
            'indexedArtBytes': art_bytes, 'preservedLargeOriginals': grandfathered, 'lfsOriginals': originals,
            'historyRewritten': False, 'objectsUploaded': False, 'remoteStorageReductionVerified': False, 'passed': True}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    result = validate()
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        with args.report.open('x', encoding='utf-8', newline='\n') as output:
            json.dump(result, output, indent=2)
            output.write('\n')
    print(json.dumps({k: (len(v) if isinstance(v, list) else v) for k, v in result.items()}))
