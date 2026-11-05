from uir33_07_inventory import prior_uir3307_bytes
from uir33_06_inventory import prior_uir3306_bytes
"""ART31 physical life reading, exact original controls and one blank decorative desk."""
import hashlib,json,re
LEDGER='art/redesign/art31.json'
BASE='art/production/art31'
RUNTIME='web/public/art/v2/life/archive-v1.webp'
FILES=['web/src/LifeScroll.vue', 'web/src/LifeCatalogue.vue', 'web/src/art12-narrative.css']
REFS=['docs/decisions/0067-life-scroll-art31-contract.md', 'goal-4/amendments/2026-10-29-goal-continue-art31.md', 'goal-4/research/art31-design-sources.json', 'goal-4/evidence/art31/LifeScroll.vue.before.txt', 'goal-4/evidence/art31/LifeCatalogue.vue.before.txt', 'goal-4/evidence/art31/art12-narrative.css.before.txt', 'goal-4/evidence/art30/next-life-art-debt.jpg']
BASELINES=[{'path': 'goal-4/evidence/art31/LifeScroll.vue.before.txt', 'bytes': 3863, 'sha256': 'e761a9134477ed98057e1886ad8723cc1e5da7543539cfe4c7001e98a4e796c1'}, {'path': 'goal-4/evidence/art31/LifeCatalogue.vue.before.txt', 'bytes': 3955, 'sha256': '09270a81c17dffaacd89255e465abec304c4156dc00dcae6b7978332a3ebbc20'}, {'path': 'goal-4/evidence/art31/art12-narrative.css.before.txt', 'bytes': 9721, 'sha256': '59c84073a8c5f9d95e34b3247a67f0da3f40b47005d3e8a19fe81b588f0e5835'}]
UNCHANGED={'web/src/ActionFeedbackStage.vue': 'c0430cb6202624a1f4135556cfadfb17541fa38ca7d8bf29c8079080bc8ffcdb', 'web/src/action-feedback.ts': 'e947bb62b1de54e51f172a2d412110ea662a01b599f0b97061e8c238f31a3606', 'web/src/action-motion.css': 'b14bcc27fa59527b32e817a164ca7f546337f4520aa02f4cb7001895460bd495', 'web/src/narrative-effects.ts': 'ca77c93e636c43fc5c57b1f7b7a3f85bef58aa00f135affe217919b64470b615', 'web/src/NarrativeStageHost.vue': 'e195b09b7485b48e88883a830ca2c0b352da396e62f6457e5ff30c0168d9630d', 'web/src/NarrativePanel.vue': '8bb4f2e0c06f623e322b2b13dabe6569982c24bbaa56d68c4c6391be756a17dc', 'web/src/FateCatalogue.vue': 'da3efbc6ebfd68d042a07ce3e89343299b94094ad3d2590f77005e61780763a2', 'web/src/EncounterTable.vue': '0c73263444112e4d6bc010201750dd836aaef36d03ee612868124afe8033ccf7', 'web/src/ResponseTable.vue': 'b9ff7f201a14b826085e0e2dbff7c0eba42633684ab20a34a2f058e368e7974e', 'web/src/reading-memory.ts': '8e7a0718edb07113e30f817df5ea98180455e1ea4a7f481a10c72b3657357808', 'web/src/journal-anchors.ts': 'fde853e92c68dd10ad9c14994c41a3157646c5245022b1f8061e4dd0e5aa2605', 'web/src/story-pages.ts': 'f75cc6730dc6b949ce7344aa79e54e6b84ac6f31d30661659e6d300be4df0fb7', 'web/src/play-flow.ts': 'ec31aeb151728b37a6de4f65f17df9020fed7407194cd02df1330a0e69ad0e76', 'web/src/CataloguePager.vue': 'b5069cf0f229edb66c1e2779cd3542d98bc8a05e292a485c71c2627a652694c0', 'web/src/focus.ts': '8ae91e78a4db7a854c293fc4b1bc28f02dd0d542b3119cff383f9245b4944eea', 'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7', 'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21', 'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73', 'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815', 'src/full/milestones.ts': 'e91f58cf0002945f679649964b5a70e7226e0890b623719b24df2c02bac09492', 'src/full/queries.ts': 'eab721ecd066440d8babe11f36664300d21df2d1cf15f10d1160c7cb2a880d48'}
BUDGETS={'oldCssCap': 14000, 'oldNarrativeCap': 45000, 'oldStoryCap': 48000, 'oldFeedbackCap': 34000, 'newRasterAssets': 1, 'maxRuntimeBytes': 280000, 'runtimeWidth': 1536, 'runtimeHeight': 768}
SOURCE_SHA='7eb3c74516376147bb8de74b827bff85975c5e549d2fd007519d398bafe353ae'
RUNTIME_SHA='4bbf44de73b950dfb0d915edeb1ef24e3f299017a3b4ea31e5041e197bdcdf47'

