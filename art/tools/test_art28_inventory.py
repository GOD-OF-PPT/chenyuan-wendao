import hashlib,json,tempfile,unittest
from pathlib import Path
from art28_inventory import validate_art28,LEDGER,FILES,REFS,BASE,BASELINES,UNCHANGED,RUNTIME
from check_inventory import image_info
ROOT=Path(__file__).resolve().parents[2]
class ART28Tests(unittest.TestCase):
 def setUp(self):
  t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup);self.root=Path(t.name);m=json.loads((ROOT/LEDGER).read_text());f=m['asset'];a=json.loads((ROOT/f['audit']['path']).read_text());names={LEDGER,*FILES,*REFS,*UNCHANGED,BASE+'/export-facts.json',f['source']['path'],RUNTIME,f['producer']['path'],f['helper']['path'],f['audit']['path'],a['reference']['path'],a['calls'][0]['candidate']['path'],f['prompts'][0]['path']}
  for key in ['alchemy-workshop','idle-production']:
   n='art/redesign/'+key+'.json';names.add(n);names.update(r['path']for r in json.loads((ROOT/n).read_text())['files'])
  for n in names:
   p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((ROOT/n).read_bytes())
  self.original={n:(self.root/n).read_bytes()for n in names}
 def check(self):return validate_art28(self.root,image_info)
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
 def test_root_and_complete_sandbox_have_actual_positive_scene(self):
  self.assertEqual(self.check()[1:],(1,196078));self.assertEqual(validate_art28(ROOT,image_info)[1:],(1,196078))
 def test_fixed_members_old_caps_and_human_acceptance_cannot_expand(self):
  self.reject(lambda:self.edit(lambda m:m['files'].pop()))
  self.reject(lambda:self.edit(lambda m:m['budgets'].update(oldNativeCap=22001)))
  self.reject(lambda:self.edit(lambda m:m.update(userAcceptance=True)))
  def grow():
   p=self.root/FILES[1];p.write_text(p.read_text()+' '*22001);self.resign()
  self.reject(grow)
 def test_scene_and_furnace_entry_keep_the_original_readonly_controller(self):
  for old,new in [('aria-hidden="true"','aria-hidden="false"'),('study-sanctum-fallback','unknown-fallback'),('@click="open"><span>查看开炉安排','@click="start"><span>查看开炉安排'),('function start(){','function start(){/*bad*/')]:
   def change(old=old,new=new):
    p=self.root/FILES[0];p.write_text(p.read_text().replace(old,new,1));self.resign()
   self.reject(change)
 def test_exact_css_baselines_and_full_feedback_proof_remain_owned(self):
  def css():
   p=self.root/FILES[1];p.write_text(p.read_text().replace('font-size:18px','font-size:12px',1));self.resign()
  self.reject(css)
  self.reject(lambda:(self.root/'web/src/alchemy-feedback.ts').write_text('replacement proof'))
  self.reject(lambda:(self.root/BASELINES[0]['path']).write_text('new historical original'))
 def test_original_opaque_art_and_uniform_export_cannot_be_relabelled(self):
  self.reject(lambda:self.facts(lambda f:f['transform'].update(crop=True)))
  self.reject(lambda:self.facts(lambda f:f['encoding'].__setitem__(2,'81')))
  self.reject(lambda:self.facts(lambda f:f['doubleExport'].update(bytesEqual=False)))
  self.reject(lambda:self.facts(lambda f:f['runtime']['alphaProof'].update(min=0)))
  self.reject(lambda:(self.root/RUNTIME).write_bytes((self.root/RUNTIME).read_bytes()[:-1]+b'X'))
 def test_actual_prompt_candidate_audit_and_real_consumer_are_required(self):
  self.reject(lambda:(self.root/BASE/'candidates/chamber-v1.png').unlink())
  self.reject(lambda:(self.root/BASE/'alchemy-scene-prompt.json').write_text('{}'))
  def claim():
   p=self.root/BASE/'alchemy-scene-audit.json';a=json.loads(p.read_text());a['model']='unverified';p.write_text(json.dumps(a));self.facts(lambda f:f.update(audit={'path':str(p.relative_to(self.root)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}))
  self.reject(claim)
if __name__=='__main__':unittest.main()
