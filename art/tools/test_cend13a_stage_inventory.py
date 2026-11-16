import copy,unittest
import test_inventory as inventory
from cend13a_stage_inventory import MANIFEST,LEDGER,validate_stage_handoff,prior_stage_handoff_bytes

ROOT=inventory.ROOT
class CultivationHandoffTests(unittest.TestCase):
 tearDown=inventory.InventoryTests.tearDown
 def write(self,n,value):
  if not isinstance(value,bytes):return inventory.InventoryTests.write(self,n,value)
  p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True)
  if p.exists():p.unlink()
  p.write_bytes(value)
 def setUp(self):
  inventory.InventoryTests.setUp(self)
  validate_stage_handoff(self.root)
 def test_full_app_inverse_and_actual_original_cap(self):
  p=MANIFEST['parent'];self.assertEqual(prior_stage_handoff_bytes(p['path'],(ROOT/p['path']).read_bytes()),(ROOT/p['before']).read_bytes());self.assertLessEqual((ROOT/p['path']).stat().st_size,159635);self.assertEqual(validate_stage_handoff(self.root)[1],1104)
 def test_current_navigation_run_sync_clock_and_plan_guards_cannot_change(self):
  p=MANIFEST['parent']['path'];raw=(ROOT/p).read_text()
  for old,new in [('!owns(owner)','false'),('document.hidden','false'),("a.status!=='running'","false"),('a.id===previous','false'),('!store.activityOwned','false'),('a.gameRevision!==g?.core.revision','false'),('r.generation!==a.generation','false'),('JSON.stringify(a.plan)!==signature','false'),('focusStillOwned(anchor)','true'),('hubTrainingMethod.value=a.plan.method;',''),('padding-bottom:4px','padding-bottom:0')]:
   self.assertIn(old,raw);self.write(p,raw.replace(old,new,1))
   with self.subTest(guard=old),self.assertRaisesRegex(AssertionError,'C13 exact current App'):validate_stage_handoff(self.root)
   self.write(p,raw.encode())
 def test_original_store_clock_scene_and_focus_owners_cannot_change(self):
  for n in ['web/src/store.ts','web/src/activity-clock.ts','web/src/CultivationOngoing.vue','web/src/CultivationSite.vue','web/src/focus.ts','src/full/activity.ts']:
   raw=(ROOT/n).read_bytes();self.write(n,raw+b' changed')
   with self.subTest(path=n),self.assertRaisesRegex(AssertionError,'C13 original authority'):validate_stage_handoff(self.root)
   self.write(n,raw)
 def test_missing_ledger_cannot_silently_accept_the_current_app(self):
  (self.root/LEDGER).unlink()
  with self.assertRaisesRegex(AssertionError,'C13 missing ledger current parent'):validate_stage_handoff(self.root)
  p=MANIFEST['parent'];self.write(p['path'],(ROOT/p['before']).read_bytes());self.assertEqual(validate_stage_handoff(self.root),(set(),0));self.write(p['path'],(ROOT/p['before']).read_bytes()+b' ')
  with self.assertRaisesRegex(AssertionError,'C13 missing ledger current parent'):validate_stage_handoff(self.root)
 def test_legacy_mh11_keeps_its_exact_original_parent_proof(self):
  from cend11_mainline_inventory import MANIFEST as old,validate_mainline_hud,prior_mainline_hud_bytes
  validate_mainline_hud(self.root)
  for p in old['parents']:self.assertEqual(prior_mainline_hud_bytes(p['path'],(ROOT/p['path']).read_bytes()),(ROOT/p['before']).read_bytes())
 def test_actual_vue_render_proof_and_before_source_are_bound(self):
  for n in [MANIFEST['renderProof']['path'],MANIFEST['parent']['before']]:
   raw=(ROOT/n).read_bytes();self.write(n,raw+b' ')
   with self.subTest(path=n),self.assertRaisesRegex(AssertionError,'C13 exact actual compiler proof|C13 preserved complete parent'):validate_stage_handoff(self.root)
   self.write(n,raw)
 def test_caps_acceptance_and_types_cannot_be_resigned(self):
  for key,value in [('version',True),('actualAppCap',159636),('maxNewUILogicBytes',1801),('newRasterAssets',1),('userAcceptance',True)]:
   m=copy.deepcopy(MANIFEST);m[key]=value;self.write(LEDGER,m)
   with self.subTest(field=key),self.assertRaisesRegex(AssertionError,'C13 immutable typed ledger'):validate_stage_handoff(self.root)
   self.write(LEDGER,copy.deepcopy(MANIFEST))

if __name__=='__main__':unittest.main()
