import hashlib,json,tempfile,unittest
from pathlib import Path
from art33_inventory import validate_art33,LEDGER,FILES,PARENTS,REFS,BASE,BASELINES,UNCHANGED,PATCHES,normalize_ux25_app,UX25_APP_TRANSFORMS,UX25_APP_BASELINE_SHA256
from check_inventory import image_info
ROOT=Path(__file__).resolve().parents[2]
class ART33Tests(unittest.TestCase):
 def setUp(self):
  t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup);self.root=Path(t.name);m=json.loads((ROOT/LEDGER).read_text());names={LEDGER,*FILES,*PARENTS,*REFS,*UNCHANGED,BASE+'/export-facts.json',*[r['path']for r in PATCHES]}
  for row in m['asset']['assets'].values():names.update([row['source']['path'],row['runtime']['path'],*[ref['path']for ref in row['references']]])
  for key in ['producer','helper','prompts','selectedSources','toolAudit']:names.add(m['asset'][key]['path'])
  for key in ['cultivation-objects','immersive-ui']:
   n='art/redesign/'+key+'.json';names.add(n);names.update(r['path']for r in json.loads((ROOT/n).read_text())['files'])
  names.add('web/src/GoalPanel.vue')
  for n in names:
   p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((ROOT/n).read_bytes())
  self.original={n:(self.root/n).read_bytes()for n in names}
 def check(self):return validate_art33(self.root,image_info)
 def edit(self,fn):
  p=self.root/LEDGER;m=json.loads(p.read_text());fn(m);p.write_text(json.dumps(m))
 def resign(self):
  self.edit(lambda m:[r.update(bytes=(self.root/r['path']).stat().st_size,sha256=hashlib.sha256((self.root/r['path']).read_bytes()).hexdigest())for r in m['files']+m['parents']])
 def change(self,n,old,new):
  p=self.root/n;p.write_text(p.read_text().replace(old,new,1));self.resign()
 def reject(self,fn):
  for n,b in self.original.items():(self.root/n).write_bytes(b)
  self.check();fn()
  with self.assertRaises((AssertionError,KeyError,ValueError)):self.check()
 def test_actual_root_and_complete_sandbox_positive(self):
  self.assertEqual(self.check()[1:],(2,137896));self.assertEqual(validate_art33(ROOT,image_info)[1:],(2,137896))
 def test_caps_scope_and_user_acceptance_cannot_expand(self):
  self.reject(lambda:self.edit(lambda m:m['budgets'].update(nativeBytes=12001)))
  self.reject(lambda:self.edit(lambda m:m['files'].pop()))
  self.reject(lambda:self.edit(lambda m:m.update(userAcceptance=True)))
  self.reject(lambda:self.change(FILES[1],'#app','#app'+' '*13000))
 def test_parent_original_script_callbacks_and_slot_survive_even_resigning(self):
  for n,old,new in [(PARENTS[0],'@inspect="viewActivityPlan"','@inspect="closeHub"'),(PARENTS[0],"function closeHub(","function changedCloseHub("),(PARENTS[1],':view="view"',':view="null"'),(PARENTS[2],"expanded=!expanded","expanded=true")]:self.reject(lambda n=n,old=old,new=new:self.change(n,old,new))
 def test_immutable_baselines_and_approved_patch_cannot_be_forged(self):
  self.reject(lambda:self.change(BASELINES[0]['path'],'act(', 'fakeAct('))
  self.reject(lambda:self.change(PATCHES[0]['path'],'viewActivityPlan','closeHub'))
 def test_new_view_cannot_get_clock_storage_reward_or_raw_html(self):
  for extra in ['setTimeout(()=>{},1);','Date.now();','indexedDB.open("other");','resolve({});','const raw="v-html";']:
   self.reject(lambda extra=extra:self.change(FILES[0],"const total=",extra+"const total="))
 def test_actual_inventory_cannot_be_replaced_by_painted_or_fabricated_count(self):
  self.reject(lambda:self.change(FILES[0],'继续或接管见上方','当前读秒见上方'))
  self.reject(lambda:self.change(FILES[0],'game.core.inventory.healing_pill>0','true'))
  self.reject(lambda:self.change(FILES[0],'{{game.core.inventory.healing_pill}}','{{1}}'))
 def test_reduced_failure_and_reading_surfaces_cannot_disappear(self):
  for old,new in [('[data-failed=true]','[data-failed=false]'),('prefers-reduced-motion:reduce','prefers-reduced-motion:never'),('.art33-case:active','.art33-case:disabled')]:self.reject(lambda old=old,new=new:self.change(FILES[1],old,new))
  self.reject(lambda:self.change(FILES[1],'#app','#app .choice-act{display:none}#app'))
 def test_runtime_and_source_bytes_cannot_be_replaced_by_changed_metadata(self):
  m=json.loads((ROOT/LEDGER).read_text())
  for part in ['source','runtime']:
   n=m['asset']['assets']['shen-offering'][part]['path']
   self.reject(lambda n=n:(self.root/n).write_bytes(b'fake PNG'))
 def test_generated_chain_cannot_claim_provider_model_or_wrong_reference(self):
  m=json.loads((ROOT/LEDGER).read_text())
  self.reject(lambda:self.change(m['asset']['toolAudit']['path'],'"model": null','"model": "invented"'))
  n=m['asset']['assets']['shen-offering']['references'][0]['path'];self.reject(lambda n=n:(self.root/n).write_bytes(b'wrong reference'))
 def test_formal_controller_and_old_group_caps_remain_strict(self):
  n=next(iter(UNCHANGED));self.reject(lambda n=n:self.change(n,'import','/* changed */import'))
  self.reject(lambda:self.change('art/redesign/cultivation-objects.json','45000','45001'))
 def test_ux25_current_time_notices_restore_previous_entire_app_source(self):
  text=(self.root/PARENTS[0]).read_text()
  self.assertEqual(hashlib.sha256(normalize_ux25_app(text).encode()).hexdigest(),UX25_APP_BASELINE_SHA256)
  self.check()
 def test_ux25_resigned_wrong_period_or_timing_source_rejected(self):
  for old,new in [('ADVENTURE_CYCLE_MS.travel/1000','ADVENTURE_CYCLE_MS.travel/1000+1'),('ADVENTURE_CYCLE_MS.travel/1000',"actionSeconds({type:'TRAVEL',location:'cave'})"),('ADVENTURE_CYCLE_MS,isAdventurePlan','ADVENTURE_CYCLE_MS as fakePeriod,isAdventurePlan')]:
   self.reject(lambda old=old,new=new:self.change(PARENTS[0],old,new))
 def test_ux25_resigned_missing_or_duplicate_time_surface_rejected(self):
  for before,after in UX25_APP_TRANSFORMS[1:]:
   self.reject(lambda before=before,after=after:self.change(PARENTS[0],after,before))
   self.reject(lambda after=after:self.change(PARENTS[0],after,after+after))
 def test_ux25_resigned_script_side_effect_and_travel_callback_rejected(self):
  self.reject(lambda:self.change(PARENTS[0],"function closeHub(","setTimeout(()=>{},1);function closeHub("))
  self.reject(lambda:self.change(PARENTS[0],"@click=\"travel('cave')\"","@click=\"act({type:'BREAKTHROUGH'})\""))
 def test_ux25_original_parent_caps_cannot_be_raised_or_retyped(self):
  for field,value in [('parentDeltaBytes',2401),('oldGoalBytes',19001),('oldImmersiveBytes',26001),('parentDeltaBytes',True)]:
   self.reject(lambda field=field,value=value:self.edit(lambda m:m['budgets'].update({field:value})))
if __name__=='__main__':unittest.main()
