"""ART30 owns four presentation files, a decorative NPC scene and original save/reading boundaries."""
import hashlib,json,re
from narrative_object_inventory import NATIVE as NARRATIVE_FILES
LEDGER='art/redesign/art30.json'
BASE='art/production/art30'
RUNTIME='web/public/art/v2/workshops/npc-parlour-v1.webp'
FILES=['web/src/EncounterTable.vue', 'web/src/ResponseTable.vue', 'web/src/FateCatalogue.vue', 'web/src/ActionFeedbackStage.vue', 'web/src/art12-narrative.css']
REFS=['docs/decisions/0066-npc-meeting-art30-contract.md', 'goal-4/amendments/2026-10-29-goal-continue-art30.md', 'goal-4/research/art30-design-sources.json', 'goal-4/evidence/art30/EncounterTable.vue.before.txt', 'goal-4/evidence/art30/ResponseTable.vue.before.txt', 'goal-4/evidence/art30/FateCatalogue.vue.before.txt', 'goal-4/evidence/art30/art12-narrative.css.before.txt', 'goal-4/evidence/art30/ActionFeedbackStage.vue.before.txt', 'goal-4/evidence/check-art27-29/relationship-art-debt.jpg']
BASELINES=[{'path': 'goal-4/evidence/art30/EncounterTable.vue.before.txt', 'bytes': 5048, 'sha256': '1a06400cfaabd46b4fad0a2d4e025502e8c50ce78da03f4bfd6b4e48f7941cb7'}, {'path': 'goal-4/evidence/art30/ResponseTable.vue.before.txt', 'bytes': 4156, 'sha256': '7bdef986b3605e155aa083bf9bfc9243b8241003bcef0d576808d2b898692751'}, {'path': 'goal-4/evidence/art30/FateCatalogue.vue.before.txt', 'bytes': 9739, 'sha256': 'f00a42f829354632d6f05ce46a76275767cf2fd38d9c8f7f72396524018b4bdc'}, {'path': 'goal-4/evidence/art30/ActionFeedbackStage.vue.before.txt', 'bytes': 10882, 'sha256': 'f5d17de52070256328b2312087cbe6634edaa1c96420a7088fd62bcf25138c93'}, {'path': 'goal-4/evidence/art30/art12-narrative.css.before.txt', 'bytes': 6320, 'sha256': 'c10587eb2190cbcccd5fd1af1e4f199eec53749fff87e7a5e1fb38da1d90ad85'}]
UNCHANGED={'web/src/PortraitImage.vue': 'e7b4b55bdce38f13e38960327bf0d8d767e69058671dc7adf42ce1adf87d5208', 'web/src/NarrativePanel.vue': '8bb4f2e0c06f623e322b2b13dabe6569982c24bbaa56d68c4c6391be756a17dc', 'web/src/NarrativeStageHost.vue': 'e195b09b7485b48e88883a830ca2c0b352da396e62f6457e5ff30c0168d9630d', 'web/src/narrative-effects.ts': 'ca77c93e636c43fc5c57b1f7b7a3f85bef58aa00f135affe217919b64470b615', 'web/src/activity-effects.ts': 'dd697069d134e4e9a935c0186758ebd243d26b29dd9856f4100d21596b4a0f8b', 'web/src/use-activity-effect.ts': 'e15a7b41b897e7d4f29e8be277703efd1f8c32d2dec11d278a41a37c89425163', 'web/src/reading-memory.ts': '8e7a0718edb07113e30f817df5ea98180455e1ea4a7f481a10c72b3657357808', 'web/src/journal-anchors.ts': 'fde853e92c68dd10ad9c14994c41a3157646c5245022b1f8061e4dd0e5aa2605', 'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7', 'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21', 'web/src/focus.ts': '8ae91e78a4db7a854c293fc4b1bc28f02dd0d542b3119cff383f9245b4944eea', 'web/src/ChoiceCard.vue': '322961bb71234da9e284555aad7a568b14b2b4a88cff9736e43cc208d3103e64', 'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73', 'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815', 'src/full/milestones.ts': 'e91f58cf0002945f679649964b5a70e7226e0890b623719b24df2c02bac09492', 'web/public/art/portraits/shen.webp': '7fb1e08bec233fa3ba11f8f56dd645e3772738e80946990ddb0eb8f97b08ba52', 'web/public/art/portraits/lu.webp': 'f3205ef5fc424896898efe8dca19e8871762636c7bb82c7136eea44fd638dff4', 'web/public/art/portraits/pei.webp': '0a1b64def5cd7200a291af8b98790d07048c190318bd4efbee1081bd6c284ad8', 'web/public/art/portraits/yan.webp': '0f68e57915cfa22ef10a88699171ab5aca3889d9e66f1d6d0c8d087f7a04bc52', 'web/src/action-feedback.ts': 'e947bb62b1de54e51f172a2d412110ea662a01b599f0b97061e8c238f31a3606', 'web/src/action-motion.css': 'b14bcc27fa59527b32e817a164ca7f546337f4520aa02f4cb7001895460bd495'}
BUDGETS={'oldNarrativeCap': 45000, 'oldCssCap': 14000, 'oldStoryCap': 48000, 'newRasterAssets': 1, 'maxRuntimeBytes': 280000, 'runtimeWidth': 1536, 'runtimeHeight': 768, 'paintedMinimum': 260, 'oldFeedbackCap': 34000}
SOURCE_SHA='740edf42832e8320e8f39efb30a11065afe40857c2dfd288bf33a535eb6b975a'
RUNTIME_SHA='5682ea34bb0370a7f206f62070398ec24079837777368e7bb7bd64c3e3327620'

