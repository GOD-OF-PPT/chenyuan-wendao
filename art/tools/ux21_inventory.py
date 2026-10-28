"""Bound the readonly trial-return presentation and its real query-only consumers."""
import hashlib,json,re
from ta09_inventory import Tags
LEDGER='art/redesign/trial-return.json'
FILES=['web/src/trial-return.ts','web/src/TrialReturnChoices.vue']
REFS=['docs/decisions/0054-trial-return-ux21-contract.md','goal-4/amendments/2026-10-28-goal-continue-ux21.md']
def validate_ux21(root):
 root=root.resolve()
 if not(root/LEDGER).exists():
  assert not any((root/f).exists()for f in FILES),'Unrecorded UX21 presentation'
  return set(),0
 m=json.loads((root/LEDGER).read_text())
 assert m['format']=='chenyuan-trial-return'and type(m['version'])is int and m['version']==1 and m['userAcceptance']is False,'UX21 header'
 assert type(m['maxNativeBytes'])is int and m['maxNativeBytes']==7000,'UX21 fixed cap'
 assert [r['path']for r in m['files']]==FILES and m['sourceReferences']==REFS,'UX21 membership'
 total=0;text=''
 for row in m['files']:
  p=root/row['path'];assert p.is_file()and not p.is_symlink(),'UX21 file missing'
  raw=p.read_bytes();assert type(row['bytes'])is int and row['bytes']==len(raw)and row['sha256']==hashlib.sha256(raw).hexdigest(),'UX21 identity'
  total+=len(raw);text+=raw.decode()
 assert total<=7000,'UX21 actual cap'
 assert not re.search(r'indexedDB|localStorage|useGame\(|fetch\s*\(|setTimeout|setInterval|v-html|\beval\s*\(',text),'UX21 gained writer or clock'
 app=(root/'web/src/App.vue').read_text();nodes=[a for tag,a in Tags(app).nodes if tag=='trialreturnchoices']
 assert len(nodes)==1 and nodes[0].get('@checkpoint')=="openHub('trial',$event,'checkpoint')"and nodes[0].get('@prepare')=='openPreparation($event)','UX21 real query consumer'
 catalogue=(root/'web/src/TrialCatalogue.vue').read_text()
 assert "trialReadMode.value=trialMode"in app and ':initial-mode="trialReadMode"'in app and "initialMode??'required'"in catalogue,'UX21 chapter query detached'
 assert "checkpointSummary?.kind !== 'trial'||pendingStoryError.value"in app and '!enabled||busy||!!block'in catalogue,'UX21 original-intent guard detached'
 for ref in REFS:assert(root/ref).is_file(),'UX21 reference missing'
 return{LEDGER,*FILES,*REFS},total
