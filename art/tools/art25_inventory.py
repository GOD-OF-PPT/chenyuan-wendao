"""Bound the real reading seat, script ownership and existing scene, without new assets."""
import hashlib,json,re
from ta09_inventory import Tags
LEDGER='art/redesign/art25.json'
FILES=['web/src/JadeStudyScene.vue', 'web/src/art10-equipment.css', 'web/src/ta09-equipment.css']
REFS=['docs/decisions/0059-study-reading-art25-contract.md', 'goal-4/amendments/2026-10-29-goal-continue-art25.md', 'goal-4/research/art25-design-sources.json']
BUDGETS={'oldNativeCap': 45000, 'oldCssCap': 12000, 'oldPreparationCap': 60000, 'oldTA09Cap': 30000, 'newRasterAssets': 0}
SCRIPT='0f2a558accca3e81f61dce5e74e389b859719f46c58816e6edaa1f4b4d6e947f'
UNCHANGED={'web/src/LearningPlanner.vue': 'd5473ace82c8193349e48515096e6411343f36465a85fc86689b35fbbbeea945', 'web/src/StudyQueueRail.vue': '2ee9119806fa68b31c97c28d754fe2589981ad58b832a8c1f43287e955c13997', 'web/src/JadeEngraving.vue': '1c1b94c82d145c504fda7c8de43dffacedcdf1db87c9f9579fcefac3bec15c1a', 'web/src/EquipmentPanel.vue': 'b5c8e4011f112ff37f21db4e0088e3304a67dda7f1872ca347d1be12559bc56c', 'web/src/equipment-effects.ts': '0946c3b6b76e5ea39ebd80571175e2835ce49abe94fe6499f480b1635a934888', 'web/src/equipment-choreography.ts': '871e41e7555f640fecbc8f26706fac34a5249225a6acb5f1db9c63789a8011bb'}
SCENE='web/public/art/v2/schools/sanctum-v1.webp'
# UX26 permits one exact display expression, while retaining the complete old source pin.
UX26_LEARNING_BEFORE="'待确认的新安排，确认后才开始'"
UX26_LEARNING_AFTER="running?'下次草案，当前执行见上方':'待确认安排，确认后开始'"
def normalize_ux26_learning(text):
 if UX26_LEARNING_AFTER not in text:return text
 assert text.count(UX26_LEARNING_AFTER)==1,'UX26 unique approved draft label'
 text=text.replace(UX26_LEARNING_AFTER,UX26_LEARNING_BEFORE,1)
 assert hashlib.sha256(text.encode()).hexdigest()==UNCHANGED['web/src/LearningPlanner.vue'],'UX26 original complete learning source'
 return text
def validate_art25(root):
 root=root.resolve()
 if not(root/LEDGER).exists():
  assert not(root/FILES[0]).exists()or'asset-id="study-sanctum"'not in(root/FILES[0]).read_text(),'ART25 unrecorded consumer'
  return set(),0,0
 def local(n):
  assert type(n)is str and not n.startswith('/')and'..'not in n.split('/')and'\\'not in n,'ART25 local path'
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'ART25 missing input';return p
 def digest(n):return hashlib.sha256(local(n).read_bytes()).hexdigest()
 m=json.loads(local(LEDGER).read_text());assert m['format']=='chenyuan-study-reading-art25'and type(m['version'])is int and m['version']==1 and m['userAcceptance']is False,'ART25 header'
 assert m['budgets']==BUDGETS and all(type(v)is int for v in m['budgets'].values()),'ART25 fixed cap'
 assert [r['path']for r in m['files']]==FILES and m['sourceReferences']==REFS,'ART25 exact members'
 for r in m['files']:
  assert type(r['bytes'])is int and r['bytes']==local(r['path']).stat().st_size and r['sha256']==digest(r['path']),'ART25 actual identity'
 for n in REFS:local(n)
 for ledger,key,cap in [('art03','maxNativeBytes',45000),('art10','nativeBytes',12000),('idle-preparation','maxNativeBytes',60000),('ta09','nativeBytes',30000)]:
  prior=json.loads(local('art/redesign/'+ledger+'.json').read_text());assert(prior.get('budgets',{}).get(key,prior.get(key)))==cap and sum(local(r['path']).stat().st_size for r in prior['files'])<=cap,'ART25 old cap'
 assert m['originalScriptSHA256']==SCRIPT and m['unchanged']==UNCHANGED,'ART25 controller ownership'
 changed=[n for n,h in UNCHANGED.items()if(hashlib.sha256(normalize_ux26_learning(local(n).read_text()).encode()).hexdigest()if n=='web/src/LearningPlanner.vue'else digest(n))!=h]
 if changed:
  assert changed==['web/src/EquipmentPanel.vue'],'ART25 controller ownership'
  from art26_inventory import validate_art26
  validate_art26(root)
  successor=json.loads(local('art/redesign/art26.json').read_text())
  assert successor['baselines']['equipmentPanel']['sha256']==UNCHANGED[changed[0]],'ART25 exact approved parent baseline'
 actor=local(FILES[0]).read_text();script=actor.split('</script>')[0].replace("import AssetImage from './AssetImage.vue';\n",'');assert hashlib.sha256(script.encode()).hexdigest()==SCRIPT,'ART25 script core'
 a=m['reusedAsset'];assert a==dict(path=SCENE,bytes=171716,sha256='91e3b5d7eebcb36bd0a1cbe3791a119290d0badddb313ad948bd4a0ade968d53')and digest(SCENE)==a['sha256']and local(SCENE).stat().st_size==a['bytes'],'ART25 reused original scene'
 local('art/production/art24/export-facts.json');tree=Tags(actor)
 art=[i for i,(t,v)in enumerate(tree.nodes)if t=='assetimage'and v.get('asset-id')=='study-sanctum'];assert len(art)==1,'ART25 actual scene'
 i=art[0];v=tree.nodes[i][1];assert v.get('path')=='art/v2/schools/sanctum-v1.webp'and v.get('aria-hidden')=='true','ART25 scene role'
 assert any(t=='span'and a.get('class')=='study-sanctum-fallback'and i in tree.ancestors[j]for j,(t,a)in enumerate(tree.nodes)),'ART25 fallback'
 actions=[i for i,(t,v)in enumerate(tree.nodes)if t=='slot'and v.get('name')=='action'];assert len(actions)==1 and any(tree.nodes[j][1].get('class')=='jade-readable'for j in tree.ancestors[actions[0]]),'ART25 adjacent original action slot'
 css=local(FILES[1]).read_text();assert 'study-sanctum'in css and not re.search(r'@import|@font-face|https?://|file://',css),'ART25 style IO'
 return {LEDGER,*FILES,*REFS,SCENE,*UNCHANGED},0,0
