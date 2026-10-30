"""Opening offering: exact view-only adapters, immutable old controllers and actual art provenance."""
import hashlib,json,re
LEDGER='art/redesign/art33.json'
BASE='art/redesign/art33'
FILES=['web/src/OpeningOffering.vue', 'web/src/opening-offering.css']
PARENTS=['web/src/App.vue', 'web/src/MilestoneGate.vue', 'web/src/GuidancePanel.vue']
BASELINES=[{'path': 'goal-4/evidence/art33/App.vue.before.txt', 'bytes': 157235, 'sha256': '01431c4688c118bb98856a3f2eacbfb1042b9db14a721cb0fcc834d457601d30'}, {'path': 'goal-4/evidence/art33/MilestoneGate.vue.before.txt', 'bytes': 4301, 'sha256': '872aaa2b56331f9de29982ad0142b8f8c56c0feab0214133dc80fd66ca275e03'}, {'path': 'goal-4/evidence/art33/GuidancePanel.vue.before.txt', 'bytes': 1376, 'sha256': '9e2a96b8dadd7b25fef68e885e34bb8a338a9bb1f580c14f9b864ab0f14c78cd'}]
REFS=['docs/decisions/0071-opening-offering-art33-contract.md', 'goal-4/amendments/2026-10-30-goal-continue-art33.md', 'goal-4/research/art33-sources.json', 'goal-4/evidence/art33/App.vue.before.txt', 'goal-4/evidence/art33/MilestoneGate.vue.before.txt', 'goal-4/evidence/art33/GuidancePanel.vue.before.txt']
UNCHANGED={'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7', 'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21', 'web/src/activity-persistence.ts': 'a5100e6f2d84b627ef17800bfc8f17f3f533566db47f35faab3833da66bab4cf', 'web/src/cultivation-effects.ts': '656c74686b1e1cee2f68c61074172d5c3c23f86cf12d5c3eed7205f215de409a', 'web/src/milestone-view.ts': 'af1a2045781e806806140092349b2ecde690524436b254a0c1f326a94e108efd', 'web/src/ChoiceCard.vue': '322961bb71234da9e284555aad7a568b14b2b4a88cff9736e43cc208d3103e64', 'web/src/AssetImage.vue': 'ecfc476d074c16c14b181abbf62863ebc6d5c014d9473d3118e761433115a8da', 'web/src/assets.ts': 'de5fb6c189b144680149d50f456d34269b4c60e670d8893c6d197315778e07b7', 'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73', 'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815', 'src/full/milestones.ts': 'e91f58cf0002945f679649964b5a70e7226e0890b623719b24df2c02bac09492', 'src/full/receipts.ts': '185597443e21bf88949232a97afa426410b0dcc8ce8e07cf240a08af0f2dd0ae'}
BUDGETS={'nativeBytes': 12000, 'parentDeltaBytes': 2400, 'oldCultivationBytes': 45000, 'oldGoalBytes': 19000, 'oldImmersiveBytes': 26000, 'newRasterAssets': 2, 'maxRuntimeBytes': 350000, 'personRuntimeBytes': 210000, 'caseRuntimeBytes': 180000, 'normalPaintMinimum': 280}
PATCHES=[{'path': 'art/redesign/art33/parent-view-patch.json', 'bytes': 4237, 'sha256': 'ec861406332cc2cc74336c2f7e36b6446168313d48093885a47fa2a3c8de45f5'}, {'path': 'art/redesign/art33/guide-view-patch.json', 'bytes': 702, 'sha256': 'b18b48a7571977fff68911881551903d477c6b03dc8b1968925e978b23dcf8b7'}]
HASHES={'shen-offering': {'source': 'e0b8e7097947178f25249f34c410a5df46bff33f2ee98590d337a6b97376018e', 'runtime': '31c2b4381cefd72f0de80baa5b3c30665039814f79660f86dec1a4b59bf46c91'}, 'medicine-case': {'source': '60c0683acf72c52e2c91b6c0ff417514a1b9347ef0b85d076a00418625728cde', 'runtime': 'fea370cbf9e87c716dc9a248fab9ba5aeb80e0a09de13fb46e066a1a5503b40f'}}

