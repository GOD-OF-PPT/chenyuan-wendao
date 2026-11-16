import hashlib,json,tempfile,unittest
from pathlib import Path
from ux20_inventory import validate_ux20,LEDGER,FILES,REFS
ROOT=Path(__file__).resolve().parents[2]
class UX20Tests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name);self.addCleanup(self.temp.cleanup)
  for f in [LEDGER,*FILES,*REFS,'web/src/GoalPanel.vue','web/src/App.vue']:
   p=self.root/f;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((ROOT/f).read_bytes())
 def mutate(self,work):
  p=self.root/LEDGER;m=json.loads(p.read_text());work(m);p.write_text(json.dumps(m))
 def resign(self):
  def update(m):
   for row in m['files']:
    raw=(self.root/row['path']).read_bytes();row['bytes']=len(raw);row['sha256']=hashlib.sha256(raw).hexdigest()
  self.mutate(update)
 def test_actual_presentation(self):self.assertLessEqual(validate_ux20(ROOT)[1],6000)
 def test_missing_ledger(self):
  (self.root/LEDGER).unlink()
  with self.assertRaises(AssertionError):validate_ux20(self.root)
 def test_fixed_cap_and_human_claim(self):
  for key,value in [('maxNativeBytes',6001),('maxNativeBytes',True),('userAcceptance',True)]:
   original=(self.root/LEDGER).read_bytes();self.mutate(lambda m:m.update({key:value}))
   with self.assertRaises(AssertionError):validate_ux20(self.root)
   (self.root/LEDGER).write_bytes(original)
 def test_actual_overcap_after_resigning(self):
  p=self.root/FILES[0];p.write_text(p.read_text()+' ' *6000);self.resign()
  with self.assertRaises(AssertionError):validate_ux20(self.root)
 def test_real_hash(self):
  p=self.root/FILES[0];p.write_text(p.read_text()+'\n')
  with self.assertRaises(AssertionError):validate_ux20(self.root)
 def test_actual_consumer_and_no_clock(self):
  p=self.root/'web/src/GoalPanel.vue';original=p.read_text();p.write_text(original.replace('<TrialGoal','<!-- <TrialGoal',1).replace("@inspect=\"emit('current',$event)\"/>","@inspect=\"emit('current',$event)\"/> -->",1))
  with self.assertRaises(AssertionError):validate_ux20(self.root)
  p.write_text(original);p=self.root/FILES[0];p.write_text(p.read_text()+'\nsetTimeout(()=>{},100);');self.resign()
  with self.assertRaises(AssertionError):validate_ux20(self.root)
