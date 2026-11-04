import json,tempfile,unittest
from pathlib import Path
from check_uir33_inventory import LEDGER,MANIFEST,prior_check_uir33_bytes,validate_check_uir33
ROOT=Path(__file__).resolve().parents[2]
class NeutralStudyListTests(unittest.TestCase):
 def setUp(self):
  t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup);self.root=Path(t.name);names={LEDGER,MANIFEST['path'],MANIFEST['before'],*MANIFEST['sourceReferences'],'art/redesign/idle-preparation.json'};names.update(r['path']for r in json.loads((ROOT/'art/redesign/idle-preparation.json').read_text())['files'])
  for n in names:
   p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((ROOT/n).read_bytes())
 def test_neutral_name_preserves_full_source_and_all_authority(self):
  _,size=validate_check_uir33(self.root);self.assertEqual(size,18541);self.assertEqual(prior_check_uir33_bytes(MANIFEST['path'],(self.root/MANIFEST['path']).read_bytes()),(self.root/MANIFEST['before']).read_bytes())
 def test_begin_callback_cannot_be_replaced(self):
  p=self.root/MANIFEST['path'];s=p.read_text();old="emit('start',plan)";self.assertIn(old,s);p.write_text(s.replace(old,"emit('start',{})",1))
  with self.assertRaises(AssertionError):validate_check_uir33(self.root)
 def test_old_budget_cannot_be_raised(self):
  p=self.root/'art/redesign/idle-preparation.json';m=json.loads(p.read_text());m['maxNativeBytes']=61000;p.write_text(json.dumps(m))
  with self.assertRaises(AssertionError):validate_check_uir33(self.root)
if __name__=='__main__':unittest.main()
