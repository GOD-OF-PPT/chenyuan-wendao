from ux28_inventory import normalize_ux28_recovery
from art35_inventory import normalize_art35_recovery
"""ART29 cold packing stage, original actions, and immutable fourteen item drawings."""
import hashlib,json,re
from ta09_inventory import Tags
from art11_inventory import IDS
LEDGER='art/redesign/art29.json'
BASE='art/production/art29'
RUNTIME='web/public/art/v2/workshops/inventory-v1.webp'
FILES=['web/src/InventoryStage.vue','web/src/art11-inventory.css']
BUDGETS={'oldCssCap': 14000, 'oldNativeCap': 18000, 'oldSupplyCap': 40000, 'newRasterAssets': 1, 'maxRuntimeBytes': 280000, 'runtimeWidth': 1536, 'runtimeHeight': 768, 'paintedMinimum': 200}
REFS=['docs/decisions/0064-inventory-stage-art29-contract.md', 'goal-4/amendments/2026-10-29-goal-continue-art29.md', 'goal-4/research/art29-design-sources.json', 'goal-4/evidence/art29/inventory-before.vue.txt', 'goal-4/evidence/art29/art11-before.css.txt', 'goal-4/evidence/art29/legacy-item-bounds.json']
BASELINES=[{'path': 'goal-4/evidence/art29/inventory-before.vue.txt', 'bytes': 6718, 'sha256': 'b567cb81c66c77a7171ff1883fcfc9c290b006a5be3a2dc32721fa5eeb8cad88'}, {'path': 'goal-4/evidence/art29/art11-before.css.txt', 'bytes': 11555, 'sha256': '99eb164046e986a6f23978ebaa33593d4e1d1b13111bf4c023591ee970136a44'}]
UNCHANGED={'web/src/ItemArtifact.vue': 'b651e6b9bc5675ca1ccaecc08d62f5c45ef8d70ae6915bae8b75b507a17328b0', 'web/src/GoodsPanel.vue': 'b7e1b89fd8b02333e2ee924c1572d5497aa1f1a7e8e4f77511ee4bf08503c00f', 'web/src/MarketCounter.vue': 'c8849c784dd1d864a5787658e941b6fbe10305ee476e5ad8ffc2daa687478b3e', 'web/src/RecoveryRitual.vue': '9764760b03850ce35a4bab251228ea29983b1dba3615fa31bc4d0ad8e3ef0c88', 'web/src/MarketPlanner.vue': '133ca11bcb8b8c283b3138cc88add796fdc22f507781869e27fb2025b379c760', 'web/src/RecoveryPlanner.vue': '478733b74bf51b209901a7e7328ea92269a77a30ab41c56c400ddd8b40ef78a9', 'web/src/supply-effects.ts': '6b11c6aab3e634831854d0c1723b76916bbb26fdbccf640e4adc6e043ee72a19', 'web/src/activity-effects.ts': 'dd697069d134e4e9a935c0186758ebd243d26b29dd9856f4100d21596b4a0f8b', 'web/src/use-activity-effect.ts': 'e15a7b41b897e7d4f29e8be277703efd1f8c32d2dec11d278a41a37c89425163', 'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21', 'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7', 'web/src/art10-equipment.css': 'd7dcafbfed487c825c607812a9a3d04be600f5d49e62c5add44f9464d83ce627', 'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73', 'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815', 'art/redesign/art11-items/export-facts.json': '0b21de7634948d0ec07965adb5eec2ab95619c561cf35057a90d6d25052dc1fc'}
EDITS={'import': "import AssetImage from './AssetImage.vue';\n", 'scene': '  <AssetImage class="study-sanctum" style="inset:-12px -18px" path="art/v2/workshops/inventory-v1.webp" asset-id="inventory-chamber" eager aria-hidden="true"><span class="study-sanctum-fallback"/></AssetImage>\n', 'footer': '   <footer class="inventory-main-decision"><button v-if="!stock" class="primary" data-testid="inventory-main-source" @click="view(\'source\')">查找{{item.name}}来源</button><button v-else class="primary" data-testid="inventory-main-uses" @click="open(purposes,$event)">查看用途与价格</button><button v-if="!stock" class="text-button" data-testid="inventory-uses-open" @click="open(purposes,$event)">用途与价格</button></footer>\n', 'cssChanges': [['#app .art11-inventory{display:flex;', '#app .art11-inventory{position:relative;isolation:isolate;display:flex;'], ['align-self:center;gap:8px;padding:0;margin:0;border:0;background:none;min-width:0}', 'align-self:center;gap:8px;padding:16px 20px;margin:0;border:0;background:linear-gradient(90deg,#0d3039e6,#0d303966);min-width:0}'], ['#app .inventory-main-decision{display:flex;justify-content:center;align-items:center;gap:18px;flex:none;min-height:52px;padding:4px 0 10px}', '#app .inventory-main-decision{display:flex;justify-content:flex-start;align-items:center;gap:18px;flex:none;min-height:52px;padding:12px 0 0}']], 'cssAddition': '\n#app .inventory-held .item-artifact-plate{background:none;border:0;box-shadow:none}#app .inventory-held{outline:0!important}#app .inventory-held:focus-visible>span{outline:2px solid var(--art18-jade)}#app .inventory-held:is(:hover,:focus-visible)>.item-artifact{filter:brightness(1.08)}#app .inventory-held:active>.item-artifact{filter:brightness(.95)}\n#app .art11-inventory[data-item=dao] .inventory-held>.item-artifact{scale:1.06}\n', 'capabilityHint': ["{{stock?'实物查用途后，再明确选择服丹或出售安排。':'查来源只查看获得方式；不自动取材、采购或旅行。'}}", "{{stock?(item.hp||item.mp?'可查看服丹调息或出售换石安排。':item.sell===null?'此物不可出售；可查看用途与来源。':'可查看材料用途或出售安排。'):'查来源只查看获得方式；不自动取材、采购或旅行。'}}"]}
BOUNDS_SHA='25212c4ec065a2813f11fbdf2278e163a20fc7cb312e286d3e6b13c1af2802d3'
SOURCE_SHA='c3e1186f96c0a8aa8dab7c8013eca1171ec8ef6ef40facfe5439480fe0472000'
RUNTIME_SHA='63aa9bd260ce7943bddd30355e330af0647a4076641a57f964bd0e81f8891be8'

