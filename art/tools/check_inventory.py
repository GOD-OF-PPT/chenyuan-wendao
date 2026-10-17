#!/usr/bin/env python3
"""Validate recorded asset facts and status boundaries, not legal rights or visual quality."""
import argparse
import hashlib
import json
import re
import struct
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path

IMAGE_EXTENSIONS = {'.png', '.webp', '.svg', '.jpg', '.jpeg'}
FORBIDDEN = {'.ttf', '.otf', '.woff', '.woff2', '.eot', '.mp3', '.ogg', '.wav', '.m4a', '.flac'}
SCOPES = ('art', 'docs/v0.3/reference', 'web/public', 'web/src')


def image_info(data, suffix):
    if suffix == '.png':
        assert data[:8] == b'\x89PNG\r\n\x1a\n' and data[12:16] == b'IHDR', 'Invalid PNG header'
        width, height = struct.unpack('>II', data[16:24])
        return {'width': width, 'height': height}, data[25] in (4, 6), 'png'
    if suffix == '.webp':
        assert data[:4] == b'RIFF' and data[8:12] == b'WEBP', 'Invalid WebP header'
        assert int.from_bytes(data[4:8], 'little') + 8 == len(data), 'Truncated WebP'
        offset = 12
        while offset + 8 <= len(data):
            kind, size = data[offset:offset + 4], int.from_bytes(data[offset + 4:offset + 8], 'little')
            chunk = data[offset + 8:offset + 8 + size]
            assert len(chunk) == size, 'Truncated WebP chunk'
            if kind == b'VP8X':
                return {'width': int.from_bytes(chunk[4:7], 'little') + 1, 'height': int.from_bytes(chunk[7:10], 'little') + 1}, bool(chunk[0] & 16), 'webp'
            if kind == b'VP8 ':
                assert chunk[3:6] == b'\x9d\x01\x2a', 'Invalid VP8 frame'
                return {'width': int.from_bytes(chunk[6:8], 'little') & 16383, 'height': int.from_bytes(chunk[8:10], 'little') & 16383}, False, 'webp'
            if kind == b'VP8L':
                assert chunk[0] == 47, 'Invalid VP8L frame'
                bits = int.from_bytes(chunk[1:5], 'little')
                return {'width': (bits & 16383) + 1, 'height': ((bits >> 14) & 16383) + 1}, bool((bits >> 28) & 1), 'webp'
            offset += 8 + size + size % 2
        raise AssertionError('No WebP image chunk')
    if suffix == '.svg':
        element = ET.fromstring(data)
        assert element.tag.split('}')[-1] == 'svg', 'Invalid SVG root'
        box = element.get('viewBox', '').replace(',', ' ').split()
        assert len(box) == 4, 'SVG requires explicit viewBox'
        return {'width': float(box[2]), 'height': float(box[3])}, True, 'svg'
    raise AssertionError('Unsupported recorded image format: ' + suffix)


