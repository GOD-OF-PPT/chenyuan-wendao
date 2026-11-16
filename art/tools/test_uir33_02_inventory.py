import json,tempfile,unittest
from pathlib import Path
from uir33_02_inventory import FACTS,LEDGER,MANIFEST,CAPS,prior_uir3302_bytes,validate_uir3302
ROOT=Path(__file__).resolve().parents[2]
class LocalExplorationTests(unittest.TestCase):
 def setUp(self):
  t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup);self.root=Path(t.name)
  names={LEDGER,MANIFEST['added']['path'],*MANIFEST['sourceReferences'],*[f['path']for f in FACTS.values()]}
  for n in CAPS:
   names.add('art/redesign/'+n+'.json');names.update(r['path']for r in json.loads((ROOT/('art/redesign/'+n+'.json')).read_text())['files'])
  for n in names:
   p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((ROOT/n).read_bytes())
 def test_exact_parent_inverse_and_original_group_caps(self):
  files,total=validate_uir3302(self.root);self.assertEqual(total,MANIFEST['added']['bytes']);self.assertIn(LEDGER,files)
  for n,f in FACTS.items():self.assertEqual(prior_uir3302_bytes(n,(self.root/f['path']).read_bytes()),(self.root/f['before']).read_bytes())
 def changed(self,n,a,b):
  p=self.root/n;s=p.read_text();self.assertIn(a,s);p.write_text(s.replace(a,b,1))
  with self.assertRaises(AssertionError):validate_uir3302(self.root)
 def test_view_cannot_become_travel(self):self.changed(MANIFEST['added']['path'],"emit('track',{kind:'breakthrough'})","emit('start',{kind:'travel'})")
 def test_existing_destination_is_not_automatically_replaced(self):self.changed('web/src/AdventurePlanner.vue','location:props.game.core.world.location',"location:'wilderness'")
 def test_current_destination_must_be_distinguished_from_foreign(self):self.changed('web/src/AdventurePlanner.vue',"props.mode==='travel'&&trip.value.location===props.game.core.world.location","true")
 def test_existing_empty_encounter_still_goes_to_travel(self):self.changed('web/src/AdventurePlanner.vue',"emit('locations','travel')","emit('locations','purchase')")
 def test_budget_and_old_originals_cannot_be_resigned(self):
  self.changed(LEDGER,'"maxAddedNativeBytes": 2500','"maxAddedNativeBytes": 3500')
if __name__=='__main__':unittest.main()
