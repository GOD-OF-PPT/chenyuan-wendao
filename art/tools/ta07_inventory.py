"""TA07 identities, bounded assets and real consumers; not visual/human acceptance.

Image headers and hash-bound decode/export facts are checked here. The recorded
Pillow decode/re-export is performed separately; this guard adds no decoder
dependency and does not claim to decode the images again.
"""
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import PurePosixPath

NATIVE = [
    'web/src/BattleCommandConsole.vue', 'web/src/BattleCast.vue',
    'web/src/battle-choreography.ts', 'web/src/ta07-commands.css',
    'web/src/ta07-cast.css',
]
COMMAND_FILES = [NATIVE[0], NATIVE[3]]
CAST_FILES = [NATIVE[1], NATIVE[2], NATIVE[4]]
LEDGER = 'art/redesign/ta07.json'
SOURCE = 'art/redesign/characters/player-standing-cold-v1.png'
RUNTIME = 'web/public/art/v2/actors/player-standing-cold-v1.webp'
RECEIPT = 'art/redesign/receipts/player-standing-cold-v1.json'
PROMPT = 'art/redesign/receipts/ta07-standing-prompt.json'
REFERENCE = 'art/redesign/characters/player-v1.png'
REFS = [
    'docs/decisions/0033-battle-actors-ta07-contract.md',
    'goal-4/amendments/2026-10-24-ta07.md',
    'goal-4/research/ta07-design-sources.json', PROMPT,
]
BUDGETS = dict(nativeBytes=36000, commandBytes=12000, castBytes=24000,
               newAssets=1, runtimeWidth=512, runtimeHeight=512,
               maxRuntimeBytes=160000)
ENCODING = ['cwebp', '-q', '82', '-m', '6', '-alpha_q', '100',
            '-resize', '512', '0', '-metadata', 'none']
BINDINGS = {
    'web/src/BattleDeck.vue': ['import BattleCommandConsole', '<BattleCommandConsole'],
    'web/src/BattlePresence.vue': ['BATTLE_PLAYER_ASSET', 'useBattlePreparation',
                ':data-run="game.core.runId"', ':data-enemy="battle.enemy"',
                ':data-stage="game.trial?.stage??\'ordinary\'"',
                ':data-revision="game.core.revision"', 'data-testid="battle-preparation"'],
    'web/src/ActionFeedbackStage.vue': ['import BattleCast', '<BattleCast', 'useBattleWitness',
                'witness.capture(value);observation.value=value;', 'witness.forNotice(next)',
                'battleSpot(cast)', 'castActors(next,cast,mark)', 'clearBattlePose(element)'],
    'web/src/assets.ts': ["BATTLE_PLAYER_ASSET='art/v2/actors/player-standing-cold-v1.webp'"],
    NATIVE[0]: ["import './ta07-commands.css'", 'data-testid="battle-command-console"',
                'data-testid="battle-strike-slots"', 'data-testid="battle-medicine-kit"',
                'data-testid="battle-retreat-lane"', "['attack','guard','technique','release']",
                "heal:'healing_pill',restore:'spirit_pill'", "emit('move',move)",
                "emit('move','flee')", '{{cost(move)}} · 3 秒 / 回合', '{{retreatEffect}}'],
    NATIVE[1]: ["import './ta07-cast.css'", "from './battle-choreography'",
                'castForNotice(props.notice)', 'data-testid="battle-cast"',
                ':data-receipt="notice.key"', ':data-move="cast.move"'],
    NATIVE[2]: ['useBattlePreparation', 'createBattleWitness', 'useBattleWitness', 'castForNotice',
                'createActivityEffectTracker(matching)', 'useActivityPresentation',
                "const matching=(a:Activity)=>a.version===6&&a.plan.kind!=='travel';", "a.nextCommand?.type!=='BATTLE'",
                'r.id!==a.id', 'r.generation!==a.generation',
                'tracker.consume(o,g,a,result,replayed,eligible)',
                "notice.key!==JSON.stringify([prior.runId,prior.commandId])",
                's.activity?.ownerId', 'document.hidden', 'clearBattlePose'],
    'web/src/activity-effects.ts': ['a.version&&[2,3,6,extra].includes(a.version)',
                'resolve(before,command)', 'completeActivity(g,prior,r,',
                'proof(resolved.nextState)!==proof(g)', 'proof(expected)!==proof(a)'],
}
DEPENDENCIES = list(BINDINGS) + [REFERENCE, RECEIPT, SOURCE, RUNTIME]


