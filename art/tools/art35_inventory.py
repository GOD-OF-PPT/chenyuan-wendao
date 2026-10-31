from ux29_inventory import normalize_ux29_ritual
from ux28_inventory import normalize_ux28_recovery
"""ART35 calm props; old renderers reverse to their full original ownership proofs."""
import hashlib,json,re
from pathlib import PurePosixPath
from ta09_inventory import Tags
LEDGER='art/redesign/art35.json'
FILES=['web/src/jade-paint.ts', 'web/src/art35-study-rest.css']
PARENTS=['web/src/JadeEngraving.vue', 'web/src/RecoveryRitual.vue']
BASELINES=[{'path': 'goal-4/evidence/art35/JadeEngraving.vue.before.txt', 'bytes': 6403, 'sha256': '1c1b94c82d145c504fda7c8de43dffacedcdf1db87c9f9579fcefac3bec15c1a'}, {'path': 'goal-4/evidence/art35/RecoveryRitual.vue.before.txt', 'bytes': 9258, 'sha256': '9764760b03850ce35a4bab251228ea29983b1dba3615fa31bc4d0ad8e3ef0c88'}]
REFS=['docs/decisions/0079-study-rest-art35-contract.md', 'goal-4/amendments/2026-10-31-goal-art35.md', 'goal-4/research/art35-sources.json', 'goal-4/evidence/art35/JadeEngraving.vue.before.txt', 'goal-4/evidence/art35/RecoveryRitual.vue.before.txt']
BUDGETS={'newNativeBytes': 7200, 'hookBytes': 2400, 'cssBytes': 4800, 'jadeDeltaBytes': 800, 'recoveryDeltaBytes': 400, 'newRasterAssets': 8, 'maxCoverBytes': 100000, 'maxLeafBytes': 40000, 'maxRuntimeBytes': 740000, 'coverWidth': 512, 'coverHeight': 512, 'leafWidth': 128, 'leafHeight': 512, 'oldTA09Cap': 30000, 'oldSupplyCap': 40000}
UNCHANGED={'web/src/JadeStudyScene.vue': '434b16c05e5e6870cb67dc1f6611a81637864b0e20463c8bfd93e4c395d675ed', 'web/src/LearningPlanner.vue': '916581594274b568bf22fea242edacf375c7cf53a96ec4ca3766adad58db3d1b', 'web/src/RecoveryPlanner.vue': '478733b74bf51b209901a7e7328ea92269a77a30ab41c56c400ddd8b40ef78a9', 'web/src/equipment-effects.ts': '0946c3b6b76e5ea39ebd80571175e2835ce49abe94fe6499f480b1635a934888', 'web/src/supply-effects.ts': '6b11c6aab3e634831854d0c1723b76916bbb26fdbccf640e4adc6e043ee72a19', 'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7', 'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21', 'web/src/activity-persistence.ts': 'a5100e6f2d84b627ef17800bfc8f17f3f533566db47f35faab3833da66bab4cf', 'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815', 'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73'}
RUNTIME_SHA={'heart': '8ffb2310476341c75d598e97dee3084da8a076976922e002297d6baaae17e7bb', 'blade': 'f5bab2000a85d7ce3644bd50f4689a4a9c71388e7c39ba4f19aa3addcf456432', 'scroll': '1cb635a6b7b6adf76bf6242087b56fb1b12b1b0c185a079f04e252aa05bce3cb', 'knot': '1b6ae27e64b564e7d3177689adddc466546b3d902cc538b0c419176baad2b096', 'seal': '21962bbfcf8b5a6659cf67026e9234b7eb323e6076a71ab4afad24c00953b389', 'fan': '1d391be6c90e887592b30c914817c952eb27f1ef29a8633c389658c1da8fc273', 'manual': 'd73b465c36b644313855e28b67e341e815aa8b0aec94c0d34648be0720f1d126', 'leaf': 'f090d0bcc40acafc90828e883ba054fcffa8a58d8f26a6c475d125f2f0178bfc'}
SOURCE_SHA={'heart': 'e8806142c853da983f27ebbdfde4ccba28a94812faac3d889097a88b804a1e81', 'blade': 'd178c4cf3f352a99740158cc60058bfc91f19473842b3f874b75ea82222abfa1', 'scroll': '4a86f1e132362f43e549a0c3550f9a8feeec4d7513fb5e6281c33f0210e29cdd', 'knot': 'a143a3a8ebfb11238897ce3dbd97a0ea91cece9de122260bb5b3571a7bb09e51', 'seal': '3e76960d9b602166238f24a94e2540476a9fdd4fa1b8e36699f1969f459c53b1', 'fan': '4f78ec19a23db1a230f4140f3d0eb5e0b91b878a9d0538ecb1f160431670cb62', 'manual': '3bab008f65388bf1fa35f3bfd49dd0a64bb1d8e1e9974b3d5b44b43a96478fdd', 'leaf': 'ac9cdb030f0c48537691353c84012bfe47f4d17d9b6d12504f00fdd92ed3f8e8'}
JADE_TRANSFORMS=[["import {computed,onDeactivated,ref,useId,watch} from 'vue';", "import {computed,onDeactivated,ref,useId,watch} from 'vue';\nimport {useJadePaint} from './jade-paint';"], ['const variant=computed', 'const artwork=useJadePaint(form);\nconst variant=computed'], ['data-testid="jade-engraving"', 'data-testid="jade-engraving" :data-painted="artwork.ready.value"'], ['<g class="ta09-jade-case" :data-form="form">', '<g class="ta09-jade-case" :data-form="form">\n     <image :key="artwork.cover.value" class="jade-painted-cover" data-jade-part="cover" :href="artwork.cover.value" x="50" y="18" width="180" height="188" @load="artwork.set($event,true)" @error="artwork.set($event,false)"/>'], ['<g v-for="n in 5" :key="n" class="ta09-jade-page" :style="{\'--page-index\':n-3}">', '<g v-for="n in 5" :key="n" class="ta09-jade-page" :style="{\'--page-index\':n-3}">\n      <image class="jade-painted-leaf" data-jade-part="page" :href="artwork.page" x="125" y="47" width="34" height="128" @load="artwork.set($event,true)" @error="artwork.set($event,false)"/>']]
def normalize_art35_jade(text):
 if JADE_TRANSFORMS[0][1]not in text:return text
 for before,after in reversed(JADE_TRANSFORMS):
  assert text.count(after)==1,'ART35 unique approved jade display'
  text=text.replace(after,before,1)
 assert hashlib.sha256(text.encode()).hexdigest()==BASELINES[0]['sha256'],'ART35 original complete jade source'
 return text

