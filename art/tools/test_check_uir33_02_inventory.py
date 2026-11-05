import json,shutil,tempfile,unittest
from pathlib import Path
from check_uir33_02_inventory import LEDGER,MANIFEST,prior_check_uir3302_bytes,validate_check_uir3302
ROOT=Path(__file__).resolve().parents[2]
class CheckUir02Tests(unittest.TestCase):
 def setUp(self):
  t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup);self.root=Path(t.name);names={LEDGER,*[f[k]for f in MANIFEST['files'].values()for k in ['path','before']],*MANIFEST['unchanged'],*MANIFEST['sourceReferences']}
  for n in MANIFEST['originalLedgers']:
   file='art/redesign/'+n+'.json';names.add(file);names.update(r['path']for r in json.loads((ROOT/file).read_text())['files'])
  for n in names:
   p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/n,p)
 def test_exact_current_source_has_original_owners_and_budgets(self):
  self.assertGreater(validate_check_uir3302(self.root)[1],0)
  for f in MANIFEST['files'].values():self.assertEqual(prior_check_uir3302_bytes(f['path'],(self.root/f['path']).read_bytes()),(self.root/f['before']).read_bytes())
 def test_feedback_replay_guard_cannot_change(self):
  p=self.root/'web/src/ActionFeedbackStage.vue';s=p.read_text();self.assertIn('store.lastReplayed',s);p.write_text(s.replace('store.lastReplayed','false',1))
  with self.assertRaises(AssertionError):validate_check_uir3302(self.root)
 def test_stop_reason_cannot_be_removed(self):
  p=self.root/'web/src/TrainingActivity.vue';s=p.read_text();self.assertIn('{{stopped}}',s);p.write_text(s.replace('{{stopped}}','',1))
  with self.assertRaises(AssertionError):validate_check_uir3302(self.root)
 def test_error_state_cannot_be_hidden_with_decoration(self):
  p=self.root/'web/src/ActionFeedbackStage.vue';s=p.read_text();self.assertIn("state.value='error'",s);p.write_text(s.replace("state.value='error'","state.value='idle'",1))
  with self.assertRaises(AssertionError):validate_check_uir3302(self.root)
 def test_old_caps_cannot_expand(self):
  p=self.root/'art/redesign/action-feedback.json';m=json.loads(p.read_text());m['maxBytes']+=100;p.write_text(json.dumps(m))
  with self.assertRaises(AssertionError):validate_check_uir3302(self.root)
