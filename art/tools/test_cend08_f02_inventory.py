import copy,unittest
from pathlib import Path
import test_inventory as inventory
from cend08_f02_inventory import MANIFEST,LEDGER,validate_config_art,prior_config_art_bytes
ROOT=inventory.ROOT
class ConfigArtTests(unittest.TestCase):
 tearDown=inventory.InventoryTests.tearDown
 write=inventory.InventoryTests.write
 def setUp(self):
  inventory.InventoryTests.setUp(self)
  validate_config_art(self.root)
 def test_complete_parent_inverse_and_original_caps(self):
  row=MANIFEST['parent'];self.assertEqual(prior_config_art_bytes(row['path'],(ROOT/row['path']).read_bytes()),(ROOT/row['before']).read_bytes());self.assertLessEqual(validate_config_art(ROOT)[1],4800)
 def test_confirm_retry_and_disable_ownership_cannot_move(self):
  n=MANIFEST['parent']['path'];original=(ROOT/n).read_text()
  for before,after in [("emit('confirm')","emit('retry')"),("busy||!available||!q.allowed||!!error","false"),("configurationPreview(props.snapshot,cmd.value)","configurationPreview(props.snapshot,{type:'SCHOOL',school:'sword'})")]:
   self.assertIn(before,original);self.write(n,original.replace(before,after,1))
   with self.subTest(before=before),self.assertRaisesRegex(AssertionError,'CA02 complete parent'):validate_config_art(self.root)
   self.write(n,original)
 def test_paint_mapping_preview_status_and_pure_child_are_exact(self):
  n=MANIFEST['display']['path'];original=(ROOT/n).read_text()
  for before,after in [('JADE_FORMS[id]?.form',"'heart'"),('拟配','已装配'),('art/v2/equipment/','art/v2/items/'),("const props=defineProps", "const emit=defineEmits(['confirm']);const props=defineProps")]:
   self.assertIn(before,original);self.write(n,original.replace(before,after,1))
   with self.subTest(before=before),self.assertRaisesRegex(AssertionError,'CA02 exact pure display'):validate_config_art(self.root)
   self.write(n,original)
 def test_original_paint_and_atomic_clock_sources_cannot_be_replaced(self):
  for n in [MANIFEST['reusedAssets'][0]['path'],'web/src/activity-clock.ts','web/src/configuration-persistence.ts']:
   original=(ROOT/n).read_bytes();p=self.root/n;p.unlink();p.write_bytes(original+b'changed')
   with self.subTest(file=n),self.assertRaisesRegex(AssertionError,'CA02 exact original painting|CA02 original ownership'):validate_config_art(self.root)
   p.unlink();p.write_bytes(original)
 def test_missing_original_or_ledger_cannot_be_a_legacy_fallback(self):
  p=MANIFEST['parent']['before'];self.write(p,'lost original')
  with self.assertRaisesRegex(AssertionError,'CA02 original parent'):validate_config_art(self.root)
  self.write(p,(ROOT/p).read_text());(self.root/LEDGER).unlink()
  with self.assertRaisesRegex(AssertionError,'CA02 missing ledger'):validate_config_art(self.root)
  (self.root/MANIFEST['display']['path']).unlink()
  with self.assertRaisesRegex(AssertionError,'CA02 missing ledger'):validate_config_art(self.root)
  self.write(MANIFEST['parent']['path'],(ROOT/MANIFEST['parent']['before']).read_text())
  self.assertEqual(validate_config_art(self.root),(set(),0))
 def test_original_caps_and_acceptance_cannot_be_resigned(self):
  for key,value in [('maxDisplayBytes',4801),('maxParentBytes',6000),('newRasterAssets',1),('version',True),('userAcceptance',True)]:
   m=copy.deepcopy(MANIFEST);m[key]=value;self.write(LEDGER,m)
   with self.subTest(key=key),self.assertRaisesRegex(AssertionError,'CA02 immutable'):validate_config_art(self.root)