# UX25: three exact display-only transforms, then the original ART33 full-source proof.
UX25_APP_BASELINE_SHA256='fff09574bebc2ce0ca42445d57f2f102a01744bedfe01fbec42de45f22931f21'
UX25_APP_TRANSFORMS=[('{isAdventurePlan, singleBattlePlan, type AdventurePlan}', '{ADVENTURE_CYCLE_MS,isAdventurePlan, singleBattlePlan, type AdventurePlan}'), ("{{cost({type:'TRAVEL',location:'cave'})}} {{why({type:'TRAVEL',location:'cave'})}}", "{{cost({type:'TRAVEL',location:'cave'})}} · {{ADVENTURE_CYCLE_MS.travel/1000}} 秒行旅 {{why({type:'TRAVEL',location:'cave'})}}")]
def normalize_ux25_app(text):
 if UX25_APP_TRANSFORMS[0][1]not in text:return text
 for before,after in reversed(UX25_APP_TRANSFORMS):
  assert text.count(after)==1,'UX25 unique approved timing display'
  text=text.replace(after,before,1)
 assert hashlib.sha256(text.encode()).hexdigest()==UX25_APP_BASELINE_SHA256,'UX25 original App full source'
 return text

def validate_art33(root,image_reader):
 root=root.resolve()
 if not(root/LEDGER).exists():
  assert not(root/'web/src/OpeningOffering.vue').exists(),'ART33 missing ledger'
  return set(),0,0
 def local(n):
  assert type(n)is str and n and not n.startswith('/')and'..'not in n.split('/')and'\\'not in n,'ART33 local path'
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'ART33 missing input';return p
 def digest(n):return hashlib.sha256(local(n).read_bytes()).hexdigest()
 def identity(r):
  assert type(r['bytes'])is int and local(r['path']).stat().st_size==r['bytes']and digest(r['path'])==r['sha256'],'ART33 actual identity';return local(r['path']).read_bytes()
 m=json.loads(local(LEDGER).read_text());assert m['format']=='chenyuan-opening-offering-art33'and type(m['version'])is int and m['version']==1 and m['userAcceptance']is False,'ART33 honest header'
 assert m['budgets']==BUDGETS and all(type(v)is int for v in m['budgets'].values()),'ART33 typed caps'
 assert [r['path']for r in m['files']]==FILES and [r['path']for r in m['parents']]==PARENTS and m['baselines']==BASELINES and m['sourceReferences']==REFS and m['unchanged']==UNCHANGED and m['patches']==PATCHES,'ART33 exact scope'
 for r in m['files']+m['parents']+BASELINES+PATCHES:identity(r)
 for n in REFS:local(n)
 for n,h in UNCHANGED.items():assert digest(n)==h,'ART33 unchanged formal controllers'
 assert sum(local(n).stat().st_size for n in FILES)<=12000,'ART33 actual native cap'
 for n,old,field,cap in [('cultivation-objects',None,'nativeBytes',45000),('immersive-ui',None,'maxBytes',26000)]:
  d=json.loads(local('art/redesign/'+n+'.json').read_text());actual=d['budgets'][field]if old is None and'budgets'in d else d[field];assert actual==cap and sum(local(r['path']).stat().st_size for r in d['files'])<=cap,'ART33 original group caps'
 assert local('web/src/GoalPanel.vue').stat().st_size<=19000,'ART33 original Goal cap'
 def reverse(actual,steps):
  for step in reversed(steps):
   assert actual.count(step['new'])==1,'ART33 unique approved view transform'
   actual=actual.replace(step['new'],step['old'],1)
  return actual
 app=local(PARENTS[0]).read_text();gate=local(PARENTS[1]).read_text();guide=local(PARENTS[2]).read_text();patch=json.loads(local(PATCHES[0]['path']).read_text());gp=json.loads(local(PATCHES[1]['path']).read_text())
 assert reverse(normalize_ux25_app(app),patch['appSteps'])==identity(BASELINES[0]).decode(),'ART33 original App full script and callbacks'
 assert gate.replace(':seconds="seconds" :view="view"',':seconds="seconds"',1)==identity(BASELINES[1]).decode(),'ART33 one Gate slot only'
 assert gp['defaultInlineUnchanged']is True and reverse(guide,gp['steps'])==identity(BASELINES[2]).decode(),'ART33 original default guidance'
 assert len(app.encode())-BASELINES[0]['bytes']<=2400 and len(gate.encode())-BASELINES[1]['bytes']==13,'ART33 exact parent bounds'
 view=local(FILES[0]).read_text();script=view.split('</script>')[0]
 assert "defineEmits<{inspect:[Event]}>()"in script and all(n in view for n in ['MILESTONE_CYCLE_MS.CHOOSE','game.core.inventory.healing_pill>0','{{game.core.inventory.healing_pill}}','phase===\'running\'','remaining','seconds','viewTitle','status','data-failed','data-arranged','position="0% 100%"','此念已保存 · 继续或接管见上方']),'ART33 readonly state consumers'
 assert not re.search(r'\b(?:setTimeout|setInterval|requestAnimationFrame|Date|performance|fetch|indexedDB|localStorage|useGameStore|resolve|advance|onMounted)\b|v-html|eval\s*\(',view),'ART33 no clock IO reward or script execution'
 assert app.count('<OpeningOffering ')==3 and app.count('phase,engaged,remaining,seconds,view}')>=3,'ART33 all actual original slot consumers'
 css=local(FILES[1]).read_text();assert all(n in css for n in ['[data-working=true]','[data-failed=true]',':not([data-failed=true])[data-phase=running]','[data-phase=running]','--gate-progress','prefers-reduced-motion:reduce','.hub-reduced','.art33-reading','.art33-case:active']),'ART33 actual state and reduced feedback'
 assert not re.search(r'@import|@font-face|https?://|file://|overflow\s*:|line-clamp|visibility\s*:',css),'ART33 no external resources or functional clipping'
 assert css.count(':not([data-failed=true])[data-phase=running]')==2,'ART33 both working visuals obey failure'
 assert css.count('display:none')==1 and '.opening-heading .speaker-portrait{display:none}'in css,'ART33 only duplicate decorative portrait removed'
 facts=json.loads(local(BASE+'/export-facts.json').read_text());assert m['asset']==facts and facts['format']=='chenyuan-art33-export'and facts['version']==1 and facts['userAcceptance']is False and set(facts['assets'])==set(HASHES),'ART33 export facts'
 for k in ['producer','helper','prompts','selectedSources','toolAudit']:identity(facts[k])
 assert facts['producer']['path']=='art/tools/export_art33_opening.py'and facts['helper']['path']=='art/tools/export_art10_blanks.py'and facts['encoding']==['cwebp','-q','82','-m','6','-alpha_q','100','-resize','512','0','-metadata','none'],'ART33 original deterministic producer'
 prompts=json.loads(local(facts['prompts']['path']).read_text());selected=json.loads(local(facts['selectedSources']['path']).read_text());audit=json.loads(local(facts['toolAudit']['path']).read_text())
 assert audit['localAuditNotProviderReceipt']is True and audit['model']is None and audit['requestId']is None and audit['tool']=='built-in image_gen'and len(audit['entries'])==2,'ART33 honest local tool audit'
 assert prompts['tool']=='built-in image_gen'and set(prompts['assets'])==set(HASHES),'ART33 literal prompts'
 recorded={LEDGER,*FILES,*PARENTS,*REFS,*UNCHANGED,BASE+'/export-facts.json',*[r['path']for r in PATCHES],*[facts[k]['path']for k in ['producer','helper','prompts','selectedSources','toolAudit']]};total=0
 for key,row in facts['assets'].items():
  for part in ['source','runtime']:
   f=row[part];raw=identity(f);dims,alpha,fmt=image_reader(raw,local(f['path']).suffix);assert dims==f['dimensions']and alpha is True and fmt==f['format']and f['sha256']==HASHES[key][part]and f['alphaProof']['min']==0 and f['alphaProof']['solidPixels']>10000 and f['alphaProof']['transparentPixels']>10000,'ART33 actual transparent image';recorded.add(f['path'])
  height,limit=(768,210000)if key=='shen-offering'else(384,180000);assert row['runtime']['path']=='web/public/art/v2/opening/'+key+'-v1.webp'and row['runtime']['dimensions']==dict(width=512,height=height)and row['runtime']['bytes']<=limit,'ART33 exact image bounds'
  assert row['source']['path']==BASE+'/'+key+'-v1.png'and row['doubleExport']==dict(bytesEqual=True,firstSHA256=HASHES[key]['runtime'],secondSHA256=HASHES[key]['runtime'],sourceUnchanged=True)and row['transform']==dict(uniformScale=512/row['source']['dimensions']['width'],crop=False,padding=False,semanticEdit=False,outputWidth=512,outputHeight=height),'ART33 full source double export'
  p=prompts['assets'][key];sel=selected[key];assert hashlib.sha256(p['prompt'].encode()).hexdigest()==p['promptSHA256']==row['promptSHA256']and p['transparentBackground']is True and p['generatedPath']==sel['originalGeneratedPath']and sel['sha256']==HASHES[key]['source']and sel['bytes']==row['source']['bytes']and sel['copiedUnchanged']is True and sel['model']is None and sel['requestId']is None and sel['noProviderReceiptClaim']is True,'ART33 actual prompt and original chain'
  assert p['referenceImages']==row['references'],'ART33 exact references'
  for ref in row['references']:assert digest(ref['path'])==ref['sha256'],'ART33 reference identity';recorded.add(ref['path'])
  assert any(key+'-v1.webp'in n for n in [view]),'ART33 actual bitmap consumer';total+=row['runtime']['bytes']
 assert total<=350000,'ART33 combined raster cap'
 return recorded,2,total
