import copy,hashlib,unittest
from pathlib import Path
from test_inventory import InventoryTests,ROOT
from cend08_study_inventory import MANIFEST,LEDGER,validate_study_intent,prior_study_intent_bytes

class StudyIntentTests(unittest.TestCase):
 setUp=InventoryTests.setUp
 tearDown=InventoryTests.tearDown
 write=InventoryTests.write
 def setUp(self):
  InventoryTests.setUp(self)
  validate_study_intent(self.root)
 def test_complete_inverse_and_actual_old_caps(self):
  self.assertEqual(validate_study_intent(ROOT)[1],-26)
  for n,r in MANIFEST['files'].items():
   self.assertEqual(prior_study_intent_bytes(n,(ROOT/n).read_bytes()),(ROOT/r['before']).read_bytes())
 def test_cost_callback_disabled_and_forecast_boundaries_cannot_be_resigned(self):
  n='web/src/LearningPlanner.vue';original=(ROOT/n).read_text()
  for a,b in [("C.swordManual.price","0"),("emit('start',plan)","emit('act',{type:'STUDY',manual:'jinghong'})"),("!!conflict||restart.same||!quote?.allowed","false"),("quote?.stopReason?.code!=='CYCLES_COMPLETE'","false")]:
   self.assertIn(a,original);self.write(n,original.replace(a,b,1))
   with self.subTest(a=a),self.assertRaisesRegex(AssertionError,'SI08 current source'):validate_study_intent(self.root)
   self.write(n,original)
 def test_actual_countdown_and_other_scroll_context_cannot_change(self):
  n='web/src/JadeStudyScene.vue';original=(ROOT/n).read_text()
  for a,b in [('Math.ceil(runtime.remainingMs/1000)','0'),("command.value?.type==='LEARN'","false"),("此段研习已暂停","可重新开始")]:
   self.assertIn(a,original);self.write(n,original.replace(a,b,1))
   with self.subTest(a=a),self.assertRaisesRegex(AssertionError,'SI08 current source'):validate_study_intent(self.root)
   self.write(n,original)
 def test_old_original_and_typed_limits_stay_immutable(self):
  for key,value in [('maxNativeDeltaBytes',1),('newRasterAssets',1),('version',True),('userAcceptance',True)]:
   m=copy.deepcopy(MANIFEST);m[key]=value;self.write(LEDGER,m)
   with self.subTest(key=key),self.assertRaisesRegex(AssertionError,'SI08 immutable'):validate_study_intent(self.root)
  self.write(LEDGER,MANIFEST)
  n=next(iter(MANIFEST['files'].values()))['before'];self.write(n,'lost original')
  with self.assertRaisesRegex(AssertionError,'SI08 original source'):validate_study_intent(self.root)
 def test_missing_ledger_is_not_a_historical_fallback(self):
  (self.root/LEDGER).unlink()
  with self.assertRaisesRegex(AssertionError,'SI08 missing ledger'):validate_study_intent(self.root)
