"""ART11 immutable item exports and actual read-only consumers.

Default validation checks bytes, headers and hash-bound actual decode/export
facts. The explicit producer owns Pillow work; this guard adds no decoder IO.
"""
import hashlib
import json
import math
import re
from pathlib import PurePosixPath
from ta09_inventory import OLD_CAPS, Tags
IDS = ['herb','dew','core','jade','lotus','soul','dao','healing_pill','spirit_pill',
       'foundation_pill','golden_pill','nascent_pill','spirit_seed','ascension_seal']
ENCODING = ['cwebp','-q','82','-m','6','-alpha_q','100','-resize','512','512','-metadata','none']
ALIGNMENT = dict(method='uniform-contain-alpha1-margin32-bottom-center', threshold=1,
                 resampling='Pillow BICUBIC inverse affine', width=512, height=512,
                 margin=32, samplingGuard=2, nonuniformScale=False, cropPaintedBody=False)
LEDGER = 'art/redesign/art11.json'
BASE = 'art/redesign/art11-items'
FACTS = BASE + '/export-facts.json'
PRODUCER = 'art/tools/export_art11_items.py'
HELPER = 'art/tools/export_art10_blanks.py'
NATIVE = ['web/src/ItemArtifact.vue', 'web/src/art11-inventory.css']
REFS = ['docs/decisions/0038-inventory-object-stage-art11-contract.md',
        'goal-4/amendments/2026-10-26-goal-continue-art11.md',
        'goal-4/research/art11-object-sources.json']
SOURCES = [f'{BASE}/{key}-v1.png' for key in IDS]
PROMPTS = [f'{BASE}/{key}-v1-prompt.json' for key in IDS]
AUDITS = [f'{BASE}/receipts/{key}-v1.json' for key in IDS]
RUNTIMES = [f'web/public/art/v2/items/{key}-v1.webp' for key in IDS]
BUDGETS = dict(nativeBytes=18000, itemArtifactBytes=4000, cssBytes=14000,
               newAssets=14, runtimeWidth=512, runtimeHeight=512,
               maxRuntimeBytes=120000, maxTotalRuntimeBytes=1680000)
SCOPE = 'Read-only item presentation and fourteen independent cold paintings; no Game, rule, authority, DB, period or human-acceptance changes.'
CAPS = OLD_CAPS + [dict(ledger='art/redesign/art04.json',key='maxNativeBytes',limit=40000,
        files=['web/src/InventoryStage.vue','web/src/MarketCounter.vue','web/src/RecoveryRitual.vue','web/src/supply-effects.ts'])]
BINDINGS = {
 'web/src/main.ts':["import './art11-inventory.css'"],
 'web/src/ItemArtifact.vue':['Object.hasOwn(C.items,props.itemId)',"'art/v2/items/'+props.itemId+'-v1.webp'"],
 'web/src/InventoryStage.vue':['import ItemArtifact', 'data-testid="inventory-library-dialog"',
    'data-testid="inventory-uses-dialog"', "emit('track',{kind:'item',id:props.itemId,quantity:1})", "emit('act',kind==='use'?{type:'USE',item:props.itemId}:{type:'SELL',item:props.itemId,quantity:1})"],
 'web/src/MarketCounter.vue':['import ItemArtifact','useSupplyCycle(()=>props.mode,()=>props.itemId)',
    "r.delta.inventory[props.itemId]??0", 'r.delta.stones'],
 'web/src/RecoveryRitual.vue':['import ItemArtifact','useSupplyCycle(()=>props.kind,()=>props.itemId)',
    'effect.notice.delta','runtime.remainingMs/1000'],
 'web/src/supply-effects.ts':["a.version===5&&a.plan.kind===kind",'supplyCommandMatches',
    'undefined,5',"command.value=p.activity.value?.nextCommand??null;", "e.result.type===kind().toUpperCase()"],
 'web/src/activity-effects.ts':['a.version&&[2,3,6,extra].includes(a.version)',
    'resolve(before,command)', 'completeActivity(g,prior,r,', 'proof(expected)!==proof(a)'],
 'web/src/use-activity-effect.ts':['createActivityEffectTracker(matches,extra)',
    '!store?.activityPausing','activity.value?.ownerId','timer=setTimeout(()=>effect.value=null,1400)'],
}
CONSUMERS = [
 dict(host='web/src/InventoryStage.vue',attrs={':item-id':'itemId',':owned':'true'}),
 dict(host='web/src/InventoryStage.vue',attrs={':item-id':'itemId',':owned':'false'}),
 dict(host='web/src/MarketCounter.vue',attrs={':item-id':'itemId',':owned':'stock>0'}),
 dict(host='web/src/RecoveryRitual.vue',attrs={':item-id':'itemId',':owned':'stock>0'}),
]
DEPENDENCIES = list(BINDINGS) + ['src/full/content.ts',PRODUCER,HELPER,FACTS] + REFS + SOURCES + PROMPTS + AUDITS + RUNTIMES
DEPENDENCIES += [r['ledger'] for r in CAPS] + [p for row in CAPS for p in row['files']]


