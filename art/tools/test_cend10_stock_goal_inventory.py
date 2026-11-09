import copy,unittest
import test_inventory as inventory
from cend10_stock_goal_inventory import MANIFEST,LEDGER,prior_stock_goal_bytes,validate_stock_goal
ROOT=inventory.ROOT
class StockGoalTests(unittest.TestCase):
 tearDown=inventory.InventoryTests.tearDown
 def write(self,n,value):
  if not isinstance(value,bytes):return inventory.InventoryTests.write(self,n,value)
  p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True)
  if p.exists():p.unlink()
  p.write_bytes(value)
 def setUp(self):
  inventory.InventoryTests.setUp(self)
  validate_stock_goal(self.root)
 def test_complete_parent_inverse_preserves_original_stock_and_reward_markup(self):
  r=MANIFEST['parent'];self.assertEqual(prior_stock_goal_bytes(r['path'],(ROOT/r['path']).read_bytes()),(ROOT/r['before']).read_bytes());self.assertLessEqual(r['bytes']-r['beforeBytes'],400);self.assertLessEqual(validate_stock_goal(self.root)[1],4600)
 def test_display_and_projection_cannot_remove_identity_or_introduce_writes(self):
  for key,before,after in [('display',':activity="activity"',':activity="null"'),('projection','a.runId!==game.core.runId','false'),('projection',"game.status!=='active'",'false')]:
   n=MANIFEST[key]['path']if key!='display'else MANIFEST['parent']['path'];raw=(ROOT/n).read_text();self.assertIn(before,raw);self.write(n,raw.replace(before,after,1))
   with self.subTest(key=key),self.assertRaisesRegex(AssertionError,'SG10 complete|SG10 exact pure'):validate_stock_goal(self.root)
   self.write(n,raw)
 def test_original_controller_rule_and_period_cannot_be_resigned(self):
  for n in ['web/src/SourcePlanner.vue','web/src/source-choreography.ts','web/src/activity-clock.ts','src/full/activity.ts']:
   raw=(ROOT/n).read_bytes();self.write(n,raw+b' changed')
   with self.subTest(path=n),self.assertRaisesRegex(AssertionError,'SG10 original authority'):validate_stock_goal(self.root)
   self.write(n,raw)
 def test_missing_ledger_sources_and_changed_old_parent_do_not_silence_feature(self):
  r=MANIFEST['parent'];(self.root/LEDGER).unlink()
  with self.assertRaisesRegex(AssertionError,'SG10 missing ledger'):validate_stock_goal(self.root)
  for key in ['display','projection']:(self.root/MANIFEST[key]['path']).unlink()
  with self.assertRaisesRegex(AssertionError,'SG10 missing ledger'):validate_stock_goal(self.root)
  self.write(r['path'],(ROOT/r['before']).read_bytes()+b' ')
  with self.assertRaisesRegex(AssertionError,'SG10 missing ledger'):validate_stock_goal(self.root)
  self.write(r['path'],(ROOT/r['before']).read_bytes());self.assertEqual(validate_stock_goal(self.root),(set(),0))
 def test_caps_acceptance_and_version_are_strictly_typed(self):
  for key,value in [('version',True),('maxChildBytes',2401),('maxParentDeltaBytes',401),('newRasterAssets',1),('userAcceptance',True)]:
   m=copy.deepcopy(MANIFEST);m[key]=value;self.write(LEDGER,m)
   with self.subTest(key=key),self.assertRaisesRegex(AssertionError,'SG10 immutable'):validate_stock_goal(self.root)
