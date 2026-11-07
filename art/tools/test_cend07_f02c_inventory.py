import unittest,copy
import test_inventory as inventory
from cend07_f02c_inventory import MANIFEST,LEDGER,validate_source_intent,prior_source_intent_bytes
ROOT=inventory.ROOT
class SourceIntentTests(unittest.TestCase):
 def setUp(self):
  inventory.InventoryTests.setUp(self)
  validate_source_intent(self.root)
 write=inventory.InventoryTests.write
 tearDown=inventory.InventoryTests.tearDown
 def test_actual_positive_original_caps_and_complete_inverse(self):
  validate_source_intent(ROOT)
  for n,row in MANIFEST['files'].items():self.assertEqual(prior_source_intent_bytes(n,(ROOT/n).read_bytes()),(ROOT/row['before']).read_bytes())
 def test_new_writing_or_gate_bypass_is_rejected(self):
  n='web/src/SourcePlanner.vue';raw=(ROOT/n).read_text()
  for value in [raw+' ',raw.replace("emit('start',plan)","emit('start',plan);scene?.resumeCultivation()"),raw.replace('busy||running||scene?.unresolved','false||false||scene?.unresolved')]:
   self.assertNotEqual(value,raw);self.write(n,value)
   with self.assertRaisesRegex(AssertionError,'SC02'):validate_source_intent(self.root)
 def test_foreign_clock_life_fence_and_visual_style_cannot_change(self):
  n='web/src/SourcePlanner.vue';raw=(ROOT/n).read_text()
  for before,after in [("a.runId===props.game.core.runId","true"),("r.generation===a.generation","true"),('background:transparent!important','background:#273c40!important')]:
   self.assertIn(before,raw);self.write(n,raw.replace(before,after,1))
   with self.assertRaisesRegex(AssertionError,'SC02'):validate_source_intent(self.root)
 def test_original_store_activity_clock_renderer_and_focus_stay_owned(self):
  for n in ['web/src/store.ts','src/full/activity.ts','web/src/SourceField.vue','web/src/TrainingActivity.vue','web/src/focus.ts']:
   raw=(ROOT/n).read_text();self.write(n,raw+' ')
   with self.subTest(file=n),self.assertRaisesRegex(AssertionError,'SC02'):validate_source_intent(self.root)
   self.write(n,raw)
 def test_caps_types_and_acceptance_cannot_be_resigned(self):
  for key,value in [('version',True),('maxNativeDeltaBytes',2201),('maxScopedCSSBytes',241),('userAcceptance',True)]:
   m=copy.deepcopy(MANIFEST);m[key]=value;self.write(LEDGER,m)
   with self.assertRaisesRegex(AssertionError,'SC02'):validate_source_intent(self.root)
 def test_missing_original_or_ledger_is_rejected(self):
  n=next(iter(MANIFEST['files'].values()))['before'];(self.root/n).unlink()
  with self.assertRaisesRegex(AssertionError,'SC02'):validate_source_intent(self.root)
  self.write(n,(ROOT/n).read_text());(self.root/LEDGER).unlink()
  with self.assertRaisesRegex(AssertionError,'SC02'):validate_source_intent(self.root)
