import hashlib,json,tempfile,unittest
from pathlib import Path
from ux21_inventory import validate_ux21,LEDGER,FILES,REFS
ROOT=Path(__file__).resolve().parents[2]
class UX21Tests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name);self.addCleanup(self.temp.cleanup)
  for f in [LEDGER,*FILES,*REFS,'web/src/TrialCatalogue.vue','web/src/App.vue']:
   p=self.root/f;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((ROOT/f).read_bytes())
 def mutate(self,work):
  p=self.root/LEDGER;m=json.loads(p.read_text());work(m);p.write_text(json.dumps(m))
 def resign(self):
  def update(m):
   for row in m['files']:
    raw=(self.root/row['path']).read_bytes();row['bytes']=len(raw);row['sha256']=hashlib.sha256(raw).hexdigest()
  self.mutate(update)
 def test_complete_positive_root_and_sandbox(self):self.assertLessEqual(validate_ux21(ROOT)[1],7000);self.assertEqual(validate_ux21(ROOT)[1],validate_ux21(self.root)[1])
 def test_no_missing_ledger_or_reference(self):
  p=self.root/LEDGER;original=p.read_bytes();p.unlink()
  with self.assertRaises(AssertionError):validate_ux21(self.root)
  p.write_bytes(original);(self.root/REFS[0]).unlink()
  with self.assertRaises(AssertionError):validate_ux21(self.root)
 def test_fixed_cap_and_human_claim(self):
  for key,value in [('maxNativeBytes',7001),('maxNativeBytes',True),('userAcceptance',True)]:
   p=self.root/LEDGER;original=p.read_bytes();self.mutate(lambda m:m.update({key:value}))
   with self.assertRaises(AssertionError):validate_ux21(self.root)
   p.write_bytes(original)
 def test_overcap_even_after_resigning(self):
  p=self.root/FILES[0];p.write_text(p.read_text()+' ' *7000);self.resign()
  with self.assertRaises(AssertionError):validate_ux21(self.root)
 def test_actual_identity(self):
  p=self.root/FILES[0];p.write_text(p.read_text()+'\n')
  with self.assertRaises(AssertionError):validate_ux21(self.root)
 def test_real_view_route_and_no_writer(self):
  p=self.root/'web/src/App.vue';original=p.read_text();p.write_text(original.replace("@checkpoint=\"openHub('trial',$event,'checkpoint')\"",'@checkpoint="act({type:\'START_TRIAL\'})"',1))
  with self.assertRaises(AssertionError):validate_ux21(self.root)
  p.write_text(original);p=self.root/FILES[0];p.write_text(p.read_text()+'\nsetTimeout(()=>{},10);');self.resign()
  with self.assertRaises(AssertionError):validate_ux21(self.root)
