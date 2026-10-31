"""ART26 actor/actual slots and a strictly bounded readonly inspection handoff."""
import hashlib,json,re
from pathlib import PurePosixPath
from ta09_inventory import Tags
LEDGER='art/redesign/art26.json'
FILES=['web/src/LoadoutConstellation.vue', 'web/src/EquipmentPanel.vue', 'web/src/ProductionPlanner.vue', 'web/src/art03-equipment.css', 'web/src/art16-schools.css']
REFS=['docs/decisions/0060-loadout-stage-art26-contract.md', 'goal-4/amendments/2026-10-29-goal-continue-art26.md', 'goal-4/research/art26-design-sources.json', 'goal-4/evidence/art26/equipment-panel-before.vue.txt', 'goal-4/evidence/art26/production-planner-before.vue.txt', 'src/full/configuration.ts']
BUDGETS={'oldNativeCap': 45000, 'schoolCssCap': 12000, 'productionCap': 26000, 'parentCap': 5000, 'preparationCap': 60000, 'ta09Cap': 30000, 'newRasterAssets': 1, 'maxRuntimeBytes': 240000, 'runtimeWidth': 512, 'runtimeHeight': 768}
BASELINES={'equipmentPanel': {'path': 'goal-4/evidence/art26/equipment-panel-before.vue.txt', 'bytes': 4125, 'sha256': 'b5c8e4011f112ff37f21db4e0088e3304a67dda7f1872ca347d1be12559bc56c'}, 'productionPlanner': {'path': 'goal-4/evidence/art26/production-planner-before.vue.txt', 'bytes': 14125, 'sha256': 'f67a0abafb51ad5d9e64c8b8f3938d95f82d3d7204fc0038d388a5cc0997e4bd'}, 'loadoutScriptSHA256': 'de82ea3cae01d5357c666799224b009e0508397679ce74142a2ec43d71009656', 'schoolBranchSHA256': 'f254e930aa235ad583fc742ad61509eb5792e7c44b46974a499f929c60d2e8d6'}
UNCHANGED={'web/src/ConfigurationDialog.vue': 'cc50327d03b19836dc9e41df9ff0e36185e2f64b846d510b795b6aad671f8b52', 'web/src/ConfigurationOutlook.vue': '72768df4cb3d226c5efc029dfa73e68324cfb0fd5962ca6d9348964224619e20', 'web/src/equipment-effects.ts': '0946c3b6b76e5ea39ebd80571175e2835ce49abe94fe6499f480b1635a934888', 'src/full/configuration.ts': 'ca9880f727c5798a55d4a8590c57c1fbe5ba71ef0e6cfb0c59fdebfb86205520'}
BASE='art/production/art26'
RUNTIME='web/public/art/v2/actors/player-loadout-idle-v1.webp'
SOURCE_SHA='662372d16decd1e4286d4a0df9ab920f42074f3afc73f7723ea439df70ab3e2e'
RUNTIME_SHA='8d07006f041943a73e9cd9e32fea87a921d0c508cff6fb0cc922a34c7a10ad90'
ENCODING=['cwebp','-q','82','-m','6','-alpha_q','100','-resize','512','768','-metadata','none']
PARENT_DECL=",relicInspection=ref<{runId:string;id:string}|null>(null)"
PARENT_FUNC="function inspectRelic(){section.value='relics';const id=props.game.loadout.relic;relicInspection.value=id?{runId:props.game.core.runId,id}:null;}\n"
PRODUCER_PROP='relicInspection?:{runId:string;id:string}|null;'
PRODUCER_WATCH="watch(()=>props.relicInspection,r=>{\n if(props.mode!=='forge'||r?.runId!==props.game.core.runId||!Object.hasOwn(C.relics,r.id))return;\n future.value=true;page.value=Math.max(0,Math.floor(rows.value.findIndex(x=>x.id===r.id)/4));select(r.id);\n},{immediate:true});\n"
UX27_EQUIPMENT_BASELINE_SHA256='31e8c9c3562fd53c1669601d6be90ab6fc3ace637513233fa75b5a92be06fc91'
UX27_EQUIPMENT_TRANSFORMS=[['travelPlan:[PreparationPlan]}', 'travelPlan:[PreparationPlan];section:[{runId:string;section:string}]}'], ['</script>', "watch(()=>[props.game.core.runId,section.value],()=>emit('section',{runId:props.game.core.runId,section:section.value}),{immediate:true});\n</script>"]]
def normalize_ux27_equipment(text):
 if UX27_EQUIPMENT_TRANSFORMS[0][1]not in text:return text
 for before,after in reversed(UX27_EQUIPMENT_TRANSFORMS):
  assert text.count(after)==1,'UX27 exact readonly category report'
  text=text.replace(after,before,1)
 assert hashlib.sha256(text.encode()).hexdigest()==UX27_EQUIPMENT_BASELINE_SHA256,'UX27 exact readonly category report original full source'
 return text

