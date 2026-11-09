import copy,unittest
from pathlib import Path
import test_inventory as inventory
from cend09_source_inventory import MANIFEST,LEDGER,validate_source_stage,prior_source_stage_bytes
ROOT=inventory.ROOT
class SourceStageTests(unittest.TestCase):
 tearDown=inventory.InventoryTests.tearDown
 def write(self,path,value):
  if not isinstance(value,bytes):return inventory.InventoryTests.write(self,path,value)
  p=self.root/path;p.parent.mkdir(parents=True,exist_ok=True)
  if p.exists():p.unlink()
  p.write_bytes(value)
 def setUp(self):
  inventory.InventoryTests.setUp(self)
  validate_source_stage(self.root)
 def test_complete_parent_inverse_and_original_whole_markup(self):
  row=MANIFEST['parent'];self.assertEqual(prior_source_stage_bytes(row['path'],(ROOT/row['path']).read_bytes()),(ROOT/row['before']).read_bytes());self.assertLessEqual((ROOT/row['path']).stat().st_size,6683);self.assertLessEqual(validate_source_stage(self.root)[1],6800)
 def test_all_original_reading_callbacks_clock_and_scene_cannot_move(self):
  n=MANIFEST['parent']['path'];raw=(ROOT/n).read_text()
  for before,after in [("emit('arrange')","emit('start')"),("useActivityPresentation(a=>a.version===2","useActivityPresentation(a=>a.version===3"),('<SourceSatchel :game="game"','<SourceSatchel :game="null"')]:
   self.assertIn(before,raw);self.write(n,raw.replace(before,after,1))
   with self.subTest(mutation=before),self.assertRaisesRegex(AssertionError,'SH09 complete current parent'):validate_source_stage(self.root)
   self.write(n,raw)
 def test_local_css_cannot_hide_text_recover_compatibility_or_lose_original_materials(self):
  n=MANIFEST['display']['path'];raw=(ROOT/n).read_text()
  for before,after in [("@import './ta08-source.css';",""),('font-size:26px','font-size:12px'),('gap:6px;','display:none;'),('align-self:start','overflow:hidden'),('/* CEND09:', '@media(max-width:600px){}/* CEND09:')]:
   self.assertIn(before,raw);self.write(n,raw.replace(before,after,1))
   with self.subTest(mutation=before),self.assertRaisesRegex(AssertionError,'SH09 exact scoped CSS'):validate_source_stage(self.root)
   self.write(n,raw)
 def test_original_planner_result_timing_and_ledgers_are_pinned(self):
  for n in ['web/src/SourcePlanner.vue','web/src/SourceSatchel.vue','web/src/activity-clock.ts','art/redesign/ta08.json']:
   raw=(ROOT/n).read_bytes();self.write(n,raw+b'changed')
   with self.subTest(path=n),self.assertRaisesRegex(AssertionError,'SH09 original authority|SH09 old ledgers'):validate_source_stage(self.root)
   self.write(n,raw)
 def test_missing_original_ledger_and_stylesheet_cannot_silence_current_parent(self):
  row=MANIFEST['parent'];n=row['before'];self.write(n,'lost original')
  with self.assertRaisesRegex(AssertionError,'SH09 preserved original'):validate_source_stage(self.root)
  self.write(n,(ROOT/n).read_bytes());(self.root/LEDGER).unlink()
  with self.assertRaisesRegex(AssertionError,'SH09 missing ledger'):validate_source_stage(self.root)
  (self.root/MANIFEST['display']['path']).unlink()
  with self.assertRaisesRegex(AssertionError,'SH09 missing ledger'):validate_source_stage(self.root)
  self.write(row['path'],(ROOT/row['before']).read_bytes());self.assertEqual(validate_source_stage(self.root),(set(),0))
 def test_typed_budgets_and_acceptance_cannot_be_resigned(self):
  for key,value in [('maxCSSBytes',6801),('maxParentBytes',6684),('version',True),('newRasterAssets',1),('userAcceptance',True)]:
   m=copy.deepcopy(MANIFEST);m[key]=value;self.write(LEDGER,m)
   with self.subTest(key=key),self.assertRaisesRegex(AssertionError,'SH09 immutable'):validate_source_stage(self.root)
