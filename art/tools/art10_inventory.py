"""ART10 recorded export/consumer integrity, not pixel or human acceptance.

Actual decode and two encodes are performed by the committed producer. This
validator uses existing header inspection and hash-bound facts, without adding
Pillow to the normal inventory command's dependencies.
"""
import hashlib
import json
import math
from pathlib import PurePosixPath
import re
from ta09_inventory import OLD_CAPS, REUSED_ASSETS, Tags

IDS = ['frost_sword', 'jade_seal', 'soul_lamp', 'cloud_mirror']
LEDGER = 'art/redesign/art10.json'
BASE = 'art/redesign/art10-relic-blanks'
FACTS = BASE + '/export-facts.json'
PRODUCER = 'art/tools/export_art10_blanks.py'
NATIVE = ['web/src/art10-equipment.css']
REFS = ['docs/decisions/0037-equipment-object-stage-art10-contract.md',
        'goal-4/amendments/2026-10-25-goal-continue-art10.md',
        'goal-4/research/art10-object-sources.json']
PROMPTS = [f'{BASE}/{key}-blank-v1-prompt.json' for key in IDS]
SOURCES = [f'{BASE}/{key}-blank-v1.png' for key in IDS]
AUDITS = [f'{BASE}/receipts/{key}-blank-v1.json' for key in IDS]
RUNTIMES = [f'web/public/art/v2/equipment/{key}-blank-v1.webp' for key in IDS]
BUDGETS = dict(nativeBytes=12000, newAssets=4, runtimeWidth=512, runtimeHeight=512,
               maxRuntimeBytes=160000, maxTotalRuntimeBytes=640000)
ENCODING = ['cwebp', '-q', '82', '-m', '6', '-alpha_q', '100', '-resize', '512', '512', '-metadata', 'none']
ALIGNMENT = dict(method='uniform-contain-alpha16-bottom-center', threshold=16,
                 resampling='Pillow BICUBIC inverse affine', width=512, height=512,
                 nonuniformScale=False, cropPaintedBody=False)
SCOPE = 'Object-stage CSS and four cold blanks only; no Game, rules, authority, DB, timing or human acceptance.'
BINDINGS = {
 'web/src/main.ts': ["import './art10-equipment.css'"],
 'web/src/RelicInscription.vue': ["const finished=computed(()=>props.owned&&!form.value.working&&!sealed.value);",
    'Object.hasOwn(names,props.relicId)', "emit('inspect')", 'projectRelicForm(props.state,',
    'class="relic-tool"', 'class="relic-sealing"'],
 'web/src/JadeStudyScene.vue': ['useEquipmentCycle(kind.value,id)', '<slot name="authorization"/>'],
 'web/src/LearningPlanner.vue': ['data-testid="learning-library-open"', 'data-testid="learning-library-dialog"',
    'data-testid="learning-library-close"', 'function openLibrary()', 'function openSettings()',
    'originalManual', "emit('start',plan)", "emit('travel',plan)"],
 'web/src/equipment-effects.ts': ['useActivityPresentation(a=>equipmentActivityMatches(kind,id(),a)',
    "kind==='forge'?4:5", 'cycleCommand.value=p.activity.value?.nextCommand??null;',
    'proof(resolved.nextState)!==proof(g)', 'proof(resolved.result)!==proof(r)'],
 'web/src/activity-effects.ts': ['a.version&&[2,3,6,extra].includes(a.version)',
    'resolve(before,command)', 'completeActivity(g,prior,r,', 'proof(expected)!==proof(a)'],
 'web/src/use-activity-effect.ts': ['createActivityEffectTracker(matches,extra)',
    '!store?.activityPausing', 'activity.value?.ownerId', 'timer=setTimeout(()=>effect.value=null,1400)'],
}
DEPENDENCIES = list(BINDINGS) + REFS + PROMPTS + SOURCES + AUDITS + RUNTIMES + [FACTS, PRODUCER]
DEPENDENCIES += [r['ledger'] for r in OLD_CAPS] + [p for r in OLD_CAPS for p in r['files']]
DEPENDENCIES += [r['path'] for a in REUSED_ASSETS for r in (a['source'], a['runtime'])]


