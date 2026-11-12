"""Current image/provenance checks. UI source shape belongs to behavior tests.

Image facts come from the existing art manifests and export records. The old
source-byte budgets and inverse transformations are intentionally not consumed.
"""
import argparse
import hashlib
import io
import json
import math
from pathlib import Path, PurePosixPath
import re
import xml.etree.ElementTree as ET
import zipfile
from PIL import Image
from image_contract import contract, original_contract

IMAGES = {'.png', '.jpg', '.jpeg', '.webp', '.svg'}
FORBIDDEN = {'.ttf', '.otf', '.woff', '.woff2', '.eot', '.mp3', '.ogg', '.wav', '.m4a', '.flac'}
IMAGE_ROOTS = ('art/', 'web/public/art/', 'docs/v0.3/reference/')


def validate(root, expected_contract=None):
    root = Path(root).resolve()
    files, pictures, historical, runtime, references = {}, {}, None, set(), set()
    documents = {path.relative_to(root).as_posix(): json.loads(path.read_text(encoding='utf-8')) for path in sorted((root / 'art').rglob('*.json'))}
    expected = original_contract() if expected_contract is None else expected_contract
    assert json.dumps(contract(documents), sort_keys=True) == json.dumps(expected, sort_keys=True), 'Image/provenance contract changed; original image facts and budgets must be preserved'

    def local(name):
        assert type(name) is str and name and '\\' not in name and ':' not in name, 'Invalid asset path'
        relative = PurePosixPath(name)
        assert not relative.is_absolute() and '..' not in relative.parts, 'Invalid asset path'
        path = root.joinpath(*relative.parts)
        assert path.resolve().is_relative_to(root) and path.is_file(), 'Missing or external asset: ' + name
        assert not path.is_symlink(), 'Asset symlink: ' + name
        return path

    def data(name):
        if name not in files:
            files[name] = local(name).read_bytes()
        return files[name]

    def reference(name):
        nonlocal historical
        if name.startswith(('goal-1/', 'goal-2/', 'goal-3/', 'goal-4/')):
            if historical is None:
                folder = root / 'tests/fixtures/legacy-goals'
                manifest = json.loads((folder / 'manifest.json').read_text(encoding='utf-8'))
                archive = (folder / 'inputs.zip').read_bytes()
                assert hashlib.sha256(archive).hexdigest() == manifest['archiveSHA256'], 'Historical provenance archive changed'
                historical = ({row['path']: row for row in manifest['files']}, archive)
            rows, archive = historical
            assert name in rows, 'Missing historical provenance: ' + name
            with zipfile.ZipFile(io.BytesIO(archive)) as stream:
                raw = stream.read(name)
            assert len(raw) == rows[name]['bytes'] and hashlib.sha256(raw).hexdigest() == rows[name]['sha256'], 'Historical provenance changed: ' + name
        else:
            local(name)
        references.add(name)

    def picture(name):
        if name not in pictures:
            raw = data(name)
            decoded = {}
            if Path(name).suffix.lower() == '.svg':
                svg = ET.fromstring(raw)
                assert svg.tag.split('}')[-1] == 'svg', 'Invalid SVG root: ' + name
                def safe_css(value):
                    assert not re.search(r'@import|javascript:', value, re.I), 'External SVG style: ' + name
                    for target in re.findall(r'url\(([^)]*)\)', value, re.I):
                        assert target.strip().strip('\'"').startswith('#'), 'External SVG reference: ' + name
                for node in svg.iter():
                    assert node.tag.split('}')[-1] not in {'script', 'foreignObject'}, 'Executable SVG: ' + name
                    for key, value in node.attrib.items():
                        assert not key.lower().startswith('on'), 'Executable SVG attribute: ' + name
                        if key.split('}')[-1] == 'href':
                            assert value.startswith('#'), 'External SVG reference: ' + name
                        safe_css(value)
                    if node.tag.split('}')[-1] == 'style':
                        safe_css(node.text or '')
                box = svg.get('viewBox', '').split()
                if svg.get('viewBox') is not None:
                    assert len(box) == 4 and all(math.isfinite(float(n)) for n in box), 'Invalid SVG viewBox: ' + name
                size = (float(box[2]), float(box[3])) if len(box) == 4 else (float(svg.get('width', '0')), float(svg.get('height', '0')))
                assert all(n > 0 and n < float('inf') for n in size), 'Invalid SVG dimensions: ' + name
                alpha = True
            else:
                with Image.open(io.BytesIO(raw)) as image:
                    image.load()
                    size, alpha = image.size, 'A' in image.getbands() or 'transparency' in image.info
                    rgba = image.convert('RGBA')
                    channel = rgba.getchannel('A')
                    histogram = channel.histogram()
                    box16 = channel.point(lambda n: 255 if n >= 16 else 0).getbbox()
                    decoded = {'rgbaSHA256': hashlib.sha256(rgba.tobytes()).hexdigest(),
                               'alphaBBox1': list(channel.getbbox()) if channel.getbbox() else None,
                               'alphaBBox16': list(box16) if box16 else None,
                               'alphaProof': {'transparentPixels': histogram[0], 'solidPixels': sum(histogram[250:]), 'intermediatePixels': sum(histogram[1:250]), 'min': channel.getextrema()[0], 'max': channel.getextrema()[1]}}
            pictures[name] = {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(), 'dimensions': {'width': size[0], 'height': size[1]}, 'alpha': alpha, **decoded}
        return pictures[name]

    def fact(row):
        name = row['path']
        assert name.startswith(IMAGE_ROOTS), 'Image outside asset roots: ' + name
        assert type(row.get('sha256')) is str and re.fullmatch('[0-9a-f]{64}', row['sha256']), 'Invalid image checksum'
        assert hashlib.sha256(data(name)).hexdigest() == row['sha256'], 'Image checksum changed: ' + name
        actual = picture(name)
        assert actual['sha256'] == row['sha256'], 'Image checksum changed: ' + name
        if 'bytes' in row:
            assert type(row['bytes']) is int and row['bytes'] > 0 and actual['bytes'] == row['bytes'], 'Image byte fact changed: ' + name
        if row.get('dimensions') is not None:
            dimensions = row['dimensions']
            assert type(dimensions) is dict and set(dimensions) == {'width', 'height'}, 'Invalid image dimensions'
            assert all(type(n) is int and n > 0 for n in dimensions.values()), 'Invalid image dimensions'
            assert actual['dimensions'] == dimensions, 'Image dimensions changed: ' + name
        if row.get('alpha') is not None:
            assert type(row['alpha']) is bool and row['alpha'] == actual['alpha'], 'Image alpha changed: ' + name
        for key in ('rgbaSHA256', 'alphaBBox1', 'alphaBBox16', 'alphaProof'):
            if key in row:
                assert json.dumps(row[key], sort_keys=True) == json.dumps(actual.get(key), sort_keys=True), 'Decoded image fact changed: ' + name + '/' + key
        if name.startswith('web/public/art/'):
            runtime.add(name)

    def blob(row):
        name = row['path']
        raw = data(name)
        if 'sha256' in row:
            assert hashlib.sha256(raw).hexdigest() == row['sha256'], 'Provenance checksum changed: ' + name
        if 'bytes' in row:
            assert type(row['bytes']) is int and len(raw) == row['bytes'], 'Provenance bytes changed: ' + name
        references.add(name)

    def collect(value, found, label='', owned=True):
        if isinstance(value, dict):
            name = value.get('path')
            if isinstance(name, str) and Path(name).suffix.lower() in IMAGES and 'sha256' in value:
                if name.startswith(('goal-1/', 'goal-2/', 'goal-3/', 'goal-4/')):
                    reference(name)
                    assert historical[0][name]['sha256'] == value['sha256'], 'Historical image reference changed: ' + name
                else:
                    fact(value)
                    if owned and name.startswith('web/public/art/'):
                        found[name] = label + ' ' + value.get('id', '')
            for key in ('receipt', 'prompt', 'audit'):
                item = value.get(key)
                if isinstance(item, dict) and isinstance(item.get('path'), str):
                    blob(item)
            for key, item in value.items():
                owns = owned and not key.lower().startswith(('reused', 'unchanged')) and key not in {'reference', 'references'}
                collect(item, found, label + '/' + str(value.get('id', '')) + '/' + key, owns)
        elif isinstance(value, list):
            for item in value:
                collect(item, found, label, owned)

    def integer(value):
        assert type(value) is int and value > 0, 'Invalid image budget'
        return value

    def budgets(document, found):
        limits = document.get('budgets', document.get('budget', document))
        if not isinstance(limits, dict):
            return
        each = limits.get('maxRuntimeBytesEach', limits.get('maxRuntimeBytesPerAsset', limits.get('maxItemBytes', limits.get('maxRuntimeBytes'))))
        total = limits.get('maxTotalRuntimeBytes', limits.get('maxRuntimeBytesTotal', limits.get('maxTotalBytes')))
        if total is None and 'maxRuntimeBytesEach' not in limits:
            total = limits.get('maxRuntimeBytes')
        if each is not None:
            assert all(picture(name)['bytes'] <= integer(each) for name in found), 'Runtime image budget exceeded'
        if total is not None:
            assert sum(picture(name)['bytes'] for name in found) <= integer(total), 'Total runtime image budget exceeded'
        for name, label in found.items():
            for axis in ('width', 'height'):
                maximum = limits.get('maxRuntime' + axis.title())
                exact = limits.get('runtime' + axis.title())
                if maximum is not None:
                    assert picture(name)['dimensions'][axis] <= integer(maximum), 'Runtime image dimension budget exceeded'
                if exact is not None:
                    assert picture(name)['dimensions'][axis] == integer(exact), 'Runtime image dimension budget changed'
            for role, key in [('cover', 'maxCoverBytes'), ('leaf', 'maxLeafBytes'), ('person', 'personRuntimeBytes'), ('case', 'caseRuntimeBytes')]:
                if key in limits and role in (label + name).lower():
                    assert picture(name)['bytes'] <= integer(limits[key]), 'Runtime image role budget exceeded'
        for group, key in [('scenes', 'maxSceneBytes'), ('stageVariants', 'maxSceneBytes'), ('characters', 'maxCharacterBytes'), ('enemies', 'maxEnemyBytes'), ('presentationVariants', 'maxPresentationBytes')]:
            if key in limits:
                for row in document.get(group, []):
                    assert picture(row['runtime']['path'])['bytes'] <= integer(limits[key]), 'Runtime image group budget exceeded'

    manifest = json.loads(data('art/asset-manifest.json'))
    assert manifest.get('format') == 'chenyuan-art-inventory' and type(manifest.get('version')) is int and manifest['version'] == 1, 'Invalid asset inventory'
    assert isinstance(manifest.get('assets'), list) and manifest['assets'], 'Empty asset inventory'
    ids = set()
    for row in manifest['assets']:
        assert type(row.get('id')) is str and row['id'], 'Invalid asset ID'
        assert row['id'] not in ids, 'Duplicate asset ID'
        ids.add(row['id'])
        status = row.get('status')
        assert status in {'reference', 'placeholder', 'missing', 'planned', 'production', 'reviewed'}, 'Invalid asset status'
        rights = row.get('rights', {})
        assert type(rights.get('productionUseApproved')) is bool, 'Invalid production-use record'
        for source in [*row.get('sourceReference', []), *rights.get('evidenceReferences', [])]:
            reference(source)
        if status in {'production', 'reviewed'}:
            assert rights['productionUseApproved'] and row.get('category') not in {'reference', 'runtime_placeholder', 'source_original'}, 'Reference is not production art'
        if status in {'missing', 'planned'}:
            assert all(row.get(key) is None for key in ('exportedPath', 'dimensions', 'bytes', 'sha256', 'alpha', 'originalHash')), 'Missing art claims an existing artifact'
            continue
        assert row.get('availability') in {'repo_file', 'code_native'} and isinstance(row.get('exportedPath'), str), 'Unverified asset availability'
        name = row.get('exportedPath')
        if isinstance(name, str) and Path(name).suffix.lower() in IMAGES:
            fact({**row, 'path': name})
            receipt = row.get('generationReceipt')
            if receipt:
                reference(receipt)
            maximum = row.get('targetSpec', {}).get('runtime', row.get('targetSpec', {})).get('candidateMaxBytes')
            if maximum is not None and name.startswith('web/public/art/'):
                assert picture(name)['bytes'] <= integer(maximum), 'Runtime candidate budget exceeded'
    for relative, document in documents.items():
        path = root / relative
        found = {}
        collect(document, found)
        if isinstance(document, dict):
            try:
                budgets(document, found)
            except AssertionError as error:
                raise AssertionError(path.relative_to(root).as_posix() + ': ' + str(error)) from error
    actual_runtime = set()
    for scope in ('art', 'web/public', 'docs/v0.3/reference'):
        for path in (root / scope).rglob('*'):
            assert not path.is_symlink() and not (hasattr(path, 'is_junction') and path.is_junction()), 'Asset tree link: ' + str(path)
            assert path.suffix.lower() not in FORBIDDEN, 'Forbidden distributed font/audio: ' + str(path)
            if path.is_file() and path.is_relative_to(root / 'web/public/art'):
                assert path.suffix.lower() in IMAGES, 'Unregistered runtime file: ' + str(path)
                actual_runtime.add(path.relative_to(root).as_posix())
    assert actual_runtime == runtime, 'Unregistered or missing runtime images: ' + str(sorted(actual_runtime ^ runtime))
    return {'format': 'chenyuan-current-assets', 'images': len(pictures), 'runtimeImages': len(runtime), 'provenanceReferences': len(references), 'runtimeBytes': sum(picture(n)['bytes'] for n in runtime), 'uiSourcePinned': False, 'scope': 'Image/provenance facts and declared image budgets; behavior, visual acceptance and rights remain separate.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[2])
    args = parser.parse_args()
    print(json.dumps(validate(args.root), ensure_ascii=False))
