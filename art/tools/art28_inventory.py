from ux30_inventory import prior_ux30_bytes,normalize_ux30
"""ART28 binds a cold environment and readonly furnace entry to the original full controller."""
import hashlib,json,re
from ta09_inventory import Tags
LEDGER='art/redesign/art28.json'
BASE='art/production/art28'
RUNTIME='web/public/art/v2/workshops/alchemy-v1.webp'
FILES=['web/src/AlchemyWorkshop.vue','web/src/alchemy-workshop.css']
BUDGETS={'oldNativeCap': 22000, 'oldProductionCap': 26000, 'newRasterAssets': 1, 'maxRuntimeBytes': 280000, 'runtimeWidth': 1536, 'runtimeHeight': 768}
REFS=['docs/decisions/0063-alchemy-scene-art28-contract.md', 'goal-4/amendments/2026-10-29-goal-continue-art28.md', 'goal-4/research/art28-design-sources.json', 'goal-4/evidence/art28/alchemy-before.vue.txt', 'goal-4/evidence/art28/alchemy-before.css.txt']
BASELINES=[{'path': 'goal-4/evidence/art28/alchemy-before.vue.txt', 'bytes': 11835, 'sha256': '654a6ceb823dbd6eaa8cbaeb143ca16b766398c7fdf28ddb31ca90870e21501e'}, {'path': 'goal-4/evidence/art28/alchemy-before.css.txt', 'bytes': 9220, 'sha256': '88bc1e45ec5f633336fce70cf717fb0612299f22db7f467e24f344bfdeb3a554'}]
UNCHANGED={'web/src/alchemy-feedback.ts': 'dfe2886f81b73788fc406e89f8631618ee5dadbdc24bab80db4dc5a8e4759899', 'web/src/ProductionPlanner.vue': '6ebbc6551f6c68605b4e634196579787bf50e91d71d8fa84938bcc8cb9f1306b', 'web/src/use-activity-effect.ts': 'e15a7b41b897e7d4f29e8be277703efd1f8c32d2dec11d278a41a37c89425163', 'web/src/activity-effects.ts': 'dd697069d134e4e9a935c0186758ebd243d26b29dd9856f4100d21596b4a0f8b', 'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21', 'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7', 'web/src/art10-equipment.css': 'd7dcafbfed487c825c607812a9a3d04be600f5d49e62c5add44f9464d83ce627', 'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73', 'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815', 'web/public/art/v2/workshop/furnace-v1.webp': 'bd201f06af3c18342eb6dda9d5bb2abb96347b623fb32f1d213c4c2b86c25642'}
EDITS={'changes': [['min-height:560px;', ''], ['background:radial-gradient(ellipse at 65% 48%,#28504b66,transparent 65%),linear-gradient(90deg,#102e33ed,#102e33b0)!important', 'background:#102e33!important'], ['.alchemy-product-name{font-size:18px;font-weight:400;color:#b8cfb9}', ''], ['padding:20px 26px;color:#e8eddb;background:#12353a;border:1px solid #a3b58a;border-radius:8px 2px;box-shadow:0 24px 80px #041b25bb', 'padding:20px 26px;border:1px solid;border-radius:8px 2px'], ['justify-content:center;gap:12px;min-height:0}.alchemy-product-tray', 'justify-content:center;gap:12px;min-height:0;padding:12px;background:linear-gradient(90deg,#102e33ed,#102e3370)}.alchemy-product-tray'], ['.alchemy-workshop .production-estimate{padding:0}', ''], ['.alchemy-library .production-choices{display:grid;grid-template-columns:1fr 1fr;gap:18px;flex:none;margin:0}', '.alchemy-library .production-choices{gap:18px;flex:none;margin:0}'], ['.alchemy-library .production-choices>button{display:grid;grid-template-columns:48px minmax(0,1fr);align-items:center;gap:0 12px;min-height:88px;padding:12px;', '.alchemy-library .production-choices>button{display:grid;align-items:center;gap:0 12px;'], ['flex:0 1 260px;', ''], ['inset:0;z-index:1;width:100%;height:100%;pointer-events:none', 'inset:0;z-index:1;pointer-events:none'], ['border:1px solid;font-size:22px!important;', ''], ['box-shadow:none!important}\n.immersive-stage .alchemy-workshop', '}\n.immersive-stage .alchemy-workshop'], ['gap:14px;min-height:30px;text-align:center', 'gap:14px;text-align:center']], 'addition': '\n#app .alchemy-furnace .alchemy-inspect{position:absolute;inset:0;z-index:2;display:flex;align-items:center;text-align:left;background:none!important;border:0!important;box-shadow:none!important;padding:12px!important}.alchemy-inspect>span{writing-mode:vertical-rl}\n#app .alchemy-inspect{outline:0!important}.alchemy-inspect:focus-visible>span{outline:2px solid #9bcbb2}\n', 'scene': '  <AssetImage class="study-sanctum" style="inset:0" path="art/v2/workshops/alchemy-v1.webp" asset-id="alchemy-chamber" eager aria-hidden="true"><span class="study-sanctum-fallback"/></AssetImage>\n', 'inspect': '    <button class="alchemy-inspect" data-testid="alchemy-inspect" aria-label="查看丹炉安排，不开炉" @click="open"><span>查看开炉安排 ›</span></button>\n'}
SOURCE_SHA='c1f22fa7d3327c19842e3774676762f056e4ace696ce401d89e5c566e2cdc069'
RUNTIME_SHA='388948c205b6d3384ff4fa6047251312c2a45afe270d09d809545615e0fdce79'

