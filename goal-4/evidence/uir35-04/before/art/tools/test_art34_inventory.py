import hashlib,json,tempfile,unittest
from pathlib import Path
from art34_inventory import validate_art34,LEDGER,FILES,BASELINES,REFS,UNCHANGED,PATCH
ROOT=Path(__file__).resolve().parents[2]
class ART34Tests(unittest.TestCase):
 def setUp(self):
  t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup);self.root=Path(t.name);names={LEDGER,*FILES,*REFS,*UNCHANGED,PATCH['path']}
  for key in ['art02','ta08','idle-sources']:
   n='art/redesign/'+key+'.json';names.add(n);names.update(r['path']for r in json.loads((ROOT/n).read_text())['files'])
  for n in names:
   p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((ROOT/n).read_bytes())
  self.original={n:(self.root/n).read_bytes()for n in names}
 def check(self):return validate_art34(self.root)
 def edit(self,fn):
  p=self.root/LEDGER;m=json.loads(p.read_text());fn(m);p.write_text(json.dumps(m))
 def resign(self):self.edit(lambda m:[r.update(bytes=(self.root/r['path']).stat().st_size,sha256=hashlib.sha256((self.root/r['path']).read_bytes()).hexdigest())for r in m['files']])
 def change(self,n,old,new):
  p=self.root/n;assert old in p.read_text();p.write_text(p.read_text().replace(old,new,1));self.resign()
 def reject(self,fn):
  for n,b in self.original.items():(self.root/n).write_bytes(b)
  self.check();fn()
  with self.assertRaises((AssertionError,KeyError,ValueError)):self.check()
 def test_actual_root_and_complete_sandbox(self):
  self.assertEqual(self.check()[1],42371);self.assertEqual(validate_art34(ROOT)[1],42371)
 def test_caps_membership_and_user_acceptance_cannot_expand(self):
  self.reject(lambda:self.edit(lambda m:m['budgets'].update(oldArt02Native=45001)))
  self.reject(lambda:self.edit(lambda m:m['files'].pop()))
  self.reject(lambda:self.edit(lambda m:m.update(userAcceptance=True)))
 def test_new_display_cannot_bypass_original_source_or_focus_owner(self):
  self.reject(lambda:self.change(FILES[0],"emit('select',id)","emit('arrange')"))
  self.reject(lambda:self.change(FILES[0],'focus.target(libraryTrigger.value??null);',''))
  self.reject(lambda:self.change(FILES[0],':progress="progress"',':progress="1"'))
 def test_original_script_clock_and_controller_are_immutable(self):
  self.reject(lambda:self.change(FILES[0],'const source=computed','setTimeout(()=>{},1);const source=computed'))
  self.reject(lambda:self.change('web/src/SourcePlanner.vue','maxCycles:','maxCycles:50,ignored:'))
  self.reject(lambda:self.change('web/src/store.ts','import','/* changed */import'))
 def test_reading_cannot_reset_on_every_cycle_or_drop_lifecycle_cleanup(self):
  self.reject(lambda:self.change(FILES[0],"props.game.core.runId+':'", "props.game.core.revision+':'"))
  self.reject(lambda:self.change(FILES[0],'onDeactivated(closeLibrary);',''))
 def test_original_sources_and_approved_patch_cannot_be_forged(self):
  self.reject(lambda:self.change(BASELINES[0]['path'],'source-work-state','fake-state'))
  self.reject(lambda:self.change(PATCH['path'],"inspectSource(id)","emit('arrange')"))
 def test_complete_text_cannot_be_clipped_hidden_or_shrunk(self):
  for css in ['.source-chosen{display:none}','.source-focus{overflow:hidden}','.source-rule{font-size:10px}']:
   self.reject(lambda css=css:self.change(FILES[1],'/* ART34:',css+'/* ART34:'))
 def test_original_css_and_group_caps_cannot_be_replaced(self):
  self.reject(lambda:self.change(FILES[1],'gap:8px;\n&','gap:8px\n&'))
  self.reject(lambda:self.change(FILES[1],'.source-field{','.other-field{'))
  self.reject(lambda:self.change('art/redesign/ta08.json','42000','42001'))
if __name__=='__main__':unittest.main()
