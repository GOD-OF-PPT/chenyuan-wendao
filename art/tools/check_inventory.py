from cend07_f02c_inventory import validate_source_intent
from cend07_f02b_inventory import validate_relic_focus
from check_cend07_three_inventory import validate_three_check
from cend07_f03_inventory import validate_painted_travel
from cend07_f04_inventory import validate_preparation_bench,prior_preparation_bench_bytes
from cend07_f02a_inventory import validate_power_focus
from check_cend07_inventory import validate_forecast
from cend06_f02b_inventory import validate_f02b
from cend06_f02a_inventory import validate_f02a
from check_ui35_source_inventory import validate_check_ui35_source
from uir35_04_inventory import validate_uir3504
from uir35_03_inventory import validate_uir3503,prior_uir3503_bytes
from check_ui35_inventory import validate_check_ui35
from uir35_02_inventory import validate_uir3502
from uir35_01_inventory import validate_uir3501
from uir34_07_inventory import validate_uir3407
from uir34_06_inventory import validate_uir3406
from uir34_05_inventory import validate_uir3405
from check_uir34_02_04_inventory import validate_check340204
from uir34_04_inventory import validate_uir3404
from uir34_03_inventory import validate_uir3403
from uir34_02_inventory import validate_uir3402,prior_uir3402_bytes
from uir34_01_inventory import validate_uir3401
from uir33_08_inventory import validate_uir3308
from check_uir33_02_inventory import validate_check_uir3302
from uir33_07_inventory import validate_uir3307,prior_uir3307_bytes
from uir33_06_inventory import validate_uir3306,prior_uir3306_bytes
from uir33_05_inventory import validate_uir3305
from check_ux31_33_inventory import validate_check_ux3133
from check_uir33_inventory import validate_check_uir33
from uir33_04_inventory import validate_uir3304
from uir33_02_inventory import validate_uir3302,prior_uir3302_bytes
from uir33_01_inventory import validate_uir3301
from ux33_inventory import validate_ux33
from ux32_inventory import validate_ux32
from ux31_inventory import validate_ux31,GROUPS as UX31_GROUPS
#!/usr/bin/env python3
"""Validate recorded asset facts and status boundaries, not legal rights or visual quality."""
import argparse
from ux30_inventory import prior_ux30_bytes,validate_ux30
import hashlib
import json
import re
import struct
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path, PurePosixPath

IMAGE_EXTENSIONS = {'.png', '.webp', '.svg', '.jpg', '.jpeg'}
FORBIDDEN = {'.ttf', '.otf', '.woff', '.woff2', '.eot', '.mp3', '.ogg', '.wav', '.m4a', '.flac'}
SCOPES = ('art', 'docs/v0.3/reference', 'web/public', 'web/src')

FEEDBACK_SKIP_NATIVE = ['web/src/FeedbackSkip.vue']
FEEDBACK_SKIP_REFS = [
    'docs/decisions/0032-matrix-check-01-contract.md',
    'goal-4/amendments/2026-10-24-check-matrix-01.md',
    'goal-4/research/check-matrix-01-sources.json',
]
FEEDBACK_SKIP_CANDIDATE = 'art/redesign/feedback-skip/source-candidate.vue'
FEEDBACK_SKIP_BINDINGS = {
    'web/src/App.vue': ["import FeedbackSkip from './FeedbackSkip.vue'", '<ActionFeedbackStage ', '<FeedbackSkip ', '@hold="hold"', '@dismiss="dismiss"'],
    'web/src/ActionFeedbackStage.vue': ['<slot v-if="notice&&showMotion" :key="notice.key" :dismiss="clear" :hold="holdMotion" :operation="notice.operation"/>', 'function holdMotion(){clearTimeout(timer);}'],
    'web/src/FeedbackSkip.vue': ["from './focus'", 'inject(gameFocusKey)', 'data-testid="fx-skip"', '@focusin="hold"', '@focusout="leave"', '@click="dismiss"', '<Teleport v-if="target" :to="target">', '.game-hud .activity-rail>footer', 'feedback-held', 'min-height:44px'],
}


def validate_feedback_skip(root):
    """Bound the additive keyboard control; source checks do not prove game feel."""
    root = root.resolve()
    ledger = root / 'art/redesign/feedback-skip.json'
    if not ledger.exists():
        assert not any((root / path).exists() for path in FEEDBACK_SKIP_NATIVE), 'Unrecorded feedback skip control'
        return 0

    def local(path):
        assert type(path) is str and path and '\\' not in path and not PurePosixPath(path).is_absolute() and '..' not in PurePosixPath(path).parts, 'Invalid feedback skip relative path'
        file = (root / path).resolve()
        assert file.is_relative_to(root) and file.is_file(), 'Missing or external feedback skip file'
        return file

    assert ledger.resolve().is_relative_to(root) and ledger.is_file(), 'Feedback skip ledger escapes repository'
    manifest = json.loads(ledger.read_text())
    assert type(manifest) is dict and set(manifest) == {'format', 'version', 'task', 'maxNativeBytes', 'newBitmapAssets', 'assets', 'userAcceptance', 'files', 'sourceReferences', 'bindings', 'provenance'}, 'Feedback skip ledger shape changed'
    assert manifest['format'] == 'chenyuan-feedback-skip' and type(manifest['version']) is int and manifest['version'] == 1 and manifest['task'] == 'Goal4 CHECK-MATRIX-01', 'Feedback skip header changed'
    assert type(manifest['maxNativeBytes']) is int and manifest['maxNativeBytes'] == 4000, 'Feedback skip fixed budget changed'
    assert type(manifest['newBitmapAssets']) is int and manifest['newBitmapAssets'] == 0 and manifest['assets'] == [], 'Feedback skip bitmap budget changed'
    assert manifest['userAcceptance'] is False, 'Feedback skip checks cannot claim user acceptance'
    assert manifest['sourceReferences'] == FEEDBACK_SKIP_REFS and manifest['bindings'] == FEEDBACK_SKIP_BINDINGS, 'Feedback skip references or consumer contract changed'
    for reference in FEEDBACK_SKIP_REFS:
        local(reference)
    assert type(manifest['files']) is list and all(type(row) is dict and set(row) == {'path', 'bytes', 'sha256'} for row in manifest['files']), 'Feedback skip source identity shape changed'
    assert [row['path'] for row in manifest['files']] == FEEDBACK_SKIP_NATIVE, 'Feedback skip single-file inventory changed'
    total = 0
    for row in manifest['files']:
        data = prior_ux30_bytes(row['path'],local(row['path']).read_bytes())
        assert type(row['bytes']) is int and row['bytes'] == len(data), 'Feedback skip source bytes changed'
        assert type(row['sha256']) is str and re.fullmatch('[0-9a-f]{64}', row['sha256']) and row['sha256'] == hashlib.sha256(data).hexdigest(), 'Feedback skip source hash changed'
        total += len(data)
    assert total <= 4000, 'Feedback skip control exceeds fixed budget'
    provenance = manifest['provenance']
    assert type(provenance) is dict and set(provenance) == {'kind', 'path', 'bytes', 'sha256', 'scope'} and provenance['kind'] == 'authored-native-candidate' and provenance['path'] == FEEDBACK_SKIP_CANDIDATE, 'Feedback skip candidate provenance changed'
    candidate = local(provenance['path']).read_bytes()
    assert type(provenance['bytes']) is int and provenance['bytes'] == len(candidate) and type(provenance['sha256']) is str and re.fullmatch('[0-9a-f]{64}', provenance['sha256']) and provenance['sha256'] == hashlib.sha256(candidate).hexdigest(), 'Feedback skip candidate identity changed'
    assert provenance['scope'] == 'Authored source candidate only; not runtime, pixel or user acceptance.', 'Feedback skip candidate cannot imply acceptance'
    for path, fragments in FEEDBACK_SKIP_BINDINGS.items():
        assert all(fragment in local(path).read_text() for fragment in fragments), 'Missing feedback skip consumer: ' + path
    app = local('web/src/App.vue').read_text()
    host = re.search(r'<ActionFeedbackStage\b[^>]*>(.*?)</ActionFeedbackStage>', app, re.S)
    slot = re.search(r'<template\s+#default="\{operation,dismiss,hold\}">(.*?)</template>', host[1], re.S) if host else None
    assert slot and re.search(r'<FeedbackSkip\s+[^>]*@hold="hold"[^>]*@dismiss="dismiss"\s*/>', slot[1]), 'Feedback skip is not consumed by the real stage scoped slot'
    domain = re.search(r'<FeedbackSkip\s+v-if="\[([^\]]*)\]\.includes\(operation\)"', slot[1])
    assert domain and re.findall(r"'([^']*)'", domain[1]) == ['BATTLE', 'BREAKTHROUGH', 'START_TRIAL'], 'Feedback skip operation domain changed'
    component = local('web/src/FeedbackSkip.vue').read_text()
    assert re.search(r'<style\s+scoped>.*?\.feedback-skip\b', component, re.S), 'Feedback skip inline control style missing'
    assert not re.search(r'<(?:img|AssetImage|PortraitImage)\b', component), 'Feedback skip cannot introduce image consumers'
    return total


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


