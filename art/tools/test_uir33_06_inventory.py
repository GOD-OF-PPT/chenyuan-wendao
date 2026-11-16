import json,shutil,tempfile,unittest
from pathlib import Path
from uir33_06_inventory import LEDGER,MANIFEST,prior_uir3306_bytes,validate_uir3306
ROOT=Path(__file__).resolve().parents[2]
class LifeEntryPresentationTests(unittest.TestCase):
 def setUp(self):
  t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup);self.root=Path(t.name);names={LEDGER,MANIFEST['consumer']['path'],*[r[k]for r in MANIFEST['files']for k in ['path','before']],*MANIFEST['unchanged'],*MANIFEST['sourceReferences'],*['art/redesign/'+n+'.json'for n in MANIFEST['oldLedgers']]}
  for group in ['story-journey','narrative-objects']:names.update(r['path']for r in json.loads((ROOT/('art/redesign/'+group+'.json')).read_text())['files'])
  for n in names:
   p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/n,p)
 def test_real_projection_reconstructs_whole_originals_and_keeps_caps(self):
  self.assertEqual(validate_uir3306(self.root)[1],271)
  for r in MANIFEST['files']:self.assertEqual(prior_uir3306_bytes(r['path'],(self.root/r['path']).read_bytes()),(self.root/r['before']).read_bytes())
 def test_retirement_cannot_change_with_a_new_title(self):
  p=self.root/'web/src/LifeCatalogue.vue';s=p.read_text();old="close();emit('end','RETIRE')";self.assertIn(old,s);p.write_text(s.replace(old,"close();emit('restart')",1))
  with self.assertRaises(AssertionError):validate_uir3306(self.root)
 def test_original_scope_cannot_disappear_in_a_reordered_page(self):
  p=self.root/'web/src/story-pages.ts';s=p.read_text();old="group:'seal',key:'scope'";self.assertIn(old,s);p.write_text(s.replace(old,"group:'life',key:'scope'",1))
  with self.assertRaises(AssertionError):validate_uir3306(self.root)
 def test_export_writer_cannot_change(self):
  p=self.root/'src/full/life-record.ts';p.write_text(p.read_text()+'\n// changed export')
  with self.assertRaises(AssertionError):validate_uir3306(self.root)
 def test_old_story_budget_cannot_rise(self):
  p=self.root/'art/redesign/story-journey.json';m=json.loads(p.read_text());m['maxNewBytes']=49000;p.write_text(json.dumps(m))
  with self.assertRaises(AssertionError):validate_uir3306(self.root)
 def test_unrecorded_entry_is_rejected(self):
  (self.root/LEDGER).unlink()
  with self.assertRaises(AssertionError):validate_uir3306(self.root)
