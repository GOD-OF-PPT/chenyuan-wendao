"""Bound the new trial-only presentation while keeping the original UI budgets."""
import hashlib,json,re
from ta09_inventory import Tags
LEDGER='art/redesign/trial-guidance.json'
FILES=['web/src/trial-goal.ts','web/src/TrialGoal.vue']
REFS=['docs/decisions/0052-trial-stage-guidance-ux20-contract.md','goal-4/amendments/2026-10-28-goal-continue-ux20.md']
def validate_ux20(root):
 root=root.resolve()
 if not(root/LEDGER).exists():
  assert not any((root/f).exists()for f in FILES),'Unrecorded UX20 presentation'
  return set(),0
 m=json.loads((root/LEDGER).read_text())
 assert m['format']=='chenyuan-trial-guidance'and type(m['version'])is int and m['version']==1 and m['userAcceptance']is False,'UX20 header'
 assert type(m['maxNativeBytes'])is int and m['maxNativeBytes']==6000,'UX20 fixed cap'
 assert [r['path']for r in m['files']]==FILES and m['sourceReferences']==REFS,'UX20 membership'
 total=0;text=''
 for row in m['files']:
  p=root/row['path'];assert p.is_file()and not p.is_symlink(),'UX20 file missing'
  raw=p.read_bytes();assert type(row['bytes'])is int and row['bytes']==len(raw)and row['sha256']==hashlib.sha256(raw).hexdigest(),'UX20 identity'
  total+=len(raw);text+=raw.decode()
 assert total<=6000,'UX20 actual cap'
 assert not re.search(r'indexedDB|localStorage|useGame\(|fetch\s*\(|setTimeout|setInterval|v-html|\beval\s*\(',text),'UX20 gained writer or clock'
 parent=(root/'web/src/GoalPanel.vue').read_text();app=(root/'web/src/App.vue').read_text()
 nodes=[a for tag,a in Tags(parent).nodes if tag=='trialgoal']
 assert len(nodes)==1 and nodes[0].get('@inspect')=="emit('current',$event)"and "target.kind==='breakthrough'"in nodes[0].get('v-if',''),'UX20 real goal consumer'
 assert 'trialView?.verb' in app and '@current="game.battle?selectTab(\'修行\'):openHub(\'current\',$event)"'in app,'UX20 real readonly route'
 for ref in REFS:assert(root/ref).is_file(),'UX20 reference missing'
 return{LEDGER,*FILES,*REFS},total
