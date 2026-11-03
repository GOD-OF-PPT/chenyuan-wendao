import hashlib,json,shutil,tempfile,unittest
from pathlib import Path
from ux30_inventory import FACTS,GROUPS,REFS,LEDGER,validate_ux30,prior_ux30_bytes
ROOT=Path(__file__).resolve().parents[2]

class PrimaryCopyTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name)
  names={LEDGER,*REFS,*['web/src/'+n for n in FACTS]}
  for n in GROUPS:
   path='art/redesign/'+n+'.json';names.add(path)
   names.update(r['path']for r in json.loads((ROOT/path).read_text())['files'])
  for n in names:
   p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/n,p)
 def update(self,fn):
  p=self.root/LEDGER;m=json.loads(p.read_text());fn(m);p.write_text(json.dumps(m))
 def resign(self,n):
  data=(self.root/n).read_bytes()
  self.update(lambda m:[r.update(bytes=len(data),sha256=hashlib.sha256(data).hexdigest())for r in m['files']+m['baselines']if r['path']==n])
 def reject(self):
  with self.assertRaises(AssertionError):validate_ux30(self.root)
 def test_actual_complete_sources_reverse_to_original_controllers_with_real_caps(self):
  recorded,size=validate_ux30(self.root);self.assertEqual(size,201410);self.assertIn(LEDGER,recorded)
  for n,f in FACTS.items():self.assertEqual(prior_ux30_bytes(n,(self.root/'web/src'/n).read_bytes()),(self.root/f['baseline']).read_bytes())
 def test_resigned_controller_or_callback_edit_is_not_a_display_exception(self):
  for n,old,new in [('TrainingPlanner.vue','maxCycles:cycles.value','maxCycles:999'),('RecoveryPlanner.vue','count=ref(3)','count=ref(9)'),('App.vue','function startTraining(','function saveTraining(')]:
   p=self.root/'web/src'/n;original=p.read_text()
   if old not in original:old,new=('emit(', 'eval(')
   self.assertTrue(old in original,n+' mutation fixture');p.write_text(original.replace(old,new,1));self.resign('web/src/'+n);self.reject();p.write_text(original);self.resign('web/src/'+n)
 def test_critical_finite_authorisation_and_full_moved_explanations_cannot_disappear(self):
  for n,token in [('App.vue','最多50轮'),('TrainingPlanner.vue','不补发离线收益'),('AlchemyWorkshop.vue','材料不足、达到目标或触及保留量时自动停炉'),('RecoveryRitual.vue','item.description'),('RecoveryPlanner.vue','达标或触及保留线即停')]:
   p=self.root/'web/src'/n;s=p.read_text();self.assertIn(token,s);p.write_text(s.replace(token,'',1));self.resign('web/src/'+n);self.reject();p.write_text(s);self.resign('web/src/'+n)
 def test_removing_ledger_or_consumer_cannot_authorise_current_displays(self):
  p=self.root/LEDGER;s=p.read_bytes();p.unlink();self.reject();p.write_bytes(s)
  p=self.root/'web/src/App.vue';s=p.read_bytes();p.write_bytes(s.replace(b'data-copy30="home"',b''));self.resign('web/src/App.vue');self.reject()
 def test_original_and_new_caps_cannot_be_resigned_or_expanded(self):
  self.update(lambda m:m['budgets'].update(appBytes=159636));self.reject()
 def test_original_regional_cap_is_still_enforced(self):
  p=self.root/'art/redesign/idle-preparation.json';m=json.loads(p.read_text());m['maxNativeBytes']=60001;p.write_text(json.dumps(m));self.reject()
 def test_actual_other_group_bytes_cannot_hide_behind_normalised_original_sizes(self):
  m=json.loads((self.root/'art/redesign/idle-preparation.json').read_text());n=next(r['path']for r in m['files']if Path(r['path']).name not in FACTS);p=self.root/n;p.write_bytes(p.read_bytes()+b' '*60000);self.reject()
 def test_original_baseline_tamper_even_with_updated_digest_cannot_replace_complete_proof(self):
  n=FACTS['RecoveryPlanner.vue']['baseline'];p=self.root/n;p.write_bytes(p.read_bytes()+b' ');self.resign(n);self.reject()
 def test_source_membership_and_human_acceptance_cannot_be_relabelled(self):
  self.update(lambda m:m.update(userAcceptance=True));self.reject()
 def test_published_transform_cannot_hide_deleted_information(self):
  p=self.root/'art/redesign/ux30-display-edits.json';m=json.loads(p.read_text());m['App.vue']=[];p.write_text(json.dumps(m));self.reject()
 def test_shrinking_clipping_or_detached_forecast_is_not_authorised(self):
  p=self.root/'web/src/TrainingPlanner.vue';s=p.read_text()
  for token in [' style="font-size:10px"',' style="overflow:hidden"',' v-if="false"']:
   p.write_text(s.replace('<details name=', '<details'+token+' name=',1));self.resign('web/src/TrainingPlanner.vue');self.reject()
 def test_symlink_cannot_substitute_original(self):
  p=self.root/FACTS['App.vue']['baseline'];p.unlink();p.symlink_to(ROOT/FACTS['App.vue']['baseline']);self.reject()
