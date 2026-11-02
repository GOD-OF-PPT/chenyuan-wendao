import hashlib,json,shutil,tempfile,unittest
from pathlib import Path
from art37_inventory import validate_art37,original_art37_main,LEDGER,CSS,MAIN,UNCHANGED
ROOT=Path(__file__).resolve().parents[2]
class DialogActionInventoryTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name);m=json.loads((ROOT/LEDGER).read_text())
  for name in {LEDGER,CSS,MAIN,m['baseline']['path'],*UNCHANGED,*m['sourceReferences'],'web/src/GameConfirmDialog.vue','web/src/use-game-confirmation.ts'}:
   dst=self.root/name;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,dst)
 def check(self):return validate_art37(self.root)
 def refresh(self,name):
  p=self.root/LEDGER;m=json.loads(p.read_text());r=m['consumer']if name==MAIN else m['files'][0];data=(self.root/name).read_bytes();r.update(bytes=len(data),sha256=hashlib.sha256(data).hexdigest());p.write_text(json.dumps(m))
 def test_positive_exact_main_inverse_original_cap_and_owners(self):
  self.assertGreater(self.check()[2],0);m=json.loads((self.root/LEDGER).read_text());self.assertEqual(original_art37_main(self.root,(self.root/MAIN).read_bytes()),(self.root/m['baseline']['path']).read_bytes())
 def test_signed_bootstrap_mutation_cannot_be_a_style_evolution(self):
  p=self.root/MAIN;p.write_text(p.read_text()+'\nvoid mount();');self.refresh(MAIN)
  with self.assertRaises(AssertionError):self.check()
 def test_original_combined_budget_cannot_rise(self):
  p=self.root/LEDGER;m=json.loads(p.read_text());m['budgets']['combinedArt18NativeBytes']+=1;p.write_text(json.dumps(m))
  with self.assertRaises(AssertionError):self.check()
 def test_signed_css_cannot_clip_content(self):
  p=self.root/CSS;p.write_text(p.read_text()+'\ndialog{overflow:hidden}');self.refresh(CSS)
  with self.assertRaises(AssertionError):self.check()
 def test_signed_css_cannot_shrink_text(self):
  p=self.root/CSS;p.write_text(p.read_text()+'\ndialog{font-size:12px}');self.refresh(CSS)
  with self.assertRaises(AssertionError):self.check()
 def test_original_consent_owner_cannot_change(self):
  p=self.root/'web/src/use-game-confirmation.ts';p.write_text(p.read_text()+'\n// altered owner')
  with self.assertRaises(AssertionError):self.check()
 def test_style_cannot_be_detached_and_resigned(self):
  p=self.root/MAIN;p.write_text(p.read_text().replace("import './art37-dialog-actions.css';\n",''));self.refresh(MAIN)
  with self.assertRaises(AssertionError):self.check()
 def test_missing_ledger_cannot_leave_an_import(self):
  (self.root/LEDGER).unlink()
  with self.assertRaises(AssertionError):self.check()
 def test_signed_css_cannot_resume_compatibility(self):
  p=self.root/CSS;p.write_text(p.read_text()+'\n@media(max-width:700px){dialog{padding:0}}');self.refresh(CSS)
  with self.assertRaises(AssertionError):self.check()
 def test_absent_feature_accepts_a_root_without_ui(self):
  with tempfile.TemporaryDirectory()as d:self.assertEqual(validate_art37(d),(set(),0,0))