def validate_alchemy_workshop(root, image_reader=image_info):
    """Bind ART01's one dormant furnace and its additive code to recorded facts."""
    ledger = root / 'art/redesign/alchemy-workshop.json'
    native = ['web/src/AlchemyWorkshop.vue', 'web/src/alchemy-workshop.css', 'web/src/alchemy-feedback.ts']
    if not ledger.exists():
        assert not any((root / path).exists() for path in native), 'Unrecorded alchemy workshop code'
        return set(), 0, 0
    manifest = json.loads(ledger.read_text())
    assert manifest['format'] == 'chenyuan-alchemy-workshop' and manifest['version'] == 1
    assert manifest['budgets'] == dict(assets=1, maxRuntimeBytes=160000, runtimeWidth=512, runtimeHeight=512, maxNativeBytes=22000), 'Alchemy workshop budget changed'
    assert manifest['userAcceptance'] is False, 'Alchemy workshop is not user acceptance'
    rights = manifest['rights']
    assert rights['productionUseApproved'] is True and rights['userAcceptance'] is False and rights['distributionLicense'] is None

    def local(path):
        value = (root / path).resolve()
        assert value.is_relative_to(root.resolve()) and value.is_file(), 'Missing or external alchemy workshop file'
        return value

    for path in manifest['sourceReferences'] + rights['evidenceReferences']:
        local(path)
    assert 'docs/decisions/0022-alchemy-object-art-contract.md' in manifest['sourceReferences']
    assert [row['path'] for row in manifest['files']] == native, 'Alchemy workshop code inventory changed'
    native_bytes = 0
    for row in manifest['files']:
        data = prior_ux30_bytes(row['path'],local(row['path']).read_bytes())
        assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256'], 'Alchemy workshop code identity changed'
        native_bytes += len(data)
    assert native_bytes <= 22000, 'Alchemy workshop code budget exceeded'
    assert len(manifest['assets']) == 1 and manifest['assets'][0]['id'] == 'dormant-furnace', 'Alchemy workshop asset slots changed'
    asset = manifest['assets'][0]
    source, runtime = asset['source'], asset['runtime']
    assert source['path'] == 'art/redesign/alchemy-workshop/furnace-v1.png'
    assert runtime['path'] == 'web/public/art/v2/workshop/furnace-v1.webp'
    recorded = set()
    for item in [source, runtime]:
        path = local(item['path']); data = prior_ux30_bytes(path, path.read_bytes())
        assert len(data) == item['bytes'] and hashlib.sha256(data).hexdigest() == item['sha256'], 'Alchemy workshop image identity changed'
        dimensions, alpha, fmt = image_reader(data, path.suffix)
        assert dimensions == item['dimensions'] and alpha == item['alpha'] is True and fmt == item['format'], 'Alchemy workshop image metadata/alpha mismatch'
        recorded.add(item['path'])
    assert runtime['dimensions'] == dict(width=512, height=512), 'Alchemy workshop runtime must be exactly512 square'
    assert runtime['bytes'] <= 160000, 'Alchemy workshop image budget exceeded'
    assert source['format'] == 'png' and runtime['format'] == 'webp'
    assert all(512 <= source['dimensions'][axis] <= 8192 for axis in ['width', 'height']), 'Alchemy workshop original dimensions invalid'
    prompt_path = 'art/redesign/alchemy-workshop/prompts.json'
    prompt = json.loads(local(prompt_path).read_text())
    assert prompt['id'] == 'dormant-furnace' and prompt['transparent_background'] is True and isinstance(prompt['prompt'], str) and prompt['prompt'].strip(), 'Alchemy workshop exact prompt missing'
    reference_path = 'web/public/art/v2/catalogue/alchemy-v1.webp'
    references = [dict(path=reference_path, sha256=hashlib.sha256(local(reference_path).read_bytes()).hexdigest())]
    assert prompt['referenceImages'] == references, 'Alchemy workshop reference image changed'
    receipt_ref = asset['receipt']
    assert receipt_ref['path'] == 'art/redesign/alchemy-workshop/receipt.json'
    receipt_raw = local(receipt_ref['path']).read_bytes()
    assert hashlib.sha256(receipt_raw).hexdigest() == receipt_ref['sha256'], 'Alchemy workshop receipt identity changed'
    receipt = json.loads(receipt_raw)
    assert receipt['id'] == asset['id'] and receipt['tool'] == 'built-in image_gen' and receipt['copiedUnchanged'] is True and receipt['transparentBackgroundRequested'] is True, 'Alchemy workshop generation evidence missing'
    assert isinstance(receipt['originalToolPath'], str) and receipt['originalToolPath'].startswith('/'), 'Alchemy workshop original tool path missing'
    assert receipt['savedPath'] == source['path'] and receipt['sourceSHA256'] == source['sha256'] and receipt['sourceBytes'] == source['bytes'] and receipt['sourceDimensions'] == source['dimensions'], 'Alchemy workshop receipt source binding changed'
    assert receipt['runtime'] == runtime, 'Alchemy workshop receipt runtime binding changed'
    assert receipt['referenceImages'] == references, 'Alchemy workshop receipt reference binding changed'
    assert receipt['promptReference'] == prompt_path + '#dormant-furnace' and receipt['promptSHA256'] == hashlib.sha256(prompt['prompt'].encode()).hexdigest(), 'Alchemy workshop prompt binding changed'
    assert receipt['encoding'] == ['cwebp', '-q', '82', '-m', '6', '-alpha_q', '100', '-resize', '512', '512', '-metadata', 'none'], 'Alchemy workshop deterministic export changed'
    assert receipt['exportVerification'] == dict(verified=True, sourceUnchanged=True, secondSHA256=runtime['sha256'], encoder='cwebp 1.6.0'), 'Alchemy workshop deterministic export proof missing'
    assert receipt['review'] == dict(actuallyViewed=True, textBaked=False, fireBaked=False, smokeBaked=False, pillsBaked=False, userAcceptance=False), 'Alchemy workshop dormant-object review missing'
    for name, item in [('alphaProof', source), ('runtimeAlphaProof', runtime)]:
        proof = receipt[name]
        assert all(isinstance(proof[k], int) and not isinstance(proof[k], bool) for k in ['min', 'max', 'transparentPixels', 'solidPixels', 'intermediatePixels']), 'Alchemy workshop alpha proof must use exact pixel counts'
        assert proof['min'] == 0 and 250 <= proof['max'] <= 255 and proof['transparentPixels'] > 10000 and proof['solidPixels'] > 10000 and proof['intermediatePixels'] >= 0, 'Alchemy workshop alpha pixels missing'
        assert proof['transparentPixels'] + proof['solidPixels'] + proof['intermediatePixels'] == item['dimensions']['width'] * item['dimensions']['height'], 'Alchemy workshop alpha pixel total changed'
    assert manifest['consumer'] == 'web/src/ProductionPlanner.vue' and '<AlchemyWorkshop ' in local(manifest['consumer']).read_text(), 'Alchemy workshop actual consumer missing'
    component = local('web/src/AlchemyWorkshop.vue').read_text()
    assert runtime['path'].removeprefix('web/public/') in component and '<AssetImage' in component and "from './use-activity-effect'" in component and 'useActivityPresentation(a=>a.version===3' in component, 'Alchemy workshop furnace/shared presentation consumer missing'
    assert 'createActivityEffectTracker(matches,extra)' in local('web/src/use-activity-effect.ts').read_text(), 'Alchemy workshop shared tracker binding missing'
    proof = local('web/src/activity-effects.ts').read_text()
    assert 'resolve(before,command)' in proof and 'completeActivity(g,prior,r' in proof, 'Alchemy workshop full Game and Activity proof missing'
    assert manifest['styleConsumer'] in ['web/src/main.ts', 'web/src/AlchemyWorkshop.vue'] and 'alchemy-workshop.css' in local(manifest['styleConsumer']).read_text(), 'Alchemy workshop style consumer missing'
    assert {'web/src/ProductionPlanner.vue', 'web/src/AlchemyWorkshop.vue', manifest['styleConsumer']} <= set(manifest['bindings']), 'Alchemy workshop bindings incomplete'
    for path, fragments in manifest['bindings'].items():
        assert fragments and all(fragment in local(path).read_text() for fragment in fragments), 'Alchemy workshop binding missing'
    return recorded, 1, native_bytes


