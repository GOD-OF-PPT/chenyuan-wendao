import hashlib,json,tempfile,unittest
from pathlib import Path
from art31_inventory import validate_art31,LEDGER,FILES,REFS,BASE,BASELINES,UNCHANGED,RUNTIME
from check_inventory import image_info
ROOT=Path(__file__).resolve().parents[2]
class ART31Tests(unittest.TestCase):
 def setUp(self):
  t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup);self.root=Path(t.name);m=json.loads((ROOT/LEDGER).read_text());f=m['asset'];a=json.loads((ROOT/f['audit']['path']).read_text());names={LEDGER,*FILES,*REFS,*UNCHANGED,BASE+'/export-facts.json',f['source']['path'],RUNTIME,f['producer']['path'],f['helper']['path'],f['audit']['path'],*[r['candidate']['path']for r in a['calls']],*[p['path']for p in f['prompts']]}
  for key in ['narrative-objects','story-journey','action-feedback']:
   n='art/redesign/'+key+'.json';names.add(n);names.update(r['path']for r in json.loads((ROOT/n).read_text())['files'])
  for n in names:
   p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((ROOT/n).read_bytes())
  self.original={n:(self.root/n).read_bytes()for n in names}
 def check(self):return validate_art31(self.root,image_info)
 def edit(self,fn):
  p=self.root/LEDGER;m=json.loads(p.read_text());fn(m);p.write_text(json.dumps(m))
 def resign(self):
  self.edit(lambda m:[r.update(bytes=(self.root/r['path']).stat().st_size,sha256=hashlib.sha256((self.root/r['path']).read_bytes()).hexdigest())for r in m['files']])
 def reject(self,fn):
  for n,b in self.original.items():
   p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
  self.check();fn()
  with self.assertRaises((AssertionError,KeyError,ValueError)):self.check()
 def facts(self,fn):
  p=self.root/BASE/'export-facts.json';f=json.loads(p.read_text());fn(f);p.write_text(json.dumps(f));self.edit(lambda m:m.update(asset=f))
 def test_actual_root_and_complete_sandbox_have_one_blank_life_scroll(self):
  self.assertEqual(self.check()[1:],(1,121598));self.assertEqual(validate_art31(ROOT,image_info)[1:],(1,121598))
 def test_original_caps_scope_and_human_acceptance_cannot_expand(self):
  self.reject(lambda:self.edit(lambda m:m['files'].pop()))
  self.reject(lambda:self.edit(lambda m:m['budgets'].update(oldFeedbackCap=34001)))
  self.reject(lambda:self.edit(lambda m:m.update(userAcceptance=True)))
  def grow():
   p=self.root/FILES[-1];p.write_text(p.read_text()+' '*(14001-p.stat().st_size));self.resign()
  self.reject(grow)
 def test_actual_scene_and_parent_owned_paging_cannot_change_intent(self):
  for index,old,new in [(0,'aria-hidden="true"','aria-hidden="false"'),(0,'narrative-seal-space art30','narrative-seal-space seal'),(1,'@change="page=$event"','@change="page=0"'),(1,'#pagination','#unknown')]:
   def change(index=index,old=old,new=new):
    p=self.root/FILES[index];p.write_text(p.read_text().replace(old,new,1));self.resign()
   self.reject(change)
 def test_original_full_scripts_reading_and_renderer_proof_remain_owned(self):
  def script():
   p=self.root/FILES[0];p.write_text(p.read_text().replace('function close(){','function close(){/*changed*/',1));self.resign()
  self.reject(script)
  self.reject(lambda:(self.root/'web/src/reading-memory.ts').write_text('replacement reader'))
  self.reject(lambda:(self.root/'web/src/ActionFeedbackStage.vue').write_text('replacement renderer'))
  self.reject(lambda:(self.root/BASELINES[0]['path']).write_text('new original'))
 def test_original_styles_and_uniform_opaque_export_cannot_be_relabelled(self):
  def css():
   p=self.root/FILES[-1];p.write_text(p.read_text().replace('font-size:18px','font-size:12px',1));self.resign()
  self.reject(css)
  self.reject(lambda:self.facts(lambda f:f['transform'].update(crop=True)))
  self.reject(lambda:self.facts(lambda f:f['encoding'].__setitem__(2,'81')))
  self.reject(lambda:self.facts(lambda f:f['doubleExport'].update(bytesEqual=False)))
  self.reject(lambda:(self.root/RUNTIME).write_bytes((self.root/RUNTIME).read_bytes()[:-1]+b'X'))
 def test_actual_literal_prompt_candidate_and_honest_audit_are_required(self):
  self.reject(lambda:(self.root/BASE/'candidates/desk-v1.png').unlink())
  self.reject(lambda:(self.root/BASE/'life-desk-prompt.json').write_text('{}'))
  def claim():
   p=self.root/BASE/'life-desk-audit.json';a=json.loads(p.read_text());a['model']='unverified';p.write_text(json.dumps(a));self.facts(lambda f:f.update(audit={'path':str(p.relative_to(self.root)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}))
  self.reject(claim)
if __name__=='__main__':unittest.main()
