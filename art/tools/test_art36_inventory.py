import hashlib,json,shutil,tempfile,unittest
from pathlib import Path
from art36_inventory import validate_art36,LEDGER,CSS,MAIN,UNCHANGED
ROOT=Path(__file__).resolve().parents[2]
class ErrorStageInventoryTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name);m=json.loads((ROOT/LEDGER).read_text())
  names={LEDGER,CSS,MAIN,m['baseline']['path'],*UNCHANGED,*m['sourceReferences']}
  if(ROOT/'art/redesign/art37.json').exists():
   evolution=json.loads((ROOT/'art/redesign/art37.json').read_text());names.update({'art/redesign/art37.json',evolution['baseline']['path']})
  for name in names:
   dst=self.root/name;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,dst)
 def check(self):return validate_art36(self.root)
 def refresh(self,name):
  m=json.loads((self.root/LEDGER).read_text());r=m['consumer'] if name==MAIN else m['files'][0];data=(self.root/name).read_bytes();r.update(bytes=len(data),sha256=hashlib.sha256(data).hexdigest());(self.root/LEDGER).write_text(json.dumps(m))
 def test_positive_complete_combined_budget_and_single_import(self):self.assertGreater(self.check()[2],0)
 def test_bootstrap_function_cannot_change_even_with_updated_facts(self):
  p=self.root/MAIN;p.write_text(p.read_text().replace('void mount();','void mount(); mount();'));self.refresh(MAIN)
  with self.assertRaises(AssertionError):self.check()
 def test_hide_or_shrink_text_cannot_be_signed_into_style(self):
  p=self.root/CSS;p.write_text(p.read_text()+'\n#app .art10-study-scene[data-state=failed]{font-size:12px}');self.refresh(CSS)
  with self.assertRaises(AssertionError):self.check()
 def test_normal_state_cannot_gain_the_error_layout(self):
  p=self.root/CSS;p.write_text(p.read_text().replace('data-state=failed','data-state=idle'));self.refresh(CSS)
  with self.assertRaises(AssertionError):self.check()
 def test_old_combined_cap_cannot_increase(self):
  p=self.root/LEDGER;m=json.loads(p.read_text());m['budgets']['combinedArt35CSS']+=1;p.write_text(json.dumps(m))
  with self.assertRaises(AssertionError):self.check()
 def test_old_activity_owner_cannot_change(self):
  p=self.root/'web/src/JadeStudyScene.vue';p.write_text(p.read_text()+'\n// changed owner')
  with self.assertRaises(AssertionError):self.check()
 def test_absent_ledger_cannot_leave_a_hidden_style_consumer(self):
  (self.root/LEDGER).unlink()
  with self.assertRaises(AssertionError):self.check()

 def test_absent_feature_accepts_a_root_without_ui(self):
  with tempfile.TemporaryDirectory() as d:self.assertEqual(validate_art36(Path(d)),(set(),0,0))