def validate_art29(root,image_reader):
 root=root.resolve()
 if not(root/LEDGER).exists():
  assert not(root/FILES[0]).exists()or'asset-id="inventory-chamber"'not in(root/FILES[0]).read_text(),'ART29 unrecorded scene'
  return set(),0,0
 def local(n):
  assert type(n)is str and not n.startswith('/')and'..'not in n.split('/')and'\\'not in n,'ART29 local path'
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'ART29 missing input';return p
 def digest(n):return hashlib.sha256(local(n).read_bytes()).hexdigest()
 def identity(r):
  assert type(r['bytes'])is int and r['bytes']==local(r['path']).stat().st_size and r['sha256']==digest(r['path']),'ART29 actual identity';return local(r['path']).read_bytes()
 m=json.loads(local(LEDGER).read_text());assert m['format']=='chenyuan-inventory-scene-art29'and type(m['version'])is int and m['version']==1 and m['userAcceptance']is False,'ART29 header'
 assert m['budgets']==BUDGETS and all(type(v)is int for v in m['budgets'].values()),'ART29 fixed typed budget'
 assert [r['path']for r in m['files']]==FILES and m['sourceReferences']==REFS and m['baselines']==BASELINES and m['unchanged']==UNCHANGED and m['presentationEdits']==EDITS,'ART29 exact files/baselines/edits'
 for r in m['files']+BASELINES:identity(r)
 for n in REFS:local(n)
 for n,h in UNCHANGED.items():assert(hashlib.sha256(normalize_art35_recovery(local(n).read_text()).encode()).hexdigest()if n=='web/src/RecoveryRitual.vue'else hashlib.sha256(normalize_ux28_recovery(local(n).read_text()).encode()).hexdigest()if n=='web/src/RecoveryPlanner.vue'else digest(n))==h,'ART29 original other controllers/item renderer/clock/proof'
 d=json.loads(local('art/redesign/art11.json').read_text());assert d['budgets']['nativeBytes']==18000 and d['budgets']['cssBytes']==14000 and d['budgets']['itemArtifactBytes']==4000 and sum(local(r['path']).stat().st_size for r in d['files'])<=18000 and local(FILES[1]).stat().st_size<=14000 and local('web/src/ItemArtifact.vue').stat().st_size<=4000,'ART29 old native/CSS caps'
 d=json.loads(local('art/redesign/art04.json').read_text());assert d['maxNativeBytes']==40000 and sum(local(r['path']).stat().st_size for r in d['files'])<=40000,'ART29 old supply cap'
 original=identity(BASELINES[0]).decode();expected=original.replace("import ItemArtifact from './ItemArtifact.vue';\n","import ItemArtifact from './ItemArtifact.vue';\n"+EDITS['import'],1).replace('  <header class="inventory-stage-heading">',EDITS['scene']+'  <header class="inventory-stage-heading">',1);assert expected.count(EDITS['footer'])==1,'ART29 original footer'
 expected=expected.replace(EDITS['footer'],'',1).replace('</small></article>','</small>'+EDITS['footer'].strip()+'</article>',1);expected=expected.replace(*EDITS['capabilityHint'],1);actor=local(FILES[0]).read_text();assert actor==expected,'ART29 exact presentation move and original entire controller'
 css=identity(BASELINES[1]).decode()
 for old,new in EDITS['cssChanges']:assert css.count(old)==1,'ART29 original exact selector';css=css.replace(old,new,1)
 assert local(FILES[1]).read_text()==css+EDITS['cssAddition'],'ART29 exact inventory styles and unchanged other domains'
 assert not re.search(r'@import|@font-face|https?://|file://',local(FILES[1]).read_text()),'ART29 external style IO'
 tree=Tags(actor);scenes=[i for i,(t,a)in enumerate(tree.nodes)if t=='assetimage'and a.get('asset-id')=='inventory-chamber'];decisions=[i for i,(t,a)in enumerate(tree.nodes)if t=='footer'and a.get('class')=='inventory-main-decision'];assert len(scenes)==len(decisions)==1,'ART29 actual scene and one primary decision'
 i=scenes[0];a=tree.nodes[i][1];assert a.get('path')=='art/v2/workshops/inventory-v1.webp'and a.get('aria-hidden')=='true'and a.get('class')=='study-sanctum'and a.get('style')=='inset:-12px -18px','ART29 actual decorative scene'
 assert any(t=='span'and a.get('class')=='study-sanctum-fallback'and i in tree.ancestors[j]for j,(t,a)in enumerate(tree.nodes)),'ART29 fallback'
 assert any(tree.nodes[j][0]=='article'and tree.nodes[j][1].get('data-testid')=='inventory-object'for j in tree.ancestors[decisions[0]]),'ART29 primary belongs to actual selected description'
 raw=identity(m['legacyBounds']);assert m['legacyBounds']['path']==REFS[-1]and m['legacyBounds']['sha256']==BOUNDS_SHA,'ART29 original item alpha facts';old=json.loads(raw);assert list(old)==IDS,'ART29 fourteen original objects'
 for n in IDS:
  r=old[n];assert r['path']=='web/public/art/v2/items/'+n+'-v1.webp'and digest(r['path'])==r['sha256']and r['dimensions']==dict(width=512,height=512),'ART29 original object bytes'
 f=json.loads(local(BASE+'/export-facts.json').read_text());assert m['asset']==f and f['format']=='chenyuan-art29-export'and type(f['version'])is int and f['version']==1 and f['userAcceptance']is False,'ART29 export facts'
 identity(f['producer']);identity(f['helper']);assert f['producer']['path']=='art/tools/export_art29_scene.py'and f['helper']['path']=='art/tools/export_art10_blanks.py'and f['encoding']==['cwebp','-q','82','-m','6','-resize','1536','0','-metadata','none'],'ART29 established export'
 for key,h in [('source',SOURCE_SHA),('runtime',RUNTIME_SHA)]:
  r=f[key];b=identity(r);dims,alpha,fmt=image_reader(b,local(r['path']).suffix);assert r['sha256']==h and dims==r['dimensions']and alpha==r['alpha']and fmt==r['format']and r['alphaProof']['min']==r['alphaProof']['max']==255,'ART29 actual opaque image'
 assert f['source']['dimensions']==dict(width=1774,height=887)and f['runtime']['path']==RUNTIME and f['runtime']['dimensions']==dict(width=1536,height=768)and f['runtime']['bytes']<=280000,'ART29 actual image bounds'
 assert f['transform']==dict(uniformScale=1536/1774,crop=False,semanticEdit=False,outputWidth=1536,outputHeight=768)and f['doubleExport']==dict(bytesEqual=True,firstSHA256=RUNTIME_SHA,secondSHA256=RUNTIME_SHA,sourceUnchanged=True),'ART29 no crop deterministic export'
 identity(f['audit']);a=json.loads(local(f['audit']['path']).read_text());assert a['kind']=='local audit of actual built-in tool result; not a provider-signed receipt'and a['model']is None and a['requestId']is None and a['originalsKept']is True and a['userAcceptance']is False and len(a['calls'])==len(f['prompts'])==2,'ART29 honest actual audit'
 identity(a['reference']);identity(a['selectedCopy']);assert a['selectedCopy']=={k:f['source'][k]for k in ['path','bytes','sha256']}and a['calls'][-1]['generatedSHA256']==SOURCE_SHA,'ART29 selected original'
 for row,prompt in zip(a['calls'],f['prompts']):
  identity(row['candidate']);identity(prompt);assert row['prompt']==prompt and row['candidate']['sha256']==row['generatedSHA256']and row['requestedTransparent']is False,'ART29 actual candidate chain'
  p=json.loads(local(prompt['path']).read_text());assert p['mode']=='built-in'and p['tool']=='image_gen.imagegen'and p['transparent_background']is False and p['promptSHA256']==hashlib.sha256(p['prompt'].encode()).hexdigest()and p['generatedOriginal']==row['generatedOriginal'],'ART29 literal prompt'
 names={LEDGER,*FILES,*REFS,*UNCHANGED,BASE+'/export-facts.json',f['source']['path'],RUNTIME,f['producer']['path'],f['helper']['path'],f['audit']['path'],a['reference']['path'],*[r['candidate']['path']for r in a['calls']],*[p['path']for p in f['prompts']],*[r['path']for r in old.values()]}
 return names,1,f['runtime']['bytes']