RECOVERY_TRANSFORMS=[["import GameIcon from './GameIcon.vue';", "import GameIcon from './GameIcon.vue';\nimport AssetImage from './AssetImage.vue';\nimport './art35-study-rest.css';"], ['<div v-else class="recovery-sitting"><GameIcon kind="nav" id="cultivate"/></div>', '<div v-else class="recovery-sitting"><AssetImage path="art/v2/characters/player-seated-cold.webp" asset-id="resting-self" fit="contain" eager><GameIcon kind="nav" id="cultivate"/></AssetImage></div>']]
def normalize_art35_recovery(text):
 text=normalize_ux29_ritual(text)
 if RECOVERY_TRANSFORMS[0][1]not in text:return text
 for before,after in reversed(RECOVERY_TRANSFORMS):
  assert text.count(after)==1,'ART35 unique approved recovery display'
  text=text.replace(after,before,1)
 assert hashlib.sha256(text.encode()).hexdigest()==BASELINES[1]['sha256'],'ART35 original complete recovery source'
 return text

def validate_art35(root,image_reader):
 root=root.resolve()
 if not(root/LEDGER).exists():
  assert not(root/FILES[0]).exists(),'ART35 unrecorded artwork loader'
  return set(),0,0
 def local(name):
  assert type(name)is str and not PurePosixPath(name).is_absolute()and'..'not in PurePosixPath(name).parts and'\\'not in name,'ART35 local path'
  path=root/name;assert path.is_file()and not path.is_symlink()and path.resolve().is_relative_to(root),'ART35 missing input'
  return path
 recorded={LEDGER,*FILES,*PARENTS,*REFS,*UNCHANGED}
 def identity(row):
  data=local(row['path']).read_bytes();recorded.add(row['path'])
  assert row['sha256']==hashlib.sha256(data).hexdigest(),'ART35 actual identity'
  if'bytes'in row:assert type(row['bytes'])is int and row['bytes']==len(data),'ART35 actual bytes'
  return data
 m=json.loads(local(LEDGER).read_text())
 assert m['format']=='chenyuan-study-rest-art35'and type(m['version'])is int and m['version']==1 and m['userAcceptance']is False,'ART35 header'
 assert m['budgets']==BUDGETS and all(type(v)is int for v in m['budgets'].values()),'ART35 fixed typed budget'
 assert [r['path']for r in m['files']]==FILES and[r['path']for r in m['parents']]==PARENTS and m['baselines']==BASELINES and m['sourceReferences']==REFS and m['unchanged']==UNCHANGED,'ART35 exact scope'
 for row in m['files']+m['parents']+BASELINES:identity(row)
 for name in REFS:local(name)
 assert sum(local(n).stat().st_size for n in FILES)<=7200 and local(FILES[0]).stat().st_size<=2400 and local(FILES[1]).stat().st_size<=4800,'ART35 pure view budget'
 for name,h in UNCHANGED.items():assert hashlib.sha256(normalize_ux28_recovery(local(name).read_text()).encode()if name=='web/src/RecoveryPlanner.vue'else local(name).read_bytes()).hexdigest()==h,'ART35 original activity and rule owners'
 for name,baseline,normalize,cap in zip(PARENTS,BASELINES,[normalize_art35_jade,normalize_art35_recovery],[800,400]):
  text=local(name).read_text();assert normalize(text).encode()==identity(baseline),'ART35 complete original renderer'
  assert local(name).stat().st_size-baseline['bytes']<=cap,'ART35 bounded original renderer delta'
 for ledger,key,cap in [('ta09','nativeBytes',30000),('art04','maxNativeBytes',40000),('art03','maxNativeBytes',45000),('art10','nativeBytes',12000),('idle-preparation','maxNativeBytes',60000)]:
  old=json.loads(local('art/redesign/'+ledger+'.json').read_text());assert old.get('budgets',{}).get(key,old.get(key))==cap and sum(local(r['path']).stat().st_size for r in old['files'])<=cap,'ART35 old cap'
 hook=local(FILES[0]).read_text();css=local(FILES[1]).read_text()
 assert not re.search(r'\b(?:useGame|resolve|completeActivity|setTimeout|setInterval|requestAnimationFrame|fetch|eval)\s*\(|\b(?:indexedDB|localStorage|sessionStorage|BroadcastChannel|WebSocket)\b|Date\.now|performance\.now',hook),'ART35 artwork loader gained Game IO or a clock'
 assert all(token in hook for token in ["image.getAttribute('href')!==(part==='cover'?cover.value:page)","watch(cover,()=>{loaded.value={cover:false,page:loaded.value.page};});","const loaded=ref({cover:false,page:false})","const ready=computed(()=>loaded.value.cover&&loaded.value.page)"]), 'ART35 image ownership and fallback'
 assert not re.search(r'@import|@font-face|https?://|file://|--jade-spread\s*:|display\s*:\s*none|opacity\s*:\s*0',css),'ART35 external style, hidden paint or replaced activity spread'
 assert '[data-painted=true]'in css and '.jade-painted-cover'in css and '.jade-painted-leaf'in css,'ART35 real paint/fallback styles'
 jade=Tags(local(PARENTS[0]).read_text());images=[a for t,a in jade.nodes if t=='image'];assert len(images)==2,'ART35 seven actual cover domains and repeated leaf'
 for part,expression,kind in [('cover','artwork.cover.value','jade-painted-cover'),('page','artwork.page','jade-painted-leaf')]:
  row=next(a for a in images if a.get('data-jade-part')==part)
  assert row.get(':href')==expression and row.get('class')==kind and row.get('@load')=='artwork.set($event,true)'and row.get('@error')=='artwork.set($event,false)','ART35 real loaded artwork binding'
 assert any(t=='g'and a.get('v-for')=='n in 5'and a.get('class')=='ta09-jade-page'for t,a in jade.nodes),'ART35 original five physical leaves'
 recovery=Tags(local(PARENTS[1]).read_text());assert any(t=='assetimage'and a.get('path')=='art/v2/characters/player-seated-cold.webp'and a.get('asset-id')=='resting-self'and a.get('fit')=='contain'for t,a in recovery.nodes),'ART35 real reused calm self'
 identity(m['reusedActor']);assert m['reusedActor']['path']=='web/public/art/v2/characters/player-seated-cold.webp','ART35 exact cold actor'
 facts=json.loads(identity(m['facts']));assert m['facts']['path']=='art/production/art35/export-facts.json'and facts['format']=='chenyuan-study-rest-art35-export'and facts['version']==1 and facts['userAcceptance']is False,'ART35 facts'
 assert [r['name']for r in facts['assets']]==['heart','blade','scroll','knot','seal','fan','manual','leaf'],'ART35 exact form catalogue'
 identity(facts['producer']);identity(facts['helper']);assert facts['producer']['path']=='art/tools/export_art35_props.py'and facts['encoding']==['cwebp','-q','82','-m','6','-alpha_q','100','-metadata','none'],'ART35 deterministic producer'
 def audit(path):
  data=json.loads(local(path).read_text());recorded.add(path)
  assert data['kind']=='local audit of actual built-in tool result; not a provider-signed receipt'and data['model']is None and data['requestId']is None and data['originalsKept']is True and data['requestedTransparent']is True and data['userAcceptance']is False,'ART35 honest audit'
  for key in ['selectedCopy','reference','prompt']:identity(data[key])
  prompt=json.loads(local(data['prompt']['path']).read_text());assert prompt['tool']=='image_gen.imagegen'and prompt['mode']=='built-in'and prompt['transparent_background']is True and prompt['promptSHA256']==hashlib.sha256(prompt['prompt'].encode()).hexdigest(),'ART35 full literal prompt'
  if'previousAudit'in data:identity(data['previousAudit']);audit(data['previousAudit']['path'])
  return data
 total=0
 for row in facts['assets']:
  name=row['name'];runtime=row['runtime'];source=row['source']
  for value,expected in [(source,SOURCE_SHA[name]),(runtime,RUNTIME_SHA[name])]:
   raw=identity(value);assert value['sha256']==expected,'ART35 frozen image identity'
   dims,alpha,fmt=image_reader(raw,local(value['path']).suffix)
   assert dims==value['dimensions']and alpha is True and fmt==value['format'],'ART35 frozen real image'
  expected=dict(width=128 if name=='leaf'else 512,height=512)
  assert runtime['path']==f'web/public/art/v2/study/{name}-v1.webp'and runtime['dimensions']==expected and runtime['bytes']<=(40000 if name=='leaf'else 100000),'ART35 runtime geometry and bytes'
  assert row['runtimeEdgeMax']==[0]*4 and runtime['alphaProof']['min']==0 and runtime['alphaProof']['max']==255,'ART35 complete alpha'
  transform=row['transform'];assert transform['cropOuterAlphaAtMost']==1 and transform['removedOuterMaxAlpha']<=1 and transform['semanticEdit']is False and transform['canvas']==list(expected.values()),'ART35 only negligible outer alpha trim'
  assert row['doubleExport']==dict(bytesEqual=True,firstSHA256=runtime['sha256'],secondSHA256=runtime['sha256'],sourceUnchanged=True),'ART35 double export'
  identity(row['audit']);a=audit(row['audit']['path']);assert a['selectedCopy']=={k:source[k]for k in ['path','bytes','sha256']}and row['prompt']==a['prompt'],'ART35 actual selected call'
  total+=runtime['bytes']
 assert total<=740000,'ART35 total runtime budget'
 return recorded,8,total

