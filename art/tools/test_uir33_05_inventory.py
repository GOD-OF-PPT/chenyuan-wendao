import json,shutil,tempfile,unittest
from pathlib import Path
from uir33_05_inventory import LEDGER,MANIFEST,IMPORT,prior_uir3305_main,validate_uir3305
ROOT=Path(__file__).resolve().parents[2]
class ActivityDetailPresentationTests(unittest.TestCase):
 def setUp(self):
  t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup);self.root=Path(t.name)
  names={LEDGER,*[r['path']for r in MANIFEST['files']],MANIFEST['consumer']['path'],MANIFEST['before']['path'],*MANIFEST['unchanged'],*MANIFEST['sourceReferences']}
  for n in names:
   p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/n,p)
 def test_current_style_and_original_owners_pass(self):
  self.assertEqual(validate_uir3305(self.root)[1],MANIFEST['files'][0]['bytes']);self.assertEqual(prior_uir3305_main((self.root/'web/src/main.ts').read_bytes()),(self.root/MANIFEST['before']['path']).read_bytes())
 def test_second_bootstrap_cannot_hide_in_style_import(self):
  p=self.root/'web/src/main.ts';p.write_text(p.read_text()+'\nvoid mount();')
  with self.assertRaises(AssertionError):validate_uir3305(self.root)
 def test_original_activity_writer_cannot_change(self):
  p=self.root/'web/src/TrainingActivity.vue';s=p.read_text();self.assertIn('@click="store.pauseCultivation"',s);p.write_text(s.replace('@click="store.pauseCultivation"','@click="store.retry"'))
  with self.assertRaises(AssertionError):validate_uir3305(self.root)
 def test_new_budget_cannot_be_raised(self):
  p=self.root/LEDGER;m=json.loads(p.read_text());m['maxAddedNativeBytes']=4000;p.write_text(json.dumps(m))
  with self.assertRaises(AssertionError):validate_uir3305(self.root)
 def test_unrecorded_style_cannot_remain(self):
  (self.root/LEDGER).unlink()
  with self.assertRaises(AssertionError):validate_uir3305(self.root)
 def test_absent_feature_accepts_empty_root(self):
  with tempfile.TemporaryDirectory() as d:self.assertEqual(validate_uir3305(d),(set(),0))