def validate_art31(root,image_reader):
 root=root.resolve()
 if not(root/LEDGER).exists():
  assert not(root/RUNTIME).exists(),'ART31 unrecorded scene'
  return set(),0,0
 def local(n):
  assert type(n)is str and n and not n.startswith('/')and'..'not in n.split('/')and'\\'not in n,'ART31 local path'
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'ART31 missing input';return p
 def digest(n):return hashlib.sha256(prior_uir3306_bytes(n,prior_uir3307_bytes(n,local(n).read_bytes()))).hexdigest()
 def identity(r):
  raw=prior_uir3306_bytes(r['path'],local(r['path']).read_bytes());assert type(r['bytes'])is int and r['bytes']==len(raw) and r['sha256']==digest(r['path']),'ART31 actual identity';return raw
 m=json.loads(local(LEDGER).read_text());assert m['format']=='chenyuan-life-scroll-art31'and type(m['version'])is int and m['version']==1 and m['userAcceptance']is False,'ART31 header'
 assert m['budgets']==BUDGETS and all(type(v)is int for v in m['budgets'].values()),'ART31 fixed typed caps'
 assert [r['path']for r in m['files']]==FILES and m['sourceReferences']==REFS and m['baselines']==BASELINES and m['unchanged']==UNCHANGED,'ART31 original scope and sources'
 for r in m['files']+BASELINES:identity(r)
 for n in REFS:local(n)
 from art32_inventory import normalize_art32_view
 for n,h in UNCHANGED.items():assert (hashlib.sha256(normalize_art32_view(n,local(n).read_text()).encode()).hexdigest()if n in ['web/src/NarrativePanel.vue','web/src/ResponseTable.vue']else digest(n))==h,'ART31 original renderer/reading/clock/proof'
 assert local(FILES[-1]).stat().st_size<=14000,'ART31 old CSS cap'
 for key,field,cap in [('narrative-objects','maxNativeBytes',45000),('story-journey','maxNewBytes',48000),('action-feedback','maxBytes',34000)]:
  d=json.loads(local('art/redesign/'+key+'.json').read_text());assert d[field]==cap and sum(local(r['path']).stat().st_size for r in d['files'])<=cap,'ART31 original group cap'
 original=identity(BASELINES[0]).decode();expected=original.replace('class="life-scroll narrative-object"','class="life-scroll narrative-object art31-scroll"',1)
 scene='  <AssetImage class="art31-desk" path="art/v2/life/archive-v1.webp" asset-id="life-archive" eager aria-hidden="true"><span class="art31-desk-fallback"/></AssetImage>\n'
 expected=expected.replace('  <div class="life-scroll-title">',scene+'  <div class="life-scroll-title">',1)
 binding='<div class="life-scroll-binding"><i class="life-scroll-cord" aria-hidden="true"/><strong>{{seal}}</strong></div>'
 expected=expected.replace(binding,'',1).replace('<div class="life-scroll-title"><slot name="heading"/></div>','<div class="life-scroll-title"><slot name="heading"/>'+binding+'</div>',1).replace('class="narrative-seal-space"','class="narrative-seal-space art30"',1).replace('<small>翻卷只阅读，不推进年月。</small><button ref="opener"','<small>翻卷只阅读，不推进年月。</small><slot name="pagination"/><button ref="opener"',1)
 expected=expected.replace('<div class="narrative-seal-space art30" aria-hidden="true"/>','<div class="narrative-seal-space art30" aria-hidden="true"><strong v-if="effect&&!store?.error" class="art31-imprint" data-testid="art31-imprint" :data-sequence="effect.sequence">{{seal}}</strong></div>',1)
 assert local(FILES[0]).read_text()==expected,'ART31 exact view geometry/original full life script'
 original=identity(BASELINES[1]).decode();pager='<CataloguePager :page="paged.page" :pages="paged.pages" :total="paged.total" label="生平" @change="page=$event"/>'
 assert original.count(pager)==1,'ART31 original unique pager'
 expected=original.replace(pager,'',1).replace('</nav></template>\n   <article','</nav></template><template #pagination>'+pager+'</template>\n   <article',1);assert prior_uir3306_bytes(FILES[1],local(FILES[1]).read_bytes()).decode()==expected,'ART31 exact parent-owned pagination slot and original all management controls'
 css=local(FILES[-1]).read_text();old=identity(BASELINES[-1]).decode();assert css.startswith(old),'ART31 previous CSS domains altered'
 extra=css[len(old):];assert all(s in extra for s in ['art31-scroll','art31-desk','grid-template-columns:150px','life-scroll-tools','life-scroll-copy','white-space:break-spaces']),'ART31 real physical reading consumers'
 assert not re.search(r'@import|@font-face|https?://|file://|@media',extra),'ART31 external IO/font/compatibility rules'
 f=json.loads(local(BASE+'/export-facts.json').read_text());assert m['asset']==f and f['format']=='chenyuan-art31-export'and type(f['version'])is int and f['version']==1 and f['userAcceptance']is False,'ART31 export facts'
 identity(f['producer']);identity(f['helper']);assert f['producer']['path']=='art/tools/export_art31_scene.py'and f['helper']['path']=='art/tools/export_art10_blanks.py'and f['encoding']==['cwebp','-q','82','-m','6','-resize','1536','0','-metadata','none'],'ART31 established export'
 for key,h in [('source',SOURCE_SHA),('runtime',RUNTIME_SHA)]:
  r=f[key];raw=identity(r);dims,alpha,fmt=image_reader(raw,local(r['path']).suffix);assert r['sha256']==h and dims==r['dimensions']and alpha==r['alpha']and fmt==r['format']and r['alphaProof']['min']==r['alphaProof']['max']==255,'ART31 actual opaque image'
 assert f['source']['dimensions']==dict(width=1774,height=887)and f['runtime']['path']==RUNTIME and f['runtime']['dimensions']==dict(width=1536,height=768)and f['runtime']['bytes']<=280000,'ART31 actual asset bounds'
 assert f['transform']==dict(uniformScale=1536/1774,crop=False,semanticEdit=False,outputWidth=1536,outputHeight=768)and f['doubleExport']==dict(bytesEqual=True,firstSHA256=RUNTIME_SHA,secondSHA256=RUNTIME_SHA,sourceUnchanged=True),'ART31 deterministic full export'
 identity(f['audit']);a=json.loads(local(f['audit']['path']).read_text());assert a['kind']=='local audit of actual built-in tool result; not a provider-signed receipt'and a['model']is None and a['requestId']is None and a['originalsKept']is True and a['userAcceptance']is False and len(a['calls'])==len(f['prompts'])==1,'ART31 honest actual audit'
 identity(a['reference']);identity(a['selectedCopy']);assert a['reference']['path']==REFS[-1]and a['selectedCopy']=={k:f['source'][k]for k in ['path','bytes','sha256']}and a['calls'][-1]['generatedSHA256']==SOURCE_SHA,'ART31 actual selected/reference chain'
 for row,prompt in zip(a['calls'],f['prompts']):
  identity(row['candidate']);identity(prompt);assert row['prompt']==prompt and row['candidate']['sha256']==row['generatedSHA256']and row['requestedTransparent']is False,'ART31 actual candidate'
  literal=json.loads(local(prompt['path']).read_text());assert literal['mode']=='built-in'and literal['tool']=='image_gen.imagegen'and literal['transparent_background']is False and literal['promptSHA256']==hashlib.sha256(literal['prompt'].encode()).hexdigest()and literal['generatedOriginal']==row['generatedOriginal'],'ART31 literal prompt'
 names={LEDGER,*FILES,*REFS,*UNCHANGED,BASE+'/export-facts.json',f['source']['path'],RUNTIME,f['producer']['path'],f['helper']['path'],f['audit']['path'],*[r['candidate']['path']for r in a['calls']],*[p['path']for p in f['prompts']]}
 return names,1,f['runtime']['bytes']
