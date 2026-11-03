from ux30_inventory import prior_ux30_bytes
"""ART06 identity, fixed budgets and real consumers; no runtime or visual acceptance."""
import hashlib,json,re
from pathlib import PurePosixPath

NATIVE=['web/src/CultivationStageHost.vue','web/src/CultivationSite.vue','web/src/MilestoneGate.vue','web/src/GoalBoard.vue','web/src/cultivation-effects.ts','web/src/cultivation-objects.css','web/src/milestone-objects.css']
PROMPT='art/redesign/receipts/cultivation-prompts.json'
RECEIPT='art/redesign/receipts/player-seated-cold.json'
SOURCE='art/redesign/characters/player-seated-cold-v1.png'
RUNTIME='web/public/art/v2/characters/player-seated-cold.webp'
REFERENCE='art/redesign/characters/player-v1.png'
REFS=['docs/decisions/0029-cultivation-object-art-contract.md','goal-4/amendments/2026-10-24-art06.md','goal-4/research/art06-sources.json',PROMPT]
ENCODING=['cwebp','-q','82','-m','6','-alpha_q','100','-resize','512','0','-metadata','none']
BUDGETS=dict(nativeBytes=45000,goalPanelBytes=19000,newAssets=1,runtimeWidth=512,runtimeHeight=512,maxRuntimeBytes=160000)
BINDINGS={
 'web/src/App.vue':['import CultivationStageHost','<CultivationStageHost','</CultivationStageHost>','<CultivationSite','<MilestoneGate'],
 'web/src/TrainingPlanner.vue':['import CultivationSite','<CultivationSite','#parameters'],
 'web/src/GoalPanel.vue':['import GoalBoard','<GoalBoard','<ProgressTrack'],
 'web/src/PreparationPanel.vue':['import GoalBoard','<GoalBoard','#conditions','#routes'],
 'web/src/CultivationStageHost.vue':['useCultivationStage','provide(cultivationStageKey,stage)','<slot'],
 'web/src/CultivationSite.vue':['useCultivationObject',"import './cultivation-objects.css'",'art/v2/characters/player-seated-cold.webp','data-testid="cultivation-site"'],
 'web/src/MilestoneGate.vue':['useCultivationMilestone',"import './milestone-objects.css'",'data-testid="milestone-gate"'],
 'web/src/GoalBoard.vue':['data-testid="goal-object-board"','name="conditions"','name="routes"'],
 'web/src/cultivation-effects.ts':['useActivityPresentation','cultivationTarget','cultivationObjectMatches','cultivationGateMatches','milestone?7:1','command.count===1','command.method===a.plan.method','a.realm===game.core.player.realm','delivery!==sequence'],
 'web/src/use-activity-effect.ts':['createActivityEffectTracker(matches,extra)','extra:0|1|4|5|7=0'],
 'web/src/activity-effects.ts':['extra:0|1|4|5|7=0','a.version&&[2,3,6,extra].includes(a.version)','resolve(before,command)','completeActivity(g,prior,r,','proof(resolved.nextState)!==proof(g)','proof(expected)!==proof(a)'],
}
DEPENDENCIES=list(BINDINGS)+['art/redesign/catalogue-art/manifest.json','web/src/ProgressionChoices.vue',REFERENCE,RECEIPT,SOURCE,RUNTIME]