def validate_art30(root,image_reader):
 root=root.resolve()
 if not(root/LEDGER).exists():
  assert not(root/RUNTIME).exists(),'ART30 unrecorded scene'
  return set(),0,0
 def local(n):
  assert type(n)is str and n and not n.startswith('/')and'..'not in n.split('/')and'\\'not in n,'ART30 local path'
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'ART30 missing input';return p
 def digest(n):return hashlib.sha256(local(n).read_bytes()).hexdigest()
 def identity(r):
  assert type(r['bytes'])is int and r['bytes']==local(r['path']).stat().st_size and r['sha256']==digest(r['path']),'ART30 actual identity';return local(r['path']).read_bytes()
 m=json.loads(local(LEDGER).read_text());assert m['format']=='chenyuan-npc-meeting-art30'and type(m['version'])is int and m['version']==1 and m['userAcceptance']is False,'ART30 header'
 assert m['budgets']==BUDGETS and all(type(v)is int for v in m['budgets'].values()),'ART30 fixed typed caps'
 assert [r['path']for r in m['files']]==FILES and m['sourceReferences']==REFS and m['baselines']==BASELINES and m['unchanged']==UNCHANGED,'ART30 original scope and sources'
 for r in m['files']+BASELINES:identity(r)
 for n in REFS:local(n)
 for n,h in UNCHANGED.items():assert digest(n)==h,'ART30 original portrait/controller/clock/proof'
 assert local(FILES[-1]).stat().st_size<=14000,'ART30 old CSS cap'
 for key,field,cap in [('narrative-objects','maxNativeBytes',45000),('story-journey','maxNewBytes',48000),('action-feedback','maxBytes',34000)]:
  d=json.loads(local('art/redesign/'+key+'.json').read_text());assert d[field]==cap and sum(local(r['path']).stat().st_size for r in d['files'])<=cap,'ART30 original group cap'
 for i,name in enumerate(['EncounterTable','ResponseTable']):
  original=identity(BASELINES[i]).decode();actor=local(FILES[i]).read_text();condition="['shen','lu','pei','yan'].includes(portrait)"+("&&mode!=='journal'"if i==0 else'')
  marker='class="'+('encounter-table narrative-object art12-encounter'if i==0 else'response-table narrative-object art12-response')+'"'
  expected=original.replace(marker,marker+' :class="{\'art30-meeting\':'+condition+'}"',1)
  pos=expected.index('\n',expected.index(' <div class="'+('encounter-table'if i==0 else'response-table')))
  scene='\n  <AssetImage v-if="'+condition+'" class="art30-parlour" path="art/v2/workshops/npc-parlour-v1.webp" asset-id="npc-parlour" eager aria-hidden="true"><span class="art30-parlour-fallback"/></AssetImage>'
  expected=expected[:pos]+scene+expected[pos:];expected=expected.replace('class="narrative-seal-space"','class="narrative-seal-space" :class="{art30:'+condition+'}"',1);assert actor==expected,'ART30 exact decorative NPC domain/original controller'
 original=identity(BASELINES[2]).decode();button='<button data-testid="show-life" @click="emit(\'life\')">修仙生平</button>';header='<header><div><small>仙缘 · 只记真实来往</small><h2 v-if="mode!==\'people\'">{{mode===\'events\'?\'此地机缘\':\'行道手记\'}}</h2></div>'+button+'</header>'
 expected=original.replace(header,'',1).replace(':aria-pressed="mode===id" @click="mode=id">{{label}}</button></nav>',':aria-pressed="mode===id" @click="mode=id">{{label}}</button>'+button+'</nav>',1);expected=expected.replace("?'下次来往预览':'已记来往'","?'下次来往预览':person?.label==='未识'?'人物图鉴':'已记来往'",1);assert local(FILES[2]).read_text()==expected,'ART30 exact duplicate header retirement/life callback'
 original=identity(BASELINES[3]).decode();start=original.index(' const cast=');end=original.index('\n timer=setTimeout(clear,1600);',start);region=original[start:end];assert region.count('next.operation')==3 and region.count('next.family')==5,'ART30 original repeated fields'
 changed=region.replace('next.operation','op').replace('next.family','family').replace(' const cast=',' const op=next.operation,family=next.family,cast=',1).replace('const target=book||',"const target=book&&book.querySelector('.art30')||book||",1).replace('if(book){','if(book&&target===book){',1)
 assert local(FILES[3]).read_text()==original[:start]+changed+original[end:],'ART30 exact NPC DOM anchor and original full feedback lifecycle'
 css=local(FILES[-1]).read_text();old=identity(BASELINES[-1]).decode();assert css.startswith(old),'ART30 previous CSS domains altered'
 extra=css[len(old):];assert all(s in extra for s in ['art30-meeting','art30-parlour','writing-mode:vertical-rl','narrative-object-paper','var(--art18-command)','data-working=true']),'ART30 actual scene/decision/phase consumption'
 assert not re.search(r'@import|@font-face|https?://|file://|@media',extra),'ART30 external IO/font/compatibility rules'
 f=json.loads(local(BASE+'/export-facts.json').read_text());assert m['asset']==f and f['format']=='chenyuan-art30-export'and type(f['version'])is int and f['version']==1 and f['userAcceptance']is False,'ART30 export facts'
 identity(f['producer']);identity(f['helper']);assert f['producer']['path']=='art/tools/export_art30_scene.py'and f['helper']['path']=='art/tools/export_art10_blanks.py'and f['encoding']==['cwebp','-q','82','-m','6','-resize','1536','0','-metadata','none'],'ART30 established export'
 for key,h in [('source',SOURCE_SHA),('runtime',RUNTIME_SHA)]:
  r=f[key];raw=identity(r);dims,alpha,fmt=image_reader(raw,local(r['path']).suffix);assert r['sha256']==h and dims==r['dimensions']and alpha==r['alpha']and fmt==r['format']and r['alphaProof']['min']==r['alphaProof']['max']==255,'ART30 actual opaque image'
 assert f['source']['dimensions']==dict(width=1774,height=887)and f['runtime']['path']==RUNTIME and f['runtime']['dimensions']==dict(width=1536,height=768)and f['runtime']['bytes']<=280000,'ART30 actual asset bounds'
 assert f['transform']==dict(uniformScale=1536/1774,crop=False,semanticEdit=False,outputWidth=1536,outputHeight=768)and f['doubleExport']==dict(bytesEqual=True,firstSHA256=RUNTIME_SHA,secondSHA256=RUNTIME_SHA,sourceUnchanged=True),'ART30 deterministic full export'
 identity(f['audit']);a=json.loads(local(f['audit']['path']).read_text());assert a['kind']=='local audit of actual built-in tool result; not a provider-signed receipt'and a['model']is None and a['requestId']is None and a['originalsKept']is True and a['userAcceptance']is False and len(a['calls'])==len(f['prompts'])==1,'ART30 honest actual audit'
 identity(a['reference']);identity(a['selectedCopy']);assert a['reference']['path']==REFS[-1]and a['selectedCopy']=={k:f['source'][k]for k in ['path','bytes','sha256']}and a['calls'][-1]['generatedSHA256']==SOURCE_SHA,'ART30 actual selected/reference chain'
 for row,prompt in zip(a['calls'],f['prompts']):
  identity(row['candidate']);identity(prompt);assert row['prompt']==prompt and row['candidate']['sha256']==row['generatedSHA256']and row['requestedTransparent']is False,'ART30 actual candidate'
  literal=json.loads(local(prompt['path']).read_text());assert literal['mode']=='built-in'and literal['tool']=='image_gen.imagegen'and literal['transparent_background']is False and literal['promptSHA256']==hashlib.sha256(literal['prompt'].encode()).hexdigest()and literal['generatedOriginal']==row['generatedOriginal'],'ART30 literal prompt'
 names={LEDGER,*FILES,*REFS,*UNCHANGED,BASE+'/export-facts.json',f['source']['path'],RUNTIME,f['producer']['path'],f['helper']['path'],f['audit']['path'],*[r['candidate']['path']for r in a['calls']],*[p['path']for p in f['prompts']]}
 return names,1,f['runtime']['bytes']
