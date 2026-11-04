import json,shutil,tempfile,unittest
from pathlib import Path
from ux33_inventory import FACTS,GROUPS,LEDGER,MANIFEST,prior_ux33_bytes,validate_ux33
ROOT=Path(__file__).resolve().parents[2]
class SharedStatusTests(unittest.TestCase):
 def setUp(self):
  t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup);self.root=Path(t.name)
  names={LEDGER,*MANIFEST['sourceReferences'],*['web/src/'+n for n in FACTS]}
  for n,g in GROUPS.items():names.add('art/redesign/'+n+'.json');names.update(g['files'])
  for n in names:
   out=self.root/n;out.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/n,out)
 def changed(self,n,a,b):
  p=self.root/'web/src'/n;s=p.read_text();self.assertIn(a,s);p.write_text(s.replace(a,b,1))
  with self.assertRaises(AssertionError):validate_ux33(self.root)
 def test_exact_current_source_preserves_every_original_with_original_budgets(self):
  files,total=validate_ux33(self.root);self.assertEqual(total,282501);self.assertIn(LEDGER,files)
  for n,f in FACTS.items():self.assertEqual(prior_ux33_bytes(n,(self.root/'web/src'/n).read_bytes()),(self.root/f['baseline']).read_bytes())
 def test_retry_callback_cannot_reauthorize_a_new_plan(self):self.changed('App.vue','@click="retryOperation"','@click="restart"')
 def test_pause_authority_and_callback_remain_owned(self):self.changed('TrainingActivity.vue','@click="store.pauseCultivation"','@click="store.retry"')
 def test_clock_cannot_be_shortened(self):self.changed('TrainingActivity.vue','runtime.value?.remainingMs??a.value?.cycleMs??0','1')
 def test_store_error_value_cannot_be_rewritten(self):self.changed('App.vue','recoveryMessage(store.error,store.canRetry)',"recoveryMessage(store.error='',true)")
 def test_old_reason_object_cannot_be_mutated(self):self.changed('activity-view.ts',"return'灵石不足'","return reason.message='灵石不足'")
 def test_budget_reason_cannot_be_claimed_as_success(self):self.changed('activity-view.ts',"return'本段用石额度不足'","return'交易成功'")
 def test_original_source_cannot_be_resigned(self):
  p=self.root/FACTS['App.vue']['baseline'];p.write_text(p.read_text()+'\n')
  with self.assertRaises(AssertionError):validate_ux33(self.root)
 def test_old_group_caps_and_human_acceptance_cannot_be_expanded(self):
  p=self.root/'art/redesign/idle-cultivation.json';m=json.loads(p.read_text());m['maxNativeBytes']=23000;p.write_text(json.dumps(m))
  with self.assertRaises(AssertionError):validate_ux33(self.root)
if __name__=='__main__':unittest.main()
