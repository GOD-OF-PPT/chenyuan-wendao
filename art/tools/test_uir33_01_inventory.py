import json,tempfile,unittest
from pathlib import Path
from uir33_01_inventory import FACTS,LEDGER,MANIFEST,prior_uir3301_bytes,validate_uir3301
ROOT=Path(__file__).resolve().parents[2]
class CultivationOngoingTests(unittest.TestCase):
 def setUp(self):
  t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup);self.root=Path(t.name)
  names={LEDGER,MANIFEST['added']['path'],*MANIFEST['sourceReferences'],*MANIFEST['originalLedgers'],*[f['path']for f in FACTS.values()]}
  names.update(r['path']for r in json.loads((ROOT/'art/redesign/cultivation-objects.json').read_text())['files'])
  for n in names:
   p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((ROOT/n).read_bytes())
 def test_complete_original_controller_and_old_budgets_remain(self):
  files,total=validate_uir3301(self.root);self.assertEqual(total,MANIFEST['added']['bytes']);self.assertIn(LEDGER,files)
  for n,f in FACTS.items():self.assertEqual(prior_uir3301_bytes(n,(self.root/f['path']).read_bytes()),(self.root/f['before']).read_bytes())
 def corrupt(self,path,old,new):
  p=self.root/path;s=p.read_text();self.assertIn(old,s);p.write_text(s.replace(old,new,1))
  with self.assertRaises(AssertionError):validate_uir3301(self.root)
 def test_continue_cannot_turn_into_new_authorization(self):self.corrupt(MANIFEST['added']['path'],'@click="store.resumeCultivation"','@click="store.startCultivation"')
 def test_pause_cannot_turn_into_a_reward(self):self.corrupt(MANIFEST['added']['path'],'@click="store.pauseCultivation"','@click="store.act"')
 def test_actual_method_cannot_be_replaced_by_draft(self):self.corrupt('web/src/App.vue',"store.activity.plan.method:hubTrainingMethod","hubTrainingMethod:hubTrainingMethod")
 def test_old_source_cannot_be_resigned(self):self.corrupt(FACTS['App.vue']['before'],'const hubTrainingMethod','const fakeTrainingMethod')
 def test_new_budget_cannot_be_raised(self):
  p=self.root/LEDGER;m=json.loads(p.read_text());m['maxAddedNativeBytes']=9999;p.write_text(json.dumps(m))
  with self.assertRaises(AssertionError):validate_uir3301(self.root)
if __name__=='__main__':unittest.main()
