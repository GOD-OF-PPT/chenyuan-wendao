import hashlib,unittest
from pathlib import Path
from ux29_inventory import PLANNER_EDITS,RITUAL_EDITS,normalize_ux29_planner,normalize_ux29_ritual
from ux28_inventory import normalize_ux28_recovery
from art35_inventory import normalize_art35_recovery
ROOT=Path(__file__).resolve().parents[2]

class UX29PresentationTests(unittest.TestCase):
 def setUp(self):
  self.cases=[('RecoveryPlanner.vue',PLANNER_EDITS,normalize_ux29_planner,normalize_ux28_recovery,'478733b74bf51b209901a7e7328ea92269a77a30ab41c56c400ddd8b40ef78a9'),('RecoveryRitual.vue',RITUAL_EDITS,normalize_ux29_ritual,normalize_art35_recovery,'9764760b03850ce35a4bab251228ea29983b1dba3615fa31bc4d0ad8e3ef0c88')]
 def test_both_current_templates_reverse_to_exact_complete_prior_and_historic_source(self):
  for name,edits,normalize,chain,pin in self.cases:
   current=(ROOT/'web/src'/name).read_text();before=(ROOT/'goal-4/evidence/ux29'/(name+'.before.txt')).read_text()
   self.assertEqual(normalize(current),before);self.assertEqual(hashlib.sha256(chain(current).encode()).hexdigest(),pin)
 def test_same_length_controller_mutation_cannot_be_resigned_behind_valid_displays(self):
  for name,edits,normalize,chain,pin in self.cases:
   current=(ROOT/'web/src'/name).read_text();old,new=('count=ref(3)','count=ref(9)')if name.startswith('RecoveryPlanner')else('??0);','??1);')
   self.assertIn(old,current);changed=current.replace(old,new,1);self.assertEqual(len(current),len(changed))
   with self.assertRaises(AssertionError):chain(changed)
 def test_missing_or_duplicate_approved_display_fragments_cannot_bypass_original_pins(self):
  for name,edits,normalize,chain,pin in self.cases:
   current=(ROOT/'web/src'/name).read_text()
   for before,after in edits:
    for changed in [current.replace(after,before,1),current+after]:
     with self.subTest(name=name),self.assertRaises(AssertionError):chain(changed)
 def test_forced_allowed_fake_recovery_and_unapproved_message_are_rejected(self):
  for name,edits,normalize,chain,pin in self.cases:
   current=(ROOT/'web/src'/name).read_text();target='quote.allowed'if name.startswith('RecoveryPlanner')else'one.allowed'
   self.assertIn(target,current)
   for changed in [current.replace(target,'true',1),current.replace('failure?.message',"'恢复+999'",1)]:
    with self.subTest(name=name),self.assertRaises(AssertionError):chain(changed)
