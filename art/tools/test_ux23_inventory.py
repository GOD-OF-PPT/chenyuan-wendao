import hashlib,json,tempfile,unittest
from pathlib import Path
from ux23_inventory import validate_ux23,LEDGER,FILES,REFS
ROOT=Path(__file__).resolve().parents[2]
class UX23Tests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name);self.addCleanup(self.temp.cleanup)
  for f in [LEDGER,*FILES,*REFS,'web/src/App.vue']:
   p=self.root/f;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((ROOT/f).read_bytes())
 def mutate(self,fn):
  p=self.root/LEDGER;m=json.loads(p.read_text());fn(m);p.write_text(json.dumps(m))
 def resign(self):
  def update(m):
   for row in m['files']:
    raw=(self.root/row['path']).read_bytes();row['bytes']=len(raw);row['sha256']=hashlib.sha256(raw).hexdigest()
  self.mutate(update)
 def test_positive_root_and_complete_sandbox(self):self.assertEqual(validate_ux23(ROOT)[1],validate_ux23(self.root)[1]);self.assertLessEqual(validate_ux23(ROOT)[1],14000)
 def test_missing_ledger_and_reference(self):
  p=self.root/LEDGER;raw=p.read_bytes();p.unlink()
  with self.assertRaises(AssertionError):validate_ux23(self.root)
  p.write_bytes(raw);(self.root/REFS[0]).unlink()
  with self.assertRaises(AssertionError):validate_ux23(self.root)
 def test_typed_fixed_cap_bitmap_and_human_claim(self):
  for key,v in [('maxNativeBytes',14001),('maxNativeBytes',True),('newBitmapAssets',1),('newBitmapAssets',False),('userAcceptance',True)]:
   p=self.root/LEDGER;raw=p.read_bytes();self.mutate(lambda m:m.update({key:v}))
   with self.assertRaises(AssertionError):validate_ux23(self.root)
   p.write_bytes(raw)
 def test_real_cap_even_after_resigning(self):
  p=self.root/FILES[-1];p.write_text(p.read_text()+' '*14000);self.resign()
  with self.assertRaises(AssertionError):validate_ux23(self.root)
 def test_identity_and_actual_consumer(self):
  p=self.root/FILES[0];p.write_text(p.read_text()+'\n')
  with self.assertRaises(AssertionError):validate_ux23(self.root)
  self.resign();p=self.root/'web/src/App.vue';s=p.read_text();p.write_text(s.replace('@life="showLife"','@life="act({type:\'RETIRE\'})"',1))
  with self.assertRaises(AssertionError):validate_ux23(self.root)
 def test_no_writer_or_fake_status_guard_after_resigning(self):
  p=self.root/FILES[0];s=p.read_text();p.write_text(s+'\nsetTimeout(()=>{},1);');self.resign()
  with self.assertRaises(AssertionError):validate_ux23(self.root)
  p.write_text(s);self.resign();p=self.root/'web/src/App.vue';s=p.read_text();p.write_text(s.replace('v-if="store.ready&&immersive&&game&&game.status!==\'active\'"','v-if="game"',1))
  with self.assertRaises(AssertionError):validate_ux23(self.root)