def validate_ta07(root, image_reader):
    root = root.resolve()
    ledger = root / LEDGER
    if not ledger.exists():
        assert not any((root / path).exists() for path in NATIVE + [SOURCE, RUNTIME]), 'Unrecorded TA07 source or raster'
        return set(), 0, 0

    def local(path):
        assert type(path) is str and path and '\\' not in path and not PurePosixPath(path).is_absolute() and '..' not in PurePosixPath(path).parts, 'Invalid TA07 relative path'
        file = (root / path).resolve()
        assert file.is_relative_to(root) and file.is_file(), 'Missing or external TA07 file'
        return file

    def digest(value):
        return type(value) is str and re.fullmatch('[0-9a-f]{64}', value)

    assert ledger.resolve().is_relative_to(root) and ledger.is_file(), 'TA07 ledger escapes repository'
    manifest = json.loads(ledger.read_text())
    assert type(manifest) is dict and set(manifest) == {'format', 'version', 'task', 'budgets', 'files', 'assets', 'sourceReferences', 'bindings', 'userAcceptance'}, 'TA07 ledger shape changed'
    assert manifest['format'] == 'chenyuan-battle-choreography' and type(manifest['version']) is int and manifest['version'] == 1 and manifest['task'] == 'Goal4 TA07', 'TA07 header changed'
    assert type(manifest['budgets']) is dict and manifest['budgets'] == BUDGETS and all(type(v) is int for v in manifest['budgets'].values()), 'TA07 fixed budgets changed'
    assert manifest['userAcceptance'] is False, 'TA07 checks cannot claim human acceptance'
    assert manifest['sourceReferences'] == REFS and manifest['bindings'] == BINDINGS, 'TA07 source or consumer contract changed'
    for reference in REFS:
        local(reference)
    assert type(manifest['files']) is list and all(type(row) is dict and set(row) == {'path', 'bytes', 'sha256'} for row in manifest['files']), 'TA07 source identity shape changed'
    assert [row['path'] for row in manifest['files']] == NATIVE, 'TA07 five-source inventory changed'
    sizes = {}
    for row in manifest['files']:
        data = local(row['path']).read_bytes()
        assert type(row['bytes']) is int and row['bytes'] == len(data), 'TA07 source bytes changed'
        assert digest(row['sha256']) and row['sha256'] == hashlib.sha256(data).hexdigest(), 'TA07 source hash changed'
        sizes[row['path']] = len(data)
    total = sum(sizes.values())
    assert sum(sizes[path] for path in COMMAND_FILES) <= 12000, 'TA07 command group exceeds fixed budget'
    assert sum(sizes[path] for path in CAST_FILES) <= 24000, 'TA07 cast group exceeds fixed budget'
    assert total <= 36000, 'TA07 total exceeds fixed budget'
    for path, fragments in BINDINGS.items():
        text = local(path).read_text()
        assert all(fragment in text for fragment in fragments), 'Missing TA07 consumer: ' + path

    # Imports alone or commented-out tags cannot stand in for actual consumers.
    def source_text(path):
        text = re.sub(r'<!--.*?-->', '', local(path).read_text(), flags=re.S)
        return re.sub(r'/\*.*?\*/', '', text, flags=re.S)

    class TemplateTags(HTMLParser):
        def __init__(self, text):
            super().__init__(); self.stack = []; self.nodes = []
            template = re.search(r'<template>(.*)</template>', text, re.S)
            assert template, 'TA07 consumer has no real template'
            self.feed(template[1])
        def handle_starttag(self, tag, attrs):
            attributes = dict(attrs); self.nodes.append((tag, attributes, self.stack.copy()))
            if tag not in {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}:
                self.stack.append((tag, attributes))
        def handle_startendtag(self, tag, attrs):
            self.nodes.append((tag, dict(attrs), self.stack.copy()))
        def handle_endtag(self, tag):
            for index in range(len(self.stack)-1, -1, -1):
                if self.stack[index][0] == tag:
                    del self.stack[index:]; break

    for path, name in [('web/src/BattleDeck.vue', 'BattleCommandConsole'), ('web/src/ActionFeedbackStage.vue', 'BattleCast')]:
        text = source_text(path)
        assert re.search(r'(?m)^\s*import\s+' + name + r'\s+from\s+[\'\"]\./' + name + r'\.vue[\'\"]', text), 'TA07 component import is detached: ' + name
        nodes = [(attributes, ancestors) for tag, attributes, ancestors in TemplateTags(text).nodes if tag == name.lower()]
        assert nodes, 'TA07 component is not rendered: ' + name
        if name == 'BattleCast':
            assert any(':notice' in attributes and any('action-motion' in (parent.get('class') or '').split() and parent.get('v-if') == 'notice&&showMotion' for _, parent in ancestors) for attributes, ancestors in nodes), 'TA07 cast lost the original trusted motion container/notice'
    presence = source_text('web/src/BattlePresence.vue')
    assert any(tag == 'assetimage' and attrs.get(':path') == 'BATTLE_PLAYER_ASSET' and any('battle-player-art' in (parent.get('class') or '').split() for _, parent in ancestors) for tag, attrs, ancestors in TemplateTags(presence).nodes), 'TA07 cold actor is not the actual image consumer'
    assert re.search(r'BATTLE_PLAYER_ASSET\s*=\s*[\'\"]art/v2/actors/player-standing-cold-v1\.webp[\'\"]', source_text('web/src/assets.ts')), 'TA07 actor constant changed'

    assert type(manifest['assets']) is list and len(manifest['assets']) == 1, 'TA07 has exactly one new raster'
    asset = manifest['assets'][0]
    assert type(asset) is dict and set(asset) == {'id', 'source', 'runtime', 'receipt'} and asset['id'] == 'player-standing-cold-v1', 'TA07 asset identity changed'
    for key, path, fmt in [('source', SOURCE, 'png'), ('runtime', RUNTIME, 'webp')]:
        row = asset[key]
        assert type(row) is dict and set(row) == {'path', 'bytes', 'sha256', 'dimensions', 'alpha', 'format'} and row['path'] == path, 'TA07 image identity shape/path changed'
        data = local(path).read_bytes()
        assert type(row['bytes']) is int and row['bytes'] == len(data) and digest(row['sha256']) and row['sha256'] == hashlib.sha256(data).hexdigest(), 'TA07 image bytes/hash changed'
        dimensions, alpha, actual_format = image_reader(data, local(path).suffix)
        assert type(row['dimensions']) is dict and set(row['dimensions']) == {'width', 'height'} and all(type(v) is int for v in row['dimensions'].values()), 'TA07 image dimension types changed'
        assert row['dimensions'] == dimensions and type(row['alpha']) is bool and row['alpha'] is alpha is True and row['format'] == actual_format == fmt, 'TA07 image header/alpha changed'
    assert asset['runtime']['dimensions'] == dict(width=512, height=512) and asset['runtime']['bytes'] <= 160000, 'TA07 runtime dimensions/bytes exceeded'
    assert all(512 <= n <= 8192 for n in asset['source']['dimensions'].values()), 'TA07 source dimensions invalid'
    reference = asset['receipt']
    assert type(reference) is dict and set(reference) == {'path', 'sha256'} and reference['path'] == RECEIPT, 'TA07 receipt reference changed'
    raw = local(RECEIPT).read_bytes()
    assert digest(reference['sha256']) and reference['sha256'] == hashlib.sha256(raw).hexdigest(), 'TA07 receipt hash changed'
    receipt = json.loads(raw)
    prompt = json.loads(local(PROMPT).read_text())
    assert receipt['id'] == asset['id'] and receipt['tool'] == 'built-in image_gen' and receipt['copiedUnchanged'] is True and receipt['userAcceptance'] is False, 'TA07 provenance/acceptance changed'
    assert receipt['source'] == asset['source'] and receipt['runtime'] == asset['runtime'] and receipt['savedPath'] == SOURCE and receipt['sourceSHA256'] == asset['source']['sha256'], 'TA07 receipt image facts changed'
    assert type(prompt) is dict and set(prompt) == {'tool', 'intent', 'transparent_background', 'referenceImage', 'prompt', 'userAcceptance'}, 'TA07 exact tool input shape changed'
    assert receipt['promptReference'] == PROMPT and prompt['intent'] == 'identity-preserve' and prompt['tool'] == 'built-in image_gen' and prompt['transparent_background'] is True and prompt['userAcceptance'] is False and type(prompt['prompt']) is str and prompt['prompt'].strip(), 'TA07 exact prompt missing'
    assert receipt['promptSHA256'] == hashlib.sha256(prompt['prompt'].encode()).hexdigest() and type(receipt['sourcePath']) is str and receipt['sourcePath'].strip() and receipt['sourcePath'].endswith('.png'), 'TA07 prompt/original identity changed'
    assert receipt.get('promptDocumentSHA256') == hashlib.sha256(local(PROMPT).read_bytes()).hexdigest(), 'TA07 prompt document identity changed'
    assert prompt['referenceImage'] == REFERENCE, 'TA07 prompt identity reference changed'
    assert type(receipt['referenceImages']) is list and len(receipt['referenceImages']) == 1 and receipt['referenceImages'][0]['path'] == REFERENCE and receipt['referenceImages'][0]['sha256'] == hashlib.sha256(local(REFERENCE).read_bytes()).hexdigest(), 'TA07 reference image hash changed'
    assert receipt['encoding'] == ENCODING and type(receipt['encoderVersion']) is str and receipt['encoderVersion'].strip(), 'TA07 export settings changed'
    decode = receipt['decodeProof']
    assert type(decode) is dict and set(decode) == {'decoder', 'sourceRGBASHA256', 'runtimeRGBASHA256', 'alphaDefinitions'} and decode['decoder'] == 'Pillow' and all(digest(decode[key]) for key in ['sourceRGBASHA256', 'runtimeRGBASHA256']), 'TA07 real RGBA decode evidence absent'
    assert decode['alphaDefinitions'] == dict(transparentPixels='alpha=0', solidPixels='alpha>=250', intermediatePixels='1<=alpha<250'), 'TA07 alpha definitions changed'
    for key, bbox_key, image in [('alphaProof', 'sourceAlphaBBox', asset['source']), ('runtimeAlphaProof', 'runtimeAlphaBBox', asset['runtime'])]:
        facts = receipt[key]
        assert type(facts) is dict and set(facts) == {'transparentPixels', 'solidPixels', 'intermediatePixels', 'min', 'max'} and all(type(v) is int for v in facts.values()), 'TA07 alpha fact types changed'
        assert facts['transparentPixels'] > 10000 and facts['solidPixels'] > 10000 and facts['intermediatePixels'] >= 0 and facts['min'] == 0 and 250 <= facts['max'] <= 255, 'TA07 alpha evidence describes an opaque or empty image'
        width, height = image['dimensions']['width'], image['dimensions']['height']
        assert sum(facts[field] for field in ['transparentPixels', 'solidPixels', 'intermediatePixels']) == width * height, 'TA07 alpha counts do not cover image dimensions'
        bbox = receipt[bbox_key]
        assert type(bbox) is list and len(bbox) == 4 and all(type(n) is int for n in bbox), 'TA07 alpha bbox types changed'
        left, top, right, bottom = bbox
        assert 0 <= left < right <= width and 0 <= top < bottom <= height and facts['solidPixels'] + facts['intermediatePixels'] <= (right-left)*(bottom-top), 'TA07 alpha bbox does not contain nontransparent pixels'
    review = receipt['review']
    assert type(review) is dict and review.get('actuallyViewed') is True and type(review.get('scope')) is str and review['scope'].strip(), 'TA07 source review absent'
    export = receipt['exportProof']
    assert type(export) is dict and export == dict(sourceUnchanged=True, runtimeUnchanged=True, reencodedBytes=asset['runtime']['bytes'], reencodedSHA256=asset['runtime']['sha256'], encoderVersion=receipt['encoderVersion']) and type(export['reencodedBytes']) is int and export['sourceUnchanged'] is True and export['runtimeUnchanged'] is True, 'TA07 deterministic export proof changed'
    return {SOURCE, RUNTIME}, 1, total