ART02_NATIVE = ['web/src/SourceField.vue', 'web/src/JourneyMap.vue', 'web/src/BattlePresence.vue', 'web/src/BattleDeck.vue', 'web/src/activity-effects.ts', 'web/src/use-activity-effect.ts', 'web/src/art02-source.css', 'web/src/art02-journey.css', 'web/src/art02-battle.css']


def validate_adventure_objects(root):
    """ART02 has no new bitmap slots; nine object/proof/style files stay additive."""
    ledger = root / 'art/redesign/art02.json'
    if not ledger.exists():
        assert not any((root / path).exists() for path in ART02_NATIVE), 'Unrecorded adventure object code'
        return 0
    manifest = json.loads(ledger.read_text())
    assert manifest['format'] == 'chenyuan-adventure-objects' and manifest['version'] == 1
    assert manifest['maxNativeBytes'] == 45000 and manifest['maxNewRasterAssets'] == 0 and manifest['assets'] == [], 'Adventure object budget changed'
    assert manifest['userAcceptance'] is False, 'Adventure object checks are not player acceptance'
    assert manifest['task'] == 'Goal4 ART02'

    def local(path):
        value = (root / path).resolve()
        assert value.is_relative_to(root.resolve()) and value.is_file(), 'Missing or external adventure object file'
        return value

    assert 'docs/decisions/0023-adventure-object-art-contract.md' in manifest['sourceReferences']
    assert 'goal-4/amendments/2026-10-23-art02.md' in manifest['sourceReferences']
    for ref in manifest['sourceReferences']:
        local(ref)
    assert [row['path'] for row in manifest['files']] == ART02_NATIVE, 'Adventure object inventory changed or proof migration omitted'
    total = 0
    for row in manifest['files']:
        data = prior_ux30_bytes(row['path'],local(row['path']).read_bytes())
        assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256'], 'Adventure object identity changed'
        total += len(data)
    assert total <= 45000, 'Adventure object native budget exceeded'
    required = {
        'web/src/SourcePlanner.vue': ['<SourceField'],
        'web/src/AdventurePlanner.vue': ['<JourneyMap'],
        'web/src/BattlePanel.vue': ['<BattlePresence '],
        'web/src/BattleStrategy.vue': ['<BattleDeck'],
        'web/src/alchemy-feedback.ts': ['activity-effects'],
        'web/src/SourceField.vue': ['use-activity-effect', 'art02-source.css', 'source-work-state'],
        'web/src/JourneyMap.vue': ['use-activity-effect', 'art02-journey.css'],
        'web/src/BattlePresence.vue': ['art02-battle.css', '<ProgressTrack'],
        'web/src/use-activity-effect.ts': ['activity-effects'],
    }
    assert set(required) <= set(manifest['bindings']), 'Adventure object bindings incomplete'
    for path, fragments in required.items():
        assert set(fragments) <= set(manifest['bindings'][path]), 'Adventure object required binding omitted'
    for path, fragments in manifest['bindings'].items():
        assert fragments and all(fragment in local(path).read_text() for fragment in fragments), 'Adventure object actual consumer missing'
    assert manifest['scope'] and 'user' in manifest['scope'].lower()
    return total


ART03_NATIVE = ['web/src/JadeStudyScene.vue', 'web/src/RelicAtelier.vue', 'web/src/LoadoutConstellation.vue', 'web/src/equipment-effects.ts', 'web/src/art03-equipment.css']
ART03_IDS = ['frost_sword', 'jade_seal', 'soul_lamp', 'cloud_mirror']


