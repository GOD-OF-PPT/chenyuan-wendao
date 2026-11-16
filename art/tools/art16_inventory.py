"""School object provenance and actual consumers; never a visual/human verdict."""
import hashlib,json,math,re
from pathlib import PurePosixPath
from ta09_inventory import Tags

IDS=['sword','talisman']
BASE='art/redesign/art16-schools'
LEDGER='art/redesign/art16.json'
NATIVE=['web/src/art16-schools.css']
PRODUCER='art/tools/export_art16_schools.py'
FACTS=BASE+'/export-facts.json'
REFS=['docs/decisions/0045-school-object-art16-contract.md','goal-4/amendments/2026-10-27-goal-continue-art16.md','goal-4/research/art16-design-sources.json']
BUDGETS=dict(nativeBytes=12000,newAssets=2,runtimeWidth=512,runtimeHeight=512,maxRuntimeBytes=160000,maxTotalRuntimeBytes=320000)
OLD=['web/src/JadeStudyScene.vue','web/src/RelicAtelier.vue','web/src/LoadoutConstellation.vue','web/src/equipment-effects.ts','web/src/art03-equipment.css']
ENCODING=['cwebp','-q','82','-m','6','-alpha_q','100','-resize','512','512','-metadata','none']
ALIGNMENT=dict(method='uniform-contain-alpha1-margin32-bottom-center',threshold=1,resampling='Pillow BICUBIC inverse affine',width=512,height=512,margin=32,samplingGuard=2,nonuniformScale=False,cropPaintedBody=False)

