import json,tempfile,unittest
from pathlib import Path
from check_ux31_33_inventory import LEDGER,EDITS,MANIFEST,prior_check_ux3133_bytes,validate_check_ux3133
ROOT=Path(__file__).resolve().parents[2]
class CombinationDisplayTests(unittest.TestCase):
 def setUp(self):
  temp=tempfile.TemporaryDirectory();self.addCleanup(temp.cleanup);self.root=Path(temp.name)
  names={LEDGER,EDITS,*MANIFEST['sourceReferences'],*MANIFEST['nativeFiles'],*MANIFEST['oldLedgers']}
  self.original={name:(ROOT/name).read_bytes() for name in names};self.restore()
 def restore(self):
  for name,raw in self.original.items():
   p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw)
 def reject(self,before,after):
  self.restore();p=self.root/'web/src/AlchemyWorkshop.vue';source=p.read_text();self.assertIn(before,source);changed=source.replace(before,after,1);self.assertNotEqual(source,changed);p.write_text(changed)
  with self.assertRaises(AssertionError):validate_check_ux3133(self.root)
 def test_real_current_source_and_complete_inverse_keep_original_budget(self):
  self.assertEqual(validate_check_ux3133(ROOT)[1],12054);self.assertEqual(validate_check_ux3133(self.root)[1],12054)
  raw=(self.root/'web/src/AlchemyWorkshop.vue').read_bytes();self.assertEqual(prior_check_ux3133_bytes('AlchemyWorkshop.vue',raw),(self.root/MANIFEST['before']['path']).read_bytes())
 def test_original_action_and_clock_ownership_cannot_be_changed(self):
  for before,after in [('@click="start"','@click="close"'),('runtime.value.remainingMs>runtime.value.totalMs*.8','runtime.value.remainingMs>0')]:self.reject(before,after)
 def test_failure_cannot_be_hidden_or_zero_forecast_reintroduced(self):
  for before,after in [('<strong v-if="quote.failure">','<strong v-if="false">'),('<small v-if="!quote.failure">耗材','<small v-if="quote.failure">耗材')]:self.reject(before,after)
 def test_real_cost_and_failure_message_cannot_be_fabricated(self):
  for before,after in [('灵石消耗 {{quote.stones}}','灵石消耗 0'),('{{quote.failure.message}}','恢复 +999')]:self.reject(before,after)
 def test_original_source_and_old_ledger_cannot_be_resigned(self):
  for name in [MANIFEST['before']['path'],*MANIFEST['oldLedgers']]:
   self.restore();p=self.root/name;p.write_bytes(p.read_bytes()+b' ')
   with self.assertRaises(AssertionError):validate_check_ux3133(self.root)
 def test_unrecorded_change_or_expanded_scope_is_rejected(self):
  (self.root/LEDGER).unlink()
  with self.assertRaises(AssertionError):validate_check_ux3133(self.root)
  for key,value in [('maxNativeBytes',22001),('newCSSBytes',1),('userAcceptance',True)]:
   self.restore();p=self.root/LEDGER;m=json.loads(p.read_text());m[key]=value;p.write_text(json.dumps(m))
   with self.assertRaises(AssertionError):validate_check_ux3133(self.root)
if __name__=='__main__':unittest.main()
