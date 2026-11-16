import unittest,json,copy
from pathlib import Path
import test_inventory as inventory
ROOT=inventory.ROOT
from cend07_f02b_inventory import MANIFEST,LEDGER,validate_relic_focus,prior_relic_focus_bytes
class RelicFocusTests(unittest.TestCase):
 def setUp(self):
  inventory.InventoryTests.setUp(self)
  validate_relic_focus(self.root)
 write=inventory.InventoryTests.write
 tearDown=inventory.InventoryTests.tearDown
 def test_actual_positive_and_complete_inverse(self):
  validate_relic_focus(ROOT)
  for n,row in MANIFEST['files'].items():self.assertEqual(prior_relic_focus_bytes(n,(ROOT/n).read_bytes()),(ROOT/row['before']).read_bytes())
 def test_unknown_display_code_or_new_write_is_rejected(self):
  n='web/src/RelicAtelier.vue';raw=(ROOT/n).read_text()
  for change in [raw+' ',raw.replace("emit('start')","emit('start');emit('equip')"),raw.replace('v-if="!owned" class="relic-material-slots"','v-if="owned" class="relic-material-slots"')]:
   self.assertNotEqual(change,raw);self.write(n,change)
   with self.assertRaisesRegex(AssertionError,'RF02'):validate_relic_focus(self.root)
 def test_original_controller_clock_receipt_and_renderer_cannot_change(self):
  for n in ['web/src/App.vue','src/full/activity.ts','web/src/RelicInscription.vue','web/src/equipment-effects.ts','web/src/focus.ts']:
   raw=(ROOT/n).read_text();self.write(n,raw+' ')
   with self.subTest(file=n),self.assertRaisesRegex(AssertionError,'RF02'):validate_relic_focus(self.root)
   self.write(n,raw)
 def test_original_ledger_caps_typed_scope_and_acceptance_cannot_be_resigned(self):
  for key,value in [('version',True),('userAcceptance',True),('newRasterAssets',1),('maxNativeDeltaBytes',1)]:
   m=copy.deepcopy(MANIFEST);m[key]=value;self.write(LEDGER,m)
   with self.assertRaisesRegex(AssertionError,'RF02'):validate_relic_focus(self.root)
 def test_missing_old_source_or_new_ledger_is_rejected(self):
  row=next(iter(MANIFEST['files'].values()));raw=(self.root/row['before']).read_bytes();(self.root/row['before']).unlink()
  with self.assertRaisesRegex(AssertionError,'RF02'):validate_relic_focus(self.root)
  (self.root/row['before']).write_bytes(raw);(self.root/LEDGER).unlink()
  with self.assertRaisesRegex(AssertionError,'RF02'):validate_relic_focus(self.root)
 def test_unknown_revision_cannot_be_hidden_by_legacy_normalization(self):
  n='web/src/RelicAtelier.vue';raw=(ROOT/n).read_bytes();self.write(n,raw.decode()+'\n<!-- unexpected -->')
  with self.assertRaisesRegex(AssertionError,'RF02'):prior_relic_focus_bytes(n,(self.root/n).read_bytes())