def validate_art28(root,image_reader):
 root=root.resolve()
 if not(root/LEDGER).exists():
  assert not(root/FILES[0]).exists()or'asset-id="alchemy-chamber"'not in(root/FILES[0]).read_text(),'ART28 unrecorded chamber'
  return set(),0,0
 def local(n):
  assert type(n)is str and not n.startswith('/')and'..'not in n.split('/')and'\\'not in n,'ART28 local path'
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'ART28 missing input';return p
 def digest(n):return hashlib.sha256(prior_ux30_bytes(n,local(n).read_bytes())).hexdigest()
 def identity(r):
  assert type(r['bytes'])is int and r['bytes']==len(prior_ux30_bytes(r['path'],local(r['path']).read_bytes())) and r['sha256']==digest(r['path']),'ART28 actual identity';return prior_ux30_bytes(r['path'],local(r['path']).read_bytes())
 m=json.loads(local(LEDGER).read_text());assert m['format']=='chenyuan-alchemy-scene-art28'and type(m['version'])is int and m['version']==1 and m['userAcceptance']is False,'ART28 header'
 assert m['budgets']==BUDGETS and all(type(v)is int for v in m['budgets'].values()),'ART28 fixed typed budgets'
 assert [r['path']for r in m['files']]==FILES and m['sourceReferences']==REFS and m['baselines']==BASELINES and m['unchanged']==UNCHANGED and m['presentationEdits']==EDITS,'ART28 exact members/edits'
 for n in REFS:local(n)
 for r in m['files']+BASELINES:identity(r)
 for n,h in UNCHANGED.items():assert digest(n)==h,'ART28 original controller/clock/proof/cold furnace'
 for ledger,key,cap in [('alchemy-workshop','maxNativeBytes',22000),('idle-production','maxNativeBytes',26000)]:
  d=json.loads(local('art/redesign/'+ledger+'.json').read_text());assert d.get('budgets',{}).get(key,d.get(key))==cap and sum(local(r['path']).stat().st_size for r in d['files'])<=cap,'ART28 actual old native cap'
 actor=normalize_ux30('AlchemyWorkshop.vue',local(FILES[0]).read_text());original=identity(BASELINES[0]).decode();expected=original.replace('  <header class="alchemy-heading">',EDITS['scene']+'  <header class="alchemy-heading">',1).replace('    <div class="alchemy-rune"',EDITS['inspect']+'    <div class="alchemy-rune"',1);assert actor==expected,'ART28 template-only original script and full controls'
 css=identity(BASELINES[1]).decode()
 for old,new in EDITS['changes']:assert css.count(old)==1,'ART28 baseline exact selector';css=css.replace(old,new,1)
 assert local(FILES[1]).read_text()==css+EDITS['addition'],'ART28 exact pure styles and retired overrides'
 assert not re.search(r'@import|@font-face|https?://|file://',local(FILES[1]).read_text()),'ART28 external IO'
 tree=Tags(actor);scenes=[i for i,(t,a)in enumerate(tree.nodes)if t=='assetimage'and a.get('asset-id')=='alchemy-chamber'];buttons=[i for i,(t,a)in enumerate(tree.nodes)if t=='button'and a.get('data-testid')=='alchemy-inspect'];assert len(scenes)==len(buttons)==1,'ART28 actual unique scene and furnace entry'
 i=scenes[0];a=tree.nodes[i][1];assert a.get('path')=='art/v2/workshops/alchemy-v1.webp'and a.get('aria-hidden')=='true'and a.get('class')=='study-sanctum'and a.get('style')=='inset:0','ART28 actual decorative scene'
 assert any(t=='span'and a.get('class')=='study-sanctum-fallback'and i in tree.ancestors[j]for j,(t,a)in enumerate(tree.nodes)),'ART28 fallback'
 i=buttons[0];a=tree.nodes[i][1];assert a.get('@click')=='open'and a.get('aria-label')=='查看丹炉安排，不开炉'and any(tree.nodes[j][1].get('data-testid')=='alchemy-furnace'for j in tree.ancestors[i]),'ART28 readonly original furnace open'
 f=json.loads(local(BASE+'/export-facts.json').read_text());assert m['asset']==f and f['format']=='chenyuan-art28-export'and type(f['version'])is int and f['version']==1 and f['userAcceptance']is False,'ART28 export facts'
 identity(f['producer']);identity(f['helper']);assert f['producer']['path']=='art/tools/export_art28_scene.py'and f['helper']['path']=='art/tools/export_art10_blanks.py'and f['encoding']==['cwebp','-q','82','-m','6','-resize','1536','0','-metadata','none'],'ART28 original export recipe'
 for key,expected in [('source',SOURCE_SHA),('runtime',RUNTIME_SHA)]:
  r=f[key];raw=identity(r);dims,alpha,fmt=image_reader(raw,local(r['path']).suffix);assert r['sha256']==expected and dims==r['dimensions']and alpha==r['alpha']and fmt==r['format']and r['alphaProof']['min']==r['alphaProof']['max']==255,'ART28 actual opaque image'
 assert f['source']['dimensions']==dict(width=1774,height=887)and f['runtime']['path']==RUNTIME and f['runtime']['dimensions']==dict(width=1536,height=768)and f['runtime']['bytes']<=280000,'ART28 actual bounds'
 assert f['transform']==dict(uniformScale=1536/1774,crop=False,semanticEdit=False,outputWidth=1536,outputHeight=768)and f['doubleExport']==dict(bytesEqual=True,firstSHA256=RUNTIME_SHA,secondSHA256=RUNTIME_SHA,sourceUnchanged=True),'ART28 uniform deterministic export'
 identity(f['audit']);a=json.loads(local(f['audit']['path']).read_text());assert a['kind']=='local audit of actual built-in tool result; not a provider-signed receipt'and a['model']is None and a['requestId']is None and a['originalsKept']is True and a['userAcceptance']is False and len(a['calls'])==1,'ART28 honest audit'
 identity(a['reference']);identity(a['selectedCopy']);assert a['selectedCopy']=={k:f['source'][k]for k in ['path','bytes','sha256']},'ART28 original copy'
 row=a['calls'][0];prompt=f['prompts'][0];identity(row['candidate']);identity(prompt);assert len(f['prompts'])==1 and row['prompt']==prompt and row['generatedSHA256']==SOURCE_SHA and row['candidate']['sha256']==SOURCE_SHA and row['requestedTransparent']is False,'ART28 actual output chain'
 literal=json.loads(local(prompt['path']).read_text());assert literal['mode']=='built-in'and literal['tool']=='image_gen.imagegen'and literal['transparent_background']is False and literal['promptSHA256']==hashlib.sha256(literal['prompt'].encode()).hexdigest()and literal['generatedOriginal']==row['generatedOriginal'],'ART28 literal prompt'
 names={LEDGER,*FILES,*REFS,*UNCHANGED,BASE+'/export-facts.json',f['source']['path'],RUNTIME,f['producer']['path'],f['helper']['path'],f['audit']['path'],a['reference']['path'],row['candidate']['path'],prompt['path']}
 return names,1,f['runtime']['bytes']
