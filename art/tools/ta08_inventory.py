from ux33_inventory import prior_ux33_bytes
"""TA08 source objects and six paintings: identities/budgets/consumer facts only.

The parent export process performs actual Pillow decode and cwebp re-export.
This guard verifies hash-bound headers and recorded facts without a new decoder
dependency; it does not replace gameplay, pixel review or human acceptance.
"""
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import PurePosixPath
from ta07_inventory import ENCODING

NATIVE = ['web/src/SourceObject.vue', 'web/src/SourceCommission.vue',
          'web/src/SourceSatchel.vue', 'web/src/source-choreography.ts',
          'web/src/ta08-source.css']
SOURCE_IDS = ['herbs', 'dew', 'jade', 'lotus', 'soul', 'dao']
COMMISSION_IDS = ['work', 'core', 'jade_task', 'work_foundation', 'lotus_task',
                  'work_golden', 'soul_task', 'work_nascent', 'dao_task', 'work_spirit']
LEDGER = 'art/redesign/ta08.json'
PROMPTS = 'art/redesign/receipts/ta08-resource-prompts.json'
PROMPT_REFS = [PROMPTS]
REFS = ['docs/decisions/0034-source-objects-ta08-contract.md',
        'goal-4/amendments/2026-10-24-ta08.md',
        'goal-4/research/ta08-design-sources.json']
SCOPE = 'Presentation only; no Game, rules, timing, DB or automatic authority changes; not human acceptance.'
BUDGETS = dict(nativeBytes=42000, newAssets=6, runtimeWidth=512,
               runtimeHeight=512, maxRuntimeBytes=160000, maxTotalRuntimeBytes=960000)
SOURCES = {key: f'art/redesign/ta08-resources/{key}-cold-v1.png' for key in SOURCE_IDS}
RUNTIMES = {key: f'web/public/art/v2/sources/{key}-cold-v1.webp' for key in SOURCE_IDS}
RECEIPTS = {key: f'art/redesign/receipts/ta08-{key}-cold-v1.json' for key in SOURCE_IDS}
ART_PATHS = {key: f'art/v2/sources/{key}-cold-v1.webp' for key in SOURCE_IDS}
BINDINGS = {
    'web/src/SourceField.vue': ['import SourceObject', '<SourceObject',
        'import SourceCommission', '<SourceCommission', 'import SourceSatchel', '<SourceSatchel',
        'useActivityPresentation(a=>a.version===2&&a.plan.sourceId===props.plan.sourceId'],
    'web/src/SourcePlanner.vue': ['<SourceField', 'source-plan-open', 'source-start',
        '@arrange="settings?.showModal()"'],
    NATIVE[0]: ['SOURCE_ART[sourceId]', 'projectSourceWork(props.state,props.progress)',
        'data-testid="source-physical-object"', "emit('arrange')"],
    NATIVE[1]: ['COMMISSION_OBJECTS[props.sourceId as keyof typeof COMMISSION_OBJECTS]',
        'projectSourceWork(props.state,props.progress)',
        'data-testid="source-commission-object"', "emit('arrange')"],
    NATIVE[2]: ['sourceHoldings(props.game,props.sourceId)',
        'sourcePeriodTotals(props.game,props.sourceId,props.activity)',
        'savedSourceYield(props.game,props.sourceId,props.activity,props.result)',
        'props.sequence>0?', 'data-testid="source-satchel"'],
    NATIVE[3]: ['export const SOURCE_ART', 'export const COMMISSION_OBJECTS',
        "quantity:item==='stones'?game.core.player.stones:game.core.inventory[item]",
        'if(activity?.version!==2||activity.runId!==game.core.runId||activity.plan.sourceId!==id)return null;',
        "result.type!=='SOURCE'||result.executedSteps!==1||result.requestedSteps!==1",
        'result.runId!==game.core.runId||result.revisionAfter!==game.core.revision',
        'activity.runId!==game.core.runId||activity.gameRevision!==result.revisionAfter',
        'result.commandId!==`cycle:${activity.id}:${activity.generation}:${activity.completedCycles}`',
        'Object.entries(result.delta.inventory)',
        "if(result.delta.stones>0)items.push({id:'stones',name:'灵石',quantity:result.delta.stones});",
        'Number.isFinite(value)', "working=state==='working'"] + list(ART_PATHS.values()),
    'web/src/use-activity-effect.ts': ['createActivityEffectTracker(matches,extra)',
        '!store?.activityPausing', 'activity.value?.ownerId',
        'timer=setTimeout(()=>effect.value=null,1400)'],
    'web/src/activity-effects.ts': ['a.version&&[2,3,6,extra].includes(a.version)',
        'resolve(before,command)', 'completeActivity(g,prior,r,',
        'proof(resolved.nextState)!==proof(g)', 'proof(expected)!==proof(a)'],
}
DEPENDENCIES = list(BINDINGS) + list(SOURCES.values()) + list(RUNTIMES.values()) + list(RECEIPTS.values())