def validate_equipment_objects(root, image_reader=image_info):
    """Bind four cold object exports and real UI/proof consumers, not visual acceptance."""
    ledger = root / 'art/redesign/art03.json'
    if not ledger.exists():
        assert not any((root / path).exists() for path in ART03_NATIVE), 'Unrecorded equipment object code'
        return set(), 0, 0
    manifest = json.loads(ledger.read_text())
    assert manifest['format'] == 'chenyuan-equipment-objects' and type(manifest['version']) is int and manifest['version'] == 1
    assert manifest['task'] == 'Goal4 ART03' and manifest['userAcceptance'] is False
    assert all(manifest[key] == limit for key, limit in {'maxNativeBytes': 45000, 'maxNewRasterAssets': 4, 'maxRuntimeBytes': 160000, 'runtimeSize': 512, 'maxTotalRuntimeBytes': 640000}.items()), 'Equipment object budget changed'

    def local(path):
        file = (root / path).resolve()
        assert file.is_relative_to(root.resolve()) and file.is_file(), 'Missing or external equipment object file'
        return file

    def identity(row):
        file = local(row['path']); data = prior_ux30_bytes(file, file.read_bytes())
        assert hashlib.sha256(data).hexdigest() == row['sha256'], 'Equipment object hash changed'
        if 'bytes' in row:
            assert len(data) == row['bytes'], 'Equipment object byte count changed'
        return file, data

    required_refs = {'docs/decisions/0025-equipment-object-art-contract.md', 'goal-4/amendments/2026-10-23-art03.md', 'art/redesign/art03-objects/asset-facts.json', 'art/redesign/art03-objects/prompts.json'}
    assert required_refs <= set(manifest['sourceReferences']), 'Equipment object source references incomplete'
    rights = manifest['rights']
    assert rights['productionUseApproved'] is True and rights['userAcceptance'] is False and rights['distributionLicense'] is None
    assert rights['evidenceReferences'], 'Equipment object rights evidence missing'
    for ref in manifest['sourceReferences'] + rights['evidenceReferences']:
        local(ref)
    assert [row['path'] for row in manifest['files']] == ART03_NATIVE, 'Equipment object code inventory changed'
    total = sum(len(identity(row)[1]) for row in manifest['files'])
    assert total <= 45000, 'Equipment object code budget exceeded'
    facts = json.loads(local('art/redesign/art03-objects/asset-facts.json').read_text())
    assert facts['format'] == 'chenyuan-art03-equipment-object-facts' and type(facts['version']) is int and facts['version'] == 1 and facts['tool'] == 'built-in image_gen'
    assert facts['budgets'] == dict(count=4, maxItemBytes=160000, maxTotalBytes=640000)
    assert facts['rights'] == dict(productionUseApproved=True, distributionLicense=None, userAcceptance=False)
    assert [asset['id'] for asset in manifest['assets']] == ART03_IDS and manifest['assets'] == facts['assets'], 'Equipment object slots or facts changed'
    prompts = json.loads(local('art/redesign/art03-objects/prompts.json').read_text())
    assert prompts['mode'] == 'built-in image_gen' and [row['id'] for row in prompts['prompts']] == ART03_IDS
    prompt_rows = {row['id']: row for row in prompts['prompts']}
    recorded = set()
    for asset in manifest['assets']:
        aid = asset['id']; source, runtime = asset['source'], asset['runtime']
        original = 'frost_sword-v2.png' if aid == 'frost_sword' else aid + '-v1.png'
        assert source['path'] == 'art/redesign/art03-objects/' + original and runtime['path'] == f'web/public/art/v2/equipment/{aid}-v1.webp'
        for row, fmt in [(source, 'png'), (runtime, 'webp')]:
            file, data = identity(row); size, alpha, actual_format = image_reader(data, file.suffix)
            assert size == row['dimensions'] and alpha == row['alpha'] is True and actual_format == row['format'] == fmt, 'Equipment object header or alpha mismatch'
            recorded.add(row['path'])
        assert all(type(source['dimensions'][axis]) is int and 512 <= source['dimensions'][axis] <= 8192 for axis in ['width', 'height'])
        assert runtime['dimensions'] == dict(width=512, height=512) and runtime['bytes'] <= 160000, 'Equipment object runtime size/bytes changed'
        assert asset['reviewSourceHash'] == source['sha256'], 'Equipment source review identity changed'
        _, raw = identity(asset['receipt']); receipt = json.loads(raw)
        assert receipt['id'] == aid and receipt['tool'] == 'built-in image_gen' and receipt['copiedUnchanged'] is True and receipt['transparentBackgroundRequested'] is True and receipt['runtimePending'] is False and receipt['userAcceptance'] is False
        assert isinstance(receipt['originalToolPath'], str) and receipt['originalToolPath'].startswith('/')
        assert receipt['savedPath'] == source['path'] and receipt['sourceSHA256'] == source['sha256'] and receipt['sourceBytes'] == source['bytes'] and receipt['sourceDimensions'] == source['dimensions'] and receipt['runtime'] == runtime, 'Equipment receipt source/runtime mismatch'
        _, raw = identity(asset['prompt']); prompt = json.loads(raw)
        assert prompt_rows[aid] == prompt and prompt['id'] == aid and prompt['mode'] == 'built-in image_gen' and prompt['transparent_background'] is True and isinstance(prompt['prompt'], str) and prompt['prompt'].strip(), 'Equipment exact prompt missing'
        assert receipt['promptReference'] == asset['prompt']['path'] and receipt['promptSHA256'] == hashlib.sha256(prompt['prompt'].encode()).hexdigest(), 'Equipment prompt binding changed'
        references = receipt['referenceImages']
        assert prompt['referenceImages'] == [row['path'] for row in references], 'Equipment edit references changed'
        for reference in references:
            identity(reference); recorded.add(reference['path'])
        assert receipt['encoding'] == ['cwebp', '-q', '82', '-m', '6', '-alpha_q', '100', '-resize', '512', '512', '-metadata', 'none'], 'Equipment export settings changed'
        export = receipt['exportVerification']
        assert export['verified'] is True and export['sourceUnchanged'] is True and export['secondSHA256'] == runtime['sha256'] and export['encoder'].startswith('cwebp 1.6.0'), 'Equipment deterministic export evidence missing'
        assert export['secondPath'] == f'art/redesign/art03-objects/exports/{aid}-repeat.webp'
        assert local(export['secondPath']).read_bytes() == local(runtime['path']).read_bytes(), 'Equipment repeated export differs'
        recorded.add(export['secondPath'])
        review = receipt['review']
        assert review['actuallyViewed'] is True and review['reviewedRuntimeSHA256'] == runtime['sha256'] and all(review[field] is False for field in ['textBaked', 'fireBaked', 'smokeBaked', 'activeHaloBaked', 'userAcceptance']), 'Equipment cold-object review missing'
        decode = receipt['decodeProof']
        assert decode['decoder'] == 'Pillow' and all(re.fullmatch('[0-9a-f]{64}', decode[field]) for field in ['sourceRGBASHA256', 'runtimeRGBASHA256'])
        assert decode['alphaDefinitions'] == dict(transparentPixels='alpha=0', solidPixels='alpha>=250', intermediatePixels='1<=alpha<250')
        for name, item in [('alphaProof', source), ('runtimeAlphaProof', runtime)]:
            alpha = receipt[name]
            assert all(type(alpha[field]) is int for field in ['min', 'max', 'transparentPixels', 'solidPixels', 'intermediatePixels'])
            assert alpha['min'] == 0 and 250 <= alpha['max'] <= 255 and alpha['transparentPixels'] > 1000 and alpha['solidPixels'] > 1000 and alpha['intermediatePixels'] >= 0, 'Equipment recorded alpha counts missing'
            assert sum(alpha[field] for field in ['transparentPixels', 'solidPixels', 'intermediatePixels']) == item['dimensions']['width'] * item['dimensions']['height'], 'Equipment alpha total mismatch'
        assert receipt['sourceBoundsAlpha16'] == asset['sourceBoundsAlpha16']
        for name, item in [('sourceBoundsAlpha16', source), ('runtimeBoundsAlpha16', runtime)]:
            bounds = asset[name]
            assert set(bounds) == {'left', 'top', 'right', 'bottom'} and all(type(value) is int for value in bounds.values())
            assert 0 <= bounds['left'] < bounds['right'] <= item['dimensions']['width'] and 0 <= bounds['top'] < bounds['bottom'] <= item['dimensions']['height'], 'Equipment recorded alpha bounds invalid'
        for coordinate, axis in [('left', 'width'), ('right', 'width'), ('top', 'height'), ('bottom', 'height')]:
            assert abs(asset['runtimeBoundsAlpha16'][coordinate] - asset['sourceBoundsAlpha16'][coordinate] * 512 / source['dimensions'][axis]) <= 2, 'Equipment bounds disagree with recorded resize'
    assert facts['runtimeTotalBytes'] == sum(asset['runtime']['bytes'] for asset in manifest['assets']) <= 640000
    required = {
        'web/src/LearningPlanner.vue': ['<JadeStudyScene'],
        'web/src/ProductionPlanner.vue': ['<RelicAtelier'],
        'web/src/EquipmentPanel.vue': ['<LoadoutConstellation'],
        'web/src/JadeStudyScene.vue': ['useEquipmentCycle', 'useConfigurationEcho', '<CatalogueArt kind="study"'],
        'web/src/RelicAtelier.vue': ["useEquipmentCycle('forge'", 'useConfigurationEcho', 'art/v2/equipment/'],
        'web/src/LoadoutConstellation.vue': ['useConfigurationEcho'],
        'web/src/equipment-effects.ts': ['useActivityPresentation', 'equipmentActivityMatches', 'resolve(before,command)', 'createActionFeedbackTracker'],
        'web/src/main.ts': ["import './art03-equipment.css'"],
    }
    assert set(required) <= set(manifest['bindings']), 'Equipment object binding inventory incomplete'
    for path, tokens in required.items():
        assert set(tokens) <= set(manifest['bindings'][path]), 'Equipment object required binding omitted'
    for path, tokens in manifest['bindings'].items():
        assert tokens and all(token in local(path).read_text() for token in tokens), 'Equipment object actual consumer missing'
    hook, shared = local('web/src/use-activity-effect.ts').read_text(), local('web/src/activity-effects.ts').read_text()
    assert 'createActivityEffectTracker(matches,extra)' in hook and 'extra:0|1|4|5|7=0' in hook
    assert 'extra:0|1|4|5|7=0' in shared and 'a.version&&[2,3,6,extra].includes(a.version)' in shared and 'resolve(before,command)' in shared and 'completeActivity(g,prior,r' in shared, 'Equipment shared full proof or default gate detached'
    catalogue = json.loads(local('art/redesign/catalogue-art/manifest.json').read_text())
    assert '<CatalogueArt kind="study"' in catalogue['bindings'].get('web/src/JadeStudyScene.vue', []) and '藏经图鉴' in local('web/src/JadeStudyScene.vue').read_text(), 'Catalogue study fallback actual child unbound'
    return recorded, 4, total


