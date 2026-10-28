"""Bound the cave scene's pure presentation and its real witness/navigation consumers."""
import hashlib,json,re
from ta09_inventory import Tags
LEDGER='art/redesign/art17.json'
NATIVE=['web/src/cave-threshold-view.ts','web/src/CaveThresholdObject.vue','web/src/art17-cave.css']
REFS=['docs/decisions/0049-cave-preparation-art17-contract.md','goal-4/amendments/2026-10-28-art17.md','goal-4/research/art17-design-sources.json']
ASSETS=['web/public/art/v2/characters/player-seated-cold.webp']+['web/public/art/v2/items/'+key+'-v1.webp'for key in ['foundation_pill','golden_pill','nascent_pill','spirit_seed','ascension_seal']]
def validate_art17(root):
 root=root.resolve()
 if not(root/LEDGER).exists():
  assert not any((root/f).exists()for f in NATIVE),'Unrecorded ART17 modules'
  return set(),0
 m=json.loads((root/LEDGER).read_text());assert m['format']=='chenyuan-art17-cave'and type(m['version'])is int and m['version']==1 and type(m['maxNativeBytes'])is int and m['maxNativeBytes']==20000 and type(m['newAssets'])is int and m['newAssets']==0 and m['userAcceptance']is False,'ART17 fixed scope/budget'
 assert [r['path']for r in m['files']]==NATIVE and m['sourceReferences']==REFS and [r['path']for r in m['reusedAssets']]==ASSETS,'ART17 membership/provenance'
 total=0
 for row in m['files']+m['reusedAssets']:
  p=(root/row['path']).resolve();assert p.is_relative_to(root)and p.is_file(),'ART17 local source missing';raw=p.read_bytes();assert type(row['bytes'])is int and len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'ART17 actual identity'
  if row['path']in NATIVE:total+=len(raw)
 assert total<=20000,'ART17 actual cap'
 for name in REFS:assert (root/name).is_file(),'ART17 reference missing'
 for ledger,field,value in [('art/redesign/cultivation-objects.json','budgets',45000),('art/redesign/cultivation-objects.json','goalPanel',19000)]:
  old=json.loads((root/ledger).read_text());assert(old[field]['nativeBytes']if field=='budgets'else old['budgets']['goalPanelBytes'])==value,'ART17 old cap changed'
 model=(root/NATIVE[0]).read_text();widget=(root/NATIVE[1]).read_text();css=(root/NATIVE[2]).read_text()
 assert not re.search(r'useGame|indexedDB|localStorage|fetch\s*\(|setTimeout|setInterval|requestAnimationFrame|v-html|\beval\s*\(',model+widget),'ART17 readonly presentation owns IO/clock'
 assert not re.search(r'@import|https?://|url\s*\(',css),'ART17 external CSS'
 assert all(t in model for t in ['previewAction(game,action)','previewActivity(game,',"getItemSources(game,item,1,['recipe','purchase'])",'sourceNavigation(source,required)']),'ART17 formal quote detached'
 gate=(root/'web/src/MilestoneGate.vue').read_text();tree=Tags(gate);slots=[a for tag,a in tree.nodes if tag=='slot'and a.get('name')=='object'];assert len(slots)==1 and all(slots[0].get(':'+k)==k for k in ['source','phase','engaged','remaining','seconds']),'ART17 original witness slot detached'
 app_source=(root/'web/src/App.vue').read_text();assert 'function inspectCaveDestination(request:NavigationRequest){rememberHubOrigin();return inspectTradeoffDestination(request);}'in app_source,'ART17 readonly return wrapper detached'
 app=Tags((root/'web/src/App.vue').read_text());nodes=[i for i,(tag,a)in enumerate(app.nodes)if tag=='cavethresholdobject'];assert len(nodes)==2,'ART17 actual two surfaces missing'
 for i in nodes:
  a=app.nodes[i][1];assert a.get(':game')=='source'and a.get('@inspect')=='openPreparation($event)'and a.get('@navigate')=='inspectCaveDestination','ART17 view route or witness changed'
  assert any(app.nodes[n][0]=='milestonegate'for n in app.ancestors[i]),'ART17 object outside milestone'
 assert '<AssetImage v-else path="art/v2/characters/player-seated-cold.webp" asset-id="cave-ready-meditator"'in widget,'ART17 actual painting path detached'
 assert '<ItemArtifact v-if="view.itemId" :item-id="view.itemId" :owned="view.have>0"/>'in widget and 'cave-ready-meditator'in widget,'ART17 actual painting/fallback detached'
 return set(NATIVE+ASSETS+REFS+[LEDGER]),total