def validate_art11(root, image_reader):
    root = root.resolve()
    if not (root/LEDGER).exists():
        assert not any((root/p).exists() for p in NATIVE+SOURCES+RUNTIMES), 'Unrecorded ART11 source or painting'
        return set(),0,0

    def local(name):
        assert type(name) is str and name and chr(92) not in name and not PurePosixPath(name).is_absolute() and '..' not in PurePosixPath(name).parts, 'ART11 invalid relative path'
        path = (root/name).resolve()
        assert path.is_relative_to(root) and path.is_file(), 'ART11 missing or external file'
        return path

    def sha(value): return type(value) is str and re.fullmatch('[0-9a-f]{64}',value)

    def identity(row,expected):
        assert type(row) is dict and set(row)=={'path','bytes','sha256'} and row['path']==expected, 'ART11 identity shape/path changed'
        data=local(expected).read_bytes()
        assert type(row['bytes']) is int and row['bytes']==len(data) and row['bytes']>0, 'ART11 actual bytes changed'
        assert sha(row['sha256']) and row['sha256']==hashlib.sha256(data).hexdigest(), 'ART11 actual hash changed'

    def clean(name):
        text=re.sub(r'/\*.*?\*/|<!--.*?-->','',local(name).read_text(),flags=re.S)
        return re.sub(r'(?m)^\s*//.*$','',text)

    def bbox(value,dimensions):
        assert type(value) is list and len(value)==4 and all(type(n) is int for n in value), 'ART11 bbox types changed'
        assert 0<=value[0]<value[2]<=dimensions['width'] and 0<=value[1]<value[3]<=dimensions['height'], 'ART11 bbox outside pixels'

    def image(row,expected):
        fields={'path','bytes','sha256','dimensions','format','mode','alpha','alphaProof','alphaBBox1','alphaBBox16','rgbaSHA256'}
        assert type(row) is dict and set(row)==fields, 'ART11 image facts shape changed'
        identity({k:row[k] for k in ['path','bytes','sha256']},expected)
        size,alpha,fmt=image_reader(local(expected).read_bytes(),local(expected).suffix)
        assert type(row['dimensions']) is dict and set(row['dimensions'])=={'width','height'} and all(type(n) is int and n>0 for n in row['dimensions'].values()), 'ART11 dimensions types changed'
        assert size==row['dimensions'] and fmt==row['format'] and row['mode']=='RGBA', 'ART11 image header differs'
        assert alpha is True and row['alpha'] is True, 'ART11 image not transparent'
        a=row['alphaProof']
        assert type(a) is dict and set(a)=={'transparentPixels','solidPixels','intermediatePixels','min','max'} and all(type(n) is int for n in a.values()), 'ART11 alpha types changed'
        assert a['transparentPixels']>0 and a['solidPixels']>0 and a['intermediatePixels']>=0 and a['min']==0 and 250<=a['max']<=255, 'ART11 empty or opaque alpha facts'
        assert sum(a[k] for k in ['transparentPixels','solidPixels','intermediatePixels'])==size['width']*size['height'], 'ART11 alpha counts disagree with pixels'
        bbox(row['alphaBBox1'],size);bbox(row['alphaBBox16'],size)
        outer,inner=row['alphaBBox1'],row['alphaBBox16']
        assert outer[0]<=inner[0]<inner[2]<=outer[2] and outer[1]<=inner[1]<inner[3]<=outer[3], 'ART11 alpha16 not within whole body'
        assert sha(row['rgbaSHA256']), 'ART11 actual decoded hash missing'

    m=json.loads(local(LEDGER).read_text())
    fields={'format','version','task','scope','budgets','files','assets','sourceReferences','promptReferences','bindings','consumers','provenance','userAcceptance'}
    assert type(m) is dict and set(m)==fields, 'ART11 ledger shape changed'
    assert m['format']=='chenyuan-inventory-art11' and type(m['version']) is int and m['version']==1 and m['task']=='Goal4 ART11', 'ART11 header changed'
    assert m['scope']==SCOPE and m['userAcceptance'] is False, 'ART11 scope/acceptance changed'
    assert type(m['budgets']) is dict and m['budgets']==BUDGETS and all(type(n) is int for n in m['budgets'].values()), 'ART11 fixed typed budgets changed'
    assert m['sourceReferences']==REFS and m['promptReferences']==PROMPTS and m['bindings']==BINDINGS and m['consumers']==CONSUMERS, 'ART11 exact reference/consumer contract changed'
    for name in REFS+PROMPTS: local(name)
    assert type(m['files']) is list and len(m['files'])==2 and [r.get('path') for r in m['files']]==NATIVE, 'ART11 exactly two new native files required'
    for row,path,cap in zip(m['files'],NATIVE,[4000,14000]):
        identity(row,path);assert row['bytes']<=cap, 'ART11 native individual cap exceeded'
    total=sum(row['bytes'] for row in m['files'])
    assert total<=18000, 'ART11 native aggregate cap exceeded'
    assert type(m['provenance']) is dict and set(m['provenance'])=={'facts','producer','helper'}, 'ART11 producer provenance missing'
    for key,path in [('facts',FACTS),('producer',PRODUCER),('helper',HELPER)]: identity(m['provenance'][key],path)
    f=json.loads(local(FACTS).read_text())
    fields={'format','version','producer','helper','decoder','decoderVersion','encoderVersion','encoding','alignment','complete','pending','assets','scope','userAcceptance'}
    assert type(f) is dict and set(f)==fields and f['format']=='chenyuan-art11-export-facts' and type(f['version']) is int and f['version']==1, 'ART11 export header changed'
    assert f['complete'] is True and f['pending']==[], 'ART11 actual fourteen exports incomplete'
    assert f['scope']=='Actual decode/alpha/whole-body alignment/double-export facts; not pixel or user acceptance' and f['userAcceptance'] is False, 'ART11 facts visual boundary changed'
    assert f['producer']==m['provenance']['producer'] and f['helper']==m['provenance']['helper'], 'ART11 actual producer/helper differs'
    assert f['decoder']=='Pillow' and type(f['decoderVersion']) is str and f['decoderVersion'] and type(f['encoderVersion']) is str and f['encoderVersion'], 'ART11 actual codec versions missing'
    assert f['encoding']==ENCODING and f['alignment']==ALIGNMENT and all(type(f['alignment'][k]) is type(v) for k,v in ALIGNMENT.items()), 'ART11 exact deterministic recipe changed'
    assert type(m['assets']) is list and m['assets']==f['assets'] and all(type(row) is dict for row in m['assets']) and [r.get('id') for r in m['assets']]==IDS, 'ART11 fourteen independent ordered assets incomplete'
    content=clean('src/full/content.ts');items=re.search(r'export const items:[^=]+=\{(.*?)\n\};',content,re.S)
    assert items and re.findall(r'^\s*(\w+):',items[1],re.M)==IDS, 'ART11 whitelist differs from actual formal content'
    runtime_total=0
    for index,a in enumerate(m['assets']):
        fields={'id','source','prompt','audit','runtime','transform','exportProof','visualAcceptance'}
        assert set(a)==fields and a['visualAcceptance'] is False, 'ART11 asset shape/visual claim changed'
        image(a['source'],SOURCES[index]);image(a['runtime'],RUNTIMES[index])
        assert a['source']['dimensions']==dict(width=1254,height=1254), 'ART11 actual source dimension changed'
        assert a['runtime']['dimensions']==dict(width=512,height=512) and a['runtime']['bytes']<=120000, 'ART11 fixed512 or single120000 cap exceeded'
        runtime_total+=a['runtime']['bytes']
        prompt=a['prompt'];assert type(prompt) is dict and set(prompt)=={'path','bytes','sha256','literalSHA256'}, 'ART11 prompt dual identities missing'
        identity({k:prompt[k] for k in ['path','bytes','sha256']},PROMPTS[index])
        p=json.loads(local(PROMPTS[index]).read_text())
        assert type(p) is dict and p.get('id')==IDS[index] and p.get('builtin') is True and p.get('transparentRequested') is True and type(p.get('prompt')) is str and p['prompt'], 'ART11 built-in prompt identity changed'
        assert sha(prompt['literalSHA256']) and prompt['literalSHA256']==hashlib.sha256(p['prompt'].encode()).hexdigest(), 'ART11 literal/document hash confused'
        identity(a['audit'],AUDITS[index]);audit=json.loads(local(AUDITS[index]).read_text())
        assert audit.get('id')==IDS[index] and audit.get('kind')=='local imagegen audit not provider-signed receipt' and audit.get('requestId') is None and audit.get('model') is None, 'ART11 local audit cannot claim provider metadata'
        assert audit.get('workspaceRaw')==SOURCES[index] and audit.get('rawSha256')==a['source']['sha256'] and audit.get('originalKept') is True, 'ART11 original copy changed'
        assert type(audit.get('generatedOriginal')) is str and audit['generatedOriginal'].endswith('.png') and audit['generatedOriginal']==p.get('generatedPath'), 'ART11 generated provenance lost'
        assert audit.get('dimensions')==[1254,1254] and audit.get('mode')=='RGBA' and audit.get('alphaExtrema')==[0,255] and audit.get('alpha16Bbox')==a['source']['alphaBBox16'], 'ART11 actual original audit facts changed'
        t=a['transform'];fields={'scale','translateX','translateY','targetBox','projectedAlphaBBox1','projectedAlphaBBox16','wholePaintedSourceInside','actualRuntimeAlphaBBox1','actualRuntimeAlphaBBox16'}
        assert type(t) is dict and set(t)==fields, 'ART11 transform shape changed'
        assert all(type(t[k]) in (int,float) and math.isfinite(t[k]) for k in ['scale','translateX','translateY']) and t['scale']>0, 'ART11 finite uniform transform required'
        lo,hi=34,478;box=a['source']['alphaBBox1'];scale=min((hi-lo)/(box[2]-box[0]),(hi-lo)/(box[3]-box[1]));x=256-scale*(box[0]+box[2])/2;y=hi-scale*box[3]
        assert t['targetBox']==[lo,lo,hi,hi] and all(abs(t[k]-v)<1e-9 for k,v in [('scale',scale),('translateX',x),('translateY',y)]), 'ART11 body is stretched or not centred/bottom-aligned'
        for key,b in [('projectedAlphaBBox1','alphaBBox1'),('projectedAlphaBBox16','alphaBBox16')]:
            box=a['source'][b];expected=[box[0]*scale+x,box[1]*scale+y,box[2]*scale+x,box[3]*scale+y]
            assert type(t[key]) is list and len(t[key])==4 and all(type(n) in (int,float) and math.isfinite(n) and abs(n-e)<1e-9 for n,e in zip(t[key],expected)), 'ART11 whole body projection differs'
        assert min(t['projectedAlphaBBox1'][:2])>=34-1e-9 and max(t['projectedAlphaBBox1'][2:])<=478+1e-9 and t['wholePaintedSourceInside'] is True, 'ART11 source crop/margin violation'
        box=a['runtime']['alphaBBox1']
        assert t['actualRuntimeAlphaBBox1']==box and t['actualRuntimeAlphaBBox16']==a['runtime']['alphaBBox16'] and min(box[:2])>=32 and max(box[2:])<=480, 'ART11 actual raster32px margin violated'
        proof=a['exportProof'];fields={'firstBytes','firstSHA256','secondBytes','secondSHA256','bytesEqual','sourceUnchanged'}
        assert type(proof) is dict and set(proof)==fields and proof['bytesEqual'] is True and proof['sourceUnchanged'] is True, 'ART11 double export flags differ'
        assert all(type(proof[k]) is int and proof[k]==a['runtime']['bytes'] for k in ['firstBytes','secondBytes']) and proof['firstSHA256']==proof['secondSHA256']==a['runtime']['sha256'], 'ART11 actual double export differs'
    assert len({a['source']['sha256'] for a in m['assets']})==14 and len({a['runtime']['sha256'] for a in m['assets']})==14 and len({json.loads(local(path).read_text())['generatedOriginal'] for path in AUDITS})==14, 'ART11 independent paintings cannot alias one generation or raster'
    assert runtime_total<=1680000, 'ART11 total runtime cap exceeded'
    for row in CAPS:
        prior=json.loads(local(row['ledger']).read_text())
        assert type(prior.get(row['key'])) is int and prior[row['key']]==row['limit'] and [r['path'] for r in prior['files']]==row['files'], 'ART11 cannot raise or move an old budget'
        assert sum(len(local(name).read_bytes()) for name in row['files'])<=row['limit'], 'ART11 actual old group exceeds cap'
    for name,tokens in BINDINGS.items():
        assert all(token in clean(name) for token in tokens), 'ART11 live consumer/proof detached: '+name
    assert len(re.findall(r"import\s+['\"]\./art11-inventory\.css['\"]",clean('web/src/main.ts')))==1, 'ART11 stylesheet not uniquely consumed'
    actor=clean(NATIVE[0]);script=re.search(r'<script[^>]*>(.*?)</script>',actor,re.S)
    assert script and not re.search(r'defineEmits|setTimeout|setInterval|requestAnimationFrame|fetch\s*\(|XMLHttpRequest|localStorage|indexedDB|useGame|Date\.now|performance\.now|\.inventory\s*=',script[1]), 'ART11 native object adds IO, clocks or writes'
    tags=Tags(actor);asset=[i for i,(tag,a) in enumerate(tags.nodes) if tag=='assetimage']
    assert len(asset)==1, 'ART11 real unique image opening required'
    index=asset[0];attrs=tags.nodes[index][1]
    assert attrs.get('v-if')=='item' and attrs.get(':path')=='path' and attrs.get(':asset-id')=="'inventory-object-'+itemId" and attrs.get('fit')=='contain', 'ART11 actual item image path/state detached'
    assert any(tag=='gameicon' and a.get('kind')=='item' and a.get(':id')=='itemId' and index in tags.ancestors[i] for i,(tag,a) in enumerate(tags.nodes)), 'ART11 real image fallback missing'
    roots=[a for tag,a in tags.nodes if a.get('data-testid')=='item-artifact']
    assert len(roots)==1 and roots[0].get(':data-item')=='itemId' and roots[0].get(':data-owned')=='owned' and roots[0].get(':class')=="{'item-artifact-diagram':!owned}", 'ART11 owned/diagram truth detached'
    for consumer in CONSUMERS:
        actual=Tags(clean(consumer['host']));matches=[a for tag,a in actual.nodes if tag=='itemartifact' and all(a.get(k)==v for k,v in consumer['attrs'].items())]
        assert len(matches)==1, 'ART11 actual item consumer props not unique/trusted'
    css=clean(NATIVE[1]);assert all(token in css for token in ['art11-inventory','art11-market','art11-recovery','art11-object-dialog']), 'ART11 actual native surfaces missing'
    assert not re.search(r'@import|@font-face|https?://|file://',css), 'ART11 CSS external IO or fonts'
    recorded=set(NATIVE+[LEDGER,FACTS,PRODUCER]+SOURCES+PROMPTS+AUDITS+RUNTIMES)
    return recorded,14,total