def validate_art16(root,image_reader):
 root=root.resolve()
 if not(root/LEDGER).exists():
  assert not any((root/p).exists()for p in NATIVE),'Unrecorded ART16 native stage'
  return set(),0,0
 def local(name):
  assert type(name)is str and name and '\\'not in name and not PurePosixPath(name).is_absolute()and'..'not in PurePosixPath(name).parts,'ART16 local path'
  p=(root/name).resolve();assert p.is_relative_to(root)and p.is_file(),'ART16 missing input';return p
 def digest(data):return hashlib.sha256(data).hexdigest()
 def identity(row,path):
  assert type(row)is dict and set(row)=={'path','bytes','sha256'}and row['path']==path,'ART16 identity shape'
  raw=local(path).read_bytes();assert type(row['bytes'])is int and row['bytes']==len(raw)and row['sha256']==digest(raw),'ART16 actual identity';return raw
 def clean(path):return re.sub(r'<!--[^>]*-->|/\*[\s\S]*?\*/','',local(path).read_text())
 def image(row,path):
  identity({k:row[k]for k in ['path','bytes','sha256']},path);dimensions,alpha,fmt=image_reader(local(path).read_bytes(),local(path).suffix)
  assert row['dimensions']==dimensions and row['format']==fmt and row['mode']=='RGBA'and row['alpha']is True and alpha is True,'ART16 actual alpha/header'
  proof=row['alphaProof'];assert all(type(proof[k])is int for k in ['transparentPixels','solidPixels','intermediatePixels','min','max']),'ART16 alpha primitive facts'
  assert proof['min']==0 and proof['max']==255 and proof['transparentPixels']>0 and proof['solidPixels']>0 and proof['intermediatePixels']>=0,'ART16 real alpha facts'
  assert sum(proof[k]for k in ['transparentPixels','solidPixels','intermediatePixels'])==dimensions['width']*dimensions['height'],'ART16 alpha pixel count'
  assert re.fullmatch('[a-f0-9]{64}',row['rgbaSHA256']),'ART16 decoded hash'
  for key in ['alphaBBox1','alphaBBox16']:
   box=row[key];assert type(box)is list and len(box)==4 and all(type(n)is int for n in box)and 0<=box[0]<box[2]<=dimensions['width']and 0<=box[1]<box[3]<=dimensions['height'],'ART16 alpha bounds'
 m=json.loads(local(LEDGER).read_text());assert m['format']=='chenyuan-school-art16'and type(m['version'])is int and m['version']==1 and m['userAcceptance']is False,'ART16 header/acceptance'
 assert m['budgets']==BUDGETS and all(type(m['budgets'][k])is int for k in BUDGETS),'ART16 fixed typed budgets'
 assert m['sourceReferences']==REFS,'ART16 source references'
 for p in REFS:local(p)
 assert len(m['files'])==1;native=identity(m['files'][0],NATIVE[0]);assert 0<len(native)<=12000,'ART16 native cap'
 assert len(m['provenance'])==2;identity(m['provenance']['producer'],PRODUCER);identity(m['provenance']['facts'],FACTS)
 f=json.loads(local(FACTS).read_text());assert f['format']=='chenyuan-art16-export-facts'and f['version']==1 and f['producer']==m['provenance']['producer']and f['userAcceptance']is False,'ART16 producer facts'
 assert f['encoding']==ENCODING and f['alignment']==ALIGNMENT and f['decoder']=='Pillow'and f['decoderVersion']and f['encoderVersion'],'ART16 exact export protocol'
 assert [x['path']for x in f['helpers']]==['art/tools/export_art10_blanks.py','art/tools/export_art11_items.py'],'ART16 reused helpers'
 for h in f['helpers']:identity(h,h['path'])
 assert m['assets']==f['assets']and[x['id']for x in m['assets']]==IDS,'ART16 independent two assets'
 recorded=set(NATIVE+[LEDGER,FACTS,PRODUCER]);total=0
 for key,a in zip(IDS,m['assets']):
  source=f'{BASE}/{key}-station-v1.png';prompt=f'{BASE}/{key}-station-v1-prompt.json';audit=f'{BASE}/receipts/{key}-station-v1.json';runtime=f'web/public/art/v2/schools/{key}-station-v1.webp'
  image(a['source'],source);image(a['runtime'],runtime);assert a['source']['dimensions']['width']==a['source']['dimensions']['height']and a['source']['dimensions']['width']>=512,'ART16 source dimensions'
  assert a['runtime']['dimensions']==dict(width=512,height=512)and a['runtime']['bytes']<=160000,'ART16 runtime cap/dimensions';total+=a['runtime']['bytes'];assert a['visualAcceptance']is False,'ART16 cannot assert human pixels'
  p=json.loads(local(prompt).read_text());identity({k:a['prompt'][k]for k in ['path','bytes','sha256']},prompt)
  assert a['prompt']['literalSHA256']==digest(p['prompt'].encode())and p['asset']==key+'-station-v1'and p['tool']=='image_gen.imagegen'and p['mode']=='built-in'and p['transparent_background']is True,'ART16 literal prompt/tool'
  identity(a['audit'],audit);v=json.loads(local(audit).read_text());assert v['kind']=='local audit of actual built-in tool result; not a provider-signed receipt'and v['model']is None and v['requestId']is None and v['originalKept']is True,'ART16 honest tool audit'
  assert v['selectedCopy']==source and v['copySHA256']==v['generatedSHA256']==a['source']['sha256']and v['promptSHA256']==a['prompt']['sha256']and v['generatedOriginal']==p['generatedOriginal'],'ART16 source/prompt copy proof'
  assert a['reference']['path']==p['reference']=='web/public/art/v2/workshop/furnace-v1.webp';identity(a['reference'],p['reference']);assert a['reference']['sha256']==p['referenceSHA256']==v['referenceSHA256'],'ART16 style reference changed'
  t=a['transform'];box=a['source']['alphaBBox1'];scale=min(444/(box[2]-box[0]),444/(box[3]-box[1]));x=256-scale*(box[0]+box[2])/2;y=478-scale*box[3]
  assert all(type(t[k])in(int,float)and math.isfinite(t[k])and abs(t[k]-z)<1e-9 for k,z in [('scale',scale),('translateX',x),('translateY',y)]),'ART16 uniform complete-body placement'
  assert t['wholePaintedSourceInside']is True and t['actualRuntimeAlphaBBox1']==a['runtime']['alphaBBox1']and t['actualRuntimeAlphaBBox16']==a['runtime']['alphaBBox16'],'ART16 actual export bounds'
  box=a['runtime']['alphaBBox1'];assert min(box[:2])>=32 and max(box[2:])<=480,'ART16 runtime margin'
  proof=a['exportProof'];assert proof['bytesEqual']is True and proof['sourceUnchanged']is True and proof['firstBytes']==proof['secondBytes']==a['runtime']['bytes']and proof['firstSHA256']==proof['secondSHA256']==a['runtime']['sha256'],'ART16 double export proof'
  recorded.update([source,prompt,audit,runtime])
 assert total<=320000,'ART16 total runtime cap'
 prior=json.loads(local('art/redesign/art03.json').read_text());assert prior['maxNativeBytes']==45000 and[r['path']for r in prior['files']]==OLD and sum(local(p).stat().st_size for p in OLD)<=45000,'ART16 old cap/member cannot change'
 css=clean(NATIVE[0]);assert not re.search(r'@import|@font-face|https?://|file://',css),'ART16 external CSS IO'
 assert 'school-station' in css and 'prefers-reduced-motion' in css and 'hub-reduced' in css,'ART16 stage/reduction detached'
 main=clean('web/src/main.ts');assert main.count("import './art16-schools.css'")==1,'ART16 unique style consumer'
 s=clean('web/src/LoadoutConstellation.vue');assert 'school-sigil'not in s and 'school-sigil'not in clean('web/src/art03-equipment.css'),'ART16 old card/sigil not retired'
 assert "useConfigurationEcho(()=>props.game.core.runId+':'+props.mode)"in s and "effect.result.type==='SCHOOL'&&game.school===school"in s,'ART16 actual saved school guard'
 tree=Tags(s);buttons=[i for i,(tag,v)in enumerate(tree.nodes)if tag=='button'and v.get('class')=='school-station'];assert len(buttons)==1,'ART16 actual school object loop missing'
 i=buttons[0];v=tree.nodes[i][1];assert v.get('v-for')=="school in ['sword','talisman'] as const"and v.get('@click')=="emit('school',school)"and v.get(':disabled')=='!!schoolReason(school)'and v.get(':aria-pressed')=='game.school===school','ART16 original school domain/action/gate lost'
 assets=[j for j,(tag,v)in enumerate(tree.nodes)if tag=='assetimage'and v.get(':asset-id')=="'school-station-'+school"];assert len(assets)==1 and i in tree.ancestors[assets[0]],'ART16 actual painting parent detached'
 j=assets[0];v=tree.nodes[j][1];assert v.get(':path')=="'art/v2/schools/'+school+'-station-v1.webp'"and v.get('fit')=='contain','ART16 actual runtime path/fit'
 assert any(tag=='gameicon'and v.get('kind')=='skill'and v.get(':id')=='C.startingLoadouts[school].builder'and j in tree.ancestors[n]for n,(tag,v)in enumerate(tree.nodes)),'ART16 actual failed-art fallback'
 assert 'loadout-node-'in s and 'game.loadout[slot]'in s and "C.skills[id].name"in s and 'schoolReason(school)'in s,'ART16 complete summary/starting arts lost'
 return recorded,2,len(native)
