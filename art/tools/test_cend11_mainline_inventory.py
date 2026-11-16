import copy,unittest
import test_inventory as inventory
from cend11_mainline_inventory import MANIFEST,LEDGER,validate_mainline_hud,prior_mainline_hud_bytes
ROOT=inventory.ROOT
class MainlineHudTests(unittest.TestCase):
 tearDown=inventory.InventoryTests.tearDown
 def write(self,n,value):
  if not isinstance(value,bytes):return inventory.InventoryTests.write(self,n,value)
  p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True)
  if p.exists():p.unlink()
  p.write_bytes(value)
 def setUp(self):
  inventory.InventoryTests.setUp(self);validate_mainline_hud(self.root)
 def test_full_parents_restore_exact_original_and_actual_caps_remain(self):
  for row in MANIFEST['parents']:self.assertEqual(prior_mainline_hud_bytes(row['path'],(ROOT/row['path']).read_bytes()),(ROOT/row['before']).read_bytes())
  self.assertLessEqual((ROOT/'web/src/App.vue').stat().st_size,159635);self.assertLessEqual((ROOT/'web/src/GameHud.vue').stat().st_size+(ROOT/'web/src/stage-r1.css').stat().st_size,18000)
 def test_current_snapshot_and_original_view_callback_cannot_change(self):
  for n,before,after in [('web/src/App.vue','runId:g.core.runId','runId:"old"'),('web/src/GameHud.vue',"emit('goal',$event)","emit('start',$event)")]:
   raw=(ROOT/n).read_text();self.assertIn(before,raw);self.write(n,raw.replace(before,after,1))
   with self.subTest(path=n),self.assertRaisesRegex(AssertionError,'MH11 exact current parent'):validate_mainline_hud(self.root)
   self.write(n,raw)
 def test_display_projection_and_original_writer_are_bound(self):
  for n in [MANIFEST['display']['path'],MANIFEST['projection']['path'],'web/src/store.ts','src/full/goals.ts']:
   raw=(ROOT/n).read_bytes();self.write(n,raw+b'changed')
   with self.subTest(path=n),self.assertRaisesRegex(AssertionError,'MH11 exact pure|MH11 original'):validate_mainline_hud(self.root)
   self.write(n,raw)
 def test_missing_ledger_and_changed_old_parents_cannot_disable_feature(self):
  (self.root/LEDGER).unlink()
  with self.assertRaisesRegex(AssertionError,'MH11 missing ledger'):validate_mainline_hud(self.root)
  for k in ['display','projection']:(self.root/MANIFEST[k]['path']).unlink()
  for row in MANIFEST['parents']:
   with self.assertRaisesRegex(AssertionError,'MH11 missing ledger'):validate_mainline_hud(self.root)
   self.write(row['path'],(ROOT/row['before']).read_bytes())
  self.assertEqual(validate_mainline_hud(self.root),(set(),0));self.write(MANIFEST['parents'][0]['path'],(ROOT/MANIFEST['parents'][0]['before']).read_bytes()+b' ')
  with self.assertRaisesRegex(AssertionError,'MH11 missing ledger'):validate_mainline_hud(self.root)
 def test_caps_and_acceptance_cannot_be_resigned_or_retyped(self):
  for key,value in [('version',True),('oldR1Cap',18001),('maxAppDeltaBytes',401),('userAcceptance',True),('newRasterAssets',1)]:
   m=copy.deepcopy(MANIFEST);m[key]=value;self.write(LEDGER,m)
   with self.subTest(key=key),self.assertRaisesRegex(AssertionError,'MH11 immutable typed'):validate_mainline_hud(self.root)
