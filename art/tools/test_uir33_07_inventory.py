import json,shutil,tempfile,unittest
from pathlib import Path
from uir33_07_inventory import LEDGER,MANIFEST,prior_uir3307_bytes,validate_uir3307
ROOT=Path(__file__).resolve().parents[2]
class OutcomeFocusTests(unittest.TestCase):
 def setUp(self):
  t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup);self.root=Path(t.name);names={LEDGER,*[r[k]for r in MANIFEST['files'].values()for k in ['path','before']],*MANIFEST['unchanged'],*MANIFEST['sourceReferences']}
  for n in MANIFEST['oldLedgers']:
   file='art/redesign/'+n+'.json';names.add(file);names.update(r['path']for r in json.loads((ROOT/file).read_text())['files'])
  for n in names:
   p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/n,p)
 def test_current_sources_reverse_to_all_originals(self):
  self.assertEqual(validate_uir3307(self.root)[1],1088)
  for f in MANIFEST['files'].values():self.assertEqual(prior_uir3307_bytes(f['path'],(self.root/f['path']).read_bytes()),(self.root/f['before']).read_bytes())
 def test_replay_guard_cannot_be_removed(self):
  p=self.root/'web/src/action-feedback.ts';s=p.read_text();a='if(replayed||observation.replayed||observation.kind';self.assertIn(a,s);p.write_text(s.replace(a,'if(false||observation.replayed||observation.kind',1))
  with self.assertRaises(AssertionError):validate_uir3307(self.root)
 def test_stage_receipt_guard_stays_strict(self):
  p=self.root/'web/src/StageOutcome.vue';s=p.read_text();self.assertIn('!props.replayed',s);p.write_text(s.replace('!props.replayed','true',1))
  with self.assertRaises(AssertionError):validate_uir3307(self.root)
 def test_full_cost_formatter_cannot_change(self):
  p=self.root/'web/src/presentation.ts';s=p.read_text();p.write_text(s.replace('不消耗物资','免费发奖'))
  with self.assertRaises(AssertionError):validate_uir3307(self.root)
 def test_old_feedback_budget_cannot_rise(self):
  p=self.root/'art/redesign/action-feedback.json';m=json.loads(p.read_text());m['maxBytes']+=100;p.write_text(json.dumps(m))
  with self.assertRaises(AssertionError):validate_uir3307(self.root)
