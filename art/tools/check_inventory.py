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
    legacy_files, legacy_production = len(recorded), counts.get('production', 0) + counts.get('reviewed', 0)
    from redesign_inventory import validate_redesign
    redesign_files, redesign_production, redesign_references = validate_redesign(root, image_info)
    assert not recorded.intersection(redesign_files), 'Legacy/redesign paths overlap'
    recorded.update(redesign_files)
    if redesign_files:
        counts['production'] = counts.get('production', 0) + redesign_production
        counts['reference'] = counts.get('reference', 0) + redesign_references
    from character_battle_inventory import validate_character_battle
    character_battle_files, character_battle_production = validate_character_battle(root, image_info)
    assert not recorded.intersection(character_battle_files), 'Character/battle paths overlap older ledgers'
    recorded.update(character_battle_files)
    counts['production'] = counts.get('production', 0) + character_battle_production
    from desktop_ui_inventory import validate_desktop_ui
    desktop_ui_files, desktop_ui_production = validate_desktop_ui(root, image_info)
    assert not recorded.intersection(desktop_ui_files), 'Desktop UI paths overlap older ledgers'
    recorded.update(desktop_ui_files)
    counts['production'] += desktop_ui_production
    from panel_materials_inventory import validate_panel_materials
    panel_files, panel_production = validate_panel_materials(root, image_info)
    assert not recorded.intersection(panel_files), 'Panel material paths overlap older ledgers'
    recorded.update(panel_files)
    counts['production'] += panel_production
    counts['reference'] = counts.get('reference', 0) + len(panel_files) - panel_production
    immersive_path = root / 'art/redesign/immersive-ui.json'
    if immersive_path.exists():
        ui = json.loads(immersive_path.read_text())
        assert ui['format'] == 'chenyuan-immersive-ui' and ui['version'] == 1
        assert ui['maxBytes'] == 26000 and ui['userAcceptance'] is False
        assert [r['path'] for r in ui['files']] == ['web/src/immersive-theme.css', 'web/src/ProgressTrack.vue', 'web/src/ChoiceCard.vue', 'web/src/GuidancePanel.vue']
        for ref in ui['sourceReferences']:
            assert (root / ref).resolve().is_relative_to(root) and (root / ref).is_file()
        for row in ui['files']:
            data = (root / row['path']).read_bytes()
            assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256'], 'Immersive UI source changed without its record'
        assert sum(r['bytes'] for r in ui['files']) <= 26000
        assert ui['consumer'] == 'web/src/main.ts' and "import './immersive-theme.css'" in (root / ui['consumer']).read_text()
        assert set(ui['bindings']) == {'web/src/App.vue', 'web/src/CharacterPanel.vue', 'web/src/GoalPanel.vue', 'web/src/BattlePanel.vue'}
        for path, fragments in ui['bindings'].items():
            assert all(fragment in (root / path).read_text() for fragment in fragments)
    else:
        assert not (root / 'web/src/immersive-theme.css').exists(), 'Unrecorded global game theme'
    action_path = root / 'art/redesign/action-feedback.json'
    if action_path.exists():
        action = json.loads(action_path.read_text())
        assert action['format'] == 'chenyuan-action-feedback' and action['version'] == 1
        assert (action['maxBytes'], action['maxFamilies'], action['maxParticles'], action['maxDurationMs']) == (34000, 14, 12, 1600)
        assert action['userAcceptance'] is False and action['oldFxFamiliesPreserved'] == ['入道', '突破', '剑符反馈', '渡劫']
        assert [r['path'] for r in action['files']] == ['web/src/action-feedback.ts', 'web/src/ActionFeedbackStage.vue', 'web/src/action-motion.css']
        for row in action['files']:
            data = (root / row['path']).read_bytes()
            assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256'], 'Action feedback source changed without its record'
        assert sum(r['bytes'] for r in action['files']) <= 34000
        for ref in action['sourceReferences']:
            assert (root / ref).resolve().is_relative_to(root) and (root / ref).is_file()
        assert action['consumer'] == 'web/src/App.vue' and '<ActionFeedbackStage ' in (root / action['consumer']).read_text()
        assert action['styleConsumer'] == 'web/src/main.ts' and "import './action-motion.css'" in (root / action['styleConsumer']).read_text()
        assert len(action['coverage']['actionTypes']) == len(set(action['coverage']['actionTypes'])) == 25
        assert set(action['coverage']['moves']) == {'attack', 'guard', 'technique', 'release', 'heal', 'restore', 'flee'}
        assert action['coverage']['controls'] == ['new_game', 'restart', 'import', 'restore']
    else:
        assert not (root / 'web/src/action-motion.css').exists(), 'Unrecorded action feedback'
    flow_path = root / 'art/redesign/playable-flow.json'
    if flow_path.exists():
        flow = json.loads(flow_path.read_text())
        assert flow['format'] == 'chenyuan-playable-flow' and flow['version'] == 1
        assert (flow['maxNewBytes'], flow['maxActionMs'], flow['maxPageCards']) == (60000, 2400, 4)
        assert flow['userAcceptance'] is False
        assert [r['path'] for r in flow['files']] == ['web/src/action-timing.ts', 'web/src/ActionExecution.vue', 'web/src/play-flow.ts', 'web/src/CataloguePager.vue', 'web/src/PreparationPanel.vue', 'web/src/ExplorePanel.vue', 'web/src/GoodsPanel.vue', 'web/src/CultivationPanel.vue', 'web/src/play-flow.css']
        for row in flow['files']:
            data = (root / row['path']).read_bytes()
            assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256'], 'Playable flow source identity changed'
        assert sum(r['bytes'] for r in flow['files']) <= 60000
        for ref in flow['sourceReferences']:
            assert (root / ref).resolve().is_relative_to(root) and (root / ref).is_file()
        for path, fragments in flow['bindings'].items():
            assert all(fragment in (root / path).read_text() for fragment in fragments)
    else:
        assert not (root / 'web/src/play-flow.css').exists(), 'Unrecorded playable flow'
    native_path = root / 'art/redesign/single-screen-native.json'
    native_bytes = 0
    if native_path.exists():
        native = json.loads(native_path.read_text())
        assert native['format'] == 'chenyuan-single-screen-native' and native['version'] == 1
        assert native['maxBytes'] == 12000 and native['userAcceptance'] is False
        assert [row['path'] for row in native['files']] == ['web/src/game-hub.css']
        for reference in native['sourceReferences']:
            file = (root / reference).resolve()
            assert file.is_relative_to(root) and file.is_file(), 'Missing game-stage source reference'
        assert native['consumer'] == 'web/src/main.ts' and "import './game-hub.css'" in (root / native['consumer']).read_text()
        for row in native['files']:
            data = (root / row['path']).read_bytes()
            assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256'], 'Game-stage style identity changed'
            native_bytes += len(data)
        assert native_bytes <= 12000, 'Game-stage style budget exceeded'
    else:
        assert not (root / 'web/src/game-hub.css').exists(), 'Unrecorded game-stage stylesheet'
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
    masters = [a for a in manifest['assets'] if a['category'] in {'scene_master', 'portrait_master'}]
    if masters:
        assert sum(a['category'] == 'scene_master' for a in masters) == 4, 'Exactly four scene masters required'
        assert sum(a['category'] == 'portrait_master' for a in masters) == 5, 'Exactly five portrait masters required'
    for asset in manifest['assets']:
        aid = asset['id']
        if asset['status'] not in {'production', 'reviewed'}:
            continue
        if asset.get('parentId'):
            assert asset['parentId'] in by_id, aid + ': missing parent'
            assert asset['parentId'] == aid + '-master', aid + ': derivative points to another role or scene'
            parent = by_id[asset['parentId']]
            source_receipt = json.loads((root / parent['generationReceipt']).read_text())
            assert source_receipt['runtimePath'] == asset['exportedPath'] and source_receipt['runtimeSHA256'] == asset['sha256'], aid + ': source receipt does not identify this derivative'
            assert asset['originalHash'] == parent['sha256'], aid + ': source hash does not match parent'
            assert asset['dimensions']['width'] <= parent['dimensions']['width'] and asset['dimensions']['height'] <= parent['dimensions']['height'], aid + ': derivative silently upscaled'
            assert asset['alpha'] == parent['alpha'], aid + ': alpha was lost or invented'
        for component in asset.get('codeComponents', []):
            code = (root / component['path']).read_bytes()
            assert len(code) == component['bytes'] and hashlib.sha256(code).hexdigest() == component['sha256'], aid + ': native code component changed without its source record'
        if asset['category'] in {'scene', 'portrait'}:
            assert asset.get('parentId'), aid + ': runtime image has no original'
            assert asset['bytes'] <= (500000 if asset['category'] == 'scene' else 80000), aid + ': runtime byte budget exceeded'
        if asset['category'] in {'scene_master', 'portrait_master'}:
            assert asset['sourceType'] == 'built_in_image_gen' and asset['originalHash'] == asset['sha256'], aid + ': original identity drift'
            receipt = json.loads((root / asset['generationReceipt']).read_text())
            assert receipt['tool'] == 'built-in image_gen' and receipt['copiedUnchanged'] is True, aid + ': original generation evidence missing'
            assert receipt['sourceSHA256'] == asset['sha256'] and receipt['sourceDimensions'] == asset['dimensions'], aid + ': receipt does not identify this original'
            assert asset.get('inputAssets', []) == receipt.get('inputAssets', []), aid + ': declared edit inputs do not match the generation receipt'
            for original in receipt.get('inputAssets', []):
                assert original['id'] in by_id and by_id[original['id']]['sha256'] == original['sha256'], aid + ': edit input identity changed'
            prompt_file, key = receipt['promptReference'].split('#')
            assert json.loads((root / prompt_file).read_text())['prompts'][key], aid + ': missing exact generation prompt'
    kit = by_id['native-ui-kit']
    if kit['status'] in {'production', 'reviewed'}:
        assert kit['bytes'] + sum(c['bytes'] for c in kit.get('codeComponents', [])) <= 80000 and kit['targetSpec']['maxSymbols'] == 40, 'Native UI budget changed'
        svg = ET.fromstring((root / kit['exportedPath']).read_bytes())
        symbols = [node.get('id') for node in svg.iter() if node.tag.split('}')[-1] == 'symbol']
        bindings = kit['bindings']
        expected = {kind + '-' + key for kind, field in [('item', 'itemIds'), ('skill', 'skillIds'), ('relic', 'relicIds')] for key in bindings[field]}
        expected |= {'nav-' + key for key in ['cultivate', 'explore', 'inventory', 'karma']}
        expected |= {'action-' + key for key in ['save', 'help', 'close', 'back', 'restore', 'export']}
        assert len(symbols) == 40 and set(symbols) == expected, 'Native symbols do not match the finite content budget'
        for node in svg.iter():
            assert node.tag.split('}')[-1] not in {'script', 'image', 'foreignObject', 'text'}, 'Unsafe or baked-text SVG content'
            assert not any(key.lower().startswith('on') or key.split('}')[-1] == 'href' for key in node.attrib), 'External or executable SVG attribute'
    fx = by_id['native-fx-kit']
    if fx['status'] in {'production', 'reviewed'}:
        assert fx['targetSpec']['maxGroups'] == 4 and fx['bindings']['groups'] == ['入道', '突破', '剑符反馈', '渡劫'], 'FX group budget changed'
    assert by_id['runtime-scene-placeholder']['sha256'] == by_id['ref-style']['sha256'], 'Placeholder/reference copy identity changed without updated provenance'
    return {'format': manifest['format'], 'verifiedFiles': len(recorded), 'legacyVerifiedFiles':legacy_files, 'legacyProductionAssets':legacy_production, 'redesignVerifiedFiles':len(redesign_files), 'redesignProductionAssets':redesign_production, 'characterBattleVerifiedFiles':len(character_battle_files), 'characterBattleProductionAssets':character_battle_production, 'desktopUIVerifiedFiles':len(desktop_ui_files), 'desktopUIProductionAssets':desktop_ui_production, 'statuses': counts, 'productionAssets': counts.get('production', 0) + counts.get('reviewed', 0), 'singleScreenNativeBytes':native_bytes, 'scope': 'Hashes and image headers/status/evidence references; not full decode, legal grant, production completion or user visual acceptance.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[2])
    args = parser.parse_args()
    print(json.dumps(validate(args.root), ensure_ascii=False))