def validate_ta08(root, image_reader):
    root = root.resolve()
    ledger = root / LEDGER
    if not ledger.exists():
        assert not any((root / p).exists() for p in NATIVE + list(SOURCES.values()) + list(RUNTIMES.values())), 'Unrecorded TA08 source or painting'
        return set(), 0, 0

    def local(name):
        assert type(name) is str and name and '\\' not in name and not PurePosixPath(name).is_absolute() and '..' not in PurePosixPath(name).parts, 'Invalid TA08 relative path'
        path = (root / name).resolve()
        assert path.is_relative_to(root) and path.is_file(), 'Missing or external TA08 file'
        return path

    def digest(value):
        return type(value) is str and re.fullmatch('[0-9a-f]{64}', value)

    def clean(name):
        return re.sub(r'/\*.*?\*/|<!--.*?-->', '', local(name).read_text(), flags=re.S)

    assert ledger.resolve().is_relative_to(root) and ledger.is_file(), 'TA08 ledger escapes repository'
    m = json.loads(ledger.read_text())
    assert type(m) is dict and set(m) == {'format', 'version', 'task', 'scope', 'budgets', 'files', 'assets', 'promptReferences', 'sourceReferences', 'bindings', 'userAcceptance'}, 'TA08 ledger shape changed'
    assert m['format'] == 'chenyuan-source-objects' and type(m['version']) is int and m['version'] == 1 and m['task'] == 'Goal4 TA08', 'TA08 header changed'
    assert m['scope'] == SCOPE and m['userAcceptance'] is False, 'TA08 scope cannot claim rules or human acceptance'
    assert type(m['budgets']) is dict and m['budgets'] == BUDGETS and all(type(n) is int for n in m['budgets'].values()), 'TA08 fixed budgets changed'
    assert m['sourceReferences'] == REFS and m['promptReferences'] == PROMPT_REFS and m['bindings'] == BINDINGS, 'TA08 source/prompt/consumer contract changed'
    for name in REFS + PROMPT_REFS:
        local(name)
    assert type(m['files']) is list and all(type(r) is dict and set(r) == {'path', 'bytes', 'sha256'} for r in m['files']), 'TA08 native identity shape changed'
    assert [r['path'] for r in m['files']] == NATIVE, 'TA08 ordered five-source inventory changed'
    total = 0
    for row in m['files']:
        data = prior_ux33_bytes(row['path'],local(row['path']).read_bytes())
        assert type(row['bytes']) is int and row['bytes'] == len(data) and digest(row['sha256']) and row['sha256'] == hashlib.sha256(data).hexdigest(), 'TA08 native bytes/hash changed'
        total += len(data)
    assert total <= 42000, 'TA08 native code exceeds fixed budget'
    for name, tokens in BINDINGS.items():
        assert all(token in local(name).read_text() for token in tokens), 'Missing TA08 consumer: ' + name

    class Tags(HTMLParser):
        def __init__(self, text):
            super().__init__(); self.nodes = []
            template = re.search(r'<template>(.*)</template>', text, re.S)
            assert template, 'TA08 consumer has no template'
            self.feed(template[1])
        def handle_starttag(self, tag, attrs):
            self.nodes.append((tag, dict(attrs)))
        def handle_startendtag(self, tag, attrs):
            self.nodes.append((tag, dict(attrs)))

    field = clean('web/src/SourceField.vue')
    tags = Tags(field).nodes
    for name in ['SourceObject', 'SourceCommission', 'SourceSatchel']:
        assert re.search(r'(?m)^\s*import\s+' + name + r'\s+from\s+[\'\"]\./' + name + r'\.vue[\'\"]', field), 'TA08 component import detached: ' + name
        assert any(tag == name.lower() for tag, _ in tags), 'TA08 component is not rendered: ' + name
    required = {
        'sourceobject': {':source-id': 'plan.sourceId', ':state': 'state', ':progress': 'progress',
            ':sequence': 'effect?.sequence??0', '@arrange': "emit('arrange')"},
        'sourcecommission': {':source-id': 'plan.sourceId', ':state': 'state', ':progress': 'progress',
            ':sequence': 'effect?.sequence??0', '@arrange': "emit('arrange')"},
        'sourcesatchel': {':game': 'game', ':source-id': 'plan.sourceId', ':activity': 'activity',
            ':result': 'effect?.result??null', ':sequence': 'effect?.sequence??0'},
    }
    for component, props in required.items():
        assert any(tag == component and all(attrs.get(k) == v for k, v in props.items()) for tag, attrs in tags), 'TA08 child lost trusted props or readonly arrange: ' + component
    assert any(tag == 'sourcefield' and attrs.get('@arrange') == 'settings?.showModal()' for tag, attrs in Tags(clean('web/src/SourcePlanner.vue')).nodes), 'TA08 arrange no longer opens original readonly dialog'
    assert not re.search(r'\b(?:useGame|createActivityEffectTracker|useActivityPresentation)\b|\b(?:setTimeout|setInterval|Date\.now|performance\.now|fetch)\s*\(|\b(?:indexedDB|localStorage|BroadcastChannel)\b', '\n'.join(clean(name) for name in NATIVE[:4])), 'TA08 child introduced Store/IO or its own clock'
    assert any(tag == 'assetimage' and attrs.get(':path') == 'SOURCE_ART[sourceId]' for tag, attrs in Tags(clean(NATIVE[0])).nodes), 'TA08 painted natural object has no real SOURCE_ART image consumer'
    assert any(re.search(r'(?m)^\s*import\s+[\'\"]\./ta08-source\.css[\'\"]', clean(name)) for name in ['web/src/SourceField.vue'] + NATIVE[:4]), 'TA08 object stylesheet is not consumed'
    helper = clean(NATIVE[3])
    def object_pairs(name):
        found = re.search(r'export\s+const\s+' + name + r'(?:\s*:[^=]+)?\s*=\s*\{([^}]+)\}', helper, re.S)
        assert found, 'TA08 explicit object map missing: ' + name
        return re.findall(r'[\'\"]?([a-z_]+)[\'\"]?\s*:\s*[\'\"]([^\'\"]+)[\'\"]', found[1])
    art = object_pairs('SOURCE_ART')
    assert len(art) == 6 and dict(art) == ART_PATHS, 'TA08 six natural paintings are not the actual SOURCE_ART map'
    commissions = object_pairs('COMMISSION_OBJECTS')
    assert len(commissions) == 10 and set(dict(commissions)) == set(COMMISSION_IDS) and len({v for _, v in commissions}) == 10, 'TA08 ten commission object domains collapsed or changed'
    commission_text = clean(NATIVE[1])
    assert all('task-' + shape in commission_text for _, shape in commissions), 'TA08 commission shapes are not consumed by actual drawings'

    prompts_raw = local(PROMPTS).read_bytes()
    prompts = json.loads(prompts_raw)
    assert type(prompts) is dict and set(prompts) == {'format', 'version', 'task', 'tool', 'prompts', 'userAcceptance'}, 'TA08 prompt collection shape changed'
    assert prompts['format'] == 'chenyuan-ta08-prompts' and type(prompts['version']) is int and prompts['version'] == 1 and prompts['task'] == 'TA08' and prompts['tool'] == 'built-in image_gen' and prompts['userAcceptance'] is False, 'TA08 prompt collection provenance changed'
    assert type(prompts['prompts']) is dict and list(prompts['prompts']) == SOURCE_IDS, 'TA08 six prompt keys/order changed'
    assert type(m['assets']) is list and len(m['assets']) == 6, 'TA08 requires exactly six independent paintings'
    recorded = set(); runtime_bytes = 0
    for source_id, asset in zip(SOURCE_IDS, m['assets']):
        assert type(asset) is dict and set(asset) == {'id', 'sourceId', 'source', 'runtime', 'receipt'} and asset['sourceId'] == source_id and asset['id'] == source_id + '-cold-v1', 'TA08 asset/source identity or order changed'
        for key, name, fmt in [('source', SOURCES[source_id], 'png'), ('runtime', RUNTIMES[source_id], 'webp')]:
            row = asset[key]
            assert type(row) is dict and set(row) == {'path', 'bytes', 'sha256', 'dimensions', 'alpha', 'format'} and row['path'] == name, 'TA08 painting identity shape/path changed'
            data = local(name).read_bytes()
            assert type(row['bytes']) is int and row['bytes'] == len(data) and digest(row['sha256']) and row['sha256'] == hashlib.sha256(data).hexdigest(), 'TA08 painting bytes/hash changed'
            dimensions, alpha, actual_format = image_reader(data, local(name).suffix)
            assert type(row['dimensions']) is dict and set(row['dimensions']) == {'width', 'height'} and all(type(n) is int for n in row['dimensions'].values()), 'TA08 painting dimension types changed'
            assert row['dimensions'] == dimensions and type(row['alpha']) is bool and row['alpha'] is alpha is True and row['format'] == actual_format == fmt, 'TA08 painting header/alpha changed'
            recorded.add(name)
        assert asset['runtime']['dimensions'] == dict(width=512, height=512) and asset['runtime']['bytes'] <= 160000, 'TA08 runtime dimensions/bytes exceeded'
        assert all(512 <= n <= 8192 for n in asset['source']['dimensions'].values()), 'TA08 original painting dimensions invalid'
        runtime_bytes += asset['runtime']['bytes']
        ref = asset['receipt']
        assert type(ref) is dict and set(ref) == {'path', 'sha256'} and ref['path'] == RECEIPTS[source_id], 'TA08 receipt reference changed'
        raw = local(ref['path']).read_bytes()
        assert digest(ref['sha256']) and ref['sha256'] == hashlib.sha256(raw).hexdigest(), 'TA08 receipt hash changed'
        receipt = json.loads(raw); prompt = prompts['prompts'][source_id]
        assert receipt['id'] == asset['id'] and receipt['sourceId'] == source_id and receipt['tool'] == 'built-in image_gen' and receipt['copiedUnchanged'] is True and receipt['userAcceptance'] is False, 'TA08 receipt provenance changed'
        assert receipt['source'] == asset['source'] and receipt['runtime'] == asset['runtime'] and receipt['savedPath'] == SOURCES[source_id] and receipt['sourceSHA256'] == asset['source']['sha256'], 'TA08 receipt image facts changed'
        assert type(prompt) is dict and set(prompt) == {'prompt', 'transparent_background', 'generatedPath', 'referenceImages'} and type(prompt['prompt']) is str and prompt['prompt'].strip() and prompt['transparent_background'] is True and prompt['referenceImages'] == [], 'TA08 exact tool prompt missing'
        assert receipt['promptReference'] == PROMPTS and receipt['promptKey'] == source_id and receipt['promptSHA256'] == hashlib.sha256(prompt['prompt'].encode()).hexdigest() and receipt['promptDocumentSHA256'] == hashlib.sha256(prompts_raw).hexdigest(), 'TA08 literal/document prompt identity changed'
        assert type(prompt['generatedPath']) is str and prompt['generatedPath'].strip() and prompt['generatedPath'].endswith('.png') and receipt['sourcePath'] == prompt['generatedPath'] and receipt['referenceImages'] == [], 'TA08 original result/reference identity changed'
        assert receipt['encoding'] == ENCODING and type(receipt['encoderVersion']) is str and receipt['encoderVersion'].strip(), 'TA08 deterministic encoding changed'
        decode = receipt['decodeProof']
        assert type(decode) is dict and set(decode) == {'decoder', 'sourceRGBASHA256', 'runtimeRGBASHA256', 'alphaDefinitions'} and decode['decoder'] == 'Pillow' and all(digest(decode[k]) for k in ['sourceRGBASHA256', 'runtimeRGBASHA256']), 'TA08 RGBA decode facts absent'
        assert decode['alphaDefinitions'] == dict(transparentPixels='alpha=0', solidPixels='alpha>=250', intermediatePixels='1<=alpha<250'), 'TA08 alpha definitions changed'
        for key, box_key, row in [('alphaProof', 'sourceAlphaBBox', asset['source']), ('runtimeAlphaProof', 'runtimeAlphaBBox', asset['runtime'])]:
            facts = receipt[key]; box = receipt[box_key]
            assert type(facts) is dict and set(facts) == {'transparentPixels', 'solidPixels', 'intermediatePixels', 'min', 'max'} and all(type(n) is int for n in facts.values()), 'TA08 alpha fact types changed'
            assert facts['transparentPixels'] > 10000 and facts['solidPixels'] > 10000 and facts['intermediatePixels'] >= 0 and facts['min'] == 0 and 250 <= facts['max'] <= 255, 'TA08 alpha facts describe opaque or empty artwork'
            width, height = row['dimensions']['width'], row['dimensions']['height']
            assert sum(facts[k] for k in ['transparentPixels', 'solidPixels', 'intermediatePixels']) == width * height, 'TA08 alpha counts do not cover pixels'
            assert type(box) is list and len(box) == 4 and all(type(n) is int for n in box), 'TA08 alpha bbox types changed'
            left, top, right, bottom = box
            assert 0 <= left < right <= width and 0 <= top < bottom <= height and facts['solidPixels'] + facts['intermediatePixels'] <= (right-left)*(bottom-top), 'TA08 alpha bbox does not contain recorded pixels'
        assert receipt['review']['actuallyViewed'] is True and type(receipt['review']['scope']) is str and receipt['review']['scope'].strip(), 'TA08 actual source review absent'
        export = receipt['exportProof']
        assert type(export) is dict and export == dict(sourceUnchanged=True, runtimeUnchanged=True, reencodedBytes=asset['runtime']['bytes'], reencodedSHA256=asset['runtime']['sha256'], encoderVersion=receipt['encoderVersion']) and type(export['reencodedBytes']) is int and export['sourceUnchanged'] is True and export['runtimeUnchanged'] is True, 'TA08 deterministic re-export facts changed'
    assert runtime_bytes <= 960000, 'TA08 combined runtime raster budget exceeded'
    return recorded, 6, total
