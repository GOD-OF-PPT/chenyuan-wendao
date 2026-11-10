import copy,hashlib,json,unittest
import test_inventory as inventory
from cend13c_gap_inventory import MANIFEST,LEDGER,prior_preparation_gap_bytes,validate_preparation_gap

ROOT=inventory.ROOT
class PreparationGapTests(unittest.TestCase):
 tearDown=inventory.InventoryTests.tearDown
 def write(self,n,v):
  if not isinstance(v,bytes):return inventory.InventoryTests.write(self,n,v)
  p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True)
  if p.exists()or p.is_symlink():p.unlink()
  p.write_bytes(v)
 def setUp(self):
  inventory.InventoryTests.setUp(self)
  validate_preparation_gap(self.root)
 def test_full_original_inverse_and_actual_unchanged_regional_budgets(self):
  r=MANIFEST['parent'];self.assertEqual(prior_preparation_gap_bytes(r['path'],(ROOT/r['path']).read_bytes()),(ROOT/r['before']).read_bytes())
  records,facts=validate_preparation_gap(self.root);self.assertEqual(facts['parentBytes'],8433);self.assertEqual(facts['displayDeltaBytes'],2)
  self.assertEqual(facts['actualGroups'],{'playable-flow':60000,'idle-preparation':59895});self.assertIn(r['before'],records)
 def test_missing_ledger_requires_exact_original_parent_without_module_or_marker_shortcuts(self):
  (self.root/LEDGER).unlink()
  with self.assertRaisesRegex(AssertionError,'C13C missing ledger exact original parent'):validate_preparation_gap(self.root)
  r=MANIFEST['parent'];self.write(r['path'],(ROOT/r['before']).read_bytes());self.assertEqual(validate_preparation_gap(self.root),(set(),{}))
  self.write(r['path'],(ROOT/r['before']).read_bytes()+b' ')
  with self.assertRaisesRegex(AssertionError,'C13C missing ledger exact original parent'):validate_preparation_gap(self.root)
 def test_unique_missing_item_and_same_visible_page_guard_cannot_be_removed(self):
  n=MANIFEST['parent']['path'];raw=(ROOT/n).read_text()
  for token in ['needs.value.filter(n=>n.have<n.required)','missing.length!==1','!needPage.rows.includes(missing[0])',"missing.map(n=>n.label+' ×'+(n.required-n.have)).join('、')",'quote?.failure?.message']:
   self.assertIn(token,raw);self.write(n,raw.replace(token,'false',1).encode())
   with self.subTest(token=token),self.assertRaisesRegex(AssertionError,'C13C exact display parent'):validate_preparation_gap(self.root)
   self.write(n,raw.encode())
 def test_complete_original_and_compiler_inputs_cannot_be_missing_or_changed(self):
  for r in [MANIFEST['parent'],MANIFEST['functional'],MANIFEST['compressionProof']]:
   n=r['before']if 'before'in r else r['path'];raw=(ROOT/n).read_bytes();self.write(n,raw+b' ')
   with self.subTest(path=n),self.assertRaises(AssertionError):validate_preparation_gap(self.root)
   self.write(n,raw)
 def test_typed_manifest_and_old_caps_cannot_be_resigned(self):
  for k,v in [('version',True),('newRasterAssets',1),('userAcceptance',True),('maxDisplayDelta',1001)]:
   m=copy.deepcopy(MANIFEST);m[k]=v;self.write(LEDGER,m)
   with self.subTest(field=k),self.assertRaisesRegex(AssertionError,'C13C immutable typed ledger'):validate_preparation_gap(self.root)
   self.write(LEDGER,copy.deepcopy(MANIFEST))
  for n in MANIFEST['oldLedgers']:
   raw=(ROOT/n).read_bytes();self.write(n,raw+b' ')
   with self.subTest(ledger=n),self.assertRaises(AssertionError):validate_preparation_gap(self.root)
   self.write(n,raw)
 def test_game_clock_costs_and_complete_material_controls_keep_original_owners(self):
  for n in ['web/src/PreparationMaterials.vue','web/src/preparation-bench.css','web/src/App.vue','web/src/store.ts','web/src/activity-clock.ts','src/full/preparation.ts','src/full/queries.ts']:
   raw=(ROOT/n).read_bytes();self.write(n,raw+b' changed')
   with self.subTest(path=n),self.assertRaisesRegex(AssertionError,'C13C unchanged authority'):validate_preparation_gap(self.root)
   self.write(n,raw)
 def test_prior_and_historical_identity_adapters_preserve_complete_original_validators(self):
  for r in [MANIFEST['hook'],*MANIFEST['legacyAdapters']]:
   n=r['path'];raw=(ROOT/n).read_bytes();self.write(n,raw+b' ')
   with self.subTest(path=n),self.assertRaisesRegex(AssertionError,'C13C exact .*adapter|C13C exact prior hook'):validate_preparation_gap(self.root)
   self.write(n,raw)
  inventory.validate(self.root)
 def test_real_cow_dependencies_include_every_original_reference_and_reject_symlink_parent(self):
  for n in MANIFEST['sourceReferences']+[MANIFEST['parent']['before'],MANIFEST['functional']['path'],MANIFEST['compressionProof']['path']]:self.assertTrue((self.root/n).is_file(),n)
  p=self.root/MANIFEST['parent']['path'];p.unlink();p.symlink_to(ROOT/MANIFEST['parent']['path'])
  with self.assertRaisesRegex(AssertionError,'C13C actual local file'):validate_preparation_gap(self.root)

if __name__=='__main__':unittest.main()