def parent_before(s):
 s=normalize_ux27_equipment(s)
 assert PARENT_DECL in s and PARENT_FUNC in s and s.count('relicInspection.value=null;')==3,'ART26 parent run/navigation scope'
 assert 'relicInspection=null' in s and ':relic-inspection="relicInspection"'in s and "$event==='relic'?inspectRelic():"in s,'ART26 real parent view callback'
 return s.replace(PARENT_DECL,'').replace(PARENT_FUNC,'').replace("learningFocus.value='';relicInspection.value=null;","learningFocus.value='';").replace("section=id;learningFocus='';relicInspection=null","section=id;learningFocus=''").replace("$event==='relic'?inspectRelic():","$event==='relic'?section='relics':").replace(' :relic-inspection="relicInspection"','')
def producer_before(s):
 assert PRODUCER_PROP in s and PRODUCER_WATCH in s,'ART26 consumer forge/run/known-id view scope'
 return s.replace(PRODUCER_PROP,'').replace(PRODUCER_WATCH,'')

def validate_art26(root,image_reader=None):
 root=root.resolve()
 if not(root/LEDGER).exists():
  assert not(root/RUNTIME).exists()and(not(root/FILES[0]).exists()or'player-loadout-idle-v1.webp'not in(root/FILES[0]).read_text()),'ART26 unrecorded actor'
  return set(),0,0
 if image_reader is None:
  from check_inventory import image_info
  image_reader=image_info
 def local(n):
  assert type(n)is str and not PurePosixPath(n).is_absolute()and'..'not in PurePosixPath(n).parts and'\\'not in n,'ART26 local path'
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'ART26 missing input';return p
 def digest(n):return hashlib.sha256(local(n).read_bytes()).hexdigest()
 def identity(r):
  assert type(r['bytes'])is int and r['bytes']==local(r['path']).stat().st_size and r['sha256']==digest(r['path']),'ART26 actual identity'
  return local(r['path']).read_bytes()
 m=json.loads(local(LEDGER).read_text());assert m['format']=='chenyuan-loadout-stage-art26'and type(m['version'])is int and m['version']==1 and m['userAcceptance']is False,'ART26 header'
 assert m['budgets']==BUDGETS and all(type(v)is int for v in m['budgets'].values()),'ART26 fixed typed cap'
 assert [r['path']for r in m['files']]==FILES and m['sourceReferences']==REFS and m['baselines']==BASELINES and m['unchanged']==UNCHANGED,'ART26 exact members/baseline'
 for r in m['files']:identity(r)
 for n in REFS:local(n)
 for key in ['equipmentPanel','productionPlanner']:identity(m['baselines'][key])
 assert all(digest(n)==h for n,h in UNCHANGED.items()),'ART26 unchanged configuration/proof'
 actor=local(FILES[0]).read_text();assert hashlib.sha256(actor.split('</script>')[0].encode()).hexdigest()==BASELINES['loadoutScriptSHA256'],'ART26 loadout script'
 school=actor.split('<template v-if="mode===\'school\'">',1)[1].split('<template v-else>',1)[0];assert hashlib.sha256(school.encode()).hexdigest()==BASELINES['schoolBranchSHA256'],'ART26 school branch'
 assert parent_before(local(FILES[1]).read_text()).encode()==identity(BASELINES['equipmentPanel']),'ART26 parent exceeds readonly handoff'
 assert producer_before(local(FILES[2]).read_text()).encode()==identity(BASELINES['productionPlanner']),'ART26 producer exceeds readonly handoff'
 for ledger,key,cap in [('art03','maxNativeBytes',45000),('art16','nativeBytes',12000),('idle-production','maxNativeBytes',26000),('idle-preparation','maxNativeBytes',60000),('ta09','nativeBytes',30000)]:
  old=json.loads(local('art/redesign/'+ledger+'.json').read_text());assert old.get('budgets',{}).get(key,old.get(key))==cap and sum(local(r['path']).stat().st_size for r in old['files'])<=cap,'ART26 old cap'
 assert local(FILES[1]).stat().st_size<=5000,'ART26 parent cap'
 f=json.loads(local(BASE+'/export-facts.json').read_text());assert m['asset']==f and f['format']=='chenyuan-art26-export'and f['version']==1 and f['userAcceptance']is False,'ART26 facts'
 identity(f['producer']);identity(f['helper']);assert f['producer']['path']=='art/tools/export_art26_actor.py'and f['helper']['path']=='art/tools/export_art10_blanks.py'and f['encoding']==ENCODING,'ART26 exact producer'
 for key,expected in [('source',SOURCE_SHA),('runtime',RUNTIME_SHA)]:
  r=f[key];raw=identity(r);dims,alpha,fmt=image_reader(raw,local(r['path']).suffix);assert r['sha256']==expected and dims==r['dimensions']and alpha and fmt==r['format'],'ART26 actual alpha identity'
  q=f[key+'AlphaQuality'];total=dims['width']*dims['height'];assert type(q['zeroPixels'])is int and type(q['core250Pixels'])is int and q['zeroPixels']>total*.3 and q['core250Pixels']>total*.3 and len(q['edgeMax'])==4 and all(type(v)is int and 0<=v<=3 for v in q['edgeMax']),'ART26 alpha quality facts'
  assert r['alphaProof']['min']==0 and r['alphaProof']['max']>=250 and r['alphaBBox16'][0]>0 and r['alphaBBox16'][1]>0 and r['alphaBBox16'][2]<dims['width']and r['alphaBBox16'][3]<dims['height'],'ART26 real complete silhouette'
 assert f['source']['dimensions']==dict(width=1024,height=1536)and f['runtime']['path']==RUNTIME and f['runtime']['dimensions']==dict(width=512,height=768)and f['runtime']['bytes']<=240000,'ART26 runtime bounds'
 assert f['transform']==dict(uniformScale=.5,crop=False,semanticEdit=False,outputWidth=512,outputHeight=768)and f['doubleExport']==dict(bytesEqual=True,firstSHA256=RUNTIME_SHA,secondSHA256=RUNTIME_SHA,sourceUnchanged=True),'ART26 whole-frame deterministic export'
 identity(f['audit']);audit=json.loads(local(f['audit']['path']).read_text());assert audit['kind']=='local audit of actual built-in tool result; not a provider-signed receipt'and audit['model']is None and audit['requestId']is None and audit['originalsKept']is True and audit['userAcceptance']is False,'ART26 honest audit'
 identity(audit['reference']);identity(audit['selectedCopy']);assert audit['selectedCopy']=={k:f['source'][k]for k in ['path','bytes','sha256']}and len(audit['calls'])==2 and m['candidates']==[r['candidate']for r in audit['calls']],'ART26 selected/candidate chain'
 for row,prompt in zip(audit['calls'],f['prompts']):
  identity(row['candidate']);identity(prompt);assert prompt==row['prompt']and row['generatedSHA256']==row['candidate']['sha256']and row['requestedTransparent']is True,'ART26 actual generation copies'
  p=json.loads(local(prompt['path']).read_text());assert p['tool']=='image_gen.imagegen'and p['mode']=='built-in'and p['transparent_background']is True and p['promptSHA256']==hashlib.sha256(p['prompt'].encode()).hexdigest()and p['generatedOriginal']==row['generatedOriginal'],'ART26 literal prompt'
 for row in m['reusedAssets']:identity(row)
 tree=Tags(actor);nodes=[(i,v)for i,(t,v)in enumerate(tree.nodes)if t=='assetimage'and v.get('asset-id')=='equipment-player-impression'];assert len(nodes)==1,'ART26 actual actor'
 i,v=nodes[0];assert v.get('path')=='art/v2/actors/player-loadout-idle-v1.webp'and v.get('fit')=='contain','ART26 actor consumer'
 assert any(t=='assetimage'and a.get('asset-id')=='loadout-portrait-fallback'and i in tree.ancestors[j]for j,(t,a)in enumerate(tree.nodes)),'ART26 actor fallback'
 assert any(t=='assetimage'and a.get('asset-id')=='loadout-sanctum'and a.get('path')=='art/v2/schools/sanctum-v1.webp'for t,a in tree.nodes),'ART26 scene consumer'
 assert any(t=='assetimage'and a.get('v-if')=="slot==='relic'&&game.loadout.relic"and a.get(':path')=="'art/v2/equipment/'+game.loadout.relic+'-v1.webp'"for t,a in tree.nodes),'ART26 actual held-relic consumer'
 assert any(t=='button'and a.get('@click')=="emit('slot',slot)"and a.get(':data-testid')=="'loadout-node-'+slot"for t,a in tree.nodes)and any(t=='i'and a.get('class')=='game-icon loadout-empty'for t,a in tree.nodes),'ART26 four readonly/empty slots'
 for n in FILES[3:]:assert not re.search(r'@import|@font-face|https?://|file://',local(n).read_text()),'ART26 external style IO'
 recorded={LEDGER,*FILES,*REFS,BASE+'/export-facts.json',f['source']['path'],RUNTIME,f['producer']['path'],f['audit']['path'],*[r['path']for r in f['prompts']],*[r['path']for r in m['candidates']],*[r['path']for r in m['reusedAssets']]}
 return recorded,1,f['runtime']['bytes']