def validate(root):
    root = root.resolve()
    manifest = json.loads((root / 'art/asset-manifest.json').read_text(encoding='utf-8'))
    assert manifest['format'] == 'chenyuan-art-inventory' and manifest['version'] == 1
    required = {'id', 'category', 'sourceType', 'originalHash', 'sourceReference', 'purpose', 'exportedPath', 'dimensions', 'bytes', 'sha256', 'status', 'availability', 'rights'}
    ids, recorded, counts = set(), set(), {}
    for asset in manifest['assets']:
        assert required <= asset.keys(), 'Incomplete asset fields'
        aid = asset['id']
        assert aid not in ids, 'Duplicate asset ID: ' + aid
        ids.add(aid)
        assert asset['sourceReference'] and asset['purpose']
        for reference in asset['sourceReference']:
            assert (root / reference).is_file(), aid + ': missing source reference ' + reference
        status = asset['status']
        assert status in {'reference', 'placeholder', 'missing', 'planned', 'production', 'reviewed'}
        counts[status] = counts.get(status, 0) + 1
        rights = asset['rights']
        assert isinstance(rights['productionUseApproved'], bool)
        assert rights['evidenceReferences'], aid + ': no source/rights evidence'
        for reference in rights['evidenceReferences']:
            assert (root / reference).is_file(), aid + ': missing rights evidence reference'
        if status in {'production', 'reviewed'}:
            assert rights['productionUseApproved'], aid + ': unverified production rights'
            assert asset['category'] not in {'reference', 'runtime_placeholder', 'source_original'}, aid + ': reference cannot be relabelled production'
            if status == 'reviewed':
                review = asset.get('visualReview', {})
                assert review.get('sourceHash') == asset['sha256'] and review.get('recordReference'), aid + ': review is not bound to this file'
        if status in {'planned', 'missing'}:
            assert asset['availability'] in {'not_produced', 'not_located_in_checked_scope'}
            assert all(asset.get(field) is None for field in ['exportedPath', 'dimensions', 'bytes', 'sha256', 'format', 'alpha', 'originalHash']), aid + ': non-file claims current file metadata'
            if status == 'missing':
                reported = asset['reportedMetadata']
                assert re.fullmatch(r'[0-9a-f]{64}', reported['sha256']) and reported['bytes'] > 0
            continue
        assert asset['availability'] in {'repo_file', 'code_native'}, aid + ': file availability not verified'
        filename = (root / asset['exportedPath']).resolve()
        assert filename.is_relative_to(root) and filename.is_file(), aid + ': missing or external file'
        relative = filename.relative_to(root).as_posix()
        assert relative not in recorded, 'Duplicate exported path: ' + relative
        recorded.add(relative)
        data = filename.read_bytes()
        assert len(data) == asset['bytes'] and hashlib.sha256(data).hexdigest() == asset['sha256'], aid + ': bytes/hash mismatch'
        if asset['availability'] == 'repo_file':
            dimensions, alpha, fmt = image_info(data, filename.suffix.lower())
            assert dimensions == asset['dimensions'] and alpha == asset['alpha'] and fmt == asset['format'], aid + ': image metadata mismatch'
            assert dimensions['width'] > 0 and dimensions['height'] > 0
    budgets = manifest['budget']
    for category, key in [('scene', 'sceneMasters'), ('portrait', 'portraits'), ('ui_kit', 'uiKits'), ('fx_kit', 'fxKits')]:
        assert sum(a['category'] == category for a in manifest['assets']) == budgets[key], 'Budget slots drift: ' + category
    assert budgets == {'sceneMasters': 4, 'portraits': 5, 'uiKits': 1, 'fxKits': 1, 'fxGroups': 4}
    assert manifest['fontPolicy']['filesDistributed'] is False and manifest['audioPolicy']['filesDistributed'] is False
    observed = set()
    for scope in SCOPES:
        directory = root / scope
        if not directory.is_dir():
            continue
        for filename in directory.rglob('*'):
            if not filename.is_file():
                continue
            suffix = filename.suffix.lower()
            assert suffix not in FORBIDDEN, 'Forbidden font/audio file: ' + str(filename.relative_to(root))
            if suffix in IMAGE_EXTENSIONS:
                observed.add(filename.relative_to(root).as_posix())
    assert observed <= recorded, 'Unrecorded image files: ' + str(sorted(observed - recorded))
    if (root / '.git').exists():
        result = subprocess.run(['git', '-C', str(root), 'ls-files', '-z'], check=True, capture_output=True)
        assert not any(Path(name).suffix.lower() in FORBIDDEN for name in result.stdout.decode().split('\0') if name), 'Tracked font/audio is forbidden by current inventory policy'
    by_id = {a['id']: a for a in manifest['assets']}
    assert by_id['runtime-scene-placeholder']['sha256'] == by_id['ref-style']['sha256'], 'Placeholder/reference copy identity changed without updated provenance'
    return {'format': manifest['format'], 'verifiedFiles': len(recorded), 'statuses': counts, 'productionAssets': counts.get('production', 0) + counts.get('reviewed', 0), 'scope': 'Hashes and image headers/status/evidence references; not full decode, legal grant, production completion or user visual acceptance.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[2])
    args = parser.parse_args()
    print(json.dumps(validate(args.root), ensure_ascii=False))
