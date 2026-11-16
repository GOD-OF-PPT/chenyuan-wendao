import hashlib,json,tempfile,unittest
from pathlib import Path
from art24_inventory import validate_art24,LEDGER,FILES,REFS,BASE,RUNTIME
from check_inventory import image_info
ROOT=Path(__file__).resolve().parents[2]
class ART24Tests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name);self.addCleanup(self.temp.cleanup)
  m=json.loads((ROOT/LEDGER).read_text());old=json.loads((ROOT/'art/redesign/art03.json').read_text());f=m['asset'];names=[LEDGER,*FILES,*REFS,BASE+'/export-facts.json','art/redesign/art03.json',*[r['path']for r in old['files']],*[f[k]['path']for k in ['source','runtime','prompt','audit','producer','helper']]]
  for n in set(names):
   p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((ROOT/n).read_bytes())
 def check(self):return validate_art24(self.root,image_info)
 def mutate(self,fn):
  p=self.root/LEDGER;m=json.loads(p.read_text());fn(m);p.write_text(json.dumps(m))
 def resign(self):
  def update(m):
   for r in m['files']:
    b=(self.root/r['path']).read_bytes();r['bytes']=len(b);r['sha256']=hashlib.sha256(b).hexdigest()
  self.mutate(update)
 def test_root_and_complete_sandbox_positive(self):self.assertEqual(validate_art24(ROOT,image_info)[2],self.check()[2]);self.assertLessEqual(self.check()[2],280000)
 def test_missing_ledger_or_reference_is_not_silently_accepted(self):
  p=self.root/LEDGER;b=p.read_bytes();p.unlink()
  with self.assertRaises(AssertionError):self.check()
  p.write_bytes(b);(self.root/REFS[0]).unlink()
  with self.assertRaises(AssertionError):self.check()
 def test_typed_fixed_budget_and_human_acceptance(self):
  for key,value in [('maxRuntimeBytes',280001),('maxRuntimeBytes',True),('oldNativeCap',45001),('schoolCssCap',12001)]:
   p=self.root/LEDGER;b=p.read_bytes();self.mutate(lambda m:m['budgets'].update({key:value}))
   with self.assertRaises(AssertionError):self.check()
   p.write_bytes(b)
  self.mutate(lambda m:m.update(userAcceptance=True))
  with self.assertRaises(AssertionError):self.check()
 def test_css_cap_survives_resigned_source_hash(self):
  p=self.root/FILES[1];p.write_text(p.read_text()+' '*12000);self.resign()
  with self.assertRaises(AssertionError):self.check()
 def test_actual_scene_consumer_and_failed_art_slot(self):
  p=self.root/FILES[0];s=p.read_text();p.write_text(s.replace('path="art/v2/schools/sanctum-v1.webp"','path="art/v2/scenes/cave.webp"'));self.resign()
  with self.assertRaises(AssertionError):self.check()
  p.write_text(s.replace('<span class="school-sanctum-fallback"/>',''));self.resign()
  with self.assertRaises(AssertionError):self.check()
 def test_runtime_identity_and_export_audit_are_bound(self):
  p=self.root/RUNTIME;p.write_bytes(p.read_bytes()+b'x')
  with self.assertRaises(AssertionError):self.check()
  p.write_bytes((ROOT/RUNTIME).read_bytes());p=self.root/BASE/'sanctum-v1-audit.json';m=json.loads(p.read_text());m['model']='invented';p.write_text(json.dumps(m))
  with self.assertRaises(AssertionError):self.check()
