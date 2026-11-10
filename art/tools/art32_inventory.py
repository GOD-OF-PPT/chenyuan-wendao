from cend13b_response_inventory import prior_response_bytes
from uir34_07_inventory import prior_uir3407_bytes
from uir33_07_inventory import prior_uir3307_bytes
from uir33_06_inventory import prior_uir3306_bytes
"""ART32 precise decorative phase transform and original full-view recovery."""
import hashlib,json,re
TRANSFORMS={'web/src/NarrativePanel.vue': [('class="paper play-catalogue story-book narrative-book stage-story r4-narrative art05-story art12-narrative"', 'class="paper play-catalogue story-book narrative-book stage-story r4-narrative art05-story art12-narrative" :class="{\'art32-narrative\':[\'question\',\'ending\'].includes(model.key)}"'), ('<strong>核对 · {{choice.label}}</strong>', "<strong>{{model.key==='question'?'作答 · ':model.key==='ending'?'收卷 · ':'核对 · '}}{{choice.label}}</strong>"), ('<small>{{choice.detail}}</small>', '<small>{{choice.detail}}</small><small v-if="[\'question\',\'ending\'].includes(model.key)" class="art32-choice-summary" data-testid="milestone-choice-summary">整次 {{seconds(choice.action)}} 秒 · 仅1次 · {{formatCosts(quote(choice.action).actualCosts??quote(choice.action).costs)}}</small>')], 'web/src/ResponseTable.vue': [(':class="{\'art30-meeting\':[\'shen\',\'lu\',\'pei\',\'yan\'].includes(portrait)}"', ':class="{\'art30-meeting\':[\'shen\',\'lu\',\'pei\',\'yan\'].includes(portrait),\'art32-threshold\':[\'question\',\'ending\'].includes(identity)}"'), ('  <aside class="response-presence">', '  <AssetImage v-if="[\'question\',\'ending\'].includes(identity)" class="art32-scene" :path="\'art/v2/milestones/\'+(identity===\'question\'?\'heart-court-v1.webp\':\'heaven-gate-v1.webp\')" :asset-id="\'milestone-\'+identity" fit="contain" eager aria-hidden="true"><span class="art32-scene-fallback"/></AssetImage><i v-if="[\'question\',\'ending\'].includes(identity)" class="art32-pulse" aria-hidden="true"/>\n  <aside class="response-presence">'), ('<PortraitImage class="response-portrait" :id="portrait" :fallback="speaker.slice(0,1)"/>', '<PortraitImage v-if="![\'question\',\'ending\'].includes(identity)" class="response-portrait" :id="portrait" :fallback="speaker.slice(0,1)"/><AssetImage v-else path="art/v2/actors/player-standing-cold-v1.webp" asset-id="milestone-player" fit="contain" class="response-portrait" aria-hidden="true"><span class="portrait-fallback">{{speaker.slice(0,1)}}</span></AssetImage>')]}
def expand_art32_view(path,text):
 for before,after in TRANSFORMS.get(path,[]):
  assert text.count(before)==1,'ART32 original unique template anchor'
  text=text.replace(before,after,1)
 return text

def normalize_art32_view(path,text):
 text=prior_uir3407_bytes(path,text.encode()).decode()
 if path not in TRANSFORMS or 'art32-' not in text:return text
 for before,after in reversed(TRANSFORMS[path]):
  assert text.count(after)==1,'ART32 exact approved decorative transform'
  text=text.replace(after,before,1)
 return text

