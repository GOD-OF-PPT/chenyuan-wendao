import copy,hashlib,unittest
from pathlib import Path
import test_inventory as inventory
from cend08_f03_inventory import MANIFEST,LEDGER,validate_source_materials,prior_source_material_bytes
ROOT=inventory.ROOT
class SourceMaterialTests(unittest.TestCase):
 tearDown=inventory.InventoryTests.tearDown
 def write(self,path,value):
  if not isinstance(value,bytes):return inventory.InventoryTests.write(self,path,value)
  p=self.root/path;p.parent.mkdir(parents=True,exist_ok=True)
  if p.exists():p.unlink()
  p.write_bytes(value)
 def setUp(self):
  inventory.InventoryTests.setUp(self)
  validate_source_materials(self.root)
 def test_complete_inverse_all_paths_callbacks_and_original_budget(self):
  for row in MANIFEST['parents']:self.assertEqual(prior_source_material_bytes(row['path'],(ROOT/row['path']).read_bytes()),(ROOT/row['before']).read_bytes())
  self.assertLessEqual(sum((ROOT/r['path']).stat().st_size for r in MANIFEST['parents']),MANIFEST['maxParentTotalBytes'])
  self.assertLessEqual(validate_source_materials(self.root)[1],6500)
 def test_each_parent_original_interaction_and_state_cannot_move(self):
  for row in MANIFEST['parents']:
   n=row['path'];raw=(ROOT/n).read_text()
   for before,after in [("emit('arrange')","emit('start')"),("props.sequence>0","props.sequence>=0"),("projectSourceWork(props.state,props.progress)","projectSourceWork('working',1)")]:
    self.assertIn(before,raw);self.write(n,raw.replace(before,after,1))
    with self.subTest(file=n,mutation=before),self.assertRaisesRegex(AssertionError,'SM03 complete current parent'):validate_source_materials(self.root)
    self.write(n,raw)
 def test_material_prefix_alpha_and_stateless_surface_cannot_change(self):
  n=MANIFEST['display']['path'];raw=(ROOT/n).read_text()
  for before,after in [("props.prefix+'-'+name","'shared-'+name"),('in2="SourceAlpha"','in2="SourceGraphic"'),("const props=defineProps","const clock=setInterval(()=>{},1);const props=defineProps")]:
   self.assertIn(before,raw);self.write(n,raw.replace(before,after,1))
   with self.subTest(mutation=before),self.assertRaisesRegex(AssertionError,'SM03 exact pure material'):validate_source_materials(self.root)
   self.write(n,raw)
 def test_old_source_authority_rasters_ledgers_are_not_resigned(self):
  for field in ['authority','reusedPaintings','oldLedgers']:
   n=next(iter(MANIFEST[field]));raw=(ROOT/n).read_bytes();self.write(n,raw+b'changed')
   with self.subTest(field=field),self.assertRaisesRegex(AssertionError,'SM03 original authority|SM03 old paintings|SM03 old ledgers'):validate_source_materials(self.root)
   self.write(n,raw)
 def test_missing_old_ledger_or_child_does_not_silence_new_parent(self):
  n=MANIFEST['parents'][0]['before'];self.write(n,'lost original')
  with self.assertRaisesRegex(AssertionError,'SM03 original parent'):validate_source_materials(self.root)
  self.write(n,(ROOT/n).read_bytes());(self.root/LEDGER).unlink()
  with self.assertRaisesRegex(AssertionError,'SM03 missing ledger'):validate_source_materials(self.root)
  (self.root/MANIFEST['display']['path']).unlink()
  with self.assertRaisesRegex(AssertionError,'SM03 missing ledger'):validate_source_materials(self.root)
  for row in MANIFEST['parents']:self.write(row['path'],(ROOT/row['before']).read_bytes())
  self.assertEqual(validate_source_materials(self.root),(set(),0))
 def test_typed_caps_provenance_and_acceptance_are_immutable(self):
  for key,value in [('maxDisplayBytes',6501),('newRasterAssets',1),('version',True),('userAcceptance',True)]:
   m=copy.deepcopy(MANIFEST);m[key]=value;self.write(LEDGER,m)
   with self.subTest(key=key),self.assertRaisesRegex(AssertionError,'SM03 immutable'):validate_source_materials(self.root)
