"""Keep the sealed-life presentation bounded and connected to original readonly/control paths."""
import hashlib,json,re
from ta09_inventory import Tags
LEDGER='art/redesign/sealed-life.json'
FILES=['web/src/SealedLifeHud.vue','web/src/SealedLifeStage.vue','web/src/SealedLifeNav.vue','web/src/sealed-life.css']
REFS=['docs/decisions/0056-sealed-life-ux23-contract.md','goal-4/amendments/2026-10-28-goal-continue-ux23.md']
def validate_ux23(root):
 root=root.resolve()
 if not(root/LEDGER).exists():
  assert not any((root/f).exists()for f in FILES),'Unrecorded sealed-life presentation'
  return set(),0
 m=json.loads((root/LEDGER).read_text())
 assert m['format']=='chenyuan-sealed-life'and type(m['version'])is int and m['version']==1 and m['userAcceptance']is False,'UX23 header'
 assert type(m['maxNativeBytes'])is int and m['maxNativeBytes']==14000,'UX23 cap'
 assert type(m['newBitmapAssets'])is int and m['newBitmapAssets']==0,'UX23 invented bitmap'
 assert [r['path']for r in m['files']]==FILES and m['sourceReferences']==REFS,'UX23 membership'
 total=0;text=''
 for row in m['files']:
  p=root/row['path'];assert p.is_file()and not p.is_symlink(),'UX23 missing file'
  raw=p.read_bytes();assert type(row['bytes'])is int and row['bytes']==len(raw)and row['sha256']==hashlib.sha256(raw).hexdigest(),'UX23 identity'
  total+=len(raw);text+=raw.decode()
 assert total<=14000,'UX23 actual cap'
 assert not re.search(r'indexedDB|localStorage|useGame\(|fetch\s*\(|setTimeout|setInterval|v-html|\beval\s*\(',text),'UX23 gained writer/clock/network'
 app=(root/'web/src/App.vue').read_text();nodes=Tags(app).nodes
 for tag,bindings in {'sealedlifehud':{'@life':'showLife','@settings':'showSettings'},'sealedlifestage':{'@life':'showLife','@export':'exportSave','@receipt':'viewReceipt','@settings':'showSettings'},'sealedlifenav':{'@open':'openHub','@settings':'showSettings'}}.items():
  actual=[a for name,a in nodes if name==tag];assert len(actual)==1 and all(actual[0].get(k)==v for k,v in bindings.items()),'UX23 real consumer'
  assert "game.status!=='active'" in actual[0].get('v-if',''),'UX23 status boundary'
 stage=(root/FILES[1]).read_text();assert "import './sealed-life.css'"in stage and 'getLifeRecord(props.game)'in stage,'UX23 factual book/style consumer'
 for ref in REFS:assert(root/ref).is_file(),'UX23 reference missing'
 return {LEDGER,*FILES,*REFS},total