LEDGER='art/redesign/art32.json'
BASE='art/production/art32'
FILES=['web/src/NarrativePanel.vue', 'web/src/ResponseTable.vue', 'web/src/narrative-objects.css']
BASELINES=[{'path': 'goal-4/evidence/art32/NarrativePanel.vue.before.txt', 'bytes': 6195, 'sha256': '8bb4f2e0c06f623e322b2b13dabe6569982c24bbaa56d68c4c6391be756a17dc'}, {'path': 'goal-4/evidence/art32/ResponseTable.vue.before.txt', 'bytes': 4522, 'sha256': 'b9ff7f201a14b826085e0e2dbff7c0eba42633684ab20a34a2f058e368e7974e'}, {'path': 'goal-4/evidence/art32/narrative-objects.css.before.txt', 'bytes': 12978, 'sha256': 'a271e6c977955e252a18ed34051758989dde3b6b4445ce7401efcb879e6328e9'}]
REFS=['docs/decisions/0068-milestone-decision-art32-contract.md', 'goal-4/amendments/2026-10-29-goal-continue-art32.md', 'goal-4/research/art32-design-sources.json', 'goal-4/evidence/art32/NarrativePanel.vue.before.txt', 'goal-4/evidence/art32/ResponseTable.vue.before.txt', 'goal-4/evidence/art32/narrative-objects.css.before.txt', 'goal-4/evidence/art32/ANSWER_TRIAL-before.jpg', 'goal-4/evidence/art32/END-before.jpg']
UNCHANGED={'web/src/LifeScroll.vue': '1130d9cadbe7d57c4afea5ba3a18bbe84db7a519f6ed0540000a71b3e6890788', 'web/src/LifeCatalogue.vue': '3e0577cf7e071e2aa5282371f30dca2a1d414c80b36b9e84fa3f5167d4398cec', 'web/src/art12-narrative.css': '29ebf434a630c31295448b4bd890668c77cf851260fd87878359567197d5d3a2', 'web/src/EncounterTable.vue': '0c73263444112e4d6bc010201750dd836aaef36d03ee612868124afe8033ccf7', 'web/src/FateCatalogue.vue': 'da3efbc6ebfd68d042a07ce3e89343299b94094ad3d2590f77005e61780763a2', 'web/src/ActionFeedbackStage.vue': 'c0430cb6202624a1f4135556cfadfb17541fa38ca7d8bf29c8079080bc8ffcdb', 'web/src/action-feedback.ts': 'e947bb62b1de54e51f172a2d412110ea662a01b599f0b97061e8c238f31a3606', 'web/src/action-motion.css': 'b14bcc27fa59527b32e817a164ca7f546337f4520aa02f4cb7001895460bd495', 'web/src/narrative-effects.ts': 'ca77c93e636c43fc5c57b1f7b7a3f85bef58aa00f135affe217919b64470b615', 'web/src/NarrativeStageHost.vue': 'e195b09b7485b48e88883a830ca2c0b352da396e62f6457e5ff30c0168d9630d', 'web/src/use-activity-effect.ts': 'e15a7b41b897e7d4f29e8be277703efd1f8c32d2dec11d278a41a37c89425163', 'web/src/activity-effects.ts': 'dd697069d134e4e9a935c0186758ebd243d26b29dd9856f4100d21596b4a0f8b', 'web/src/reading-memory.ts': '8e7a0718edb07113e30f817df5ea98180455e1ea4a7f481a10c72b3657357808', 'web/src/journal-anchors.ts': 'fde853e92c68dd10ad9c14994c41a3157646c5245022b1f8061e4dd0e5aa2605', 'web/src/ChoiceCard.vue': '322961bb71234da9e284555aad7a568b14b2b4a88cff9736e43cc208d3103e64', 'web/src/CataloguePager.vue': 'b5069cf0f229edb66c1e2779cd3542d98bc8a05e292a485c71c2627a652694c0', 'web/src/focus.ts': '8ae91e78a4db7a854c293fc4b1bc28f02dd0d542b3119cff383f9245b4944eea', 'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7', 'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21', 'web/src/story-pages.ts': 'f75cc6730dc6b949ce7344aa79e54e6b84ac6f31d30661659e6d300be4df0fb7', 'web/src/assets.ts': 'de5fb6c189b144680149d50f456d34269b4c60e670d8893c6d197315778e07b7', 'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73', 'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815', 'src/full/milestones.ts': 'e91f58cf0002945f679649964b5a70e7226e0890b623719b24df2c02bac09492', 'src/full/queries.ts': 'eab721ecd066440d8babe11f36664300d21df2d1cf15f10d1160c7cb2a880d48', 'web/public/art/v2/actors/player-standing-cold-v1.webp': 'ead57061820734bd53f89f600795310cb2040b478f5e2bf61da2b946571ca2ef', 'web/public/art/v2/characters/shen.webp': '31ab868950058e5425e20e90508086f3e30c856554dd6b68efb012d082e1b6c1', 'web/public/art/v2/characters/lu.webp': '632438e9da240cd8b362d785d8b4a581544b79e6fc3d14edd54cc43cf7410ad4', 'web/public/art/v2/characters/pei.webp': '925d7f303997aac05dd7a27ea2bd7a74cbb1796546ceb8f0e06a565d8d34166d', 'web/public/art/v2/characters/yan.webp': '82cc6f98bded838b6b8a59d1d27ba123fdec70c1a0043dd4bf6ea236a65c2e2f'}
BUDGETS={'oldNarrativeCap': 45000, 'oldStoryCap': 48000, 'oldFeedbackCap': 34000, 'oldArt12CssCap': 14000, 'newRasterAssets': 2, 'maxRuntimeBytesEach': 280000, 'maxRuntimeBytesTotal': 400000, 'runtimeWidth': 1536, 'runtimeHeight': 768, 'normalPlayerPaintMin': 260}
HASHES={'question': {'source': '3367dcaab9ed0bd74e072e6d66e5c1049969295ddd49d67386c39aa58b2e226c', 'runtime': '97048fae773e77a915c251a80c2526482e4a5a94a8d5b6ff52a8377875d87582'}, 'ending': {'source': '37c4e5d5d92a1444f84facad37135ce69c325ee59604a7a01403fd496ea6dafc', 'runtime': 'bd2034f2641aed54747d749308c08cbaa537ace1b62c015eeccf6e6d2c62e665'}}
RUNTIMES={'question':'web/public/art/v2/milestones/heart-court-v1.webp','ending':'web/public/art/v2/milestones/heaven-gate-v1.webp'}