def validate(root):
    root = root.resolve()
    source_intent_files,source_intent_delta=validate_source_intent(root)
    relic_focus_files,relic_focus_delta=validate_relic_focus(root)
    threecheck_files,threecheck_delta=validate_three_check(root)
    travelpaint_files,travelpaint_bytes=validate_painted_travel(root)
    bench_files,bench_bytes=validate_preparation_bench(root)
    power_files,power_delta=validate_power_focus(root)
    forecast_files,forecast_delta=validate_forecast(root)
    f02b_files,f02b_bytes=validate_f02b(root)
    f02a_files,f02a_bytes=validate_f02a(root)
    checkui35source_files,checkui35source_bytes=validate_check_ui35_source(root)
    uir3504_files,uir3504_bytes=validate_uir3504(root)
    uir3503_files,uir3503_bytes=validate_uir3503(root)
    checkui35_files,checkui35_bytes=validate_check_ui35(root)
    uir3502_files,uir3502_bytes=validate_uir3502(root)
    validate_uir3501(root)
    check340204_files,check340204_bytes=validate_check340204(root)
    uir3404_files,uir3404_bytes=validate_uir3404(root)
    uir3403_files,uir3403_bytes=validate_uir3403(root)
    uir3402_files,uir3402_bytes=validate_uir3402(root)
    uir3407_files,uir3407_bytes=validate_uir3407(root)
    uir3406_files,uir3406_bytes=validate_uir3406(root)
    uir3405_files,uir3405_bytes=validate_uir3405(root)
    uir3401_files,uir3401_bytes=validate_uir3401(root)
    uir3308_files,uir3308_bytes=validate_uir3308(root)
    checkuir02_files,checkuir02_bytes=validate_check_uir3302(root)
    uir3307_files,uir3307_bytes=validate_uir3307(root)
    uir3306_files,uir3306_bytes=validate_uir3306(root)
    uir3305_files,uir3305_bytes=validate_uir3305(root)
    checkuir_files,checkuir_bytes=validate_check_uir33(root)
    uir3304_files,uir3304_bytes=validate_uir3304(root)
    uir3302_files,uir3302_bytes=validate_uir3302(root)
    uir3301_files,uir3301_bytes=validate_uir3301(root)
    check95_files,check95_bytes=validate_check_ux3133(root)
    ux33_files,ux33_bytes=validate_ux33(root)
    ux32_files,ux32_bytes=validate_ux32(root)
    ux31_files,ux31_bytes=validate_ux31(root)
    ux30_files,ux30_bytes=validate_ux30(root)
    adventure_object_bytes = validate_adventure_objects(root)
    feedback_skip_bytes = validate_feedback_skip(root)
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
        data = prior_ux30_bytes(filename, filename.read_bytes())
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
    from catalogue_art_inventory import validate_catalogue_art
    catalogue_files,catalogue_production=validate_catalogue_art(root,image_info)
    assert not recorded.intersection(catalogue_files),'Catalogue paths overlap older ledgers'
    recorded.update(catalogue_files)
    counts['production']+=catalogue_production
    counts['reference']+=len(catalogue_files)-catalogue_production
    workshop_files, workshop_production, workshop_bytes = validate_alchemy_workshop(root)
    assert not recorded.intersection(workshop_files), 'Alchemy workshop paths overlap older ledgers'
    recorded.update(workshop_files)
    counts['production'] += workshop_production
    counts['reference'] += len(workshop_files) - workshop_production
    equipment_files, equipment_production, equipment_bytes = validate_equipment_objects(root)
    assert not recorded.intersection(equipment_files), 'Equipment object paths overlap older ledgers'
    recorded.update(equipment_files)
    counts['production'] += equipment_production
    counts['reference'] += len(equipment_files) - equipment_production
    from cultivation_object_inventory import validate_cultivation_objects
    cultivation_files, cultivation_production, cultivation_bytes = validate_cultivation_objects(root, image_info)
    assert not recorded.intersection(cultivation_files), 'Cultivation object paths overlap older ledgers'
    recorded.update(cultivation_files)
    counts['production'] += cultivation_production
    counts['reference'] += len(cultivation_files) - cultivation_production
    from ta07_inventory import validate_ta07
    ta07_files, ta07_production, ta07_bytes = validate_ta07(root, image_info)
    assert not recorded.intersection(ta07_files), 'TA07 paths overlap older ledgers'
    recorded.update(ta07_files)
    counts['production'] += ta07_production
    counts['reference'] += len(ta07_files) - ta07_production
    from ta08_inventory import validate_ta08
    ta08_files, ta08_production, ta08_bytes = validate_ta08(root, image_info)
    assert not recorded.intersection(ta08_files), 'TA08 paths overlap older ledgers'
    recorded.update(ta08_files)
    counts['production'] += ta08_production
    counts['reference'] += len(ta08_files) - ta08_production
    from ta09_inventory import validate_ta09
    ta09_files, ta09_production, ta09_bytes = validate_ta09(root, image_info)
    assert ta09_production == 0, 'TA09 adds no production raster'
    assert not recorded.intersection(ta09_files), 'TA09 paths overlap older ledgers'
    recorded.update(ta09_files)
    counts['reference'] += len(ta09_files)

    from art10_inventory import validate_art10
    art10_files, art10_production, art10_bytes = validate_art10(root, image_info)
    assert not recorded.intersection(art10_files), 'ART10 paths overlap older ledgers'
    recorded.update(art10_files)
    counts['production'] += art10_production
    counts['reference'] += len(art10_files) - art10_production

    from art11_inventory import validate_art11
    art11_files, art11_production, art11_bytes = validate_art11(root, image_info)
    assert not recorded.intersection(art11_files), 'ART11 paths overlap older ledgers'
    recorded.update(art11_files)
    counts['production'] += art11_production
    counts['reference'] += len(art11_files) - art11_production

    from art12_inventory import validate_art12
    art12_files, art12_bytes = validate_art12(root)
    assert not recorded.intersection(art12_files), 'ART12 paths overlap older ledgers'
    recorded.update(art12_files)
    counts['reference'] += len(art12_files)

    from art15_inventory import validate_art15
    art15_files, art15_bytes = validate_art15(root)
    assert not recorded.intersection(art15_files), 'ART15 paths overlap older ledgers'
    recorded.update(art15_files)
    counts['reference'] += len(art15_files)

    from art16_inventory import validate_art16
    art16_files, art16_production, art16_bytes = validate_art16(root, image_info)
    assert not recorded.intersection(art16_files), 'ART16 paths overlap older ledgers'
    recorded.update(art16_files)
    counts['production'] += art16_production
    counts['reference'] += len(art16_files) - art16_production

    from supply_object_inventory import validate_supply_objects
    supply_bytes = validate_supply_objects(root)
    from narrative_object_inventory import validate_narrative_objects
    narrative_object_bytes = validate_narrative_objects(root)
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
        if (root / 'web/src/BattlePresence.vue').exists():
            assert ui['bindings']['web/src/BattlePanel.vue'] == ['<BattlePresence '], 'Immersive battle consumer must follow the real actor component'
            assert '<ProgressTrack' in (root / 'web/src/BattlePresence.vue').read_text(), 'Immersive battle progress consumer missing'
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
            data = prior_uir3307_bytes(row['path'],(root / row['path']).read_bytes())
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
            data = prior_uir3302_bytes(row['path'],prior_preparation_bench_bytes(row['path'],(root / row['path']).read_bytes()))
            assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256'], 'Playable flow source identity changed'
        assert sum(r['bytes'] for r in flow['files']) <= 60000
        for ref in flow['sourceReferences']:
            assert (root / ref).resolve().is_relative_to(root) and (root / ref).is_file()
        for path, fragments in flow['bindings'].items():
            assert all(fragment in (root / path).read_text() for fragment in fragments)
    else:
        assert not (root / 'web/src/play-flow.css').exists(), 'Unrecorded playable flow'
    story_path = root / 'art/redesign/story-journey.json'
    if story_path.exists():
        story = json.loads(story_path.read_text())
        assert story['format'] == 'chenyuan-story-journey' and story['version'] == 1
        assert (story['maxNewBytes'], story['maxRowsPerPage']) == (48000, 4)
        assert story['userAcceptance'] is False
        assert [r['path'] for r in story['files']] == ['web/src/story-pages.ts', 'web/src/NarrativePanel.vue', 'web/src/FateCatalogue.vue', 'web/src/LifeCatalogue.vue', 'web/src/TrialCatalogue.vue', 'web/src/ReviewPages.vue', 'web/src/story-book.css', 'web/src/reading-memory.ts']
        for row in story['files']:
            data = prior_uir3306_bytes(row['path'],(root / row['path']).read_bytes())
            assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256'], 'Story source identity changed'
        assert sum(r['bytes'] for r in story['files']) <= 48000
        for ref in story['sourceReferences']:
            assert (root / ref).resolve().is_relative_to(root) and (root / ref).is_file()
        for path, fragments in story['bindings'].items():
            assert all(fragment in (root / path).read_text() for fragment in fragments)
    else:
        assert not (root / 'web/src/story-book.css').exists(), 'Unrecorded story journey'
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
    menu_path = root / 'art/redesign/game-menu-matrix.json'
    menu_bytes = 0
    if menu_path.exists():
        menu = json.loads(menu_path.read_text())
        assert menu['format'] == 'chenyuan-game-menu-matrix' and type(menu['version']) is int and menu['version'] == 1
        assert menu['maxNativeBytes'] == 18000 and menu['maxStylesheetBytes'] == 6000 and menu['userAcceptance'] is False
        assert [row['path'] for row in menu['files']] == ['web/src/LocalExperiencePanel.vue', 'web/src/game-menus.css']
        for row in menu['files']:
            raw = prior_ux30_bytes(row['path'], (root / row['path']).read_bytes())
            assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256'], 'Game menu source identity changed'
            menu_bytes += len(raw)
            if row['path'].endswith('.css'):
                assert len(raw) <= 6000, 'Game menu stylesheet budget exceeded'
        assert menu_bytes <= 18000, 'Game menu native budget exceeded'
        assert {'docs/decisions/0031-game-ui-matrix-intent-contract.md', 'goal-4/amendments/2026-10-24-game-studio-recheck.md'} <= set(menu['sourceReferences']), 'Game menu source contract missing'
        for ref in menu['sourceReferences']:
            assert (root / ref).resolve().is_relative_to(root) and (root / ref).is_file()
        required_menu_bindings = {'web/src/main.ts': ["import './game-menus.css'"], 'web/src/App.vue': ['class="paper settings game-settings"', 'class="settings-grid"', 'class="paper settings game-help"', 'label="帮助主题"', "'game-menus-desktop':singleScreen"], 'web/src/LocalExperiencePanel.vue': ['data-testid="local-view-overview"', 'label="最近记录"', 'validatedDownload()', 'data-testid="local-export-cancel"']}
        for path, fragments in required_menu_bindings.items():
            assert set(fragments) <= set(menu['bindings'].get(path, [])), 'Game menu required consumer omitted'
        for path, fragments in menu['bindings'].items():
            assert (root / path).resolve().is_relative_to(root) and (root / path).is_file() and fragments
            assert all(fragment in (root / path).read_text() for fragment in fragments), 'Game menu consumer missing'
    else:
        assert not (root / 'web/src/game-menus.css').exists(), 'Unrecorded game menu stylesheet'
    idle_path = root / 'art/redesign/idle-cultivation.json'
    idle_bytes = 0
    if idle_path.exists():
        idle = json.loads(idle_path.read_text())
        assert idle['format'] == 'chenyuan-idle-cultivation' and idle['version'] == 1
        assert idle['maxNativeBytes'] == 22000 and idle['userAcceptance'] is False
        assert [row['path'] for row in idle['files']] == ['web/src/activity-clock.ts', 'web/src/TrainingActivity.vue', 'web/src/TrainingPlanner.vue', 'web/src/idle-activity.css']
        for row in idle['files']:
            raw = prior_ux30_bytes(row['path'], (root / row['path']).read_bytes())
            assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256'], 'Idle UI source identity changed'
            idle_bytes += len(raw)
        assert idle_bytes <= 22000, 'Idle UI budget exceeded'
        for ref in idle['sourceReferences']:
            assert (root / ref).resolve().is_relative_to(root) and (root / ref).is_file()
        for path, fragments in idle['bindings'].items():
            assert all(fragment in (root / path).read_text() for fragment in fragments), 'Idle UI consumer missing'
    else:
        assert not (root / 'web/src/idle-activity.css').exists(), 'Unrecorded idle cultivation UI'
    source_ui_path = root / 'art/redesign/idle-sources.json'
    source_ui_bytes = 0
    if source_ui_path.exists():
        source_ui = json.loads(source_ui_path.read_text())
        assert source_ui['format'] == 'chenyuan-idle-sources' and source_ui['version'] == 1
        assert source_ui['maxNativeBytes'] == 24000 and source_ui['userAcceptance'] is False
        assert [row['path'] for row in source_ui['files']] == ['web/src/SourcePlanner.vue', 'web/src/idle-sources.css']
        for row in source_ui['files']:
            raw = prior_ux30_bytes(row['path'], (root / row['path']).read_bytes())
            assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256'], 'Source UI identity changed'
            source_ui_bytes += len(raw)
        assert source_ui_bytes <= 24000, 'Source UI budget exceeded'
        for ref in source_ui['sourceReferences']:
            assert (root / ref).resolve().is_relative_to(root) and (root / ref).is_file()
        for path, fragments in source_ui['bindings'].items():
            assert all(fragment in (root / path).read_text() for fragment in fragments), 'Source UI consumer missing'
    else:
        assert not (root / 'web/src/idle-sources.css').exists(), 'Unrecorded source UI'
    production_ui_path = root / 'art/redesign/idle-production.json'
    production_ui_bytes = 0
    if production_ui_path.exists():
        production_ui = json.loads(production_ui_path.read_text())
        assert production_ui['format'] == 'chenyuan-idle-production' and production_ui['version'] == 1
        assert production_ui['maxNativeBytes'] == 26000 and production_ui['userAcceptance'] is False
        assert [row['path'] for row in production_ui['files']] == ['web/src/ProductionPlanner.vue', 'web/src/idle-production.css', 'web/src/activity-view.ts']
        for row in production_ui['files']:
            raw = prior_ux30_bytes(row['path'], (root / row['path']).read_bytes())
            assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256'], 'Production UI identity changed'
            production_ui_bytes += len(raw)
        assert production_ui_bytes <= 26000, 'Production UI budget exceeded'
        for ref in production_ui['sourceReferences']:
            assert (root / ref).resolve().is_relative_to(root) and (root / ref).is_file()
        for path, fragments in production_ui['bindings'].items():
            assert all(fragment in (root / path).read_text() for fragment in fragments), 'Production UI consumer missing'
    else:
        assert not (root / 'web/src/idle-production.css').exists(), 'Unrecorded production UI'
    preparation_path = root / 'art/redesign/idle-preparation.json'
    preparation_bytes = 0
    if preparation_path.exists():
        preparation = json.loads(preparation_path.read_text())
        assert preparation['format'] == 'chenyuan-idle-preparation' and preparation['version'] == 1
        assert preparation['maxNativeBytes'] == 60000 and preparation['userAcceptance'] is False
        assert [r['path'] for r in preparation['files']] == ['web/src/LearningPlanner.vue', 'web/src/MarketPlanner.vue', 'web/src/RecoveryPlanner.vue', 'web/src/ConfigurationDialog.vue', 'web/src/preparation-view.ts', 'web/src/idle-preparation.css']
        total = 0
        for row in preparation['files']:
            raw = prior_ux30_bytes(row['path'], (root / row['path']).read_bytes())
            assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256'], 'Preparation UI identity changed'
            total += len(raw)
        preparation_bytes = total
        assert total <= 60000, 'Preparation UI budget exceeded'
        for ref in preparation['sourceReferences']:
            assert (root / ref).resolve().is_relative_to(root) and (root / ref).is_file()
        for path, fragments in preparation['bindings'].items():
            assert all(fragment in (root / path).read_text() for fragment in fragments), 'Preparation UI consumer missing'
    else:
        assert not (root / 'web/src/idle-preparation.css').exists(), 'Unrecorded preparation UI'
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
    from art18_inventory import validate_art18
    art18_files,art18_bytes=validate_art18(root)
    recorded.update(art18_files)
    from ux20_inventory import validate_ux20
    ux20_files,ux20_bytes=validate_ux20(root)
    recorded.update(ux20_files)
    from ux21_inventory import validate_ux21
    ux21_files,ux21_bytes=validate_ux21(root)
    recorded.update(ux21_files)
    from ux23_inventory import validate_ux23
    ux23_files,ux23_bytes=validate_ux23(root)
    recorded.update(ux23_files)
    from art24_inventory import validate_art24
    art24_files,art24_count,art24_runtime_bytes=validate_art24(root,image_info)
    recorded.update(art24_files)
    from art25_inventory import validate_art25
    art25_files,_,_=validate_art25(root)
    recorded.update(art25_files)
    from art26_inventory import validate_art26
    art26_files,art26_count,art26_runtime_bytes=validate_art26(root,image_info)
    recorded.update(art26_files)
    from art27_inventory import validate_art27
    art27_files,art27_count,art27_runtime_bytes=validate_art27(root,image_info)
    recorded.update(art27_files)
    from art28_inventory import validate_art28
    art28_files,art28_count,art28_runtime_bytes=validate_art28(root,image_info)
    recorded.update(art28_files)
    from art29_inventory import validate_art29
    art29_files,art29_count,art29_runtime_bytes=validate_art29(root,image_info)
    recorded.update(art29_files)
    from art30_inventory import validate_art30
    art30_files,art30_count,art30_runtime_bytes=validate_art30(root,image_info)
    recorded.update(art30_files)
    from art31_inventory import validate_art31
    art31_files,art31_count,art31_runtime_bytes=validate_art31(root,image_info)
    recorded.update(art31_files)
    from art32_inventory import validate_art32
    art32_files,art32_count,art32_runtime_bytes=validate_art32(root,image_info)
    recorded.update(art32_files)
    from art33_inventory import validate_art33
    art33_files,art33_count,art33_runtime_bytes=validate_art33(root,image_info)
    recorded.update(art33_files)
    from art34_inventory import validate_art34
    art34_files,art34_native_bytes=validate_art34(root)
    recorded.update(art34_files)
    from art35_inventory import validate_art35
    art35_files,art35_count,art35_runtime_bytes=validate_art35(root,image_info)
    from art36_inventory import validate_art36
    art36_files,art36_count,art36_bytes=validate_art36(root)
    recorded.update(art35_files)
    recorded.update(art36_files)
    from art37_inventory import validate_art37
    art37_files,art37_count,art37_bytes=validate_art37(root)
    recorded.update(art37_files)
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
            code = prior_uir3503_bytes(component['path'],(root / component['path']).read_bytes())
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
    adventure_path = root / 'art/redesign/idle-adventure.json'
    adventure_bytes = 0
    if adventure_path.exists():
        adventure = json.loads(adventure_path.read_text())
        assert adventure['format'] == 'chenyuan-idle-adventure' and adventure['version'] == 1
        assert adventure['maxNativeBytes'] == 45000 and adventure['userAcceptance'] is False
        assert [r['path'] for r in adventure['files']] == ['web/src/AdventurePlanner.vue', 'web/src/BattleStrategy.vue', 'web/src/AdventureHistory.vue', 'web/src/adventure-view.ts', 'web/src/idle-adventure.css']
        for row in adventure['files']:
            raw = prior_ux30_bytes(row['path'], (root / row['path']).read_bytes())
            assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256'], 'Adventure UI identity changed'
            adventure_bytes += len(raw)
        assert adventure_bytes <= 45000, 'Adventure UI budget exceeded'
        for ref in adventure['sourceReferences']:
            assert (root / ref).resolve().is_relative_to(root) and (root / ref).is_file()
        for path, fragments in adventure['bindings'].items():
            assert all(fragment in (root / path).read_text() for fragment in fragments), 'Adventure consumer missing'
    else:
        assert not (root / 'web/src/idle-adventure.css').exists(), 'Unrecorded adventure UI'
    milestone_path = root / 'art/redesign/idle-milestones.json'
    milestone_bytes = 0
    if milestone_path.exists():
        milestone = json.loads(milestone_path.read_text())
        assert milestone['format'] == 'chenyuan-idle-milestones' and milestone['version'] == 1
        assert milestone['maxNativeBytes'] == 30000 and milestone['userAcceptance'] is False
        assert [r['path'] for r in milestone['files']] == ['web/src/MilestoneReview.vue', 'web/src/milestone-view.ts', 'web/src/idle-milestones.css']
        for row in milestone['files']:
            raw = prior_ux30_bytes(row['path'], prior_uir3402_bytes(row['path'], (root / row['path']).read_bytes()))
            assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256'], 'Milestone UI identity changed'
            milestone_bytes += len(raw)
        assert milestone_bytes <= 30000, 'Milestone UI budget exceeded'
        for ref in milestone['sourceReferences']:
            assert (root / ref).resolve().is_relative_to(root) and (root / ref).is_file()
        for path, fragments in milestone['bindings'].items():
            assert all(fragment in (root / path).read_text() for fragment in fragments), 'Milestone UI consumer missing'
    else:
        assert not (root / 'web/src/idle-milestones.css').exists(), 'Unrecorded milestone UI'
    stage_path = root / 'art/redesign/stage-r1.json'
    stage_bytes = 0
    if stage_path.exists():
        stage = json.loads(stage_path.read_text())
        assert stage['format'] == 'chenyuan-stage-r1' and stage['version'] == 1
        assert stage['maxNativeBytes'] == 18000 and stage['userAcceptance'] is False
        assert [r['path'] for r in stage['files']] == ['web/src/GameHud.vue', 'web/src/stage-r1.css']
        for row in stage['files']:
            data = (root / row['path']).read_bytes()
            assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256'], 'Stage R1 identity changed'
            stage_bytes += len(data)
        assert stage_bytes <= 18000, 'Stage R1 budget exceeded'
        for ref in stage['sourceReferences']:
            assert (root / ref).resolve().is_relative_to(root) and (root / ref).is_file()
        for path, fragments in stage['bindings'].items():
            assert all(fragment in (root / path).read_text() for fragment in fragments), 'Stage R1 consumer missing'
    else:
        assert not (root / 'web/src/GameHud.vue').exists() and not (root / 'web/src/stage-r1.css').exists(), 'Unrecorded stage R1 UI'
    r2_path = root / 'art/redesign/stage-r2.json'
    r2_bytes = 0
    if r2_path.exists():
        r2 = json.loads(r2_path.read_text())
        assert r2['format'] == 'chenyuan-stage-r2' and r2['version'] == 1
        assert r2['maxNativeBytes'] == 14000 and r2['userAcceptance'] is False
        assert [r['path'] for r in r2['files']] == ['web/src/stage-r2.css']
        for row in r2['files']:
            data = (root / row['path']).read_bytes()
            assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256'], 'Stage R2 identity changed'
            r2_bytes += len(data)
        assert r2_bytes <= 14000, 'Stage R2 budget exceeded'
        for ref in r2['sourceReferences']:
            assert (root / ref).resolve().is_relative_to(root) and (root / ref).is_file()
        for path, fragments in r2['bindings'].items():
            assert all(fragment in (root / path).read_text() for fragment in fragments), 'Stage R2 consumer missing'
    else:
        assert not (root / 'web/src/stage-r2.css').exists(), 'Unrecorded stage R2 UI'
    r3_path = root / 'art/redesign/stage-r3.json'
    r3_bytes = 0
    if r3_path.exists():
        r3 = json.loads(r3_path.read_text())
        assert r3['format'] == 'chenyuan-stage-r3' and r3['version'] == 1
        assert r3['maxNativeBytes'] == 18000 and r3['userAcceptance'] is False
        assert [r['path'] for r in r3['files']] == ['web/src/stage-r3.css']
        for row in r3['files']:
            data = (root / row['path']).read_bytes()
            assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256'], 'Stage R3 identity changed'
            r3_bytes += len(data)
        assert r3_bytes <= 18000, 'Stage R3 budget exceeded'
        for ref in r3['sourceReferences']:
            assert (root / ref).resolve().is_relative_to(root) and (root / ref).is_file()
        for path, fragments in r3['bindings'].items():
            assert all(fragment in (root / path).read_text() for fragment in fragments), 'Stage R3 consumer missing'
    else:
        assert not (root / 'web/src/stage-r3.css').exists(), 'Unrecorded stage R2 UI'
    r4_path = root / 'art/redesign/stage-r4.json'
    r4_bytes = 0
    if r4_path.exists():
        r4 = json.loads(r4_path.read_text())
        assert r4['format'] == 'chenyuan-stage-r4' and r4['version'] == 1
        assert r4['maxNativeBytes'] == 14000 and r4['userAcceptance'] is False
        assert [r['path'] for r in r4['files']] == ['web/src/stage-r4.css', 'web/src/journal-anchors.ts', 'web/src/navigation.ts']
        for row in r4['files']:
            data = (root / row['path']).read_bytes()
            assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256'], 'Stage R4 identity changed'
            r4_bytes += len(data)
        assert r4_bytes <= 14000, 'Stage R4 budget exceeded'
        for ref in r4['sourceReferences']:
            assert (root / ref).resolve().is_relative_to(root) and (root / ref).is_file()
        for path, fragments in r4['bindings'].items():
            assert all(fragment in (root / path).read_text() for fragment in fragments), 'Stage R4 consumer missing'
    else:
        assert not (root / 'web/src/stage-r4.css').exists(), 'Unrecorded stage R4 UI'
    tradeoff_path = root / 'art/redesign/idle-tradeoffs.json'
    tradeoff_bytes = 0
    if tradeoff_path.exists():
        tradeoff = json.loads(tradeoff_path.read_text())
        assert tradeoff['format'] == 'chenyuan-idle-tradeoffs' and tradeoff['version'] == 1
        assert tradeoff['maxNativeBytes'] == 30000 and tradeoff['userAcceptance'] is False
        assert [r['path'] for r in tradeoff['files']] == ['src/full/progression.ts', 'web/src/ProgressionChoices.vue', 'web/src/ConfigurationOutlook.vue', 'web/src/idle-tradeoffs.css']
        for row in tradeoff['files']:
            data = (root / row['path']).read_bytes()
            assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256'], 'Idle tradeoff identity changed'
            tradeoff_bytes += len(data)
        assert tradeoff_bytes <= 30000, 'Idle tradeoff budget exceeded'
        for ref in tradeoff['sourceReferences']:
            assert (root / ref).resolve().is_relative_to(root) and (root / ref).is_file()
        for path, fragments in tradeoff['bindings'].items():
            assert all(fragment in (root / path).read_text() for fragment in fragments), 'Idle tradeoff consumer missing'
    else:
        assert not (root / 'web/src/idle-tradeoffs.css').exists(), 'Unrecorded idle tradeoff UI'
    loading_path = root / 'art/redesign/local-loading.json'
    loading_bytes = 0
    if loading_path.exists():
        loading = json.loads(loading_path.read_text())
        assert loading['format'] == 'chenyuan-local-loading' and loading['version'] == 1
        assert loading['maxNativeBytes'] == 6000 and loading['userAcceptance'] is False
        assert [r['path'] for r in loading['files']] == ['web/src/local-initialization.ts', 'web/src/local-loading.css']
        for row in loading['files']:
            data = (root / row['path']).read_bytes()
            assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256'], 'Local loading identity changed'
            loading_bytes += len(data)
        assert loading_bytes <= 6000, 'Local loading budget exceeded'
        for ref in loading['sourceReferences']:
            assert (root / ref).resolve().is_relative_to(root) and (root / ref).is_file()
        for path, fragments in loading['bindings'].items():
            assert all(fragment in (root / path).read_text() for fragment in fragments), 'Local loading consumer missing'
    else:
        assert not (root / 'web/src/local-loading.css').exists() and not (root / 'web/src/local-initialization.ts').exists(), 'Unrecorded local loading code'
    history_path = root / 'art/redesign/activity-history.json'
    history_bytes = 0
    if history_path.exists():
        history_ui = json.loads(history_path.read_text())
        assert history_ui['format'] == 'chenyuan-activity-history' and history_ui['version'] == 1
        assert history_ui['maxNativeBytes'] == 9000 and history_ui['userAcceptance'] is False
        assert [row['path'] for row in history_ui['files']] == ['web/src/ActivityHistory.vue']
        for row in history_ui['files']:
            data = (root / row['path']).read_bytes()
            assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256'], 'Activity history identity changed'
            history_bytes += len(data)
        assert history_bytes <= 9000, 'Activity history budget exceeded'
        for ref in history_ui['sourceReferences']:
            assert (root / ref).resolve().is_relative_to(root) and (root / ref).is_file()
        for path, fragments in history_ui['bindings'].items():
            assert all(fragment in (root / path).read_text() for fragment in fragments), 'Activity history consumer missing'
    else:
        assert not (root / 'web/src/ActivityHistory.vue').exists(), 'Unrecorded activity history'
    from art17_inventory import validate_art17
    art17_files,art17_bytes=validate_art17(root)
    recorded.update(art17_files)
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
    recorded.update(check340204_files)
    recorded.update(power_files)
    recorded.update(source_intent_files)
    recorded.update(relic_focus_files)
    recorded.update(threecheck_files)
    recorded.update(travelpaint_files)
    recorded.update(bench_files)
    recorded.update(forecast_files)
    recorded.update(f02b_files)
    recorded.update(f02a_files)
    recorded.update(checkui35source_files)
    recorded.update(uir3504_files)
    recorded.update(uir3503_files)
    recorded.update(checkui35_files)
    recorded.update(uir3502_files)
    recorded.update(uir3404_files)
    recorded.update(uir3403_files)
    recorded.update(uir3402_files)
    recorded.update(uir3407_files)
    recorded.update(uir3406_files)
    recorded.update(uir3405_files)
    recorded.update(uir3401_files)
    recorded.update(uir3308_files)
    recorded.update(checkuir02_files)
    recorded.update(uir3307_files)
    recorded.update(uir3306_files)
    recorded.update(uir3305_files)
    recorded.update(checkuir_files)
    recorded.update(uir3304_files)
    recorded.update(uir3302_files)
    recorded.update(uir3301_files)
    recorded.update(check95_files)
    recorded.update(ux33_files)
    recorded.update(ux32_files)
    recorded.update(ux31_files)
    recorded.update(ux30_files)
    return {'sourceIntentDeltaBytes':source_intent_delta,'relicFocusDeltaBytes':relic_focus_delta,'threeCheckDeltaBytes':threecheck_delta,'paintedTravelNativeBytes':travelpaint_bytes,'preparationBenchNativeBytes':bench_bytes,'powerFocusDeltaBytes':power_delta,'forecastContextDeltaBytes':forecast_delta,'checkUi35FeedbackBytes':checkui35_bytes,'uir3502AddedNativeBytes':uir3502_bytes,'uir3407StoryBytes':uir3407_bytes,'uir3406AddedNativeBytes':uir3406_bytes,'uir3405CssBytes':uir3405_bytes,'check340204MilestoneBytes':check340204_bytes,'uir3404NativeBytes':uir3404_bytes,'uir3403GroupBytes':uir3403_bytes,'uir3402NativeBytes':uir3402_bytes,'uir3401AddedNativeBytes':uir3401_bytes,'uir3308NativeBytes':uir3308_bytes,'checkuir02ActualBytes':checkuir02_bytes,'uir3307ProjectionBytes':uir3307_bytes,'uir3306NativeDeltaBytes':uir3306_bytes,'uir3305AddedNativeBytes':uir3305_bytes,'checkUirActualBytes':checkuir_bytes,'uir3304AddedNativeBytes':uir3304_bytes,'uir3302AddedNativeBytes':uir3302_bytes,'uir3301AddedNativeBytes':uir3301_bytes,'checkUx3133ActualSourceBytes':check95_bytes,'ux33ActualSourceBytes':ux33_bytes,'ux32ActualSourceBytes':ux32_bytes,'ux31ActualSourceBytes':ux31_bytes,'ux31ActualGroupBytes':{n:sum((root/p).stat().st_size for p in g['files'])for n,g in UX31_GROUPS.items()},'ux30SourceBytes':ux30_bytes,'ux30ActualGroupBytes':{n:sum((root/r['path']).stat().st_size for r in json.loads((root/('art/redesign/'+n+'.json')).read_text())['files'])for n in ['cultivation-objects','idle-cultivation','idle-production','alchemy-workshop','idle-preparation']},'format': manifest['format'], 'verifiedFiles': len(recorded), 'legacyVerifiedFiles':legacy_files, 'legacyProductionAssets':legacy_production, 'redesignVerifiedFiles':len(redesign_files), 'redesignProductionAssets':redesign_production, 'characterBattleVerifiedFiles':len(character_battle_files), 'characterBattleProductionAssets':character_battle_production, 'desktopUIVerifiedFiles':len(desktop_ui_files), 'desktopUIProductionAssets':desktop_ui_production, 'statuses': counts, 'productionAssets': counts.get('production', 0) + counts.get('reviewed', 0)+art24_count+art26_count+art27_count+art28_count+art29_count+art30_count+art31_count+art32_count+art33_count+art35_count+art37_count, 'singleScreenNativeBytes':native_bytes, 'gameMenuNativeBytes':menu_bytes, 'feedbackSkipNativeBytes':feedback_skip_bytes, 'idleNativeBytes':idle_bytes, 'sourceNativeBytes':source_ui_bytes, 'productionNativeBytes':production_ui_bytes, 'preparationNativeBytes':preparation_bytes, 'adventureNativeBytes':adventure_bytes, 'stageR1NativeBytes':stage_bytes, 'stageR2NativeBytes':r2_bytes, 'stageR3NativeBytes':r3_bytes, 'stageR4NativeBytes':r4_bytes, 'idleTradeoffNativeBytes':tradeoff_bytes, 'localLoadingNativeBytes':loading_bytes, 'activityHistoryNativeBytes':history_bytes, 'alchemyWorkshopNativeBytes':workshop_bytes, 'adventureObjectNativeBytes':adventure_object_bytes, 'equipmentObjectNativeBytes':equipment_bytes, 'supplyObjectNativeBytes':supply_bytes, 'narrativeObjectNativeBytes':narrative_object_bytes, 'cultivationObjectNativeBytes':cultivation_bytes, 'ta07NativeBytes':ta07_bytes, 'ta08NativeBytes':ta08_bytes, 'ta09NativeBytes':ta09_bytes, 'art10NativeBytes':art10_bytes, 'art11NativeBytes':art11_bytes, 'art12NativeBytes':art12_bytes, 'art15NativeBytes':art15_bytes, 'art16NativeBytes':art16_bytes,'art17NativeBytes':art17_bytes,'art18NativeBytes':art18_bytes,'ux20NativeBytes':ux20_bytes,'ux21NativeBytes':ux21_bytes,'ux23NativeBytes':ux23_bytes,'art24RuntimeBytes':art24_runtime_bytes,'art26RuntimeBytes':art26_runtime_bytes,'art27RuntimeBytes':art27_runtime_bytes,'art28RuntimeBytes':art28_runtime_bytes,'art29RuntimeBytes':art29_runtime_bytes,'art30RuntimeBytes':art30_runtime_bytes,'art31RuntimeBytes':art31_runtime_bytes,'art32RuntimeBytes':art32_runtime_bytes,'art33RuntimeBytes':art33_runtime_bytes,'art34NativeBytes':art34_native_bytes,'art35RuntimeBytes':art35_runtime_bytes,'art37NativeBytes':art37_bytes,'art37RuntimeBytes':sum(r['bytes']for r in json.loads((root/'art/redesign/art37.json').read_text())['runtimeAssets'])if(root/'art/redesign/art37.json').exists()else 0, 'scope': 'Hashes and image headers/status/evidence references; not full decode, legal grant, production completion or user visual acceptance.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[2])
    args = parser.parse_args()
    print(json.dumps(validate(args.root), ensure_ascii=False))
