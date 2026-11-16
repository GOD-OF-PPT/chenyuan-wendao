from ux30_inventory import normalize_ux30
import hashlib,unittest
from pathlib import Path
from ux28_inventory import normalize_ux28_recovery,BASELINE_SHA256,EDITS

ROOT=Path(__file__).resolve().parents[2]
class UX28RecoveryDisplayTests(unittest.TestCase):
 def setUp(self):self.source=(ROOT/'web/src/RecoveryPlanner.vue').read_text()
 def test_current_six_changes_reverse_to_the_exact_whole_original_source(self):
  before=normalize_ux28_recovery(self.source)
  self.assertEqual(hashlib.sha256(before.encode()).hexdigest(),BASELINE_SHA256)
  self.assertEqual(before,(ROOT/'goal-4/evidence/ux28/RecoveryPlanner.vue.before.txt').read_text())
 def test_original_without_ux28_still_requires_the_same_complete_pin(self):
  before=normalize_ux28_recovery(self.source);self.assertEqual(normalize_ux28_recovery(before),before)
  with self.assertRaises(AssertionError):normalize_ux28_recovery(before.replace('count=ref(3)','count=ref(9)'))
 def test_same_size_old_controller_mutation_is_rejected_even_when_display_is_valid(self):
  changed=self.source.replace('count=ref(3)','count=ref(9)');self.assertEqual(len(changed),len(self.source))
  with self.assertRaises(AssertionError):normalize_ux28_recovery(changed)
 def test_wrong_clock_missing_or_duplicate_approved_fragments_cannot_be_resigned(self):
  source=normalize_ux30('RecoveryPlanner.vue',self.source)
  variants=[source.replace('ADVENTURE_CYCLE_MS.travel/1000','ADVENTURE_CYCLE_MS.battle/1000'),source.replace('quote.cycleMs/1000','quote.cycles/1000',1)]
  for before,after in EDITS:variants.extend([source.replace(after,before,1),source+after])
  for changed in variants:
   self.assertNotEqual(changed,source)
   with self.subTest(sha=hashlib.sha256(changed.encode()).hexdigest()),self.assertRaises(AssertionError):normalize_ux28_recovery(changed)
