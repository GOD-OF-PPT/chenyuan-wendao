import copy,hashlib,json,unittest
import test_inventory as inventory
from cend13b_response_inventory import MANIFEST,LEDGER,prior_response_bytes,validate_response_context

ROOT=inventory.ROOT
class ResponseContextTests(unittest.TestCase):
 tearDown=inventory.InventoryTests.tearDown
 def write(self,n,v):
  if not isinstance(v,bytes):return inventory.InventoryTests.write(self,n,v)
  p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True)
  if p.exists():p.unlink()
  p.write_bytes(v)
 def setUp(self):
  inventory.InventoryTests.setUp(self)
  validate_response_context(self.root)
 def test_complete_source_inverse_and_actual_groups_include_the_new_helper(self):
  for r in MANIFEST['parents']:self.assertEqual(prior_response_bytes(r['path'],(ROOT/r['path']).read_bytes()),(ROOT/r['before']).read_bytes())
  records,facts=validate_response_context(self.root)
  self.assertEqual(facts['helperBytes'],2719);self.assertLessEqual(facts['layerBytes'],5000)
  for group,cap in MANIFEST['caps'].items():
   rows=json.loads((ROOT/('art/redesign/'+group+'.json')).read_text())['files'];actual=sum((ROOT/r['path']).stat().st_size for r in rows)+(facts['helperBytes']if group=='narrative-objects'else 0)
   self.assertEqual(facts['actualGroups'][group],actual);self.assertLessEqual(actual,cap)
  self.assertIn(MANIFEST['helper']['path'],records)
 def test_missing_ledger_requires_complete_old_parents_even_without_new_module_markers(self):
  (self.root/LEDGER).unlink()
  with self.assertRaisesRegex(AssertionError,'C13B missing ledger helper'):validate_response_context(self.root)
  (self.root/MANIFEST['helper']['path']).unlink()
  with self.assertRaisesRegex(AssertionError,'C13B missing ledger exact old parent'):validate_response_context(self.root)
  for r in MANIFEST['parents']:self.write(r['path'],(ROOT/r['before']).read_bytes())
  self.assertEqual(validate_response_context(self.root),(set(),{}))
  r=MANIFEST['parents'][0];self.write(r['path'],(ROOT/r['before']).read_bytes()+b' ')
  with self.assertRaisesRegex(AssertionError,'C13B missing ledger exact old parent'):validate_response_context(self.root)
 def test_each_current_display_parent_is_exact_without_resigning_an_old_ledger(self):
  for r in MANIFEST['parents']:
   raw=(ROOT/r['path']).read_bytes();self.write(r['path'],raw+b' ')
   with self.subTest(path=r['path']),self.assertRaisesRegex(AssertionError,'C13B exact current parent'):validate_response_context(self.root)
   self.write(r['path'],raw)
 def test_readonly_context_identity_operation_and_clock_fences_cannot_be_removed(self):
  n=MANIFEST['helper']['path'];raw=(ROOT/n).read_text()
  for guard in ['a.runId!==g.core.runId','a.gameRevision!==g.core.revision',"!['DECIDE','ANSWER_TRIAL','END'].includes(a.plan.action.type)",'g.core.activeEvent.instanceId===origin.core.activeEvent?.instanceId','g.trial?.stage===origin.trial?.stage','i.owned','r.generation===a.generation']:
   self.assertIn(guard,raw);self.write(n,raw.replace(guard,'false',1))
   with self.subTest(guard=guard),self.assertRaisesRegex(AssertionError,'C13B exact readonly status source'):validate_response_context(self.root)
   self.write(n,raw.encode())
 def test_original_authority_and_effect_owners_stay_unchanged(self):
  for n in ['web/src/store.ts','web/src/narrative-effects.ts','web/src/use-activity-effect.ts','web/src/activity-clock.ts','web/src/story-pages.ts','web/src/App.vue']:
   raw=(ROOT/n).read_bytes();self.write(n,raw+b' changed')
   with self.subTest(path=n),self.assertRaisesRegex(AssertionError,'C13B original authority'):validate_response_context(self.root)
   self.write(n,raw)
 def test_typed_caps_acceptance_and_full_scope_cannot_be_resigned(self):
  for k,v in [('version',True),('maxHelperBytes',3001),('maxStatusLayerBytes',5001),('newRasterAssets',1),('userAcceptance',True)]:
   m=copy.deepcopy(MANIFEST);m[k]=v;self.write(LEDGER,m)
   with self.subTest(field=k),self.assertRaisesRegex(AssertionError,'C13B immutable typed ledger'):validate_response_context(self.root)
   self.write(LEDGER,copy.deepcopy(MANIFEST))
  for name in MANIFEST['oldLedgers']:
   raw=(ROOT/name).read_bytes();self.write(name,raw+b' ')
   with self.subTest(ledger=name),self.assertRaises(AssertionError):validate_response_context(self.root)
   self.write(name,raw)
 def test_both_legacy_validator_adapters_keep_the_complete_original_guard_code(self):
  for key,reason in [('hook','C13B exact C13A hook'),('legacyIdentityAdapter','C13B exact ART32 historical identity adapter')]:
   r=MANIFEST[key];raw=(ROOT/r['path']).read_bytes();self.write(r['path'],raw+b' ')
   with self.subTest(guard=r['path']),self.assertRaisesRegex(AssertionError,reason):validate_response_context(self.root)
   self.write(r['path'],raw)
  inventory.validate(self.root)
 def test_preserved_parents_and_every_referenced_input_are_real_cow_dependencies(self):
  for n in [r['before']for r in MANIFEST['parents']]+MANIFEST['sourceReferences']:
   self.assertTrue((self.root/n).is_file(),n)
  r=MANIFEST['parents'][0];self.write(r['before'],(ROOT/r['before']).read_bytes()+b' changed')
  with self.assertRaisesRegex(AssertionError,'C13B exact original parent'):validate_response_context(self.root)

if __name__=='__main__':unittest.main()