def validate_art32(root,image_reader):
 root=root.resolve()
 if not(root/LEDGER).exists():
  assert not any((root/n).exists()for n in RUNTIMES.values()),'ART32 unrecorded scene'
  return set(),0,0
 def local(n):
  assert type(n)is str and n and not n.startswith('/')and'..'not in n.split('/')and'\\'not in n,'ART32 local path'
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'ART32 missing input';return p
 def digest(n):return hashlib.sha256(prior_uir3306_bytes(n,prior_uir3307_bytes(n,local(n).read_bytes()))).hexdigest()
 def identity(r):
  assert type(r['bytes'])is int and len(prior_response_bytes(r['path'],local(r['path']).read_bytes()))==r['bytes']and digest(r['path'])==r['sha256'],'ART32 actual identity';return prior_response_bytes(r['path'],local(r['path']).read_bytes())
 m=json.loads(local(LEDGER).read_text());assert m['format']=='chenyuan-milestone-stage-art32'and type(m['version'])is int and m['version']==1 and m['userAcceptance']is False,'ART32 header'
 assert m['budgets']==BUDGETS and all(type(v)is int for v in m['budgets'].values()),'ART32 original typed caps'
 assert [r['path']for r in m['files']]==FILES and m['sourceReferences']==REFS and m['baselines']==BASELINES and m['unchanged']==UNCHANGED,'ART32 exact scope and sources'
 for r in m['files']+BASELINES:identity(r)
 for n in REFS:local(n)
 for n,h in UNCHANGED.items():assert digest(n)==h,'ART32 original controller/reading/renderer/proof'
 for key,field,cap in [('narrative-objects','maxNativeBytes',45000),('story-journey','maxNewBytes',48000),('action-feedback','maxBytes',34000)]:
  d=json.loads(local('art/redesign/'+key+'.json').read_text());assert d[field]==cap and sum(local(r['path']).stat().st_size for r in d['files'])<=cap,'ART32 old group cap'
 assert local('web/src/art12-narrative.css').stat().st_size<=14000,'ART32 old ART12 cap'
 for i,n in enumerate(FILES[:2]):
  original=identity(BASELINES[i]).decode();actual=prior_response_bytes(n,local(n).read_bytes()).decode();assert expand_art32_view(n,original)==actual and normalize_art32_view(n,actual)==original,'ART32 exact phase view/original full script'
 css=local(FILES[-1]).read_text();old=identity(BASELINES[-1]).decode();assert css.startswith(old),'ART32 original style domains'
 extra=css[len(old):];assert all(n in extra for n in ['art32-narrative','art32-threshold','grid-template-columns:150px','grid-template-columns:280px','[data-working=true]','flex:none!important','white-space:break-spaces']),'ART32 actual decision consumers'
 assert not re.search(r'@import|@font-face|https?://|file://|@media|setTimeout|setInterval',extra),'ART32 external IO/font/compatibility/timer'
 assert extra.count('display:none')==1 and '.art32-threshold .book-scenery{display:none}'in extra and not re.search(r'overflow\s*:|visibility\s*:|position\s*:\s*fixed',extra),'ART32 functional surfaces cannot be hidden/scrolled'
 combined=json.loads(local(BASE+'/export-facts.json').read_text());assert m['asset']==combined and combined['format']=='chenyuan-art32-stages'and type(combined['version'])is int and combined['version']==1 and combined['userAcceptance']is False and set(combined['assets'])==set(RUNTIMES),'ART32 combined export'
 recorded={LEDGER,*FILES,*REFS,*UNCHANGED,BASE+'/export-facts.json'};total=0
 for key,runtime_name in RUNTIMES.items():
  f=combined['assets'][key];assert json.loads(local(BASE+'/'+key+'-export-facts.json').read_text())==f and f['format']=='chenyuan-art32-export'and f['version']==1 and f['userAcceptance']is False,'ART32 individual export'
  identity(f['producer']);identity(f['helper']);assert f['producer']['path']=='art/tools/export_art32_stages.py'and f['helper']['path']=='art/tools/export_art10_blanks.py'and f['encoding']==['cwebp','-q','82','-m','6','-resize','1536','0','-metadata','none'],'ART32 established producer'
  for part in ['source','runtime']:
   row=f[part];raw=identity(row);dims,alpha,fmt=image_reader(raw,local(row['path']).suffix);assert row['sha256']==HASHES[key][part]and dims==row['dimensions']and alpha==row['alpha']and fmt==row['format']and row['alphaProof']['min']==row['alphaProof']['max']==255,'ART32 actual opaque image'
  assert f['source']['path']==BASE+'/'+key+'-v1.png'and f['source']['dimensions']==dict(width=1774,height=887)and f['runtime']['path']==runtime_name and f['runtime']['dimensions']==dict(width=1536,height=768)and f['runtime']['bytes']<=280000,'ART32 actual image bounds'
  assert f['transform']==dict(uniformScale=1536/1774,crop=False,semanticEdit=False,outputWidth=1536,outputHeight=768)and f['doubleExport']==dict(bytesEqual=True,firstSHA256=HASHES[key]['runtime'],secondSHA256=HASHES[key]['runtime'],sourceUnchanged=True),'ART32 whole deterministic export'
  identity(f['audit']);audit=json.loads(local(f['audit']['path']).read_text());assert audit['kind']=='local audit of actual built-in tool result; not a provider-signed receipt'and audit['model']is None and audit['requestId']is None and audit['originalsKept']is True and audit['userAcceptance']is False and len(audit['calls'])==len(f['prompts'])==1,'ART32 honest actual audit'
  assert audit['referenceRole']=='Current UI evidence actually reviewed locally; not passed as imagegen input','ART32 honest reference role';identity(audit['reference']);identity(audit['selectedCopy']);assert audit['selectedCopy']=={k:f['source'][k]for k in ['path','bytes','sha256']}and audit['reference']['path']==REFS[-2 if key=='question'else-1],'ART32 actual reference/selected chain'
  for call,prompt in zip(audit['calls'],f['prompts']):
   identity(call['candidate']);identity(prompt);assert call['candidate']['path']==BASE+'/candidates/'+key+'-v1.png'and call['candidate']['sha256']==call['generatedSHA256']==HASHES[key]['source']and call['prompt']==prompt and call['requestedTransparent']is False,'ART32 actual candidate'
   literal=json.loads(local(prompt['path']).read_text());assert literal['mode']=='built-in'and literal['tool']=='image_gen.imagegen'and literal['transparent_background']is False and literal['promptSHA256']==hashlib.sha256(literal['prompt'].encode()).hexdigest()and literal['generatedOriginal']==call['generatedOriginal']and local(BASE+'/'+key+'-prompt.txt').read_text()==literal['prompt']+'\n','ART32 literal prompt'
   recorded.update([call['candidate']['path'],prompt['path'],BASE+'/'+key+'-prompt.txt'])
  recorded.update([BASE+'/'+key+'-export-facts.json',f['source']['path'],runtime_name,f['audit']['path'],f['producer']['path'],f['helper']['path']]);total+=f['runtime']['bytes']
 assert total<=400000,'ART32 combined runtime cap'
 return recorded,2,total