def validate_art10(root, image_reader):
    root = root.resolve()
    ledger = root / LEDGER
    if not ledger.exists():
        assert not any((root / p).exists() for p in NATIVE + SOURCES + RUNTIMES), 'Unrecorded ART10 implementation or painting'
        return set(), 0, 0

    def local(name):
        assert type(name) is str and name and '\\' not in name and not PurePosixPath(name).is_absolute() and '..' not in PurePosixPath(name).parts, 'ART10 invalid relative path'
        p = (root / name).resolve()
        assert p.is_relative_to(root) and p.is_file(), 'ART10 missing or external file'
        return p

    def digest(value):
        return type(value) is str and re.fullmatch('[0-9a-f]{64}', value)

    def identity(row, expected):
        assert type(row) is dict and set(row) == {'path', 'bytes', 'sha256'} and row['path'] == expected, 'ART10 identity shape or path changed'
        data = local(expected).read_bytes()
        assert type(row['bytes']) is int and row['bytes'] > 0 and row['bytes'] == len(data), 'ART10 actual bytes changed'
        assert digest(row['sha256']) and row['sha256'] == hashlib.sha256(data).hexdigest(), 'ART10 actual hash changed'

    def clean(name):
        text = re.sub(r'/\*.*?\*/|<!--.*?-->', '', local(name).read_text(), flags=re.S)
        return re.sub(r'(?m)^\s*//.*$', '', text)

    def box(value, dimensions):
        assert type(value) is list and len(value) == 4 and all(type(n) is int for n in value), 'ART10 bbox must be four primitive integers'
        assert 0 <= value[0] < value[2] <= dimensions['width'] and 0 <= value[1] < value[3] <= dimensions['height'], 'ART10 bbox outside image'

    def image(row, expected):
        assert type(row) is dict and set(row) == {'path','bytes','sha256','dimensions','format','mode','alpha','alphaProof','alphaBBox1','alphaBBox16','rgbaSHA256'}, 'ART10 image facts shape changed'
        identity({k: row[k] for k in ('path','bytes','sha256')}, expected)
        dimensions, alpha_header, format_header = image_reader(local(expected).read_bytes(), local(expected).suffix)
        assert type(row['dimensions']) is dict and set(row['dimensions']) == {'width','height'} and all(type(n) is int and n > 0 for n in row['dimensions'].values()), 'ART10 dimensions malformed'
        assert format_header == row['format'] and dimensions == row['dimensions'] and row['mode'] == 'RGBA', 'ART10 image header mismatch'
        assert alpha_header is True and row['alpha'] is True, 'ART10 painting is not transparent'
        alpha = row['alphaProof']
        assert type(alpha) is dict and set(alpha) == {'transparentPixels','solidPixels','intermediatePixels','min','max'} and all(type(n) is int for n in alpha.values()), 'ART10 alpha facts malformed'
        assert alpha['transparentPixels'] > 0 and alpha['solidPixels'] > 0 and alpha['intermediatePixels'] >= 0 and alpha['min'] == 0 and 250 <= alpha['max'] <= 255, 'ART10 opaque or empty alpha proof'
        assert sum(alpha[k] for k in ('transparentPixels','solidPixels','intermediatePixels')) == row['dimensions']['width'] * row['dimensions']['height'], 'ART10 alpha counts do not cover pixels'
        box(row['alphaBBox1'], row['dimensions']); box(row['alphaBBox16'], row['dimensions'])
        outer, inner = row['alphaBBox1'], row['alphaBBox16']
        assert outer[0] <= inner[0] < inner[2] <= outer[2] and outer[1] <= inner[1] < inner[3] <= outer[3], 'ART10 threshold bbox outside alpha body'
        assert digest(row['rgbaSHA256']), 'ART10 decoded RGBA hash missing'

    m = json.loads(local(LEDGER).read_text())
    assert type(m) is dict and set(m) == {'format','version','task','scope','budgets','files','assets','sourceReferences','promptReferences','bindings','provenance','userAcceptance'}, 'ART10 ledger shape changed'
    assert m['format'] == 'chenyuan-equipment-art10' and type(m['version']) is int and m['version'] == 1 and m['task'] == 'Goal4 ART10', 'ART10 header changed'
    assert m['scope'] == SCOPE and m['userAcceptance'] is False, 'ART10 scope/human boundary changed'
    assert type(m['budgets']) is dict and m['budgets'] == BUDGETS and all(type(n) is int for n in m['budgets'].values()), 'ART10 fixed typed budgets changed'
    assert m['sourceReferences'] == REFS and m['promptReferences'] == PROMPTS and m['bindings'] == BINDINGS, 'ART10 references or bindings changed'
    for path in REFS + PROMPTS:
        local(path)
    assert type(m['files']) is list and len(m['files']) == 1, 'ART10 owns exactly one new CSS runtime file'
    identity(m['files'][0], NATIVE[0]); total = m['files'][0]['bytes']
    assert total <= 12000, 'ART10 CSS exceeds fixed12000 cap'
    assert type(m['provenance']) is dict and set(m['provenance']) == {'facts','producer'}, 'ART10 producer provenance missing'
    identity(m['provenance']['facts'], FACTS); identity(m['provenance']['producer'], PRODUCER)
    f = json.loads(local(FACTS).read_text())
    assert type(f) is dict and set(f) == {'format','version','producer','decoder','decoderVersion','encoderVersion','encoding','alignment','assets','scope','userAcceptance'}, 'ART10 export facts shape changed'
    assert f['format'] == 'chenyuan-art10-export-facts' and type(f['version']) is int and f['version'] == 1 and f['userAcceptance'] is False and f['scope'] == 'Actual decode/alpha/alignment/re-export facts; not pixel or user acceptance', 'ART10 export header/human changed'
    assert f['producer'] == m['provenance']['producer'] and f['decoder'] == 'Pillow' and type(f['decoderVersion']) is str and f['decoderVersion'] and type(f['encoderVersion']) is str and f['encoderVersion'], 'ART10 actual producer/decoder/encoder missing'
    assert f['encoding'] == ENCODING and type(f['alignment']) is dict and f['alignment'] == ALIGNMENT and all(type(f['alignment'][k]) is type(v) for k,v in ALIGNMENT.items()), 'ART10 exact encoding or uniform alignment changed'
    assert type(m['assets']) is list and all(type(r) is dict for r in m['assets']) and m['assets'] == f['assets'] and [r.get('id') for r in m['assets']] == IDS, 'ART10 four ordered assets incomplete or detached from facts'
    runtime_total = 0
    for i, a in enumerate(m['assets']):
        assert type(a) is dict and set(a) == {'id','source','reference','prompt','audit','runtime','transform','exportProof','visualAcceptance'} and a['visualAcceptance'] is False, 'ART10 asset shape/visual claim changed'
        image(a['source'], SOURCES[i]); image(a['runtime'], RUNTIMES[i])
        assert a['source']['dimensions'] == dict(width=1254,height=1254), 'ART10 selected source dimensions changed'
        assert a['runtime']['dimensions'] == dict(width=512,height=512) and a['runtime']['bytes'] <= 160000, 'ART10 fixed512 or single160000 budget exceeded'
        runtime_total += a['runtime']['bytes']
        ref = a['reference']; old = REUSED_ASSETS[i]
        assert type(ref) is dict and set(ref) == {'source','runtime'} and ref['source'] == old['source'], 'ART10 current reference source replaced'
        identity(ref['source'], old['source']['path']); image(ref['runtime'], old['runtime']['path'])
        assert all(ref['runtime'][k] == old['runtime'][k] for k in ('path','bytes','sha256')), 'ART10 current reference runtime replaced'
        prompt = a['prompt']
        assert type(prompt) is dict and set(prompt) == {'path','bytes','sha256','literalSHA256'}, 'ART10 prompt document/literal identities missing'
        identity({k:prompt[k] for k in ('path','bytes','sha256')}, PROMPTS[i])
        p = json.loads(local(PROMPTS[i]).read_text()); assert type(p) is dict and type(p.get('prompt')) is str and p['prompt'], 'ART10 literal prompt missing'
        assert digest(prompt['literalSHA256']) and prompt['literalSHA256'] == hashlib.sha256(p['prompt'].encode()).hexdigest(), 'ART10 prompt literal/document hashes confused'
        assert p.get('asset') == IDS[i]+'-blank-v1' and p.get('reference') == old['source']['path'] and p.get('transparent_background') is True and p.get('tool') == 'image_gen.imagegen' and p.get('mode') == 'built-in', 'ART10 actual generation/reference metadata changed'
        identity(a['audit'], AUDITS[i]); audit = json.loads(local(AUDITS[i]).read_text()); assert type(audit) is dict, 'ART10 local audit shape changed'
        assert audit.get('kind') == 'local audit of actual built-in tool result; not a provider-signed receipt' and audit.get('tool') == 'image_gen.imagegen' and audit.get('mode') == 'built-in', 'ART10 local audit cannot claim provider receipt'
        assert audit.get('selectedCopy') == SOURCES[i] and audit.get('copySHA256') == audit.get('generatedSHA256') == a['source']['sha256'], 'ART10 original copy not unchanged'
        assert audit.get('prompt') == PROMPTS[i] and audit.get('promptSHA256') == prompt['sha256'] and audit.get('reference') == old['source']['path'] and audit.get('referenceSHA256') == old['source']['sha256'], 'ART10 audit document/reference identity changed'
        assert type(audit.get('generatedOriginal')) is str and audit['generatedOriginal'] == p.get('generatedOriginal') and audit['generatedOriginal'].endswith('.png'), 'ART10 original generated path lost'
        assert audit.get('dimensions') == [1254,1254] and audit.get('alphaExtrema') == [0,255] and all(type(n) is int for n in audit['dimensions'] + audit['alphaExtrema']), 'ART10 actual source audit facts changed'
        t = a['transform']; raw = a['source']['alphaBBox16']; target = ref['runtime']['alphaBBox16']
        assert type(t) is dict and set(t) == {'scale','translateX','translateY','targetAlphaBBox16','projectedAlphaBBox1','projectedAlphaBBox16','wholePaintedSourceInside','actualRuntimeAlphaBBox16','alpha16ResidualToReference'}, 'ART10 affine transform shape changed'
        assert all(type(t[k]) in (int,float) and math.isfinite(t[k]) for k in ('scale','translateX','translateY')) and t['scale'] > 0, 'ART10 transform is not primitive finite uniform scale'
        scale = min((target[2]-target[0])/(raw[2]-raw[0]), (target[3]-target[1])/(raw[3]-raw[1]))
        x = (target[0]+target[2])/2-scale*(raw[0]+raw[2])/2; y = target[3]-scale*raw[3]
        assert all(abs(t[k]-v)<1e-9 for k,v in [('scale',scale),('translateX',x),('translateY',y)]) and t['targetAlphaBBox16'] == target, 'ART10 alignment is stretched or not reference-centred/bottom-aligned'
        for key, box_key in [('projectedAlphaBBox1','alphaBBox1'),('projectedAlphaBBox16','alphaBBox16')]:
            source_box = a['source'][box_key]; expected = [source_box[0]*scale+x,source_box[1]*scale+y,source_box[2]*scale+x,source_box[3]*scale+y]
            assert type(t[key]) is list and len(t[key]) == 4 and all(type(n) in (int,float) and math.isfinite(n) for n in t[key]) and all(abs(n-e)<1e-9 for n,e in zip(t[key],expected)), 'ART10 affine body projection changed'
        assert min(t['projectedAlphaBBox1']) >= 0 and max(t['projectedAlphaBBox1']) <= 512 and t['wholePaintedSourceInside'] is True, 'ART10 painted body cropped by canvas'
        assert type(t['alpha16ResidualToReference']) is list and all(type(n) is int for n in t['alpha16ResidualToReference']) and t['actualRuntimeAlphaBBox16'] == a['runtime']['alphaBBox16'] and t['alpha16ResidualToReference'] == [n-e for n,e in zip(a['runtime']['alphaBBox16'],target)], 'ART10 measured bbox residual is not recorded honestly'
        proof = a['exportProof']
        assert type(proof) is dict and set(proof) == {'firstBytes','firstSHA256','secondBytes','secondSHA256','bytesEqual','sourceUnchanged','referenceUnchanged'}, 'ART10 two-export proof missing'
        assert all(proof[k] is True for k in ('bytesEqual','sourceUnchanged','referenceUnchanged')) and all(type(proof[k]) is int and proof[k] == a['runtime']['bytes'] for k in ('firstBytes','secondBytes')) and proof['firstSHA256'] == proof['secondSHA256'] == a['runtime']['sha256'], 'ART10 deterministic double export does not match runtime'
    assert runtime_total <= 640000, 'ART10 total runtime budget exceeded'
    for old in OLD_CAPS:
        prior = json.loads(local(old['ledger']).read_text())
        assert type(prior.get(old['key'])) is int and prior[old['key']] == old['limit'] and [r['path'] for r in prior['files']] == old['files'], 'ART10 cannot raise or move an old budget'
        assert sum(len(local(p).read_bytes()) for p in old['files']) <= old['limit'], 'ART10 actual old native group exceeds original cap'
    for name, tokens in BINDINGS.items():
        source = clean(name)
        assert all(token in source for token in tokens), 'ART10 live consumer/proof detached'
    assert len(re.findall(r"import\s+['\"]\./art10-equipment\.css['\"]",clean('web/src/main.ts'))) == 1, 'ART10 stylesheet is not uniquely consumed'
    css = clean(NATIVE[0]); assert 'art10-learning' in css and not re.search(r'@import|@font-face|https?://|file://', css), 'ART10 stylesheet introduces external IO or loses stage'
    actor = Tags(clean('web/src/RelicInscription.vue'))
    blank = [i for i,(tag,attrs) in enumerate(actor.nodes) if tag == 'assetimage' and attrs.get('class') == 'relic-cold-blank']
    assert len(blank) == 1, 'ART10 blank image must be a real unique opening tag'
    index = blank[0]; attrs = actor.nodes[index][1]
    assert attrs.get(':path') == "'art/v2/equipment/'+id+'-blank-v1.webp'" and 'v-else' in attrs and attrs.get(':asset-id') == "'relic-blank-'+id" and attrs.get('fit') == 'contain', 'ART10 actual cold-blank path/state consumer changed'
    fallback = [(tag,a) for i,(tag,a) in enumerate(actor.nodes) if index in actor.ancestors[i]]
    assert any(tag == 'gameicon' and a.get('kind') == 'relic' and a.get(':id') == 'id' for tag,a in fallback), 'ART10 real blank fallback missing'
    finished = [i for i,(tag,a) in enumerate(actor.nodes) if tag == 'div' and a.get('class') == 'relic-finished-art' and a.get('v-if') == 'finished']
    assert len(finished) == 1 and any(tag == 'slot' and a.get('name') == 'artifact' and finished[0] in actor.ancestors[i] for i,(tag,a) in enumerate(actor.nodes)), 'ART10 actual finished artifact slot detached'
    names = re.search(r'const names=\{([^}]+)\}', clean('web/src/RelicInscription.vue'))
    assert names and re.findall(r'(\w+)\s*:', names[1]) == IDS, 'ART10 four dynamic blank IDs are not the real actor domain'
    recorded = set(NATIVE + [LEDGER,FACTS,PRODUCER] + SOURCES + PROMPTS + AUDITS + RUNTIMES)
    return recorded, 4, total
