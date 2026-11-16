import hashlib,json,tempfile,unittest
from pathlib import Path
from art25_inventory import validate_art25,LEDGER,FILES,REFS,UNCHANGED,SCENE,normalize_ux26_learning,UX26_LEARNING_BEFORE,UX26_LEARNING_AFTER
from ux33_inventory import prior_ux33_bytes
ROOT=Path(__file__).resolve().parents[2]
class ART25Tests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name);names={LEDGER,*FILES,*REFS,*UNCHANGED,SCENE,'art/production/art24/export-facts.json'}
  for key in ['art03','art10','idle-preparation','ta09']:
   name='art/redesign/'+key+'.json';names.add(name);names.update(r['path']for r in json.loads((ROOT/name).read_text())['files'])
  for n in names:
   p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(prior_ux33_bytes(n,(ROOT/n).read_bytes()))
  if(ROOT/'art/redesign/art26.json').exists():
   before=(ROOT/'goal-4/evidence/art26/equipment-panel-before.vue.txt').read_bytes();self.assertEqual(hashlib.sha256(before).hexdigest(),UNCHANGED['web/src/EquipmentPanel.vue']);(self.root/'web/src/EquipmentPanel.vue').write_bytes(before)
 def check(self):return validate_art25(self.root)
 def edit(self,fn):
  p=self.root/LEDGER;j=json.loads(p.read_text());fn(j);p.write_text(json.dumps(j))
 def resign(self):
  def change(j):
   for r in j['files']:
    b=(self.root/r['path']).read_bytes();r.update(bytes=len(b),sha256=hashlib.sha256(b).hexdigest())
  self.edit(change)
 def test_real_and_complete_sandbox_positive(self):self.assertEqual(validate_art25(ROOT)[1:],self.check()[1:]);self.assertEqual(self.check()[1:],(0,0))
 def test_missing_ledger_and_reference_are_rejected(self):
  p=self.root/LEDGER;b=p.read_bytes();p.unlink()
  with self.assertRaises(AssertionError):self.check()
  p.write_bytes(b);(self.root/REFS[0]).unlink()
  with self.assertRaises(AssertionError):self.check()
 def test_original_caps_and_actual_css_cannot_be_expanded(self):
  for key,value in [('oldNativeCap',45001),('newRasterAssets',True)]:
   p=self.root/LEDGER;b=p.read_bytes();self.edit(lambda j:j['budgets'].update({key:value}))
   with self.assertRaises(AssertionError):self.check()
   p.write_bytes(b)
  p=self.root/FILES[1];p.write_text(p.read_text()+' '*12000);self.resign()
  with self.assertRaises(AssertionError):self.check()
 def test_real_scene_and_adjacent_action_consumer_are_bound(self):
  p=self.root/FILES[0];s=p.read_text()
  for replacement in [s.replace('path="art/v2/schools/sanctum-v1.webp"','path="art/v2/scenes/cave.webp"'),s.replace('class="jade-readable"','class="another-reading-surface"'),s.replace('<span class="study-sanctum-fallback"/>','')]:
   p.write_text(replacement);self.resign()
   with self.assertRaises(AssertionError):self.check()
 def test_original_script_and_parent_controllers_cannot_be_resigned(self):
  p=self.root/FILES[0];s=p.read_text();p.write_text(s.replace("useEquipmentCycle(kind.value,id)","useEquipmentCycle('forge',id)"));self.resign()
  with self.assertRaises(AssertionError):self.check()
  p.write_text(s);self.resign();p=self.root/'web/src/LearningPlanner.vue';p.write_text(p.read_text()+' ')
  with self.assertRaises(AssertionError):self.check()
 def test_original_paint_and_human_acceptance_cannot_be_relabelled(self):
  p=self.root/SCENE;b=p.read_bytes();p.write_bytes(b+b'x')
  with self.assertRaises(AssertionError):self.check()
  p.write_bytes(b);self.edit(lambda j:j.update(userAcceptance=True))
  with self.assertRaises(AssertionError):self.check()

 def reject_learning(self,change):
  p=self.root/'web/src/LearningPlanner.vue';old=p.read_bytes();ledger=self.root/'art/redesign/idle-preparation.json';saved=ledger.read_bytes()
  try:
   text=change(old.decode());self.assertNotEqual(text,old.decode());p.write_text(text);m=json.loads(ledger.read_text())
   for row in m['files']:
    if row['path']=='web/src/LearningPlanner.vue':row.update(bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())
   ledger.write_text(json.dumps(m))
   with self.assertRaises(AssertionError):self.check()
  finally:p.write_bytes(old);ledger.write_bytes(saved)
 def test_ux26_current_labels_restore_exact_original_whole_source(self):
  source=(self.root/'web/src/LearningPlanner.vue').read_text();self.assertEqual(hashlib.sha256(normalize_ux26_learning(source).encode()).hexdigest(),UNCHANGED['web/src/LearningPlanner.vue']);self.check()
 def test_ux26_equal_size_wrong_running_or_saved_labels_cannot_be_resigned(self):
  for before,after in [("running?'下次草案","busy   ?'下次草案"),('sameSaved&&planSaved','sameSaved||planSaved'),('下次草案，当前执行见上方','本次草案，当前执行见上方')]:
   self.assertEqual(len(before.encode()),len(after.encode()));self.reject_learning(lambda text,before=before,after=after:text.replace(before,after,1))
 def test_ux26_missing_or_duplicated_approved_expression_is_not_ignored(self):
  self.reject_learning(lambda text:text.replace(UX26_LEARNING_AFTER,"'待确认安排，确认后开始'",1))
  source=(self.root/'web/src/LearningPlanner.vue').read_text()
  with self.assertRaises(AssertionError):normalize_ux26_learning(source.replace(UX26_LEARNING_AFTER,UX26_LEARNING_AFTER+UX26_LEARNING_AFTER,1))
 def test_ux26_equal_size_script_or_callback_cannot_be_resigned(self):
  for before,after in [('p.stoneBudget===d.stoneBudget','p.stoneBudget!==d.stoneBudget'),("emit('start',plan)","emit('track',plan)")]:
   self.assertEqual(len(before.encode()),len(after.encode()));self.reject_learning(lambda text,before=before,after=after:text.replace(before,after,1))
 def test_ux26_original_preparation_cap_cannot_be_raised_retyped_or_exceeded(self):
  p=self.root/LEDGER;original=p.read_bytes()
  for value in [60001,True]:
   try:
    self.edit(lambda m:m['budgets'].update(oldPreparationCap=value))
    with self.assertRaises(AssertionError):self.check()
   finally:p.write_bytes(original)
  self.reject_learning(lambda text:text+' ')
