import json,tempfile,unittest
from pathlib import Path
from uir33_04_inventory import FACTS,LEDGER,MANIFEST,CAPS,prior_uir3304_bytes,validate_uir3304
ROOT=Path(__file__).resolve().parents[2]
class StudyNotesTests(unittest.TestCase):
 def setUp(self):
  t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup);self.root=Path(t.name)
  names={LEDGER,MANIFEST['added']['path'],*MANIFEST['sourceReferences'],*[f['path']for f in FACTS.values()]}
  for n in CAPS:
   names.add('art/redesign/'+n+'.json');names.update(r['path']for r in json.loads((ROOT/('art/redesign/'+n+'.json')).read_text())['files'])
  for n in names:
   p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((ROOT/n).read_bytes())
 def test_complete_originals_and_all_old_caps(self):
  _,size=validate_uir3304(self.root);self.assertEqual(size,MANIFEST['added']['bytes'])
  for n,f in FACTS.items():self.assertEqual(prior_uir3304_bytes(n,(self.root/f['path']).read_bytes()),(self.root/f['before']).read_bytes())
 def changed(self,n,a,b):
  p=self.root/n;s=p.read_text();self.assertIn(a,s);p.write_text(s.replace(a,b,1))
  with self.assertRaises(AssertionError):validate_uir3304(self.root)
 def test_tabs_cannot_close_the_reader(self):self.changed('web/src/CultivationNotes.vue','closest(props.selection)',"closest('button')")
 def test_return_cannot_target_a_hidden_menu(self):self.changed('web/src/CultivationNotes.vue','focus?.target(opener.value??null)','focus?.target(options.value??null)')
 def test_ordinary_cycles_cannot_reset_the_book(self):self.changed('web/src/JadeStudyScene.vue','game.core.runId+game.core.player.realm+game.status','game.core.runId+game.core.revision')
 def test_budget_controls_cannot_disappear(self):self.changed('web/src/LearningPlanner.vue',"mode==='skills'&&queue.length||!!conflict","false")
 def test_user_acceptance_or_old_budget_cannot_be_forged(self):self.changed(LEDGER,'"userAcceptance": false','"userAcceptance": true')
if __name__=='__main__':unittest.main()
