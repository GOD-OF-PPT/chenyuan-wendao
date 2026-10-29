import hashlib,json,tempfile,unittest
from pathlib import Path
from art27_inventory import validate_art27,LEDGER,FILES,REFS,BASE,BASELINES,UNCHANGED,RUNTIME
from check_inventory import image_info
ROOT=Path(__file__).resolve().parents[2]
class ART27Tests(unittest.TestCase):
 def setUp(self):
  t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup);self.root=Path(t.name);m=json.loads((ROOT/LEDGER).read_text());f=m['asset'];a=json.loads((ROOT/f['audit']['path']).read_text());legacy=json.loads((ROOT/m['legacyBounds']['path']).read_text())
  names={LEDGER,*FILES,*REFS,*UNCHANGED,BASE+'/export-facts.json',f['source']['path'],RUNTIME,f['producer']['path'],f['helper']['path'],f['audit']['path'],a['reference']['path'],*[r['path']for r in f['prompts']],*[r['path']for r in m['candidates']],*[r['path']for r in legacy.values()]}
  for key in ['art03','art10','ta09','idle-production','idle-preparation']:
   n='art/redesign/'+key+'.json';names.add(n);names.update(r['path']for r in json.loads((ROOT/n).read_text())['files'])
  for n in names:
   p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((ROOT/n).read_bytes())
  self.original={n:(self.root/n).read_bytes()for n in names}
 def reset(self):
  for n,b in self.original.items():
   p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
 def check(self):return validate_art27(self.root,image_info)
 def edit(self,fn):
  p=self.root/LEDGER;j=json.loads(p.read_text());fn(j);p.write_text(json.dumps(j))
 def resign(self):
  def change(j):
   for r in j['files']:
    b=(self.root/r['path']).read_bytes();r.update(bytes=len(b),sha256=hashlib.sha256(b).hexdigest())
  self.edit(change)
 def reject(self,fn):
  self.reset();fn()
  with self.assertRaises((AssertionError,KeyError,ValueError)):self.check()
 def facts(self,fn):
  p=self.root/BASE/'export-facts.json';j=json.loads(p.read_text());fn(j);p.write_text(json.dumps(j));self.edit(lambda m:m.update(asset=j))
 def test_real_and_complete_sandbox_positive(self):
  self.assertEqual(validate_art27(ROOT,image_info)[1:],self.check()[1:]);self.assertEqual(self.check()[1:],(1,195308))
 def test_ledger_references_and_exact_production_members_are_required(self):
  self.reject(lambda:(self.root/LEDGER).unlink())
  self.reject(lambda:(self.root/REFS[0]).unlink())
  self.reject(lambda:self.edit(lambda m:m['files'].pop()))
  self.reject(lambda:self.edit(lambda m:m['sourceReferences'].append('other.md')))
 def test_fixed_typed_caps_and_actual_resigned_old_native_bytes(self):
  self.reject(lambda:self.edit(lambda m:m['budgets'].update(newRasterAssets=True)))
  self.reject(lambda:self.edit(lambda m:m['budgets'].update(oldNativeCap=45001)))
  self.reject(lambda:self.edit(lambda m:m.update(userAcceptance=True)))
  def grow():
   p=self.root/FILES[1];p.write_text(p.read_text()+'/*'+('bounded artwork '*4000)+'*/');self.resign()
  self.reject(grow)
  self.reject(lambda:(self.root/'art/redesign/art10.json').write_text((self.root/'art/redesign/art10.json').read_text().replace('12000','12001',1)))
 def test_real_decorative_scene_fallback_and_full_original_controller_are_bound(self):
  for old,new in [('aria-hidden="true"','aria-hidden="false"'),('asset-id="relic-workshop"','asset-id="other-workshop"'),('study-sanctum-fallback','unowned-fallback'),('function start(){','function start(){/* broadened */')]:
   def change(old=old,new=new):
    p=self.root/FILES[0];p.write_text(p.read_text().replace(old,new,1));self.resign()
   self.reject(change)
 def test_actual_codec_candidate_and_atomic_export_facts_cannot_be_relabelled(self):
  self.reject(lambda:self.facts(lambda f:f['encoding'].__setitem__(2,'81')))
  self.reject(lambda:self.facts(lambda f:f['doubleExport'].update(bytesEqual=False)))
  self.reject(lambda:self.facts(lambda f:f['runtime']['alphaProof'].update(min=0)))
  self.reject(lambda:self.facts(lambda f:f['transform'].update(crop=True)))
  self.reject(lambda:(self.root/BASE/'candidates/workshop-v1.png').unlink())
  def claim():
   p=self.root/BASE/'relic-workshop-audit.json';j=json.loads(p.read_text());j['model']='unverified-provider';p.write_text(json.dumps(j));self.facts(lambda f:f.update(audit={'path':str(p.relative_to(self.root)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}))
  self.reject(claim)
 def test_original_coordinates_alpha_facts_and_other_gameplay_styles_stay_owned(self):
  def coordinates():
   p=self.root/'web/src/RelicInscription.vue';p.write_text(p.read_text().replace('viewBox="0 0 240 240"','viewBox="0 0 241 240"'));self.resign()
  self.reject(coordinates)
  self.reject(lambda:(self.root/REFS[4]).write_text((self.root/REFS[4]).read_text().replace('128','127',1)))
  def study():
   p=self.root/FILES[2];p.write_text(p.read_text().replace('learning-object h3{font-size:28px','learning-object h3{font-size:12px'));self.resign()
  self.reject(study)
  def io():
   p=self.root/FILES[1];p.write_text(p.read_text()+'@import "https://example.invalid/style.css";');self.resign()
  self.reject(io)