def validate_cultivation_objects(root,image_reader):
 root=root.resolve();ledger=root/'art/redesign/cultivation-objects.json'
 if not ledger.exists():
  assert not any((root/p).exists()for p in NATIVE),'Unrecorded cultivation object source'
  return set(),0,0
 def local(path):
  assert type(path)is str and path and '\\'not in path and not PurePosixPath(path).is_absolute() and '..'not in PurePosixPath(path).parts,'Invalid cultivation relative path'
  p=(root/path).resolve();assert p.is_relative_to(root)and p.is_file(),'Missing or external cultivation file'
  return p
 assert ledger.resolve().is_relative_to(root)and ledger.is_file(),'Cultivation ledger escapes repository'
 m=json.loads(ledger.read_text())
 assert type(m)is dict and set(m)=={'format','version','task','budgets','files','goalPanel','assets','sourceReferences','bindings','userAcceptance'},'Cultivation ledger shape changed'
 assert m['format']=='chenyuan-cultivation-objects'and type(m['version'])is int and m['version']==1 and m['task']=='Goal4 ART06','Cultivation header changed'
 assert type(m['budgets'])is dict and m['budgets']==BUDGETS and all(type(v)is int for v in m['budgets'].values()),'Cultivation budget changed'
 assert m['userAcceptance']is False,'Cultivation checks cannot claim human acceptance'
 assert m['sourceReferences']==REFS and m['bindings']==BINDINGS,'Cultivation reference/consumer contract changed'
 for p in REFS:local(p)
 def identity(row):
  assert type(row)is dict and set(row)=={'path','bytes','sha256'},'Cultivation source identity shape changed'
  b=prior_ux30_bytes(row['path'],local(row['path']).read_bytes())
  assert type(row['bytes'])is int and row['bytes']==len(b),'Cultivation source bytes changed'
  assert type(row['sha256'])is str and re.fullmatch('[0-9a-f]{64}',row['sha256'])and row['sha256']==hashlib.sha256(b).hexdigest(),'Cultivation source hash changed'
  return len(b)
 assert type(m['files'])is list and all(type(r)is dict for r in m['files'])and[r.get('path')for r in m['files']]==NATIVE,'Cultivation seven-source inventory changed'
 total=sum(identity(r)for r in m['files']);assert total<=45000,'Cultivation object code exceeds fixed budget'
 assert type(m['goalPanel'])is dict and m['goalPanel'].get('path')=='web/src/GoalPanel.vue'and identity(m['goalPanel'])<=19000,'GoalPanel exceeds whole-file budget'
 for p,fragments in BINDINGS.items():
  assert all(f in local(p).read_text()for f in fragments),'Missing cultivation consumer: '+p
 app=local('web/src/App.vue').read_text();host=re.search(r'<CultivationStageHost\b[^>]*>(.*?)</CultivationStageHost>',app,re.S)
 assert host and all('<'+tag in host[1]for tag in ['CultivationSite','MilestoneGate','TrainingPlanner']),'Cultivation host is not stable across actual objects'
 assert re.search(r'<KeepAlive\b[^>]*>\s*<TrainingPlanner\b',host[1]),'Cultivation host lost the original planner lifetime'
 helper=local('web/src/cultivation-effects.ts').read_text()
 domain=re.search(r'function cultivationMilestoneMatches\([^)]*\)\{[^\n]*?\[([^\]]*)\]',helper)
 assert domain and re.findall(r"'([^']*)'",domain[1])==['CHOOSE','BREAKTHROUGH','START_TRIAL'],'Cultivation finite action domain changed'
 assert "a.version===1&&a.plan.kind==='cultivation'"in helper,'Cultivation v1 domain changed'
 assert '<CatalogueArt'not in local('web/src/PreparationPanel.vue').read_text(),'Old painting token cannot substitute for the preparation object'
 catalogue=json.loads(local('art/redesign/catalogue-art/manifest.json').read_text())
 paint_binding=['<CatalogueArt :kind="kind===\'cultivation\'?\'study\':\'alchemy\'"']
 assert 'web/src/PreparationPanel.vue'not in catalogue['bindings']and catalogue['bindings'].get('web/src/ProgressionChoices.vue')==paint_binding,'Old painting consumer is not the actual surviving route comparison'
 assert all(f in local('web/src/ProgressionChoices.vue').read_text()for f in paint_binding),'Old painting lost its real surviving consumer'
 assert type(m['assets'])is list and len(m['assets'])==1,'Cultivation has exactly one new raster slot'
 asset=m['assets'][0];assert type(asset)is dict and set(asset)=={'id','source','runtime','receipt'}and asset['id']=='player-seated-cold','Cultivation raster identity changed'
 for key,path,fmt in [('source',SOURCE,'png'),('runtime',RUNTIME,'webp')]:
  row=asset[key];assert type(row)is dict and set(row)=={'path','bytes','sha256','dimensions','alpha','format'}and row['path']==path,'Cultivation image path/shape changed'
  b=local(path).read_bytes();assert type(row['bytes'])is int and row['bytes']==len(b)and row['sha256']==hashlib.sha256(b).hexdigest(),'Cultivation image identity changed'
  dimensions,alpha,format=image_reader(b,local(path).suffix)
  assert row['dimensions']==dimensions and type(row['alpha'])is bool and row['alpha']is alpha is True and row['format']==format==fmt,'Cultivation image header/alpha changed'
 assert asset['runtime']['dimensions']==dict(width=512,height=512)and asset['runtime']['bytes']<=160000,'Cultivation runtime dimensions/bytes exceeded'
 assert all(type(n)is int and 512<=n<=8192 for n in asset['source']['dimensions'].values()),'Cultivation source dimensions invalid'
 ref=asset['receipt'];assert type(ref)is dict and set(ref)=={'path','sha256'}and ref['path']==RECEIPT,'Cultivation receipt reference changed'
 raw=local(RECEIPT).read_bytes();assert ref['sha256']==hashlib.sha256(raw).hexdigest(),'Cultivation receipt hash changed'
 r=json.loads(raw);prompt=json.loads(local(PROMPT).read_text())
 assert r['id']==asset['id']and r['tool']=='built-in image_gen'and r['copiedUnchanged']is True and r['userAcceptance']is False,'Cultivation provenance/acceptance changed'
 assert r['source']==asset['source']and r['runtime']==asset['runtime']and r['savedPath']==SOURCE and r['sourceSHA256']==asset['source']['sha256'],'Cultivation receipt facts changed'
 assert r['promptReference']==PROMPT and prompt['task']=='ART06'and prompt['tool']=='built-in image_gen'and prompt['transparentBackground']is True and type(prompt['prompt'])is str and prompt['prompt'].strip(),'Cultivation exact prompt missing'
 assert r['promptSHA256']==hashlib.sha256(prompt['prompt'].encode()).hexdigest()and r['sourcePath']==prompt['generatedPath'],'Cultivation prompt/original identity changed'
 assert prompt['referenceImages']==[dict(path=REFERENCE,role='identity and costume reference only')],'Cultivation identity reference changed'
 assert r['referenceImages']==[dict(path=REFERENCE,sha256=hashlib.sha256(local(REFERENCE).read_bytes()).hexdigest(),role='identity/costume reference only')],'Cultivation reference image hash changed'
 assert r['encoding']==ENCODING and type(r['encoderVersion'])is str and r['encoderVersion'].strip(),'Cultivation export settings changed'
 decode=r['decodeProof'];assert type(decode)is dict and set(decode)=={'decoder','sourceRGBASHA256','runtimeRGBASHA256','alphaDefinitions'}and decode['decoder']=='Pillow'and all(type(decode[k])is str and re.fullmatch('[0-9a-f]{64}',decode[k])for k in ['sourceRGBASHA256','runtimeRGBASHA256']),'Cultivation real RGBA decode evidence absent'
 assert decode['alphaDefinitions']==dict(transparentPixels='alpha=0',solidPixels='alpha>=250',intermediatePixels='1<=alpha<250'),'Cultivation alpha definitions changed'
 for key,image in [('alphaProof',asset['source']),('runtimeAlphaProof',asset['runtime'])]:
  a=r[key];assert type(a)is dict and set(a)=={'transparentPixels','solidPixels','intermediatePixels','min','max'}and all(type(v)is int for v in a.values()),'Cultivation alpha facts malformed'
  assert a['transparentPixels']>10000 and a['solidPixels']>10000 and a['intermediatePixels']>=0 and a['min']==0 and 250<=a['max']<=255,'Cultivation alpha evidence invalid'
  assert a['transparentPixels']+a['solidPixels']+a['intermediatePixels']==image['dimensions']['width']*image['dimensions']['height'],'Cultivation alpha counts do not cover actual dimensions'
 assert r['review']['actuallyViewed']is True and type(r['review']['scope'])is str and r['review']['scope'].strip(),'Cultivation source review absent'
 e=r['exportProof'];assert type(e)is dict and e.get('sourceUnchanged')is True and e.get('runtimeUnchanged')is True and type(e.get('reencodedBytes'))is int and e==dict(sourceUnchanged=True,runtimeUnchanged=True,reencodedBytes=asset['runtime']['bytes'],reencodedSHA256=asset['runtime']['sha256'],encoderVersion=r['encoderVersion']),'Cultivation deterministic export proof changed'
 return {SOURCE,RUNTIME},1,total
