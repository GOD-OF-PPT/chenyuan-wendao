import copy,hashlib,json,os,shutil,tempfile,unittest
from pathlib import Path
from check_inventory import validate,validate_alchemy_workshop,validate_adventure_objects,validate_equipment_objects,ART02_NATIVE,ART03_NATIVE,SCOPES
ROOT=Path(__file__).resolve().parents[2]

class InventoryTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='chenyuan-art-negative-');self.root=Path(self.temp.name);self.manifest=json.loads((ROOT/'art/asset-manifest.json').read_text())
  files=set()
  for scope in SCOPES:
   files.update(f for f in (ROOT/scope).rglob('*') if f.is_file() and '__pycache__' not in f.parts)
  for asset in self.manifest['assets']:
   for ref in asset['sourceReference']+asset['rights']['evidenceReferences']:
    files.add(ROOT/ref)
   if asset.get('visualReview',{}).get('recordReference'):files.add(ROOT/asset['visualReview']['recordReference'])
  redesign=ROOT/'art/redesign/manifest.json'
  if redesign.exists():
   current=json.loads(redesign.read_text())
   files.update(ROOT/ref for ref in current['sourceReferences']+current['rights']['evidenceReferences'])
  character_battle=ROOT/'art/redesign/character-battle-manifest.json'
  if character_battle.exists():
   current=json.loads(character_battle.read_text())
   files.update(ROOT/ref for ref in current['sourceReferences']+current['rights']['evidenceReferences'])
  desktop_ui=ROOT/'art/redesign/desktop-ui-manifest.json'
  if desktop_ui.exists():
   current=json.loads(desktop_ui.read_text())
   files.update(ROOT/ref for ref in current['sourceReferences']+current['rights']['evidenceReferences'])
  native=ROOT/'art/redesign/single-screen-native.json'
  if native.exists():files.update(ROOT/ref for ref in json.loads(native.read_text())['sourceReferences'])
  panels=ROOT/'art/redesign/panel-materials.json'
  if panels.exists():files.update(ROOT/ref for ref in json.loads(panels.read_text())['sourceReferences'])
  immersive=ROOT/'art/redesign/immersive-ui.json'
  if immersive.exists():files.update(ROOT/ref for ref in json.loads(immersive.read_text())['sourceReferences'])
  actions=ROOT/'art/redesign/action-feedback.json'
  if actions.exists():files.update(ROOT/ref for ref in json.loads(actions.read_text())['sourceReferences'])
  flow=ROOT/'art/redesign/playable-flow.json'
  if flow.exists():files.update(ROOT/ref for ref in json.loads(flow.read_text())['sourceReferences'])
  story=ROOT/'art/redesign/story-journey.json'
  if story.exists():files.update(ROOT/ref for ref in json.loads(story.read_text())['sourceReferences'])
  catalogue=ROOT/'art/redesign/catalogue-art/manifest.json'
  if catalogue.exists():files.update(ROOT/ref for ref in json.loads(catalogue.read_text())['sourceReferences'])
  idle=ROOT/'art/redesign/idle-cultivation.json'
  if idle.exists():files.update(ROOT/ref for ref in json.loads(idle.read_text())['sourceReferences'])
  source_ui=ROOT/'art/redesign/idle-sources.json'
  if source_ui.exists():files.update(ROOT/ref for ref in json.loads(source_ui.read_text())['sourceReferences'])
  production_ui=ROOT/'art/redesign/idle-production.json'
  if production_ui.exists():files.update(ROOT/ref for ref in json.loads(production_ui.read_text())['sourceReferences'])
  preparation=ROOT/'art/redesign/idle-preparation.json'
  if preparation.exists():files.update(ROOT/ref for ref in json.loads(preparation.read_text())['sourceReferences'])
  adventure=ROOT/'art/redesign/idle-adventure.json'
  if adventure.exists():files.update(ROOT/ref for ref in json.loads(adventure.read_text())['sourceReferences'])
  milestone=ROOT/'art/redesign/idle-milestones.json'
  if milestone.exists():files.update(ROOT/ref for ref in json.loads(milestone.read_text())['sourceReferences'])
  stage=ROOT/'art/redesign/stage-r1.json'
  if stage.exists():files.update(ROOT/ref for ref in json.loads(stage.read_text())['sourceReferences'])
  r2=ROOT/'art/redesign/stage-r2.json'
  if r2.exists():files.update(ROOT/ref for ref in json.loads(r2.read_text())['sourceReferences'])
  r3=ROOT/'art/redesign/stage-r3.json'
  if r3.exists():files.update(ROOT/ref for ref in json.loads(r3.read_text())['sourceReferences'])
  r4=ROOT/'art/redesign/stage-r4.json'
  if r4.exists():files.update(ROOT/ref for ref in json.loads(r4.read_text())['sourceReferences'])
  tradeoff=ROOT/'art/redesign/idle-tradeoffs.json'
  if tradeoff.exists():
   data=json.loads(tradeoff.read_text());files.update(ROOT/ref for ref in data['sourceReferences']);files.update(ROOT/row['path'] for row in data['files'])
  loading=ROOT/'art/redesign/local-loading.json'
  if loading.exists():
   data=json.loads(loading.read_text());files.update(ROOT/ref for ref in data['sourceReferences']);files.update(ROOT/row['path'] for row in data['files'])
  history_ui=ROOT/'art/redesign/activity-history.json'
  if history_ui.exists():
   data=json.loads(history_ui.read_text());files.update(ROOT/ref for ref in data['sourceReferences']);files.update(ROOT/row['path'] for row in data['files'])
  uir3504=ROOT/'art/redesign/uir35-04.json'
  if uir3504.exists():
   current=json.loads(uir3504.read_text());files.update(ROOT/n for n in [*current['sourceReferences'],*current['files'],*[r['before']for r in current['files'].values()],current['projection']['path'],*current['unchanged']])
  uir3503=ROOT/'art/redesign/uir35-03.json'
  if uir3503.exists():
   current=json.loads(uir3503.read_text());files.update(ROOT/n for n in [*current['sourceReferences'],current['path'],current['before'],*current['unchanged']])
  checkui35=ROOT/'art/redesign/check-ui35.json'
  if checkui35.exists():
   current=json.loads(checkui35.read_text());files.update(ROOT/n for n in [*current['sourceReferences'],*current['files'],*[x['before']for x in current['files'].values()],*current['unchanged']])
  uir3502=ROOT/'art/redesign/uir35-02.json'
  if uir3502.exists():
   current=json.loads(uir3502.read_text());files.update(ROOT/n for n in [*current['sourceReferences'],current['app']['path'],current['app']['before'],*current['added'],*current['unchanged']])
  uir3501=ROOT/'art/redesign/uir35-01.json'
  if uir3501.exists():
   current=json.loads(uir3501.read_text());files.update(ROOT/n for n in [*current['sourceReferences'],*current['files'],*current['unchanged'],*[row['before']for row in current['files'].values()]])
  uir3407=ROOT/'art/redesign/uir34-07.json'
  if uir3407.exists():
   data=json.loads(uir3407.read_text());files.update(ROOT/ref for ref in data['sourceReferences']+list(data['unchanged']));files.update(ROOT/r['before']for r in data['files'].values())
  uir3406=ROOT/'art/redesign/uir34-06.json'
  if uir3406.exists():
   data=json.loads(uir3406.read_text());files.update(ROOT/ref for ref in data['sourceReferences']+[data['before']]+list(data['unchanged']))
  uir3405=ROOT/'art/redesign/uir34-05.json'
  if uir3405.exists():
   data=json.loads(uir3405.read_text());files.update(ROOT/ref for ref in data['sourceReferences']+[data['before']]+list(data['unchanged']))
  check340204=ROOT/'art/redesign/check-uir34-02-04.json'
  if check340204.exists():
   data=json.loads(check340204.read_text());files.update(ROOT/ref for ref in data['sourceReferences']+[data['before']]+list(data['unchanged']))
  uir3404=ROOT/'art/redesign/uir34-04.json'
  if uir3404.exists():
   data=json.loads(uir3404.read_text());files.update(ROOT/ref for ref in data['sourceReferences']+list(data['unchanged']));files.update(ROOT/r['before']for r in data['files'].values())
  uir3403=ROOT/'art/redesign/uir34-03.json'
  if uir3403.exists():
   data=json.loads(uir3403.read_text());files.update(ROOT/ref for ref in data['sourceReferences']+[data['before']]+list(data['unchanged']))
  uir3402=ROOT/'art/redesign/uir34-02.json'
  if uir3402.exists():
   data=json.loads(uir3402.read_text());files.update(ROOT/ref for ref in data['sourceReferences']+list(data['unchanged']));files.update(ROOT/ref['before'] for ref in data['files'].values())
  uir3401=ROOT/'art/redesign/uir34-01.json'
  if uir3401.exists():
   data=json.loads(uir3401.read_text());files.update(ROOT/ref for ref in data['sourceReferences']+list(data['unchanged']));files.update(ROOT/ref['before'] for ref in data['files'].values())
  uir3308=ROOT/'art/redesign/uir33-08.json'
  if uir3308.exists():
   data=json.loads(uir3308.read_text());files.update(ROOT/ref for ref in data['sourceReferences']+[data['before']]+list(data['unchanged']))
  workshop=ROOT/'art/redesign/alchemy-workshop.json'
  if workshop.exists():
   data=json.loads(workshop.read_text());files.update(ROOT/ref for ref in data['sourceReferences']+data['rights']['evidenceReferences']);files.update(ROOT/row['path'] for row in data['files'])
  objects=ROOT/'art/redesign/art02.json'
  if objects.exists():
   data=json.loads(objects.read_text());files.update(ROOT/ref for ref in data['sourceReferences']);files.update(ROOT/row['path'] for row in data['files'])
  equipment=ROOT/'art/redesign/art03.json'
  if equipment.exists():
   data=json.loads(equipment.read_text());files.update(ROOT/ref for ref in data['sourceReferences']+data['rights']['evidenceReferences']);files.update(ROOT/row['path'] for row in data['files'])
  supplies=ROOT/'art/redesign/art04.json'
  if supplies.exists():files.update(ROOT/ref for ref in json.loads(supplies.read_text())['sourceReferences'])
  narrative=ROOT/'art/redesign/narrative-objects.json'
  if narrative.exists():files.update(ROOT/ref for ref in json.loads(narrative.read_text())['sourceReferences'])
  cultivation=ROOT/'art/redesign/cultivation-objects.json'
  if cultivation.exists():files.update(ROOT/ref for ref in json.loads(cultivation.read_text())['sourceReferences'])
  menus=ROOT/'art/redesign/game-menu-matrix.json'
  if menus.exists():files.update(ROOT/ref for ref in json.loads(menus.read_text())['sourceReferences'])
  feedback_skip=ROOT/'art/redesign/feedback-skip.json'
  if feedback_skip.exists():
   data=json.loads(feedback_skip.read_text());files.update(ROOT/ref for ref in data['sourceReferences']);files.add(ROOT/data['provenance']['path'])
   ta07=ROOT/'art/redesign/ta07.json'
   if ta07.exists():files.update(ROOT/ref for ref in json.loads(ta07.read_text())['sourceReferences'])
   ta08=ROOT/'art/redesign/ta08.json'
   if ta08.exists():
    data=json.loads(ta08.read_text());files.update(ROOT/ref for ref in data['sourceReferences']+data['promptReferences'])
  ta09=ROOT/'art/redesign/ta09.json'
  if ta09.exists():files.update(ROOT/ref for ref in json.loads(ta09.read_text())['sourceReferences'])
  art10=ROOT/'art/redesign/art10.json'
  if art10.exists():files.update(ROOT/ref for ref in json.loads(art10.read_text())['sourceReferences'])
  art11=ROOT/'art/redesign/art11.json'
  if art11.exists():files.update(ROOT/ref for ref in json.loads(art11.read_text())['sourceReferences'])
  if art11.exists():files.add(ROOT/'src/full/content.ts')
  art12=ROOT/'art/redesign/art12.json'
  if art12.exists():files.update(ROOT/ref for ref in json.loads(art12.read_text())['sourceReferences'])
  art15=ROOT/'art/redesign/art15.json'
  if art15.exists():files.update(ROOT/ref for ref in json.loads(art15.read_text())['sourceReferences'])
  art16=ROOT/'art/redesign/art16.json'
  if art16.exists():files.update(ROOT/ref for ref in json.loads(art16.read_text())['sourceReferences'])
  art17=ROOT/'art/redesign/art17.json'
  if art17.exists():files.update(ROOT/ref for ref in json.loads(art17.read_text())['sourceReferences'])
  art18=ROOT/'art/redesign/art18.json'
  if art18.exists():files.update(ROOT/ref for ref in json.loads(art18.read_text())['sourceReferences'])
  trial_guidance=ROOT/'art/redesign/trial-guidance.json'
  if trial_guidance.exists():files.update(ROOT/ref for ref in json.loads(trial_guidance.read_text())['sourceReferences'])
  trial_return=ROOT/'art/redesign/trial-return.json'
  if trial_return.exists():files.update(ROOT/ref for ref in json.loads(trial_return.read_text())['sourceReferences'])
  sealed_life=ROOT/'art/redesign/sealed-life.json'
  if sealed_life.exists():files.update(ROOT/ref for ref in json.loads(sealed_life.read_text())['sourceReferences'])
  art24=ROOT/'art/redesign/art24.json'
  if art24.exists():files.update(ROOT/ref for ref in json.loads(art24.read_text())['sourceReferences'])
  art25=ROOT/'art/redesign/art25.json'
  if art25.exists():files.update(ROOT/ref for ref in json.loads(art25.read_text())['sourceReferences'])
  art26=ROOT/'art/redesign/art26.json'
  if art26.exists():files.update(ROOT/ref for ref in json.loads(art26.read_text())['sourceReferences'])
  art27=ROOT/'art/redesign/art27.json'
  if art27.exists():files.update(ROOT/ref for ref in json.loads(art27.read_text())['sourceReferences'])
  art28=ROOT/'art/redesign/art28.json'
  if art28.exists():
   data=json.loads(art28.read_text());files.update(ROOT/ref for ref in data['sourceReferences']+list(data['unchanged']))
  art29=ROOT/'art/redesign/art29.json'
  if art29.exists():
   data=json.loads(art29.read_text());files.update(ROOT/ref for ref in data['sourceReferences']+list(data['unchanged']))
  art30=ROOT/'art/redesign/art30.json'
  if art30.exists():
   data=json.loads(art30.read_text());files.update(ROOT/ref for ref in data['sourceReferences']+list(data['unchanged']))
  art31=ROOT/'art/redesign/art31.json'
  if art31.exists():
   data=json.loads(art31.read_text());files.update(ROOT/ref for ref in data['sourceReferences']+list(data['unchanged']))
  art32=ROOT/'art/redesign/art32.json'
  if art32.exists():
   data=json.loads(art32.read_text());files.update(ROOT/ref for ref in data['sourceReferences']+list(data['unchanged']))
  art35=ROOT/'art/redesign/art35.json'
  if art35.exists():
   data=json.loads(art35.read_text());files.update(ROOT/ref for ref in data['sourceReferences']+list(data['unchanged']));files.update(ROOT/r['path']for r in data['parents']+data['files'])
  art33=ROOT/'art/redesign/art33.json'
  if art33.exists():
   data=json.loads(art33.read_text());files.update(ROOT/ref for ref in data['sourceReferences']+list(data['unchanged']));files.update(ROOT/row['path']for row in data['files']+data['parents'])
   for row in data['asset']['assets'].values():files.update(ROOT/ref['path']for ref in row['references'])
  art34=ROOT/'art/redesign/art34.json'
  if art34.exists():
   data=json.loads(art34.read_text());files.update(ROOT/ref for ref in data['sourceReferences']+list(data['unchanged']));files.update(ROOT/row['path']for row in data['files'])
  art36=ROOT/'art/redesign/art36.json'
  if art36.exists():files.update(ROOT/ref for ref in json.loads(art36.read_text())['sourceReferences'])
  checkuir=ROOT/'art/redesign/check-uir33-label.json'
  if checkuir.exists():
   m=json.loads(checkuir.read_text());files.update(ROOT/ref for ref in m['sourceReferences']+[m['before']])
  checkuir02=ROOT/'art/redesign/check-uir33-02.json'
  if checkuir02.exists():
   data=json.loads(checkuir02.read_text());files.update(ROOT/ref for ref in data['sourceReferences']+[r['before']for r in data['files'].values()]+list(data['unchanged']))
  uir3307=ROOT/'art/redesign/uir33-07.json'
  if uir3307.exists():
   data=json.loads(uir3307.read_text());files.update(ROOT/ref for ref in data['sourceReferences']+[r['before']for r in data['files'].values()]+list(data['unchanged']))
  uir3306=ROOT/'art/redesign/uir33-06.json'
  if uir3306.exists():
   data=json.loads(uir3306.read_text());files.update(ROOT/ref for ref in data['sourceReferences']+[r['before']for r in data['files']]+[data['consumer']['path']]+list(data['unchanged']))
  uir3305=ROOT/'art/redesign/uir33-05.json'
  if uir3305.exists():
   data=json.loads(uir3305.read_text());files.update(ROOT/ref for ref in data['sourceReferences']+[data['before']['path']])
  uir3304=ROOT/'art/redesign/uir33-04.json'
  if uir3304.exists():files.update(ROOT/ref for ref in json.loads(uir3304.read_text())['sourceReferences'])
  uir3302=ROOT/'art/redesign/uir33-02.json'
  if uir3302.exists():files.update(ROOT/ref for ref in json.loads(uir3302.read_text())['sourceReferences'])
  uir3301=ROOT/'art/redesign/uir33-01.json'
  if uir3301.exists():files.update(ROOT/ref for ref in json.loads(uir3301.read_text())['sourceReferences'])
  check95=ROOT/'art/redesign/check-ux31-33.json'
  if check95.exists():files.update(ROOT/ref for ref in json.loads(check95.read_text())['sourceReferences'])
  ux33=ROOT/'art/redesign/ux33.json'
  if ux33.exists():files.update(ROOT/ref for ref in json.loads(ux33.read_text())['sourceReferences'])
  ux32=ROOT/'art/redesign/ux32.json'
  if ux32.exists():files.update(ROOT/ref for ref in json.loads(ux32.read_text())['sourceReferences'])
  ux31=ROOT/'art/redesign/ux31.json'
  if ux31.exists():files.update(ROOT/ref for ref in json.loads(ux31.read_text())['sourceReferences'])
  ux30=ROOT/'art/redesign/ux30.json'
  if ux30.exists():files.update(ROOT/ref for ref in json.loads(ux30.read_text())['sourceReferences'])
  art37=ROOT/'art/redesign/art37.json'
  if art37.exists():
   current=json.loads(art37.read_text());files.update(ROOT/ref for ref in current['sourceReferences']);files.update(ROOT/r['consumer']for r in current.get('testBaselines',[]))
  for f in files:
   out=self.root/f.relative_to(ROOT);out.parent.mkdir(parents=True,exist_ok=True);os.link(f,out)
  self.write('art/asset-manifest.json',self.manifest)
 def tearDown(self):self.temp.cleanup()
 def test_game_menu_manifest_is_required(self):
  (self.root/'art/redesign/game-menu-matrix.json').unlink();self.rejected()
 def test_game_menu_budgets_are_not_expandable(self):
  path='art/redesign/game-menu-matrix.json';data=json.loads((self.root/path).read_text())
  for key in ['maxNativeBytes','maxStylesheetBytes']:
   altered=copy.deepcopy(data);altered[key]+=1;self.write(path,altered);self.rejected()
 def test_game_menu_source_hash_is_bound(self):
  path='art/redesign/game-menu-matrix.json';data=json.loads((self.root/path).read_text());data['files'][0]['sha256']='0'*64;self.write(path,data);self.rejected()
 def test_game_menu_actual_stylesheet_budget_is_enforced_with_an_updated_hash(self):
  path='art/redesign/game-menu-matrix.json';data=json.loads((self.root/path).read_text());css=self.root/'web/src/game-menus.css';raw=css.read_bytes()+b'\n'*6001;css.unlink();css.write_bytes(raw)
  row=data['files'][1];row['bytes']=len(raw);row['sha256']=hashlib.sha256(raw).hexdigest();self.write(path,data);self.rejected()
 def test_game_menu_style_must_be_consumed(self):
  path=self.root/'web/src/main.ts';text=path.read_text();path.unlink();path.write_text(text.replace("import './game-menus.css'",''));self.rejected()
 def test_game_menu_machine_checks_do_not_claim_user_acceptance(self):
  path='art/redesign/game-menu-matrix.json';data=json.loads((self.root/path).read_text());data['userAcceptance']=True;self.write(path,data);self.rejected()
 def test_game_menu_contract_is_required(self):
  path='art/redesign/game-menu-matrix.json';data=json.loads((self.root/path).read_text());data['sourceReferences']=[];self.write(path,data);self.rejected()
 def test_game_menu_actual_bindings_cannot_be_omitted(self):
  path='art/redesign/game-menu-matrix.json';data=json.loads((self.root/path).read_text());data['bindings']={};self.write(path,data);self.rejected()
 def test_stage_manifest_is_required(self):
  (self.root/'art/redesign/stage-r1.json').unlink();self.rejected()
 def test_stage_budget_is_not_expandable(self):
  p='art/redesign/stage-r1.json';d=json.loads((self.root/p).read_text());d['maxNativeBytes']=18001;self.write(p,d);self.rejected()
 def test_stage_hash_is_bound(self):
  p='art/redesign/stage-r1.json';d=json.loads((self.root/p).read_text());d['files'][0]['sha256']='0'*64;self.write(p,d);self.rejected()
 def test_stage_machine_check_is_not_player_acceptance(self):
  p='art/redesign/stage-r1.json';d=json.loads((self.root/p).read_text());d['userAcceptance']=True;self.write(p,d);self.rejected()
 def test_r2_manifest_is_required(self):
  (self.root/'art/redesign/stage-r2.json').unlink();self.rejected()
 def test_r2_budget_is_not_expandable(self):
  p='art/redesign/stage-r2.json';d=json.loads((self.root/p).read_text());d['maxNativeBytes']=14001;self.write(p,d);self.rejected()
 def test_r2_hash_is_bound(self):
  p='art/redesign/stage-r2.json';d=json.loads((self.root/p).read_text());d['files'][0]['sha256']='0'*64;self.write(p,d);self.rejected()
 def test_r2_machine_check_is_not_player_acceptance(self):
  p='art/redesign/stage-r2.json';d=json.loads((self.root/p).read_text());d['userAcceptance']=True;self.write(p,d);self.rejected()
 def test_r3_manifest_is_required(self):
  (self.root/'art/redesign/stage-r3.json').unlink();self.rejected()
 def test_r3_budget_is_not_expandable(self):
  p='art/redesign/stage-r3.json';d=json.loads((self.root/p).read_text());d['maxNativeBytes']=18001;self.write(p,d);self.rejected()
 def test_r3_hash_is_bound(self):
  p='art/redesign/stage-r3.json';d=json.loads((self.root/p).read_text());d['files'][0]['sha256']='0'*64;self.write(p,d);self.rejected()
 def test_r3_machine_check_is_not_player_acceptance(self):
  p='art/redesign/stage-r3.json';d=json.loads((self.root/p).read_text());d['userAcceptance']=True;self.write(p,d);self.rejected()
 def test_r4_manifest_is_required(self):
  (self.root/'art/redesign/stage-r4.json').unlink();self.rejected()
 def test_tradeoff_manifest_is_required(self):
  (self.root/'art/redesign/idle-tradeoffs.json').unlink();self.rejected()
 def test_tradeoff_budget_is_not_expandable(self):
  p='art/redesign/idle-tradeoffs.json';d=json.loads((self.root/p).read_text());d['maxNativeBytes']=30001;self.write(p,d);self.rejected()
 def test_tradeoff_hash_is_bound(self):
  p='art/redesign/idle-tradeoffs.json';d=json.loads((self.root/p).read_text());d['files'][0]['sha256']='0'*64;self.write(p,d);self.rejected()
 def test_tradeoff_machine_check_is_not_player_acceptance(self):
  p='art/redesign/idle-tradeoffs.json';d=json.loads((self.root/p).read_text());d['userAcceptance']=True;self.write(p,d);self.rejected()
 def test_tradeoff_core_stays_in_budget(self):
  p='art/redesign/idle-tradeoffs.json';d=json.loads((self.root/p).read_text());d['files']=d['files'][1:];self.write(p,d);self.rejected()
 def test_r4_budget_is_not_expandable(self):
  p='art/redesign/stage-r4.json';d=json.loads((self.root/p).read_text());d['maxNativeBytes']=14001;self.write(p,d);self.rejected()
 def test_r4_hash_is_bound(self):
  p='art/redesign/stage-r4.json';d=json.loads((self.root/p).read_text());d['files'][0]['sha256']='0'*64;self.write(p,d);self.rejected()
 def test_r4_machine_check_is_not_player_acceptance(self):
  p='art/redesign/stage-r4.json';d=json.loads((self.root/p).read_text());d['userAcceptance']=True;self.write(p,d);self.rejected()
 def test_reading_memory_stays_in_original_story_budget(self):
  p='art/redesign/story-journey.json';d=json.loads((self.root/p).read_text());d['files']=[r for r in d['files'] if r['path']!='web/src/reading-memory.ts'];self.write(p,d);self.rejected()
 def test_visit_route_code_stays_in_stage_budget(self):
  p='art/redesign/stage-r4.json';d=json.loads((self.root/p).read_text());d['files']=[r for r in d['files'] if r['path']!='web/src/navigation.ts'];self.write(p,d);self.rejected()
 def write(self,path,value):
  p=self.root/path;p.parent.mkdir(parents=True,exist_ok=True)
  if p.exists():p.unlink()
  p.write_text(json.dumps(value,ensure_ascii=False) if not isinstance(value,str) else value)
 def asset(self,id):return next(x for x in self.manifest['assets'] if x['id']==id)
 def rejected(self):
  self.write('art/asset-manifest.json',self.manifest)
  with self.assertRaises((AssertionError,KeyError,ValueError)):validate(self.root)
 def test_current_inventory_is_consistent(self):
  result=validate(self.root);self.assertEqual(result['legacyProductionAssets'],20)
  self.assertEqual(result['productionAssets'],(38 if (self.root/'art/redesign/manifest.json').exists() else 20)+(30 if (self.root/'art/redesign/character-battle-manifest.json').exists() else 0)+(2 if (self.root/'art/redesign/desktop-ui-manifest.json').exists() else 0)+(4 if (self.root/'art/redesign/panel-materials.json').exists() else 0)+(3 if (self.root/'art/redesign/catalogue-art/manifest.json').exists() else 0)+(1 if (self.root/'art/redesign/alchemy-workshop.json').exists() else 0)+(4 if (self.root/'art/redesign/art03.json').exists() else 0)+(1 if (self.root/'art/redesign/cultivation-objects.json').exists() else 0)+(1 if (self.root/'art/redesign/ta07.json').exists() else 0)+(6 if (self.root/'art/redesign/ta08.json').exists() else 0)+(4 if (self.root/'art/redesign/art10.json').exists() else 0)+(14 if (self.root/'art/redesign/art11.json').exists() else 0)+(2 if (self.root/'art/redesign/art16.json').exists() else 0)+(1 if (self.root/'art/redesign/art24.json').exists() else 0)+(1 if (self.root/'art/redesign/art26.json').exists() else 0)+(1 if (self.root/'art/redesign/art27.json').exists() else 0)+(1 if (self.root/'art/redesign/art28.json').exists() else 0)+(1 if (self.root/'art/redesign/art29.json').exists() else 0)+(1 if (self.root/'art/redesign/art30.json').exists() else 0)+(1 if (self.root/'art/redesign/art31.json').exists() else 0)+(2 if (self.root/'art/redesign/art32.json').exists() else 0)+(2 if (self.root/'art/redesign/art33.json').exists() else 0)+(8 if (self.root/'art/redesign/art35.json').exists() else 0)+(2 if(self.root/'art/redesign/art37.json').exists()else 0))
 def test_idle_ui_requires_its_source_ledger(self):
  (self.root/'art/redesign/idle-cultivation.json').unlink();self.rejected()
 def test_idle_ui_budget_cannot_be_raised(self):
  p='art/redesign/idle-cultivation.json';d=json.loads((self.root/p).read_text());d['maxNativeBytes']=22001;self.write(p,d);self.rejected()
 def test_idle_ui_cannot_claim_player_acceptance(self):
  p='art/redesign/idle-cultivation.json';d=json.loads((self.root/p).read_text());d['userAcceptance']=True;self.write(p,d);self.rejected()
 def test_idle_ui_hash_and_real_consumer_are_required(self):
  self.write('web/src/idle-activity.css','');self.rejected()
 def test_source_ui_requires_recorded_budget(self):
  (self.root/'art/redesign/idle-sources.json').unlink();self.rejected()
 def test_source_ui_budget_stays_bounded(self):
  p='art/redesign/idle-sources.json';d=json.loads((self.root/p).read_text());d['maxNativeBytes']=24001;self.write(p,d);self.rejected()
 def test_source_ui_rejects_changed_runtime(self):
  self.write('web/src/SourcePlanner.vue','');self.rejected()
 def test_source_ui_requires_live_consumer(self):
  p='web/src/ExplorePanel.vue';self.write(p,(self.root/p).read_text().replace('<SourcePlanner ','<RemovedPlanner '));self.rejected()
 def test_production_ui_requires_ledger(self):
  (self.root/'art/redesign/idle-production.json').unlink();self.rejected()
 def test_production_ui_cannot_expand_cap(self):
  p='art/redesign/idle-production.json';d=json.loads((self.root/p).read_text());d['maxNativeBytes']=26001;self.write(p,d);self.rejected()
 def test_production_ui_rejects_modified_sources(self):
  self.write('web/src/ProductionPlanner.vue','');self.rejected()
 def test_production_ui_requires_actual_consumer(self):
  p='web/src/GoodsPanel.vue';self.write(p,(self.root/p).read_text().replace('<ProductionPlanner ','<RemovedPlanner '));self.rejected()
 def test_preparation_requires_ledger(self):
  (self.root/'art/redesign/idle-preparation.json').unlink();self.rejected()
 def test_preparation_cap_cannot_expand(self):
  p='art/redesign/idle-preparation.json';d=json.loads((self.root/p).read_text());d['maxNativeBytes']=60001;self.write(p,d);self.rejected()
 def test_preparation_source_identity(self):
  self.write('web/src/MarketPlanner.vue','');self.rejected()
 def test_preparation_requires_real_consumer(self):
  p='web/src/App.vue';self.write(p,(self.root/p).read_text().replace('<ConfigurationDialog ','<RemovedDialog '));self.rejected()
 def test_preparation_cannot_claim_user_acceptance(self):
  p='art/redesign/idle-preparation.json';d=json.loads((self.root/p).read_text());d['userAcceptance']=True;self.write(p,d);self.rejected()
 def test_digest_corruption_is_rejected(self):self.asset('scene-secret')['sha256']='0'*64;self.rejected()
 def test_false_dimensions_are_rejected(self):self.asset('portrait-player')['dimensions']['width']=999;self.rejected()
 def test_parent_hash_cannot_be_relabelled(self):self.asset('scene-wilderness')['originalHash']='0'*64;self.rejected()
 def test_missing_parent_is_rejected(self):self.asset('portrait-lu')['parentId']='unknown';self.rejected()
 def test_rights_cannot_be_inferred_from_file_presence(self):self.asset('portrait-shen')['rights']['productionUseApproved']=False;self.rejected()
 def test_receipt_cannot_describe_a_different_original(self):
  p=self.asset('portrait-player-master')['generationReceipt'];r=json.loads((self.root/p).read_text());r['sourceSHA256']='0'*64;self.write(p,r);self.rejected()
 def test_unregistered_images_are_rejected(self):
  p=self.root/'web/public/art/unregistered.png';p.write_bytes((ROOT/'art/production/scenes/wilderness.png').read_bytes());self.rejected()
 def test_fonts_are_rejected(self):self.write('art/production/unlicensed.woff','font');self.rejected()
 def test_added_scene_slot_is_rejected(self):
  a=copy.deepcopy(self.asset('scene-wilderness'));a.update(id='scene-fifth',status='planned',availability='not_produced');
  for key in ['exportedPath','dimensions','bytes','sha256','format','alpha','originalHash']:a[key]=None
  self.manifest['assets'].append(a);self.rejected()
 def test_ui_script_is_rejected_even_with_updated_digest(self):
  a=self.asset('native-ui-kit');p=a['exportedPath'];text=(self.root/p).read_text().replace('</svg>','<script>bad()</script></svg>');self.write(p,text);a.update(bytes=len(text.encode()),sha256=hashlib.sha256(text.encode()).hexdigest());self.rejected()
 def test_ui_byte_budget_is_independent_of_the_claimed_hash(self):
  a=self.asset('native-ui-kit');p=a['exportedPath'];text=(self.root/p).read_text()+' '*80000;self.write(p,text);a.update(bytes=len(text.encode()),sha256=hashlib.sha256(text.encode()).hexdigest());self.rejected()
 def test_master_original_hash_is_not_a_claimed_other_source(self):self.asset('scene-wilderness-master')['originalHash']='0'*64;self.rejected()
 def test_derivative_cannot_use_another_person_as_its_parent(self):
  a=self.asset('portrait-shen');a['parentId']='portrait-lu-master';a['originalHash']=self.asset('portrait-lu-master')['sha256'];self.rejected()
 def test_source_receipt_must_identify_the_actual_derivative(self):
  p=self.asset('scene-secret-master')['generationReceipt'];r=json.loads((self.root/p).read_text());r['runtimeSHA256']='0'*64;self.write(p,r);self.rejected()
 def test_edit_input_declaration_is_bound_to_the_actual_receipt(self):self.asset('scene-terrace-master')['inputAssets'][0]['sha256']='0'*64;self.rejected()
 def test_native_code_digest_is_bound_to_the_kit(self):self.asset('native-ui-kit')['codeComponents'][0]['sha256']='0'*64;self.rejected()
 def test_four_fx_groups_cannot_be_silently_expanded(self):self.asset('native-fx-kit')['bindings']['groups'].append('额外');self.rejected()
 def current_redesign(self):return json.loads((self.root/'art/redesign/manifest.json').read_text())
 def check_redesign(self,m):
  from redesign_inventory import validate_redesign
  from check_inventory import image_info
  self.write('art/redesign/manifest.json',m)
  with self.assertRaises((AssertionError,KeyError,ValueError)):validate_redesign(self.root,image_info)
 def test_redesign_cannot_duplicate_or_omit_a_current_scene(self):
  m=self.current_redesign();m['scenes'][-1]['id']='cave';self.check_redesign(m)
 def test_redesign_cannot_claim_a_different_source_hash(self):
  m=self.current_redesign();m['scenes'][0]['source']['sha256']='0'*64;self.check_redesign(m)
 def test_redesign_rights_cannot_be_inferred_from_image_presence(self):
  m=self.current_redesign();m['rights']['productionUseApproved']=False;self.check_redesign(m)
 def test_redesign_cannot_claim_human_acceptance(self):
  m=self.current_redesign();m['rights']['userAcceptance']=True;self.check_redesign(m)
 def test_redesign_budget_cannot_be_silently_raised(self):
  m=self.current_redesign();m['budgets']['maxSceneBytes']=600000;self.check_redesign(m)
 def test_redesign_phase_variant_cannot_use_an_unrelated_master(self):
  m=self.current_redesign();m['stageVariants'][0]['sourceParentSHA256']='0'*64;self.check_redesign(m)
 def test_redesign_receipt_source_binding_survives_control_hash_recalculation(self):
  m=self.current_redesign();s=m['scenes'][0];r=s['receipt'];data=json.loads((self.root/r['path']).read_text());data['sourceSHA256']='0'*64;self.write(r['path'],data);r['sha256']=hashlib.sha256((self.root/r['path']).read_bytes()).hexdigest();self.check_redesign(m)
 def test_redesign_binding_must_include_every_runtime_scene(self):
  m=self.current_redesign();file=m['bindingFile'];text=(self.root/file).read_text().replace('art/v2/scenes/cave.webp','art/v2/scenes/wrong.webp');self.write(file,text);self.check_redesign(m)
 def test_removing_new_ledger_does_not_allow_unregistered_new_images(self):
  (self.root/'art/redesign/manifest.json').unlink();self.rejected()

 def current_character_battle(self):return json.loads((self.root/'art/redesign/character-battle-manifest.json').read_text())
 def reject_character_battle(self,m):
  from character_battle_inventory import validate_character_battle
  from check_inventory import image_info
  self.write('art/redesign/character-battle-manifest.json',m)
  with self.assertRaises((AssertionError,KeyError,ValueError)):validate_character_battle(self.root,image_info)
 def test_character_enemy_cannot_duplicate_a_subject(self):
  m=self.current_character_battle();m['enemies'][1]['id']='wolf';self.reject_character_battle(m)
 def test_character_enemy_source_hash_is_bound(self):
  m=self.current_character_battle();m['characters'][0]['source']['sha256']='0'*64;self.reject_character_battle(m)
 def test_character_enemy_alpha_header_is_required(self):
  m=self.current_character_battle();m['enemies'][0]['runtime']['alpha']=False;self.reject_character_battle(m)
 def test_character_enemy_budget_cannot_be_raised(self):
  m=self.current_character_battle();m['budgets']['maxEnemyBytes']=130000;self.reject_character_battle(m)
 def test_character_enemy_cannot_claim_user_acceptance(self):
  m=self.current_character_battle();m['rights']['userAcceptance']=True;self.reject_character_battle(m)
 def test_character_receipt_cannot_swap_identity_even_if_control_hash_recalculated(self):
  m=self.current_character_battle();s=m['characters'][0];r=s['receipt'];data=json.loads((self.root/r['path']).read_text());data['referenceImages'][0]['path']='art/production/portraits/shen.png';data['referenceImages'][0]['sha256']=hashlib.sha256((self.root/data['referenceImages'][0]['path']).read_bytes()).hexdigest();self.write(r['path'],data);r['sha256']=hashlib.sha256((self.root/r['path']).read_bytes()).hexdigest();self.reject_character_battle(m)
 def test_enemy_receipt_cannot_claim_opaque_background_as_alpha(self):
  m=self.current_character_battle();r=m['enemies'][0]['receipt'];data=json.loads((self.root/r['path']).read_text());data['alphaProof']['min']=255;self.write(r['path'],data);r['sha256']=hashlib.sha256((self.root/r['path']).read_bytes()).hexdigest();self.reject_character_battle(m)
 def test_enemy_binding_cannot_be_silently_removed(self):
  m=self.current_character_battle();file=m['bindingFile'];self.write(file,(self.root/file).read_text().replace('art/v2/enemies/wolf.webp','art/v2/enemies/absent.webp'));self.reject_character_battle(m)
 def test_removing_character_enemy_ledger_does_not_bypass_guard(self):
  (self.root/'art/redesign/character-battle-manifest.json').unlink();self.rejected()

 def test_meditation_variant_cannot_change_its_cave_parent(self):
  m=self.current_character_battle();m['presentationVariants'][0]['sourceParentSHA256']='0'*64;self.reject_character_battle(m)
 def test_meditation_variant_cannot_claim_a_transparent_runtime(self):
  m=self.current_character_battle();m['presentationVariants'][0]['runtime']['alpha']=True;self.reject_character_battle(m)

 def current_desktop_ui(self):return json.loads((self.root/'art/redesign/desktop-ui-manifest.json').read_text())
 def reject_desktop_ui(self,m):
  from desktop_ui_inventory import validate_desktop_ui
  from check_inventory import image_info
  self.write('art/redesign/desktop-ui-manifest.json',m)
  with self.assertRaises((AssertionError,KeyError,ValueError)):validate_desktop_ui(self.root,image_info)
 def test_desktop_ui_original_hash_is_bound(self):
  m=self.current_desktop_ui();m['assets'][0]['source']['sha256']='0'*64;self.reject_desktop_ui(m)
 def test_desktop_ui_alpha_cannot_be_invented(self):
  m=self.current_desktop_ui();m['assets'][0]['runtime']['alpha']=False;self.reject_desktop_ui(m)
 def test_desktop_ui_budget_cannot_be_raised(self):
  m=self.current_desktop_ui();m['budgets']['maxRuntimeBytes']=200000;self.reject_desktop_ui(m)
 def test_desktop_ui_cannot_claim_user_acceptance(self):
  m=self.current_desktop_ui();m['rights']['userAcceptance']=True;self.reject_desktop_ui(m)
 def test_desktop_ui_cannot_swap_player_reference_after_receipt_rehash(self):
  m=self.current_desktop_ui();r=m['assets'][0]['receipt'];data=json.loads((self.root/r['path']).read_text());data['referenceImages'][0]['path']='art/redesign/characters/shen-v1.png';data['referenceImages'][0]['sha256']=hashlib.sha256((self.root/data['referenceImages'][0]['path']).read_bytes()).hexdigest();self.write(r['path'],data);r['sha256']=hashlib.sha256((self.root/r['path']).read_bytes()).hexdigest();self.reject_desktop_ui(m)
 def test_removing_desktop_ui_ledger_does_not_bypass_guard(self):
  (self.root/'art/redesign/desktop-ui-manifest.json').unlink();self.rejected()

 def test_game_stage_cannot_silently_change_bytes(self):
  self.write('web/src/game-hub.css','body{display:none}')
  self.rejected()
 def test_game_stage_cannot_disappear_from_inventory(self):
  (self.root/'art/redesign/single-screen-native.json').unlink()
  self.rejected()
 def test_game_stage_budget_cannot_be_raised(self):
  path='art/redesign/single-screen-native.json';m=json.loads((self.root/path).read_text());m['maxBytes']=20000;self.write(path,m)
  self.rejected()

 def test_paper_material_cannot_silently_change_pixels(self):
  self.write('web/public/art/v2/ui/xuan-paper-v2.webp','invalid')
  self.rejected()
 def test_paper_material_cannot_drop_ledger(self):
  (self.root/'art/redesign/panel-materials.json').unlink()
  self.rejected()
 def test_paper_material_cannot_raise_budget_or_claim_acceptance(self):
  p='art/redesign/panel-materials.json';original=json.loads((self.root/p).read_text())
  for field in ['budget','acceptance']:
   m=copy.deepcopy(original)
   if field=='budget':m['budgets']['maxRuntimeBytes']=300000
   else:m['rights']['userAcceptance']=True
   self.write(p,m);self.rejected()
 def test_paper_material_cannot_invent_transparency_after_receipt_rehash(self):
  p='art/redesign/panel-materials.json';m=json.loads((self.root/p).read_text());ref=m['assets'][1]['receipt'];r=json.loads((self.root/ref['path']).read_text());r['alphaProof']['min']=255;self.write(ref['path'],r);ref['sha256']=hashlib.sha256((self.root/ref['path']).read_bytes()).hexdigest();self.write(p,m);self.rejected()
 def test_paper_styles_cannot_change_without_identity_update(self):
  self.write('web/src/panel-materials.css','body{display:none}')
  self.rejected()

 def test_global_theme_cannot_drop_its_record(self):
  (self.root/'art/redesign/immersive-ui.json').unlink();self.rejected()
 def test_global_theme_cannot_change_feedback_source_silently(self):
  self.write('web/src/ProgressTrack.vue','<template>wrong</template>');self.rejected()
 def test_global_theme_cannot_raise_budget(self):
  p='art/redesign/immersive-ui.json';m=json.loads((self.root/p).read_text());m['maxBytes']=30000;self.write(p,m);self.rejected()
 def test_global_theme_cannot_remove_its_actual_consumer(self):
  p='web/src/main.ts';self.write(p,(self.root/p).read_text().replace("import './immersive-theme.css';",''));self.rejected()
 def test_global_theme_cannot_claim_user_acceptance(self):
  p='art/redesign/immersive-ui.json';m=json.loads((self.root/p).read_text());m['userAcceptance']=True;self.write(p,m);self.rejected()

 def test_action_motion_cannot_drop_source_record(self):
  (self.root/'art/redesign/action-feedback.json').unlink();self.rejected()
 def test_action_motion_cannot_change_consumer_silently(self):
  self.write('web/src/ActionFeedbackStage.vue','<template>wrong</template>');self.rejected()
 def test_action_motion_cannot_raise_particle_or_byte_budgets(self):
  p='art/redesign/action-feedback.json';original=json.loads((self.root/p).read_text())
  for field in ['maxBytes','maxParticles','maxDurationMs']:
   m=copy.deepcopy(original);m[field]+=1;self.write(p,m);self.rejected()
 def test_action_motion_cannot_hide_an_old_major_family(self):
  p='art/redesign/action-feedback.json';m=json.loads((self.root/p).read_text());m['oldFxFamiliesPreserved'].pop();self.write(p,m);self.rejected()
 def test_action_motion_cannot_claim_user_acceptance(self):
  p='art/redesign/action-feedback.json';m=json.loads((self.root/p).read_text());m['userAcceptance']=True;self.write(p,m);self.rejected()

 def test_playable_flow_cannot_drop_its_ledger(self):
  (self.root/'art/redesign/playable-flow.json').unlink();self.rejected()
 def test_playable_flow_cannot_change_clock_silently(self):
  self.write('web/src/action-timing.ts','wrong');self.rejected()
 def test_playable_flow_cannot_raise_budgets(self):
  p='art/redesign/playable-flow.json';original=json.loads((self.root/p).read_text())
  for field in ['maxNewBytes','maxActionMs','maxPageCards']:
   m=copy.deepcopy(original);m[field]+=1;self.write(p,m);self.rejected()
 def test_playable_flow_cannot_claim_user_acceptance(self):
  p='art/redesign/playable-flow.json';m=json.loads((self.root/p).read_text());m['userAcceptance']=True;self.write(p,m);self.rejected()
 def test_playable_flow_cannot_remove_actual_consumer(self):
  p='web/src/App.vue';self.write(p,(self.root/p).read_text().replace('<ExplorePanel ','<RemovedPanel '));self.rejected()

 def test_story_cannot_drop_ledger(self):
  (self.root/'art/redesign/story-journey.json').unlink();self.rejected()
 def test_story_cannot_change_text_pages_silently(self):
  self.write('web/src/story-pages.ts','wrong');self.rejected()
 def test_story_cannot_raise_budgets(self):
  p='art/redesign/story-journey.json';original=json.loads((self.root/p).read_text())
  for field in ['maxNewBytes','maxRowsPerPage']:
   m=copy.deepcopy(original);m[field]+=1;self.write(p,m);self.rejected()
 def test_story_cannot_claim_user_acceptance(self):
  p='art/redesign/story-journey.json';m=json.loads((self.root/p).read_text());m['userAcceptance']=True;self.write(p,m);self.rejected()
 def test_story_cannot_drop_real_consumer(self):
  p='web/src/App.vue';self.write(p,(self.root/p).read_text().replace('<LifeCatalogue ','<Removed '));self.rejected()

 def test_catalogue_art_requires_its_ledger(self):
  (self.root/'art/redesign/catalogue-art/manifest.json').unlink();self.rejected()
 def test_catalogue_art_source_is_bound(self):
  p='art/redesign/catalogue-art/manifest.json';m=json.loads((self.root/p).read_text());m['assets'][0]['source']['sha256']='0'*64;self.write(p,m);self.rejected()
 def test_catalogue_art_budget_cannot_be_raised(self):
  p='art/redesign/catalogue-art/manifest.json';original=json.loads((self.root/p).read_text())
  for key in ['maxRuntimeBytesPerAsset','maxRuntimeBytes','maxNativeBytes']:
   m=copy.deepcopy(original);m['budgets'][key]+=1;self.write(p,m);self.rejected()
 def test_catalogue_art_cannot_claim_user_acceptance(self):
  p='art/redesign/catalogue-art/manifest.json';m=json.loads((self.root/p).read_text());m['rights']['userAcceptance']=True;self.write(p,m);self.rejected()
 def test_catalogue_art_prompt_cannot_be_relabelled(self):
  p='art/redesign/catalogue-art/prompts.json';m=json.loads((self.root/p).read_text());m['assets'][0]['prompt']='other request';self.write(p,m);self.rejected()
 def test_catalogue_art_needs_actual_consumers(self):
  p='web/src/ProgressionChoices.vue';self.write(p,(self.root/p).read_text().replace('<CatalogueArt ','<RemovedArt '));self.rejected()
 def test_catalogue_art_receipt_must_match_runtime(self):
  p='art/redesign/catalogue-art/manifest.json';m=json.loads((self.root/p).read_text());a=m['assets'][0];ref=a['receipt']['path'];r=json.loads((self.root/ref).read_text());r['runtime']['sha256']='0'*64;self.write(ref,r);a['receipt']['sha256']=hashlib.sha256((self.root/ref).read_bytes()).hexdigest();self.write(p,m);self.rejected()

 def test_adventure_ui_requires_ledger(self):
  (self.root/'art/redesign/idle-adventure.json').unlink();self.rejected()
 def test_adventure_ui_binds_source_and_consumer(self):
  self.write('web/src/AdventurePlanner.vue','wrong');self.rejected()
 def test_adventure_ui_cannot_raise_budget(self):
  p='art/redesign/idle-adventure.json';m=json.loads((self.root/p).read_text());m['maxNativeBytes']+=1;self.write(p,m);self.rejected()
 def test_adventure_ui_cannot_claim_player_acceptance(self):
  p='art/redesign/idle-adventure.json';m=json.loads((self.root/p).read_text());m['userAcceptance']=True;self.write(p,m);self.rejected()

 def test_milestone_ui_requires_ledger(self):
  (self.root/'art/redesign/idle-milestones.json').unlink();self.rejected()
 def test_milestone_ui_binds_source(self):
  self.write('web/src/MilestoneReview.vue','wrong');self.rejected()
 def test_milestone_ui_cannot_raise_budget(self):
  p='art/redesign/idle-milestones.json';m=json.loads((self.root/p).read_text());m['maxNativeBytes']+=1;self.write(p,m);self.rejected()
 def test_milestone_ui_cannot_claim_player_acceptance(self):
  p='art/redesign/idle-milestones.json';m=json.loads((self.root/p).read_text());m['userAcceptance']=True;self.write(p,m);self.rejected()

 def test_local_loading_requires_ledger(self):
  (self.root/'art/redesign/local-loading.json').unlink();self.rejected()
 def test_local_loading_keeps_its_budget(self):
  p='art/redesign/local-loading.json';m=json.loads((self.root/p).read_text());m['maxNativeBytes']+=1;self.write(p,m);self.rejected()
 def test_local_loading_needs_actual_consumer(self):
  p='web/src/main.ts';self.write(p,(self.root/p).read_text().replace("import './local-loading.css';",''));self.rejected()
 def test_local_loading_keeps_source_identity(self):
  self.write('web/src/local-initialization.ts','unreviewed replacement');self.rejected()
 def test_local_loading_cannot_claim_player_acceptance(self):
  p='art/redesign/local-loading.json';m=json.loads((self.root/p).read_text());m['userAcceptance']=True;self.write(p,m);self.rejected()

 def test_activity_history_requires_ledger(self):
  (self.root/'art/redesign/activity-history.json').unlink();self.rejected()
 def test_activity_history_budget_remains_fixed(self):
  p='art/redesign/activity-history.json';m=json.loads((self.root/p).read_text());m['maxNativeBytes']+=1;self.write(p,m);self.rejected()
 def test_activity_history_hash_is_bound(self):
  self.write('web/src/ActivityHistory.vue','wrong source');self.rejected()
 def test_activity_history_cannot_claim_player_acceptance(self):
  p='art/redesign/activity-history.json';m=json.loads((self.root/p).read_text());m['userAcceptance']=True;self.write(p,m);self.rejected()

 def objects(self):return json.loads((self.root/'art/redesign/art02.json').read_text())
 def reject_objects(self,manifest):
  self.write('art/redesign/art02.json',manifest)
  with self.assertRaises((AssertionError,KeyError,ValueError)):validate_adventure_objects(self.root)
 def test_adventure_objects_record_the_nine_bounded_files(self):
  m=self.objects();self.assertEqual([r['path'] for r in m['files']],ART02_NATIVE);self.assertGreater(validate_adventure_objects(self.root),0);self.assertLessEqual(validate_adventure_objects(self.root),45000)
 def test_adventure_objects_ledger_is_required(self):
  (self.root/'art/redesign/art02.json').unlink()
  with self.assertRaises(AssertionError):validate_adventure_objects(self.root)
 def test_adventure_objects_native_budget_cannot_increase(self):
  m=self.objects();m['maxNativeBytes']=45001;self.reject_objects(m)
 def test_adventure_objects_bitmap_budget_cannot_increase(self):
  m=self.objects();m['maxNewRasterAssets']=1;self.reject_objects(m)
 def test_adventure_objects_cannot_add_an_unreviewed_bitmap(self):
  m=self.objects();m['assets']=[{'path':'web/public/new.webp'}];self.reject_objects(m)
 def test_adventure_objects_cannot_claim_user_acceptance(self):
  m=self.objects();m['userAcceptance']=True;self.reject_objects(m)
 def test_adventure_objects_hash_is_required(self):
  m=self.objects();m['files'][0]['sha256']='0'*64;self.reject_objects(m)
 def test_adventure_objects_size_is_bound(self):
  m=self.objects();m['files'][0]['bytes']+=1;self.reject_objects(m)
 def test_adventure_objects_migrated_proof_still_counts_in_budget(self):
  m=self.objects();m['files']=[r for r in m['files'] if r['path']!='web/src/activity-effects.ts'];self.reject_objects(m)
 def test_adventure_objects_cannot_substitute_an_external_file(self):
  m=self.objects();m['files'][0]['path']='../outside.vue';self.reject_objects(m)
 def test_adventure_objects_required_consumer_cannot_be_omitted(self):
  m=self.objects();del m['bindings']['web/src/SourcePlanner.vue'];self.reject_objects(m)
 def test_adventure_objects_cannot_weaken_a_required_binding(self):
  m=self.objects();m['bindings']['web/src/SourceField.vue']=['use-activity-effect'];self.reject_objects(m)
 def test_adventure_objects_actual_binding_must_exist(self):
  m=self.objects();m['bindings']['web/src/SourceField.vue'].append('never-existing-production-consumer');self.reject_objects(m)
 def test_adventure_objects_contract_cannot_be_omitted(self):
  m=self.objects();m['sourceReferences'].remove('docs/decisions/0023-adventure-object-art-contract.md');self.reject_objects(m)
 def test_adventure_objects_raw_input_cannot_be_omitted(self):
  m=self.objects();m['sourceReferences'].remove('goal-4/amendments/2026-10-23-art02.md');self.reject_objects(m)
 def test_adventure_objects_source_references_cannot_escape_workspace(self):
  m=self.objects();m['sourceReferences'].append('../outside.md');self.reject_objects(m)
 def test_adventure_objects_even_rehashed_overbudget_code_is_rejected(self):
  m=self.objects();row=m['files'][0];data=('x'*45001).encode();self.write(row['path'],data.decode());row['bytes']=len(data);row['sha256']=hashlib.sha256(data).hexdigest();self.reject_objects(m)

 def test_adventure_objects_battle_progress_real_consumer_cannot_be_removed(self):
  m=self.objects();m['bindings']['web/src/BattlePresence.vue']=['art02-battle.css'];self.reject_objects(m)
 def test_adventure_objects_immersive_battle_binding_follows_real_component(self):
  p='art/redesign/immersive-ui.json';m=json.loads((self.root/p).read_text());m['bindings']['web/src/BattlePanel.vue']=['BattlePresence'];self.write(p,m);self.rejected()

 def workshop(self):return json.loads((self.root/'art/redesign/alchemy-workshop.json').read_text())
 def reject_workshop(self,manifest):
  self.write('art/redesign/alchemy-workshop.json',manifest)
  with self.assertRaises((AssertionError,KeyError,ValueError)):validate_alchemy_workshop(self.root)
 def workshop_receipt(self,manifest,change):
  ref=manifest['assets'][0]['receipt'];receipt=json.loads((self.root/ref['path']).read_text());change(receipt);self.write(ref['path'],receipt);ref['sha256']=hashlib.sha256((self.root/ref['path']).read_bytes()).hexdigest()
 def workshop_image(self,manifest,data):
  runtime=manifest['assets'][0]['runtime'];p=self.root/runtime['path'];p.unlink();p.write_bytes(data);runtime['bytes']=len(data);runtime['sha256']=hashlib.sha256(data).hexdigest()
  self.workshop_receipt(manifest,lambda receipt:receipt.update(runtime=copy.deepcopy(runtime)))
 def workshop_code(self,manifest,path,code):
  self.write(path,code)
  for row in manifest['files']:
   if row['path']==path:row.update(bytes=len(code.encode()),sha256=hashlib.sha256(code.encode()).hexdigest())
 def test_workshop_records_one_dormant_furnace_and_all_additive_code(self):
  files,production,total=validate_alchemy_workshop(self.root);self.assertEqual(production,1);self.assertEqual(len(files),2);self.assertGreater(total,0);self.assertLessEqual(total,22000)
 def test_workshop_manifest_cannot_be_removed(self):
  (self.root/'art/redesign/alchemy-workshop.json').unlink()
  with self.assertRaises(AssertionError):validate_alchemy_workshop(self.root)
 def test_workshop_budgets_and_asset_slot_are_not_expandable(self):
  original=self.workshop()
  for key in ['assets','maxRuntimeBytes','runtimeWidth','runtimeHeight','maxNativeBytes']:
   m=copy.deepcopy(original);m['budgets'][key]+=1;self.reject_workshop(m)
 def test_workshop_extra_asset_or_omitted_helper_is_not_outside_the_budget(self):
  m=self.workshop();m['assets'].append(copy.deepcopy(m['assets'][0]));self.reject_workshop(m)
  m=self.workshop();m['assets']=m['assets'][:1];m['files']=m['files'][:-1];self.reject_workshop(m)
 def test_workshop_cannot_claim_user_visual_acceptance(self):
  m=self.workshop();m['userAcceptance']=True;self.reject_workshop(m)
 def test_workshop_native_identity_cannot_silently_change(self):
  m=self.workshop();self.write(m['files'][0]['path'],'unrecorded workshop');self.reject_workshop(m)
 def test_workshop_actual_code_cap_survives_hash_recalculation(self):
  m=self.workshop();path=m['files'][0]['path'];self.workshop_code(m,path,(self.root/path).read_text()+' '*22001);self.reject_workshop(m)
 def test_workshop_original_hash_is_bound(self):
  m=self.workshop();m['assets'][0]['source']['sha256']='0'*64;self.reject_workshop(m)
 def test_workshop_pixel_bytes_cannot_change_behind_a_header(self):
  m=self.workshop();p=self.root/m['assets'][0]['runtime']['path'];data=bytearray(p.read_bytes());data[-1]^=1;p.unlink();p.write_bytes(data);self.reject_workshop(m)
 def test_workshop_opaque_runtime_cannot_be_claimed_transparent_after_rehash(self):
  m=self.workshop();runtime=m['assets'][0]['runtime'];data=bytearray((self.root/runtime['path']).read_bytes());self.assertEqual(data[12:16],b'VP8X');data[20]&=~16;runtime['alpha']=False;self.workshop_image(m,data);self.reject_workshop(m)
 def test_workshop_runtime_must_remain_exactly512_even_after_header_and_receipt_rehash(self):
  m=self.workshop();runtime=m['assets'][0]['runtime'];data=bytearray((self.root/runtime['path']).read_bytes());self.assertEqual(data[12:16],b'VP8X');data[24:27]=(512).to_bytes(3,'little');runtime['dimensions']['width']=513;self.workshop_image(m,data);self.reject_workshop(m)
 def test_workshop_actual_image_bytes_cannot_exceed_cap_after_rehash(self):
  m=self.workshop();runtime=m['assets'][0]['runtime'];data=bytearray((self.root/runtime['path']).read_bytes());data.extend(b'\0'*(160001-len(data)));data[4:8]=(len(data)-8).to_bytes(4,'little');self.workshop_image(m,data);self.reject_workshop(m)
 def test_workshop_receipt_cannot_bind_another_original_after_rehash(self):
  m=self.workshop();self.workshop_receipt(m,lambda receipt:receipt.update(sourceSHA256='0'*64));self.reject_workshop(m)
 def test_workshop_prompt_cannot_be_relabelled(self):
  m=self.workshop();path='art/redesign/alchemy-workshop/prompts.json';prompt=json.loads((self.root/path).read_text());prompt['prompt']='different object';self.write(path,prompt);self.reject_workshop(m)
 def test_workshop_receipt_identity_cannot_be_dropped(self):
  m=self.workshop();m['assets'][0]['receipt']['sha256']='0'*64;self.reject_workshop(m)
 def test_workshop_export_settings_are_fixed_even_after_receipt_rehash(self):
  m=self.workshop();self.workshop_receipt(m,lambda receipt:receipt['encoding'].__setitem__(2,'99'));self.reject_workshop(m)
 def test_workshop_deterministic_export_cannot_be_assumed(self):
  m=self.workshop();self.workshop_receipt(m,lambda receipt:receipt['exportVerification'].update(verified=False));self.reject_workshop(m)
 def test_workshop_reference_image_cannot_change_after_receipt_rehash(self):
  m=self.workshop();self.workshop_receipt(m,lambda receipt:receipt['referenceImages'][0].update(sha256='0'*64));self.reject_workshop(m)
 def test_workshop_alpha_proof_cannot_describe_a_fully_opaque_bitmap(self):
  m=self.workshop();self.workshop_receipt(m,lambda receipt:receipt['runtimeAlphaProof'].update(min=255,transparentPixels=0));self.reject_workshop(m)
 def test_workshop_alpha_proof_pixel_total_must_match_the_image(self):
  m=self.workshop();self.workshop_receipt(m,lambda receipt:receipt['runtimeAlphaProof'].update(intermediatePixels=receipt['runtimeAlphaProof']['intermediatePixels']+1));self.reject_workshop(m)
 def test_workshop_baked_effects_cannot_pass_the_dormant_object_receipt(self):
  m=self.workshop();self.workshop_receipt(m,lambda receipt:receipt['review'].update(smokeBaked=True));self.reject_workshop(m)
 def test_workshop_actual_ui_consumer_is_required(self):
  m=self.workshop();path=m['consumer'];self.write(path,(self.root/path).read_text().replace('<AlchemyWorkshop ','<RemovedWorkshop '));self.reject_workshop(m)
 def test_workshop_runtime_consumer_cannot_disappear_after_code_rehash(self):
  m=self.workshop();path='web/src/AlchemyWorkshop.vue';text=(self.root/path).read_text().replace(m['assets'][0]['runtime']['path'].removeprefix('web/public/'),'art/not-the-furnace.webp');self.workshop_code(m,path,text);self.reject_workshop(m)
 def test_workshop_shared_presentation_cannot_be_detached_after_rehash(self):
  m=self.workshop();path='web/src/AlchemyWorkshop.vue';code=(self.root/path).read_text().replace('useActivityPresentation(a=>a.version===3','useDetachedPresentation(a=>a.version===3');self.workshop_code(m,path,code);m['bindings'][path]=['<AssetImage'];self.reject_workshop(m)
 def test_workshop_shared_tracker_cannot_be_detached_by_manifest(self):
  m=self.workshop();path='web/src/use-activity-effect.ts';self.write(path,(self.root/path).read_text().replace('createActivityEffectTracker(matches,extra)','createDetachedTracker(matches,extra)'));m['bindings'].pop(path,None);self.reject_workshop(m)
 def test_workshop_formal_game_and_activity_proof_both_remain_required(self):
  path='web/src/activity-effects.ts';original=(self.root/path).read_text()
  for token in ['resolve(before,command)','completeActivity(g,prior,r']:
   m=self.workshop();self.write(path,original.replace(token,'detachedProof('));m['bindings'].pop(path,None);self.reject_workshop(m)
 def test_workshop_style_and_source_references_cannot_be_unbound(self):
  m=self.workshop();m['styleConsumer']='web/src/does-not-exist.ts';self.reject_workshop(m)
  m=self.workshop();m['sourceReferences']=['../outside-contract.md'];self.reject_workshop(m)

 def equipment(self):return json.loads((self.root/'art/redesign/art03.json').read_text())
 def equipment_facts(self,manifest):
  p='art/redesign/art03-objects/asset-facts.json';facts=json.loads((self.root/p).read_text());facts['assets']=copy.deepcopy(manifest['assets']);facts['runtimeTotalBytes']=sum(a['runtime']['bytes'] for a in manifest['assets']);self.write(p,facts)
 def reject_equipment(self,manifest,sync_facts=False):
  self.write('art/redesign/art03.json',manifest)
  if sync_facts:self.equipment_facts(manifest)
  with self.assertRaises((AssertionError,KeyError,ValueError)):validate_equipment_objects(self.root)
 def equipment_receipt(self,manifest,change):
  ref=manifest['assets'][0]['receipt'];receipt=json.loads((self.root/ref['path']).read_text());change(receipt);self.write(ref['path'],receipt);ref['sha256']=hashlib.sha256((self.root/ref['path']).read_bytes()).hexdigest()
 def equipment_image(self,manifest,data):
  runtime=manifest['assets'][0]['runtime'];p=self.root/runtime['path'];p.unlink();p.write_bytes(data);runtime.update(bytes=len(data),sha256=hashlib.sha256(data).hexdigest());self.equipment_receipt(manifest,lambda r:r.update(runtime=copy.deepcopy(runtime)))
 def test_equipment_records_four_production_objects_and_all_five_native_files(self):
  files,count,size=validate_equipment_objects(self.root);self.assertEqual(count,4);self.assertEqual(len(files),13);self.assertGreater(size,0);self.assertLessEqual(size,45000);self.assertEqual([r['path'] for r in self.equipment()['files']],ART03_NATIVE)
 def test_equipment_ledger_is_required(self):
  (self.root/'art/redesign/art03.json').unlink()
  with self.assertRaises(AssertionError):validate_equipment_objects(self.root)
 def test_equipment_headers_and_all_original_caps_are_fixed(self):
  original=self.equipment()
  for key,value in [('format','other'),('version',True),('task','Other'),('maxNativeBytes',45001),('maxNewRasterAssets',5),('maxRuntimeBytes',160001),('runtimeSize',513),('maxTotalRuntimeBytes',640001)]:
   m=copy.deepcopy(original);m[key]=value;self.reject_equipment(m)
 def test_equipment_machine_checks_cannot_claim_user_acceptance(self):
  m=self.equipment();m['userAcceptance']=True;self.reject_equipment(m)
 def test_equipment_native_inventory_cannot_omit_the_shared_adapter(self):
  m=self.equipment();m['files']=[r for r in m['files'] if r['path']!='web/src/equipment-effects.ts'];self.reject_equipment(m)
 def test_equipment_code_identity_and_rehashed_byte_cap_are_both_enforced(self):
  m=self.equipment();m['files'][0]['sha256']='0'*64;self.reject_equipment(m)
  m=self.equipment();row=m['files'][0];code=(self.root/row['path']).read_text()+' '*45001;self.write(row['path'],code);row.update(bytes=len(code.encode()),sha256=hashlib.sha256(code.encode()).hexdigest());self.reject_equipment(m)
 def test_equipment_exact_four_slots_cannot_be_replaced_or_duplicated(self):
  m=self.equipment();m['assets'][0]['id']='another-object';self.reject_equipment(m,True)
 def test_equipment_asset_facts_cannot_drift_from_the_manifest(self):
  m=self.equipment();m['assets'][0]['reviewSourceHash']='0'*64;self.reject_equipment(m)
 def test_equipment_source_and_receipt_hashes_remain_bound(self):
  original=self.equipment()
  for key in ['source','receipt']:
   m=copy.deepcopy(original);m['assets'][0][key]['sha256']='0'*64;self.reject_equipment(m,True)
 def test_equipment_runtime_header_size_is_checked_after_rehash(self):
  m=self.equipment();r=m['assets'][0]['runtime'];data=bytearray((self.root/r['path']).read_bytes());self.assertEqual(data[12:16],b'VP8X');data[24:27]=(512).to_bytes(3,'little');r['dimensions']['width']=513;self.equipment_image(m,data);self.reject_equipment(m,True)
 def test_equipment_runtime_alpha_cannot_be_invented_after_rehash(self):
  m=self.equipment();r=m['assets'][0]['runtime'];data=bytearray((self.root/r['path']).read_bytes());self.assertEqual(data[12:16],b'VP8X');data[20]&=~16;r['alpha']=False;self.equipment_image(m,data);self.reject_equipment(m,True)
 def test_equipment_runtime_byte_budget_survives_rehash(self):
  m=self.equipment();r=m['assets'][0]['runtime'];data=bytearray((self.root/r['path']).read_bytes());data.extend(b'\0'*(160001-len(data)));data[4:8]=(len(data)-8).to_bytes(4,'little');self.equipment_image(m,data);self.reject_equipment(m,True)
 def test_equipment_source_references_cannot_omit_contract_or_escape(self):
  original=self.equipment();m=copy.deepcopy(original);m['sourceReferences'].remove('docs/decisions/0025-equipment-object-art-contract.md');self.reject_equipment(m)
  m=copy.deepcopy(original);m['sourceReferences'].append('../outside.md');self.reject_equipment(m)
 def test_equipment_export_settings_and_repeat_bytes_are_bound(self):
  m=self.equipment();self.equipment_receipt(m,lambda r:r['encoding'].__setitem__(2,'99'));self.reject_equipment(m,True)
 def test_equipment_deterministic_second_export_is_an_actual_file(self):
  m=self.equipment();r=json.loads((self.root/m['assets'][0]['receipt']['path']).read_text());p=self.root/r['exportVerification']['secondPath'];data=bytearray(p.read_bytes());data[-1]^=1;p.unlink();p.write_bytes(data);self.reject_equipment(m)
 def test_equipment_alpha_totals_and_bounds_are_checked(self):
  m=self.equipment();self.equipment_receipt(m,lambda r:r['runtimeAlphaProof'].update(intermediatePixels=r['runtimeAlphaProof']['intermediatePixels']+1));self.reject_equipment(m,True)
 def test_equipment_recorded_runtime_bounds_must_fit_actual_dimensions(self):
  m=self.equipment();m['assets'][0]['runtimeBoundsAlpha16']['right']=513;self.reject_equipment(m,True)
 def test_equipment_baked_active_effects_cannot_be_relabelled_cold(self):
  m=self.equipment();self.equipment_receipt(m,lambda r:r['review'].update(activeHaloBaked=True));self.reject_equipment(m,True)
 def test_equipment_exact_prompt_and_edit_input_cannot_be_relabelled(self):
  m=self.equipment();self.equipment_receipt(m,lambda r:r.update(promptSHA256='0'*64));self.reject_equipment(m,True)
 def test_equipment_actual_consumers_and_full_proof_cannot_be_detached(self):
  original=self.equipment();m=copy.deepcopy(original);del m['bindings']['web/src/LearningPlanner.vue'];self.reject_equipment(m)
  m=copy.deepcopy(original);p='web/src/activity-effects.ts';self.write(p,(self.root/p).read_text().replace('completeActivity(g,prior,r','detachedProof(g,prior,r'));self.reject_equipment(m)
 def test_equipment_catalogue_fallback_must_bind_the_actual_child(self):
  m=self.equipment();p='art/redesign/catalogue-art/manifest.json';catalogue=json.loads((self.root/p).read_text());catalogue['bindings'].pop('web/src/JadeStudyScene.vue');self.write(p,catalogue);self.reject_equipment(m)

class SupplyObjectTests(unittest.TestCase):
 def setUp(self):
  from supply_object_inventory import NATIVE,REFS,BINDINGS
  self.temp=tempfile.TemporaryDirectory(prefix='chenyuan-supply-negative-');self.root=Path(self.temp.name)
  for p in set(NATIVE+REFS+list(BINDINGS)+['art/redesign/art04.json']):
   out=self.root/p;out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes((ROOT/p).read_bytes())
 def tearDown(self):self.temp.cleanup()
 def data(self):return json.loads((self.root/'art/redesign/art04.json').read_text())
 def write(self,m):(self.root/'art/redesign/art04.json').write_text(json.dumps(m))
 def check(self):
  from supply_object_inventory import validate_supply_objects
  return validate_supply_objects(self.root)
 def reject(self,m):
  self.write(m)
  with self.assertRaises(AssertionError):self.check()
 def test_supply_four_files_bound_and_budgeted(self):self.assertGreater(self.check(),0);self.assertLessEqual(self.check(),40000)
 def test_supply_missing_ledger_rejected(self):
  (self.root/'art/redesign/art04.json').unlink()
  with self.assertRaises(AssertionError):self.check()
 def test_supply_cannot_raise_cap_or_claim_acceptance(self):
  for key,value in [('maxNativeBytes',40001),('newBitmapAssets',1),('newBitmapAssets',False),('userAcceptance',True)]:
   m=self.data();m[key]=value;self.reject(m);self.write(json.loads((ROOT/'art/redesign/art04.json').read_text()))
 def test_supply_hash_bytes_inventory_and_path_bound(self):
  original=self.data()
  for change in [lambda m:m['files'][0].update(sha256='0'*64),lambda m:m['files'][0].update(bytes=0),lambda m:m['files'].pop(),lambda m:m['files'][0].update(path='../outside')]:
   m=copy.deepcopy(original);change(m);self.reject(m)
 def test_supply_cannot_expand_code_even_with_updated_identity(self):
  m=self.data();row=m['files'][0];raw=('x'*40001).encode();(self.root/row['path']).write_bytes(raw);row.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest());self.reject(m)
 def test_supply_real_consumers_required(self):
  p=self.root/'web/src/MarketPlanner.vue';p.write_text(p.read_text().replace('<MarketCounter','<DetachedCounter'))
  with self.assertRaises(AssertionError):self.check()
 def test_supply_source_reference_and_binding_contract_required(self):
  m=self.data();m['sourceReferences']=[];self.reject(m)
  m=json.loads((ROOT/'art/redesign/art04.json').read_text());m['bindings']={};self.reject(m)

class NarrativeObjectTests(unittest.TestCase):
 def setUp(self):
  from narrative_object_inventory import NATIVE,REFS,BINDINGS
  self.temp=tempfile.TemporaryDirectory(prefix='chenyuan-narrative-negative-');self.root=Path(self.temp.name)
  for path in set(NATIVE+REFS+list(BINDINGS)+['art/redesign/narrative-objects.json']):
   target=self.root/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((ROOT/path).read_bytes())
 def tearDown(self):self.temp.cleanup()
 def data(self):return json.loads((self.root/'art/redesign/narrative-objects.json').read_text())
 def write(self,m):(self.root/'art/redesign/narrative-objects.json').write_text(json.dumps(m))
 def check(self):
  from narrative_object_inventory import validate_narrative_objects
  return validate_narrative_objects(self.root)
 def reject(self,m):
  self.write(m)
  with self.assertRaises(AssertionError):self.check()
 def changed_source(self,path,text,m):
  data=text.encode();(self.root/path).write_bytes(data)
  row=next(row for row in m['files'] if row['path']==path);row.update(bytes=len(data),sha256=hashlib.sha256(data).hexdigest());self.write(m)
 def test_narrative_six_actual_sources_bound_and_budgeted(self):
  from narrative_object_inventory import NATIVE
  self.assertEqual([row['path'] for row in self.data()['files']],NATIVE);self.assertGreater(self.check(),0);self.assertLessEqual(self.check(),45000)
 def test_narrative_missing_ledger_rejects_unrecorded_sources(self):
  (self.root/'art/redesign/narrative-objects.json').unlink()
  with self.assertRaises(AssertionError):self.check()
 def test_narrative_header_format_and_task_cannot_change(self):
  original=self.data()
  for key,value in [('format','other'),('task','Goal4 ART04')]:
   with self.subTest(key=key):m=copy.deepcopy(original);m[key]=value;self.reject(m)
 def test_narrative_version_rejects_boolean_and_float_aliases(self):
  original=self.data()
  for value in [True,1.0,2]:
   with self.subTest(value=value):m=copy.deepcopy(original);m['version']=value;self.reject(m)
 def test_narrative_fixed_cap_rejects_raise_and_boolean(self):
  original=self.data()
  for value in [45001,True]:
   with self.subTest(value=value):m=copy.deepcopy(original);m['maxNativeBytes']=value;self.reject(m)
 def test_narrative_bitmap_zero_rejects_boolean_and_new_asset(self):
  original=self.data()
  for change in [lambda m:m.update(newBitmapAssets=False),lambda m:m.update(newBitmapAssets=1),lambda m:m.update(assets=[{'path':'new.webp'}])]:
   m=copy.deepcopy(original);change(m);self.reject(m)
 def test_narrative_cannot_claim_human_acceptance_or_numeric_alias(self):
  original=self.data()
  for value in [True,0]:
   with self.subTest(value=value):m=copy.deepcopy(original);m['userAcceptance']=value;self.reject(m)
 def test_narrative_complete_ordered_inventory_and_rows_required(self):
  original=self.data()
  for change in [lambda m:m['files'].pop(),lambda m:m['files'].append(m['files'][0]),lambda m:m['files'][0].update(untracked=True)]:
   m=copy.deepcopy(original);change(m);self.reject(m)
 def test_narrative_source_bytes_hash_and_boolean_size_rejected(self):
  original=self.data()
  for key,value in [('bytes',0),('bytes',True),('sha256','0'*64)]:
   with self.subTest(key=key,value=value):m=copy.deepcopy(original);m['files'][0][key]=value;self.reject(m)
 def test_narrative_absolute_and_traversal_paths_rejected(self):
  original=self.data()
  for value in ['/tmp/narrative-source.vue','../outside.vue']:
   with self.subTest(path=value):m=copy.deepcopy(original);m['files'][0]['path']=value;self.reject(m)
 def test_narrative_source_or_ledger_symlink_cannot_escape_repository(self):
  for path in [self.root/self.data()['files'][0]['path'],self.root/'art/redesign/narrative-objects.json']:
   original=path.read_bytes()
   with tempfile.TemporaryDirectory(prefix='chenyuan-narrative-outside-') as folder:
    outside=Path(folder)/path.name;outside.write_bytes(original);path.unlink();path.symlink_to(outside)
    with self.subTest(path=path.name),self.assertRaises(AssertionError):self.check()
    path.unlink();path.write_bytes(original)
 def test_narrative_actual_budget_enforced_after_identity_update(self):
  m=self.data();self.changed_source(m['files'][0]['path'],'x'*45001,m)
  with self.assertRaises(AssertionError):self.check()
 def test_narrative_required_sources_and_binding_contract_not_optional(self):
  original=self.data()
  for key,value in [('sourceReferences',[]),('bindings',{})]:
   with self.subTest(key=key):m=copy.deepcopy(original);m[key]=value;self.reject(m)
 def test_narrative_missing_reference_rejected(self):
  (self.root/self.data()['sourceReferences'][0]).unlink()
  with self.assertRaises(AssertionError):self.check()
 def test_narrative_all_three_real_parent_consumers_required(self):
  for path,tag in [('web/src/FateCatalogue.vue','EncounterTable'),('web/src/NarrativePanel.vue','ResponseTable'),('web/src/LifeCatalogue.vue','LifeScroll')]:
   file=self.root/path;before=file.read_text();file.write_text(before.replace('<'+tag,'<DetachedObject'))
   with self.subTest(parent=path),self.assertRaises(AssertionError):self.check()
   file.write_text(before)
 def test_narrative_app_host_must_wrap_original_keepalive_children(self):
  path=self.root/'web/src/App.vue';text=path.read_text().replace('<NarrativeStageHost','<DetachedStageHost').replace('</NarrativeStageHost>','</DetachedStageHost>');path.write_text(text+'\n<NarrativeStageHost></NarrativeStageHost>\n')
  with self.assertRaises(AssertionError):self.check()
 def test_narrative_objects_require_hook_even_after_rehash(self):
  path='web/src/EncounterTable.vue';m=self.data();self.changed_source(path,(self.root/path).read_text().replace('useNarrativeObject','useUnprovenObject'),m)
  with self.assertRaises(AssertionError):self.check()
 def test_narrative_shared_proof_consumer_required_after_rehash(self):
  path='web/src/narrative-effects.ts';m=self.data();self.changed_source(path,(self.root/path).read_text().replace('useActivityPresentation','useUnprovenPresentation'),m)
  with self.assertRaises(AssertionError):self.check()
 def test_narrative_css_must_be_consumed_by_actual_objects(self):
  original=self.data()
  for path in ['web/src/EncounterTable.vue','web/src/ResponseTable.vue','web/src/LifeScroll.vue']:
   text=(self.root/path).read_text();self.changed_source(path,text.replace("import './narrative-objects.css'",''),copy.deepcopy(original))
   with self.subTest(object=path),self.assertRaises(AssertionError):self.check()
   self.changed_source(path,text,copy.deepcopy(original))
 def test_narrative_action_domain_cannot_expand_even_after_rehash(self):
  path='web/src/narrative-effects.ts';text=(self.root/path).read_text();changed=text.replace("'END_LIFE'];","'END_LIFE','CHOOSE'];",1);self.assertNotEqual(changed,text);self.changed_source(path,changed,self.data())
  with self.assertRaises(AssertionError):self.check()

class CultivationObjectTests(unittest.TestCase):
 def setUp(self):
  from cultivation_object_inventory import NATIVE,REFS,DEPENDENCIES
  self.temp=tempfile.TemporaryDirectory(prefix='chenyuan-cultivation-negative-');self.root=Path(self.temp.name)
  for path in set(NATIVE+REFS+DEPENDENCIES+['art/redesign/cultivation-objects.json']):
   target=self.root/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((ROOT/path).read_bytes())
 def tearDown(self):self.temp.cleanup()
 def data(self):return json.loads((self.root/'art/redesign/cultivation-objects.json').read_text())
 def write(self,m):(self.root/'art/redesign/cultivation-objects.json').write_text(json.dumps(m))
 def check(self):
  from cultivation_object_inventory import validate_cultivation_objects
  from check_inventory import image_info
  return validate_cultivation_objects(self.root,image_info)
 def reject(self,m):
  self.write(m)
  with self.assertRaises(AssertionError):self.check()
 def changed_source(self,path,text,m):
  data=text.encode();(self.root/path).write_bytes(data)
  row=m['goalPanel']if path==m['goalPanel']['path']else next((r for r in m['files']if r['path']==path),None)
  if row is not None:row.update(bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
  self.write(m)
 def changed_receipt(self,change):
  m=self.data();ref=m['assets'][0]['receipt'];p=self.root/ref['path'];r=json.loads(p.read_text());change(r);p.write_text(json.dumps(r));ref['sha256']=hashlib.sha256(p.read_bytes()).hexdigest();self.write(m)
 def test_cultivation_actual_seven_sources_one_painting_and_fixed_budgets(self):
  files,production,total=self.check();self.assertEqual(len(files),2);self.assertEqual(production,1);self.assertGreater(total,0);self.assertLessEqual(total,45000)
 def test_cultivation_missing_ledger_cannot_hide_present_sources(self):
  (self.root/'art/redesign/cultivation-objects.json').unlink()
  with self.assertRaises(AssertionError):self.check()
 def test_cultivation_header_task_and_numeric_version_aliases_rejected(self):
  original=self.data()
  for key,value in [('format','other'),('task','Goal4 ART05'),('version',True),('version',1.0),('version',2)]:
   with self.subTest(key=key,value=value):m=copy.deepcopy(original);m[key]=value;self.reject(m)
 def test_cultivation_all_budget_caps_and_boolean_aliases_rejected(self):
  original=self.data()
  for key in original['budgets']:
   for value in [original['budgets'][key]+1,True]:
    with self.subTest(key=key,value=value):m=copy.deepcopy(original);m['budgets'][key]=value;self.reject(m)
 def test_cultivation_cannot_claim_human_acceptance_or_extra_asset(self):
  original=self.data()
  for change in [lambda m:m.update(userAcceptance=True),lambda m:m.update(userAcceptance=0),lambda m:m['assets'].append(copy.deepcopy(m['assets'][0]))]:
   m=copy.deepcopy(original);change(m);self.reject(m)
 def test_cultivation_complete_ordered_inventory_and_strict_identity_rows_required(self):
  original=self.data()
  for change in [lambda m:m['files'].pop(),lambda m:m['files'].append(m['files'][0]),lambda m:m['files'][0].update(untracked=True),lambda m:m['files'][0].update(bytes=True),lambda m:m.update(goalPanel=False)]:
   m=copy.deepcopy(original);change(m);self.reject(m)
 def test_cultivation_bytes_and_hash_must_match_actual_file(self):
  original=self.data()
  for key,value in [('bytes',0),('sha256','0'*64)]:
   with self.subTest(key=key):m=copy.deepcopy(original);m['files'][0][key]=value;self.reject(m)
 def test_cultivation_absolute_traversal_and_symlink_paths_cannot_escape(self):
  original=self.data()
  for value in ['/tmp/cultivation.vue','../outside.vue']:
   m=copy.deepcopy(original);m['files'][0]['path']=value;self.reject(m)
  self.write(original)
  for path in [self.root/original['files'][0]['path'],self.root/'art/redesign/cultivation-objects.json']:
   raw=path.read_bytes()
   with tempfile.TemporaryDirectory(prefix='chenyuan-cultivation-external-')as folder:
    other=Path(folder)/path.name;other.write_bytes(raw);path.unlink();path.symlink_to(other)
    with self.assertRaises(AssertionError):self.check()
    path.unlink();path.write_bytes(raw)
 def test_cultivation_actual_native_budget_checked_after_rehash(self):
  m=self.data();self.changed_source(m['files'][0]['path'],'x'*45001,m)
  with self.assertRaisesRegex(AssertionError,'code exceeds'):self.check()
 def test_cultivation_goal_parent_whole_file_budget_checked_after_rehash(self):
  m=self.data();p=m['goalPanel']['path'];self.changed_source(p,(self.root/p).read_text()+' '*(19001-(self.root/p).stat().st_size),m)
  with self.assertRaisesRegex(AssertionError,'GoalPanel exceeds'):self.check()
 def test_cultivation_references_and_exact_consumer_contract_required(self):
  original=self.data()
  for key,value in [('sourceReferences',[]),('bindings',{})]:
   m=copy.deepcopy(original);m[key]=value;self.reject(m)
  self.write(original);(self.root/original['sourceReferences'][0]).unlink()
  with self.assertRaises(AssertionError):self.check()
 def test_cultivation_goal_and_preparation_require_actual_goal_board(self):
  original=self.data()
  for path in ['web/src/GoalPanel.vue','web/src/PreparationPanel.vue']:
   before=(self.root/path).read_text();self.changed_source(path,before.replace('<GoalBoard','<DetachedBoard'),copy.deepcopy(original))
   with self.subTest(parent=path),self.assertRaisesRegex(AssertionError,'Missing cultivation consumer'):self.check()
   self.changed_source(path,before,copy.deepcopy(original))
 def test_cultivation_empty_app_host_token_cannot_fake_stable_ownership(self):
  p=self.root/'web/src/App.vue';s=p.read_text().replace('<CultivationStageHost','<DetachedHost').replace('</CultivationStageHost>','</DetachedHost>');p.write_text(s+'<CultivationStageHost></CultivationStageHost>')
  with self.assertRaisesRegex(AssertionError,'host is not stable'):self.check()
 def test_cultivation_v1_single_cycle_method_realm_and_three_v7_domains_stay_narrow(self):
  p='web/src/cultivation-effects.ts';text=(self.root/p).read_text();original=self.data()
  for before,after in [("a.version===1&&a.plan.kind==='cultivation'","a.version<=1&&a.plan.kind==='cultivation'"),('command.count===1','command.count>=1'),('command.method===a.plan.method','true'),('a.realm===game.core.player.realm','true'),("['CHOOSE','BREAKTHROUGH','START_TRIAL']","['CHOOSE','BREAKTHROUGH','START_TRIAL','EVENT']")]:
   self.assertIn(before,text);self.changed_source(p,text.replace(before,after),copy.deepcopy(original))
   with self.subTest(fragment=before),self.assertRaises(AssertionError):self.check()
   self.changed_source(p,text,copy.deepcopy(original))
 def test_cultivation_default_domain_zero_guard_and_full_proof_not_optional(self):
  for path,before,after in [('web/src/activity-effects.ts','extra:0|1|4|5|7=0','extra:0|1|4|5|7=1'),('web/src/activity-effects.ts','a.version&&[2,3,6,extra]','[2,3,6,extra]'),('web/src/activity-effects.ts','proof(resolved.nextState)!==proof(g)','false'),('web/src/activity-effects.ts','proof(expected)!==proof(a)','false')]:
   p=self.root/path;s=p.read_text();self.assertIn(before,s);p.write_text(s.replace(before,after))
   with self.subTest(fragment=before),self.assertRaises(AssertionError):self.check()
   p.write_text(s)
 def test_cultivation_runtime_objects_require_real_hooks_styles_and_asset_after_rehash(self):
  original=self.data()
  for path,token in [('web/src/CultivationSite.vue','useCultivationObject'),('web/src/MilestoneGate.vue',"import './milestone-objects.css'"),('web/src/CultivationSite.vue','art/v2/characters/player-seated-cold.webp')]:
   s=(self.root/path).read_text();self.changed_source(path,s.replace(token,'Detached'),copy.deepcopy(original))
   with self.subTest(token=token),self.assertRaises(AssertionError):self.check()
   self.changed_source(path,s,copy.deepcopy(original))
 def test_cultivation_raster_missing_original_header_and_identity_cannot_be_faked(self):
  original=self.data();path=self.root/original['assets'][0]['source']['path'];raw=path.read_bytes();path.unlink()
  with self.assertRaises(AssertionError):self.check()
  path.write_bytes(raw);m=copy.deepcopy(original);m['assets'][0]['source']['sha256']='0'*64;self.reject(m)
  self.write(original);path.write_bytes(b'INVALID!'+raw[8:]);m=copy.deepcopy(original);m['assets'][0]['source']['sha256']=hashlib.sha256(path.read_bytes()).hexdigest();self.write(m)
  with self.assertRaisesRegex(AssertionError,'PNG header'):self.check()
 def test_cultivation_runtime_actual_byte_cap_enforced_with_valid_riff_header(self):
  m=self.data();row=m['assets'][0]['runtime'];p=self.root/row['path'];b=bytearray(p.read_bytes()+b'JUNK'+(100000).to_bytes(4,'little')+b'x'*100000);b[4:8]=(len(b)-8).to_bytes(4,'little');p.write_bytes(b);row.update(bytes=len(b),sha256=hashlib.sha256(b).hexdigest());self.write(m)
  with self.assertRaisesRegex(AssertionError,'dimensions/bytes exceeded'):self.check()
 def test_cultivation_alpha_counts_and_numeric_aliases_must_cover_real_pixels(self):
  original=self.data();receipt=(self.root/original['assets'][0]['receipt']['path']).read_bytes()
  for change in [lambda r:r['runtimeAlphaProof'].update(solidPixels=r['runtimeAlphaProof']['solidPixels']+1),lambda r:r['alphaProof'].update(min=False),lambda r:r['runtimeAlphaProof'].update(max=1),lambda r:r['decodeProof'].update(sourceRGBASHA256='not-a-digest')]:
   self.write(copy.deepcopy(original));(self.root/original['assets'][0]['receipt']['path']).write_bytes(receipt);self.changed_receipt(change)
   with self.assertRaises(AssertionError):self.check()
 def test_cultivation_exact_prompt_identity_and_export_settings_must_match_receipt(self):
  original=self.data();receipt=(self.root/original['assets'][0]['receipt']['path']).read_bytes()
  for change in [lambda r:r.update(promptReference='art/redesign/receipts/other.json'),lambda r:r.update(promptSHA256='0'*64),lambda r:r['encoding'].__setitem__(2,'70'),lambda r:r['referenceImages'][0].update(sha256='0'*64)]:
   self.write(copy.deepcopy(original));(self.root/original['assets'][0]['receipt']['path']).write_bytes(receipt);self.changed_receipt(change)
   with self.assertRaises(AssertionError):self.check()
 def test_cultivation_deterministic_export_proof_cannot_claim_wrong_payload(self):
  self.changed_receipt(lambda r:r['exportProof'].update(reencodedSHA256='0'*64))
  with self.assertRaisesRegex(AssertionError,'export proof'):self.check()
 def test_cultivation_old_painting_binding_cannot_hide_a_fake_default_consumer(self):
  p=self.root/'art/redesign/catalogue-art/manifest.json';m=json.loads(p.read_text());m['bindings'].pop('web/src/ProgressionChoices.vue');m['bindings']['web/src/PreparationPanel.vue']=['<GoalBoard '];p.write_text(json.dumps(m))
  with self.assertRaisesRegex(AssertionError,'Old painting consumer'):self.check()

class FeedbackSkipTests(unittest.TestCase):
 def setUp(self):
  from check_inventory import FEEDBACK_SKIP_NATIVE,FEEDBACK_SKIP_REFS,FEEDBACK_SKIP_BINDINGS,FEEDBACK_SKIP_CANDIDATE
  self.temp=tempfile.TemporaryDirectory(prefix='chenyuan-feedback-skip-negative-');self.root=Path(self.temp.name)
  for name in set(FEEDBACK_SKIP_NATIVE+FEEDBACK_SKIP_REFS+list(FEEDBACK_SKIP_BINDINGS)+[FEEDBACK_SKIP_CANDIDATE,'art/redesign/feedback-skip.json']):
   target=self.root/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((ROOT/name).read_bytes())
 def tearDown(self):self.temp.cleanup()
 def data(self):return json.loads((self.root/'art/redesign/feedback-skip.json').read_text())
 def write(self,m):(self.root/'art/redesign/feedback-skip.json').write_text(json.dumps(m))
 def check(self):
  from check_inventory import validate_feedback_skip
  return validate_feedback_skip(self.root)
 def reject(self,m):
  self.write(m)
  with self.assertRaises(AssertionError):self.check()
 def changed_source(self,path,text,m):
  data=text.encode();(self.root/path).write_bytes(data)
  for row in m['files']:
   if row['path']==path:row.update(bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
  self.write(m)
 def test_feedback_skip_actual_control_and_additive_fixed_budget(self):
  self.assertEqual(self.check(),(self.root/'web/src/FeedbackSkip.vue').stat().st_size);self.assertLessEqual(self.check(),4000)
 def test_feedback_skip_missing_ledger_cannot_hide_present_control(self):
  (self.root/'art/redesign/feedback-skip.json').unlink()
  with self.assertRaises(AssertionError):self.check()
 def test_feedback_skip_strict_manifest_shape_required(self):
  original=self.data()
  for change in [lambda m:m.pop('provenance'),lambda m:m.update(extra=True)]:
   m=copy.deepcopy(original);change(m);self.reject(m)
 def test_feedback_skip_header_rejects_other_task_and_numeric_aliases(self):
  original=self.data()
  for key,value in [('format','other'),('task','Goal4 TA07'),('version',True),('version',1.0),('version',2)]:
   with self.subTest(key=key,value=value):m=copy.deepcopy(original);m[key]=value;self.reject(m)
 def test_feedback_skip_fixed_cap_rejects_raise_boolean_and_float(self):
  original=self.data()
  for value in [4001,True,4000.0]:
   with self.subTest(value=value):m=copy.deepcopy(original);m['maxNativeBytes']=value;self.reject(m)
 def test_feedback_skip_bitmap_zero_rejects_alias_or_new_asset(self):
  original=self.data()
  for change in [lambda m:m.update(newBitmapAssets=False),lambda m:m.update(newBitmapAssets=0.0),lambda m:m.update(newBitmapAssets=1),lambda m:m.update(assets=[{'path':'new.webp'}])]:
   m=copy.deepcopy(original);change(m);self.reject(m)
 def test_feedback_skip_cannot_claim_user_acceptance_or_numeric_alias(self):
  original=self.data()
  for value in [True,0]:
   m=copy.deepcopy(original);m['userAcceptance']=value;self.reject(m)
 def test_feedback_skip_exact_single_file_and_strict_identity_rows_required(self):
  original=self.data()
  for change in [lambda m:m.update(files=[]),lambda m:m['files'].append(copy.deepcopy(m['files'][0])),lambda m:m['files'][0].update(untracked=True)]:
   m=copy.deepcopy(original);change(m);self.reject(m)
 def test_feedback_skip_bytes_hash_and_numeric_size_aliases_rejected(self):
  original=self.data()
  for key,value in [('bytes',0),('bytes',True),('bytes',float(original['files'][0]['bytes'])),('sha256','0'*64)]:
   with self.subTest(key=key):m=copy.deepcopy(original);m['files'][0][key]=value;self.reject(m)
 def test_feedback_skip_absolute_and_traversal_paths_rejected(self):
  original=self.data()
  for value in ['/tmp/FeedbackSkip.vue','../FeedbackSkip.vue']:
   m=copy.deepcopy(original);m['files'][0]['path']=value;self.reject(m)
 def test_feedback_skip_ledger_and_source_symlinks_cannot_escape(self):
  for name in ['art/redesign/feedback-skip.json','web/src/FeedbackSkip.vue']:
   path=self.root/name;raw=path.read_bytes()
   with tempfile.TemporaryDirectory(prefix='chenyuan-feedback-skip-outside-') as folder:
    external=Path(folder)/path.name;external.write_bytes(raw);path.unlink();path.symlink_to(external)
    with self.subTest(path=name),self.assertRaises(AssertionError):self.check()
    path.unlink();path.write_bytes(raw)
 def test_feedback_skip_actual_budget_enforced_after_identity_update(self):
  m=self.data();path='web/src/FeedbackSkip.vue';text=(self.root/path).read_text()+'\n'*4001;self.changed_source(path,text,m)
  with self.assertRaisesRegex(AssertionError,'exceeds fixed budget'):self.check()
 def test_feedback_skip_references_and_consumer_contract_cannot_be_omitted(self):
  original=self.data()
  for key,value in [('sourceReferences',[]),('bindings',{}),('bindings',{'web/src/App.vue':['fake']})]:
   m=copy.deepcopy(original);m[key]=value;self.reject(m)
 def test_feedback_skip_required_reference_must_exist(self):
  (self.root/self.data()['sourceReferences'][0]).unlink()
  with self.assertRaises(AssertionError):self.check()
 def test_feedback_skip_candidate_identity_and_nonacceptance_scope_bound(self):
  original=self.data()
  for key,value in [('path','../outside.vue'),('bytes',True),('sha256','0'*64),('scope','User accepted'),('kind','approved-runtime')]:
   with self.subTest(key=key):m=copy.deepcopy(original);m['provenance'][key]=value;self.reject(m)
 def test_feedback_skip_app_must_import_the_actual_control(self):
  path=self.root/'web/src/App.vue';path.write_text(path.read_text().replace("import FeedbackSkip from './FeedbackSkip.vue'",''))
  with self.assertRaises(AssertionError):self.check()
 def test_feedback_skip_fake_external_consumer_cannot_replace_scoped_slot(self):
  path=self.root/'web/src/App.vue';text=path.read_text();outside='<FeedbackSkip v-if="[\'BATTLE\',\'BREAKTHROUGH\',\'START_TRIAL\'].includes(operation)" @hold="hold" @dismiss="dismiss"/>'
  path.write_text(text.replace('<FeedbackSkip ','<DetachedSkip ',1)+'\n'+outside)
  with self.assertRaisesRegex(AssertionError,'real stage scoped slot'):self.check()
 def test_feedback_skip_stage_requires_current_notice_gate_key_and_callbacks(self):
  path=self.root/'web/src/ActionFeedbackStage.vue';original=path.read_text()
  for token in ['notice&&showMotion',':key="notice.key"',':dismiss="clear"',':hold="holdMotion"',':operation="notice.operation"']:
   path.write_text(original.replace(token,'detached',1))
   with self.subTest(token=token),self.assertRaises(AssertionError):self.check()
  path.write_text(original)
 def test_feedback_skip_operation_domain_cannot_expand(self):
  path=self.root/'web/src/App.vue';path.write_text(path.read_text().replace("['BATTLE','BREAKTHROUGH','START_TRIAL'].includes(operation)","['BATTLE','BREAKTHROUGH','START_TRIAL','END'].includes(operation)",1))
  with self.assertRaisesRegex(AssertionError,'operation domain'):self.check()
 def test_feedback_skip_focus_and_hud_teleport_cannot_detach_after_rehash(self):
  path='web/src/FeedbackSkip.vue';original=(self.root/path).read_text();manifest=self.data()
  for token in ['inject(gameFocusKey)','<Teleport v-if="target" :to="target">','.game-hud .activity-rail>footer']:
   self.changed_source(path,original.replace(token,'detached',1),copy.deepcopy(manifest))
   with self.subTest(token=token),self.assertRaises(AssertionError):self.check()
  self.changed_source(path,original,manifest)
 def test_feedback_skip_inline_style_and_zero_image_consumers_bound_after_rehash(self):
  path='web/src/FeedbackSkip.vue';original=(self.root/path).read_text();manifest=self.data()
  for text in [original.replace('<style scoped>','<style>'),original+'\n<img src="external.webp">']:
   self.changed_source(path,text,copy.deepcopy(manifest))
   with self.assertRaises(AssertionError):self.check()

class TA07InventoryTests(unittest.TestCase):
 def setUp(self):
  from ta07_inventory import NATIVE,REFS,DEPENDENCIES,LEDGER
  self.temp=tempfile.TemporaryDirectory(prefix='chenyuan-ta07-negative-');self.root=Path(self.temp.name)
  self.original={name:(ROOT/name).read_bytes()for name in set(NATIVE+REFS+DEPENDENCIES+[LEDGER])}
  self.restore()
 def tearDown(self):self.temp.cleanup()
 def restore(self):
  for name,raw in self.original.items():
   path=self.root/name;path.parent.mkdir(parents=True,exist_ok=True)
   if path.is_symlink():path.unlink()
   path.write_bytes(raw)
 def data(self):return json.loads((self.root/'art/redesign/ta07.json').read_text())
 def write(self,data):(self.root/'art/redesign/ta07.json').write_text(json.dumps(data))
 def check(self):
  from ta07_inventory import validate_ta07
  from check_inventory import image_info
  return validate_ta07(self.root,image_info)
 def reject(self,data):
  self.write(data)
  with self.assertRaises(AssertionError):self.check()
 def changed_source(self,path,text):
  raw=text.encode();(self.root/path).write_bytes(raw);manifest=self.data()
  for row in manifest['files']:
   if row['path']==path:row.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest())
  self.write(manifest)
 def changed_receipt(self,change):
  manifest=self.data();ref=manifest['assets'][0]['receipt'];path=self.root/ref['path'];receipt=json.loads(path.read_text());change(receipt);path.write_text(json.dumps(receipt));ref['sha256']=hashlib.sha256(path.read_bytes()).hexdigest();self.write(manifest)
 def test_ta07_actual_five_sources_three_fixed_budgets_and_one_raster(self):
  from ta07_inventory import NATIVE,COMMAND_FILES,CAST_FILES
  files,production,total=self.check();self.assertEqual(len(files),2);self.assertEqual(production,1)
  self.assertEqual(total,sum((self.root/path).stat().st_size for path in NATIVE));self.assertLessEqual(total,36000)
  self.assertLessEqual(sum((self.root/path).stat().st_size for path in COMMAND_FILES),12000)
  self.assertLessEqual(sum((self.root/path).stat().st_size for path in CAST_FILES),24000)
 def test_ta07_missing_ledger_cannot_hide_present_native_implementation(self):
  (self.root/'art/redesign/ta07.json').unlink()
  with self.assertRaisesRegex(AssertionError,'Unrecorded TA07'):self.check()
 def test_ta07_missing_ledger_cannot_hide_raster_before_native_lands(self):
  from ta07_inventory import NATIVE
  (self.root/'art/redesign/ta07.json').unlink()
  for name in NATIVE:(self.root/name).unlink()
  with self.assertRaisesRegex(AssertionError,'Unrecorded TA07'):self.check()
 def test_ta07_strict_manifest_shape_does_not_accept_missing_or_extra_fields(self):
  original=self.data()
  for change in [lambda m:m.pop('assets'),lambda m:m.update(extra=True)]:
   m=copy.deepcopy(original);change(m);self.reject(m)
 def test_ta07_header_task_and_numeric_version_aliases_rejected(self):
  original=self.data()
  for key,value in [('format','other'),('task','Goal4 ART02'),('version',True),('version',1.0),('version',2)]:
   with self.subTest(key=key,value=value):m=copy.deepcopy(original);m[key]=value;self.reject(m)
 def test_ta07_fixed_budget_caps_cannot_raise_or_use_boolean_float_aliases(self):
  original=self.data()
  for name,value in original['budgets'].items():
   for invalid in [value+1,True,float(value)]:
    with self.subTest(name=name,value=invalid):m=copy.deepcopy(original);m['budgets'][name]=invalid;self.reject(m)
 def test_ta07_cannot_claim_human_acceptance_or_add_another_raster(self):
  original=self.data()
  for change in [lambda m:m.update(userAcceptance=True),lambda m:m.update(userAcceptance=0),lambda m:m['assets'].append(copy.deepcopy(m['assets'][0]))]:
   m=copy.deepcopy(original);change(m);self.reject(m)
 def test_ta07_complete_ordered_source_inventory_and_exact_rows_required(self):
  original=self.data()
  for change in [lambda m:m['files'].pop(),lambda m:m['files'].reverse(),lambda m:m['files'].append(copy.deepcopy(m['files'][0])),lambda m:m['files'][0].update(extra=True)]:
   m=copy.deepcopy(original);change(m);self.reject(m)
 def test_ta07_native_identity_must_match_bytes_hash_and_integer_size(self):
  original=self.data()
  for field,value in [('bytes',0),('bytes',True),('bytes',float(original['files'][0]['bytes'])),('sha256','0'*64),('sha256','not-a-digest')]:
   with self.subTest(field=field):m=copy.deepcopy(original);m['files'][0][field]=value;self.reject(m)
 def test_ta07_absolute_traversal_and_external_symlink_paths_rejected(self):
  original=self.data()
  for invalid in ['/tmp/actor.vue','../actor.vue','web\\src\\actor.vue']:
   m=copy.deepcopy(original);m['files'][0]['path']=invalid;self.reject(m)
  for name in ['art/redesign/ta07.json','web/src/BattleCast.vue','web/public/art/v2/actors/player-standing-cold-v1.webp']:
   self.restore();path=self.root/name;raw=path.read_bytes()
   with tempfile.TemporaryDirectory(prefix='chenyuan-ta07-external-')as folder:
    outside=Path(folder)/path.name;outside.write_bytes(raw);path.unlink();path.symlink_to(outside)
    with self.subTest(name=name),self.assertRaises(AssertionError):self.check()
 def test_ta07_missing_actual_source_is_not_satisfied_by_its_identity_row(self):
  (self.root/'web/src/BattleCast.vue').unlink()
  with self.assertRaisesRegex(AssertionError,'Missing or external'):self.check()
 def test_ta07_actual_command_and_cast_subbudgets_enforced_after_rehash(self):
  from ta07_inventory import COMMAND_FILES,CAST_FILES
  for group,cap,label in [(COMMAND_FILES,12000,'command group'),(CAST_FILES,24000,'cast group')]:
   self.restore();total=sum((self.root/name).stat().st_size for name in group);path=group[-1]
   self.changed_source(path,(self.root/path).read_text()+'\n'*(cap-total+1))
   with self.subTest(group=label),self.assertRaisesRegex(AssertionError,label+' exceeds fixed budget'):self.check()
 def test_ta07_exact_references_and_consumer_contract_cannot_be_omitted(self):
  original=self.data()
  for key,value in [('sourceReferences',[]),('bindings',{}),('bindings',{'web/src/App.vue':['fake']})]:
   m=copy.deepcopy(original);m[key]=value;self.reject(m)
 def test_ta07_contract_and_original_reference_files_must_exist(self):
  from ta07_inventory import REFS,REFERENCE
  for name in [REFS[0],REFERENCE]:
   self.restore();(self.root/name).unlink()
   with self.subTest(name=name),self.assertRaisesRegex(AssertionError,'Missing or external'):self.check()
 def test_ta07_components_need_real_imports_not_a_name_in_a_comment(self):
  for path,name in [('web/src/BattleDeck.vue','BattleCommandConsole'),('web/src/ActionFeedbackStage.vue','BattleCast')]:
   self.restore();text=(self.root/path).read_text();changed=text.replace('import '+name,'//import '+name,1);self.assertNotEqual(changed,text);self.changed_source(path,changed)
   with self.subTest(name=name),self.assertRaisesRegex(AssertionError,'component import is detached'):self.check()
 def test_ta07_commented_out_render_tag_cannot_fake_a_live_consumer(self):
  import re
  for path,name in [('web/src/BattleDeck.vue','BattleCommandConsole'),('web/src/ActionFeedbackStage.vue','BattleCast')]:
   self.restore();text=(self.root/path).read_text();changed,count=re.subn(r'(<'+name+r'\b[^>]*?/>)',r'<!--\1-->',text,count=1);self.assertEqual(count,1);self.changed_source(path,changed)
   with self.subTest(name=name),self.assertRaises(AssertionError):self.check()
 def test_ta07_saved_cast_must_remain_inside_the_original_trusted_motion_container(self):
  path='web/src/ActionFeedbackStage.vue';text=(self.root/path).read_text();changed=text.replace('v-if="notice&&showMotion" :key="\'art-\'+notice.key"','v-if="notice" :key="\'art-\'+notice.key"',1);self.assertNotEqual(changed,text);self.changed_source(path,changed)
  with self.assertRaisesRegex(AssertionError,'trusted motion container'):self.check()
 def test_ta07_actor_constant_and_real_player_image_binding_cannot_be_detached(self):
  for path,before,after in [('web/src/assets.ts','art/v2/actors/player-standing-cold-v1.webp','art/v2/characters/player.webp'),('web/src/BattlePresence.vue',':path="BATTLE_PLAYER_ASSET"',':path="PORTRAIT_ASSETS.player"')]:
   self.restore();text=(self.root/path).read_text();self.assertIn(before,text);self.changed_source(path,text.replace(before,after,1))
   with self.subTest(path=path),self.assertRaises(AssertionError):self.check()
 def test_ta07_own_stylesheets_must_be_consumed_even_after_source_rehash(self):
  for path,token in [('web/src/BattleCommandConsole.vue',"import './ta07-commands.css'"),('web/src/BattleCast.vue',"import './ta07-cast.css'")]:
   self.restore();text=(self.root/path).read_text();self.assertIn(token,text);self.changed_source(path,text.replace(token,'',1))
   with self.subTest(path=path),self.assertRaisesRegex(AssertionError,'Missing TA07 consumer'):self.check()
 def test_ta07_battle_domain_command_identity_and_complete_shared_proof_remain_connected(self):
  for path,token in [('web/src/battle-choreography.ts',"const matching=(a:Activity)=>a.version===6&&a.plan.kind!=='travel';"),('web/src/battle-choreography.ts',"a.nextCommand?.type!=='BATTLE'"),('web/src/battle-choreography.ts','r.generation!==a.generation'),('web/src/battle-choreography.ts','tracker.consume(o,g,a,result,replayed,eligible)'),('web/src/activity-effects.ts','resolve(before,command)'),('web/src/activity-effects.ts','proof(expected)!==proof(a)')]:
   self.restore();text=(self.root/path).read_text();self.assertIn(token,text);self.changed_source(path,text.replace(token,'detached',1))
   with self.subTest(path=path,token=token),self.assertRaisesRegex(AssertionError,'Missing TA07 consumer'):self.check()
 def test_ta07_raster_hash_and_actual_headers_cannot_be_invented(self):
  original=self.data();m=copy.deepcopy(original);m['assets'][0]['source']['sha256']='0'*64;self.reject(m)
  for key in ['source','runtime']:
   self.restore();m=self.data();row=m['assets'][0][key];path=self.root/row['path'];raw=b'INVALID!'+path.read_bytes()[8:];path.write_bytes(raw);row.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest());self.write(m)
   with self.subTest(key=key),self.assertRaises(AssertionError):self.check()
 def test_ta07_opaque_image_header_cannot_borrow_true_alpha_metadata(self):
  for key in ['source','runtime']:
   self.restore();m=self.data();row=m['assets'][0][key];path=self.root/row['path'];raw=bytearray(path.read_bytes())
   if key=='source':self.assertEqual(raw[25],6);raw[25]=2
   else:self.assertEqual(raw[12:16],b'VP8X');self.assertTrue(raw[20]&16);raw[20]&=~16
   path.write_bytes(raw);row.update(sha256=hashlib.sha256(raw).hexdigest());self.write(m)
   with self.subTest(key=key),self.assertRaisesRegex(AssertionError,'header/alpha'):self.check()
 def test_ta07_runtime_byte_cap_enforced_with_a_valid_riff_length_after_rehash(self):
  m=self.data();row=m['assets'][0]['runtime'];path=self.root/row['path'];raw=bytearray(path.read_bytes()+b'JUNK'+(160000).to_bytes(4,'little')+b'x'*160000);raw[4:8]=(len(raw)-8).to_bytes(4,'little');path.write_bytes(raw);row.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest());self.write(m)
  with self.assertRaisesRegex(AssertionError,'runtime dimensions/bytes exceeded'):self.check()
 def test_ta07_real_alpha_counts_types_and_nonempty_transparency_are_bound(self):
  for change in [lambda r:r['runtimeAlphaProof'].update(solidPixels=r['runtimeAlphaProof']['solidPixels']+1),lambda r:r['alphaProof'].update(min=False),lambda r:r['runtimeAlphaProof'].update(transparentPixels=0),lambda r:r['decodeProof'].update(sourceRGBASHA256='not-a-digest')]:
   self.restore();self.changed_receipt(change)
   with self.assertRaises(AssertionError):self.check()
 def test_ta07_alpha_bbox_must_contain_real_nontransparent_pixels_without_false_margin_claim(self):
  # A zero-edge bbox is valid: the actual source hair touches the canvas edge.
  self.assertEqual(self.data()['assets'][0]['id'],'player-standing-cold-v1')
  for value in [[0,0,1,1],[False,0,499,507],[-1,0,499,507],[0,0,513,507]]:
   self.restore();self.changed_receipt(lambda r:r.update(runtimeAlphaBBox=value))
   with self.subTest(value=value),self.assertRaisesRegex(AssertionError,'alpha bbox'):self.check()
 def test_ta07_exact_tool_prompt_transparency_and_identity_reference_are_required(self):
  from ta07_inventory import PROMPT
  for change in [lambda p:p.update(prompt=''),lambda p:p.update(transparent_background=False),lambda p:p.update(referenceImage='../other.png'),lambda p:p.update(userAcceptance=True),lambda p:p.update(prompt=p['prompt']+' changed')]:
   self.restore();path=self.root/PROMPT;prompt=json.loads(path.read_text());change(prompt);path.write_text(json.dumps(prompt))
   with self.assertRaises(AssertionError):self.check()
 def test_ta07_receipt_identity_reference_decode_and_reexport_facts_cannot_be_forged(self):
  for change in [lambda r:r.update(copiedUnchanged=False),lambda r:r.update(userAcceptance=True),lambda r:r.update(promptSHA256='0'*64),lambda r:r['referenceImages'][0].update(sha256='0'*64),lambda r:r['encoding'].__setitem__(2,'70'),lambda r:r['exportProof'].update(reencodedSHA256='0'*64),lambda r:r['review'].update(actuallyViewed=False)]:
   self.restore();self.changed_receipt(change)
   with self.assertRaises(AssertionError):self.check()
 def test_ta07_receipt_must_be_present_and_hash_bound(self):
  m=self.data();ref=m['assets'][0]['receipt'];ref['sha256']='0'*64;self.reject(m)
  self.restore();(self.root/self.data()['assets'][0]['receipt']['path']).unlink()
  with self.assertRaisesRegex(AssertionError,'Missing or external'):self.check()
 def test_ta07_prompt_document_digest_is_distinct_from_literal_prompt_digest(self):
  from ta07_inventory import PROMPT
  prompt=(self.root/PROMPT).read_bytes();literal=json.loads(prompt)['prompt'].encode()
  self.assertNotEqual(hashlib.sha256(prompt).hexdigest(),hashlib.sha256(literal).hexdigest())
  self.changed_receipt(lambda r:r.update(promptDocumentSHA256=hashlib.sha256(literal).hexdigest()))
  with self.assertRaisesRegex(AssertionError,'prompt document identity'):self.check()

class TA08InventoryTests(unittest.TestCase):
 def setUp(self):
  from ta08_inventory import NATIVE,REFS,PROMPT_REFS,DEPENDENCIES,LEDGER
  self.temp=tempfile.TemporaryDirectory(prefix='chenyuan-ta08-negative-');self.root=Path(self.temp.name)
  from ux33_inventory import prior_ux33_bytes
  self.original={name:prior_ux33_bytes(name,(ROOT/name).read_bytes()) if name in NATIVE else (ROOT/name).read_bytes() for name in set(NATIVE+REFS+PROMPT_REFS+DEPENDENCIES+[LEDGER])};self.restore()
 def tearDown(self):self.temp.cleanup()
 def restore(self):
  for name,raw in self.original.items():
   p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True)
   if p.is_symlink():p.unlink()
   p.write_bytes(raw)
 def data(self):return json.loads((self.root/'art/redesign/ta08.json').read_text())
 def write(self,m):(self.root/'art/redesign/ta08.json').write_text(json.dumps(m))
 def check(self):
  from ta08_inventory import validate_ta08
  from check_inventory import image_info
  return validate_ta08(self.root,image_info)
 def reject(self,m):
  self.write(m)
  with self.assertRaises(AssertionError):self.check()
 def changed_source(self,path,text):
  raw=text.encode();(self.root/path).write_bytes(raw);m=self.data()
  for row in m['files']:
   if row['path']==path:row.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest())
  self.write(m)
 def changed_receipt(self,change,index=0):
  m=self.data();ref=m['assets'][index]['receipt'];p=self.root/ref['path'];r=json.loads(p.read_text());change(r);p.write_text(json.dumps(r));ref['sha256']=hashlib.sha256(p.read_bytes()).hexdigest();self.write(m)
 def test_ta08_actual_five_sources_six_independent_paintings_and_fixed_total(self):
  from ta08_inventory import NATIVE,SOURCE_IDS
  files,production,total=self.check();m=self.data();self.assertEqual(len(files),12);self.assertEqual(production,6);self.assertEqual(total,sum((self.root/p).stat().st_size for p in NATIVE));self.assertLessEqual(total,42000);self.assertEqual([a['sourceId']for a in m['assets']],SOURCE_IDS);self.assertLessEqual(sum(a['runtime']['bytes']for a in m['assets']),960000)
 def test_ta08_missing_ledger_rejects_present_native_implementation(self):
  (self.root/'art/redesign/ta08.json').unlink()
  with self.assertRaisesRegex(AssertionError,'Unrecorded TA08'):self.check()
 def test_ta08_missing_ledger_rejects_paintings_before_source_lands(self):
  from ta08_inventory import NATIVE
  (self.root/'art/redesign/ta08.json').unlink()
  for name in NATIVE:(self.root/name).unlink()
  with self.assertRaisesRegex(AssertionError,'Unrecorded TA08'):self.check()
 def test_ta08_manifest_requires_exact_shape(self):
  original=self.data()
  for change in [lambda m:m.pop('promptReferences'),lambda m:m.update(extra=True)]:
   m=copy.deepcopy(original);change(m);self.reject(m)
 def test_ta08_header_scope_and_human_acceptance_are_not_aliasable(self):
  original=self.data()
  for key,value in [('format','other'),('version',True),('version',1.0),('version',2),('task','Goal4 ART02'),('scope','New game rules accepted'),('userAcceptance',True),('userAcceptance',0)]:
   with self.subTest(key=key,value=value):m=copy.deepcopy(original);m[key]=value;self.reject(m)
 def test_ta08_all_native_single_and_combined_raster_caps_are_fixed_integers(self):
  original=self.data()
  for key,value in original['budgets'].items():
   for invalid in [value+1,True,float(value)]:
    with self.subTest(key=key,value=invalid):m=copy.deepcopy(original);m['budgets'][key]=invalid;self.reject(m)
 def test_ta08_ordered_complete_source_inventory_and_identity_rows_required(self):
  original=self.data()
  for change in [lambda m:m['files'].pop(),lambda m:m['files'].reverse(),lambda m:m['files'].append(copy.deepcopy(m['files'][0])),lambda m:m['files'][0].update(extra=True)]:
   m=copy.deepcopy(original);change(m);self.reject(m)
 def test_ta08_source_bytes_hash_and_numeric_aliases_rejected(self):
  original=self.data()
  for key,value in [('bytes',0),('bytes',True),('bytes',float(original['files'][0]['bytes'])),('sha256','0'*64),('sha256','invalid')]:
   m=copy.deepcopy(original);m['files'][0][key]=value;self.reject(m)
 def test_ta08_local_source_asset_prompt_and_ledger_paths_cannot_escape(self):
  original=self.data()
  for value in ['/tmp/SourceObject.vue','../SourceObject.vue','web\\src\\SourceObject.vue']:
   m=copy.deepcopy(original);m['files'][0]['path']=value;self.reject(m)
  for name in ['art/redesign/ta08.json','web/src/SourceObject.vue','art/redesign/receipts/ta08-resource-prompts.json','web/public/art/v2/sources/herbs-cold-v1.webp']:
   self.restore();p=self.root/name;raw=p.read_bytes()
   with tempfile.TemporaryDirectory(prefix='chenyuan-ta08-outside-')as folder:
    outside=Path(folder)/p.name;outside.write_bytes(raw);p.unlink();p.symlink_to(outside)
    with self.subTest(name=name),self.assertRaises(AssertionError):self.check()
 def test_ta08_required_actual_files_and_contract_cannot_be_missing(self):
  from ta08_inventory import NATIVE,REFS,PROMPTS
  for name in [NATIVE[0],REFS[0],PROMPTS]:
   self.restore();(self.root/name).unlink()
   with self.subTest(name=name),self.assertRaisesRegex(AssertionError,'Missing or external'):self.check()
 def test_ta08_actual_whole_five_file_budget_enforced_after_rehash(self):
  m=self.data();path=m['files'][-1]['path'];total=sum(row['bytes']for row in m['files']);self.changed_source(path,(self.root/path).read_text()+'\n'*(42001-total))
  with self.assertRaisesRegex(AssertionError,'native code exceeds fixed budget'):self.check()
 def test_ta08_reference_prompt_and_consumer_contract_must_stay_complete(self):
  original=self.data()
  for key,value in [('sourceReferences',[]),('promptReferences',[]),('bindings',{}),('bindings',{'web/src/App.vue':['fake']})]:
   m=copy.deepcopy(original);m[key]=value;self.reject(m)
 def test_ta08_commented_import_or_render_token_cannot_fake_objects(self):
  import re
  path='web/src/SourceField.vue'
  for name in ['SourceObject','SourceCommission','SourceSatchel']:
   for mutation in ['import','tag']:
    self.restore();text=(self.root/path).read_text()
    if mutation=='import':changed=text.replace('import '+name,'//import '+name,1)
    else:changed,count=re.subn(r'(<'+name+r'\b[^>]*?/>)',r'<!--\1-->',text,count=1);self.assertEqual(count,1)
    self.assertNotEqual(changed,text);self.changed_source(path,changed)
    with self.subTest(name=name,mutation=mutation),self.assertRaises(AssertionError):self.check()
 def test_ta08_children_cannot_add_a_clock_store_or_storage_after_rehash(self):
  for expression in ['setTimeout(()=>{},1)','setInterval(()=>{},1)','Date.now()','indexedDB.open("private")','useActivityPresentation(()=>true,()=>"other")']:
   self.restore();path='web/src/source-choreography.ts';self.changed_source(path,(self.root/path).read_text()+'\n'+expression)
   with self.subTest(expression=expression),self.assertRaisesRegex(AssertionError,'Store/IO or its own clock'):self.check()
 def test_ta08_real_object_stylesheet_import_must_remain_connected(self):
  import re
  from ta08_inventory import NATIVE
  changed=0
  for path in ['web/src/SourceField.vue']+NATIVE[:4]:
   text=(self.root/path).read_text();next_text,count=re.subn(r'import\s+[\'\"]\./ta08-source\.css[\'\"];?','',text);changed+=count
   if count:self.changed_source(path,next_text)
  self.assertGreater(changed,0)
  with self.assertRaisesRegex(AssertionError,'stylesheet is not consumed'):self.check()
 def test_ta08_source_projection_chain_and_full_shared_proof_cannot_be_detached(self):
  seams=[('web/src/SourceField.vue','a.version===2&&a.plan.sourceId===props.plan.sourceId'),('web/src/activity-effects.ts','resolve(before,command)'),('web/src/activity-effects.ts','proof(expected)!==proof(a)'),('web/src/use-activity-effect.ts','!store?.activityPausing'),('web/src/SourceSatchel.vue','sourceHoldings(props.game,props.sourceId)'),('web/src/SourceSatchel.vue','sourcePeriodTotals(props.game,props.sourceId,props.activity)'),('web/src/SourceSatchel.vue','savedSourceYield(props.game,props.sourceId,props.activity,props.result)'),('web/src/source-choreography.ts',"result.type!=='SOURCE'||result.executedSteps!==1||result.requestedSteps!==1"),('web/src/source-choreography.ts','result.runId!==game.core.runId||result.revisionAfter!==game.core.revision'),('web/src/source-choreography.ts','activity.runId!==game.core.runId||activity.gameRevision!==result.revisionAfter'),('web/src/source-choreography.ts','result.commandId!==`cycle:${activity.id}:${activity.generation}:${activity.completedCycles}`')]
  for path,token in seams:
   self.restore();text=(self.root/path).read_text();self.assertEqual(text.count(token),1);self.changed_source(path,text.replace(token,'detached',1))
   with self.subTest(path=path),self.assertRaisesRegex(AssertionError,'Missing TA08 consumer'):self.check()
 def test_ta08_actual_mapping_requires_six_paintings_and_ten_distinct_drawings(self):
  path='web/src/source-choreography.ts'
  for before,after in [("herbs:'art/v2/sources/herbs-cold-v1.webp'","herbs:'art/v2/sources/dew-cold-v1.webp'"),("work:'sweep'","work:'escort'"),("work:'sweep'","unknown:'sweep'")]:
   self.restore();text=(self.root/path).read_text();self.assertEqual(text.count(before),1)
   # Retain the literal in a comment: an unused token must not fake a live map.
   self.changed_source(path,text.replace(before,after,1)+'\n/* '+before+' */')
   with self.subTest(before=before),self.assertRaisesRegex(AssertionError,'six natural paintings|ten commission'):self.check()
 def test_ta08_each_real_child_receives_trusted_props_and_readonly_arrange(self):
  import re
  cases=[('web/src/SourceField.vue','SourceObject',':sequence="effect?.sequence??0"',':sequence="999"'),('web/src/SourceField.vue','SourceCommission',':state="state"',':state="\'working\'"'),('web/src/SourceField.vue','SourceSatchel',':result="effect?.result??null"',':result="null"'),('web/src/SourcePlanner.vue','SourceField','@arrange="settings?.showModal()"','@arrange="undefined"'),('web/src/SourceObject.vue','AssetImage',':path="SOURCE_ART[sourceId]"',':path="\'unrelated.webp\'"')]
  for path,component,before,after in cases:
   self.restore();text=(self.root/path).read_text();tags=re.findall(r'<'+component+r'\b(?:[^>"\']|"[^"]*"|\'[^\']*\')*>',text);self.assertEqual(len(tags),1);tag=tags[0];self.assertEqual(tag.count(before),1);self.assertEqual(text.count(tag),1)
   self.changed_source(path,text.replace(tag,tag.replace(before,after,1),1))
   with self.subTest(component=component),self.assertRaises(AssertionError):self.check()
 def test_ta08_exact_six_unique_asset_source_ids_order_and_paths_required(self):
  original=self.data()
  for change in [lambda m:m['assets'].pop(),lambda m:m['assets'].append(copy.deepcopy(m['assets'][0])),lambda m:m['assets'].reverse(),lambda m:m['assets'].__setitem__(1,copy.deepcopy(m['assets'][0])),lambda m:m['assets'][0].update(sourceId='herb'),lambda m:m['assets'][0]['runtime'].update(path='../herbs.webp')]:
   m=copy.deepcopy(original);change(m);self.reject(m)
 def test_ta08_painting_identity_and_actual_headers_cannot_be_invented(self):
  m=self.data();m['assets'][0]['source']['sha256']='0'*64;self.reject(m)
  for key in ['source','runtime']:
   self.restore();m=self.data();row=m['assets'][0][key];p=self.root/row['path'];raw=b'INVALID!'+p.read_bytes()[8:];p.write_bytes(raw);row.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest());self.write(m)
   with self.subTest(key=key),self.assertRaises(AssertionError):self.check()
 def test_ta08_opaque_actual_header_cannot_borrow_transparent_metadata(self):
  for key in ['source','runtime']:
   self.restore();m=self.data();row=m['assets'][0][key];p=self.root/row['path'];raw=bytearray(p.read_bytes())
   if key=='source':self.assertEqual(raw[25],6);raw[25]=2
   else:self.assertEqual(raw[12:16],b'VP8X');self.assertTrue(raw[20]&16);raw[20]&=~16
   p.write_bytes(raw);row.update(sha256=hashlib.sha256(raw).hexdigest());self.write(m)
   with self.subTest(key=key),self.assertRaisesRegex(AssertionError,'header/alpha'):self.check()
 def test_ta08_each_runtime_byte_cap_applies_even_to_last_asset_after_rehash(self):
  m=self.data();row=m['assets'][-1]['runtime'];p=self.root/row['path'];raw=bytearray(p.read_bytes()+b'JUNK'+(160000).to_bytes(4,'little')+b'x'*160000);raw[4:8]=(len(raw)-8).to_bytes(4,'little');p.write_bytes(raw);row.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest());self.write(m)
  with self.assertRaisesRegex(AssertionError,'runtime dimensions/bytes exceeded'):self.check()
 def test_ta08_image_dimensions_format_and_boolean_aliases_rejected(self):
  original=self.data()
  for change in [lambda m:m['assets'][0]['runtime']['dimensions'].update(width=512.0),lambda m:m['assets'][0]['runtime'].update(alpha=1),lambda m:m['assets'][0]['source'].update(format='webp')]:
   m=copy.deepcopy(original);change(m);self.reject(m)
 def test_ta08_alpha_pixel_counts_types_and_nonempty_transparency_required(self):
  for change in [lambda r:r['runtimeAlphaProof'].update(solidPixels=r['runtimeAlphaProof']['solidPixels']+1),lambda r:r['alphaProof'].update(min=False),lambda r:r['runtimeAlphaProof'].update(transparentPixels=0),lambda r:r['decodeProof'].update(runtimeRGBASHA256='invalid')]:
   self.restore();self.changed_receipt(change)
   with self.assertRaises(AssertionError):self.check()
 def test_ta08_alpha_bbox_must_be_typed_inbounds_and_cover_recorded_subject(self):
  for box in [[0,0,1,1],[False,0,512,512],[-1,0,512,512],[0,0,513,512]]:
   self.restore();self.changed_receipt(lambda r:r.update(runtimeAlphaBBox=box))
   with self.subTest(box=box),self.assertRaisesRegex(AssertionError,'alpha bbox'):self.check()
 def test_ta08_prompt_collection_requires_six_exact_real_tool_inputs(self):
  from ta08_inventory import PROMPTS
  for change in [lambda m:m['prompts'].pop('dao'),lambda m:m.update(version=True),lambda m:m.update(userAcceptance=True),lambda m:m['prompts']['herbs'].update(prompt=''),lambda m:m['prompts']['herbs'].update(transparent_background=False)]:
   self.restore();p=self.root/PROMPTS;m=json.loads(p.read_text());change(m);p.write_text(json.dumps(m))
   with self.assertRaises(AssertionError):self.check()
 def test_ta08_literal_and_document_hashes_and_prompt_key_cannot_be_conflated(self):
  from ta08_inventory import PROMPTS
  raw=(self.root/PROMPTS).read_bytes();literal=json.loads(raw)['prompts']['herbs']['prompt'].encode();self.assertNotEqual(hashlib.sha256(raw).hexdigest(),hashlib.sha256(literal).hexdigest())
  for change in [lambda r:r.update(promptSHA256=hashlib.sha256(raw).hexdigest()),lambda r:r.update(promptDocumentSHA256=hashlib.sha256(literal).hexdigest()),lambda r:r.update(promptKey='dew')]:
   self.restore();self.changed_receipt(change)
   with self.assertRaisesRegex(AssertionError,'literal/document prompt identity'):self.check()
 def test_ta08_receipts_require_hash_bound_actual_provenance_and_reexport(self):
  m=self.data();m['assets'][0]['receipt']['sha256']='0'*64;self.reject(m)
  for change in [lambda r:r.update(copiedUnchanged=False),lambda r:r.update(sourceId='dew'),lambda r:r.update(userAcceptance=True),lambda r:r['encoding'].__setitem__(2,'70'),lambda r:r['exportProof'].update(reencodedSHA256='0'*64),lambda r:r['review'].update(actuallyViewed=False)]:
   self.restore();self.changed_receipt(change)
   with self.assertRaises(AssertionError):self.check()
 def test_ta08_no_identity_reference_or_external_prompt_consumer_can_be_invented(self):
  for change in [lambda r:r.update(promptReference='../prompts.json'),lambda r:r.update(referenceImages=[{'path':'/tmp/ref.png'}]),lambda r:r.update(sourcePath='not-original')]:
   self.restore();self.changed_receipt(change)
   with self.assertRaises(AssertionError):self.check()

# TA09 object integrity cases; all earlier339 tests remain unchanged.
class TA09InventoryTests(unittest.TestCase):
 def setUp(self):
  from ta09_inventory import NATIVE,REFS,DEPENDENCIES,LEDGER
  self.temp=tempfile.TemporaryDirectory(prefix='chenyuan-ta09-negative-');self.root=Path(self.temp.name)
  from ux31_inventory import prior_ux31_bytes
  # Keep every legacy ownership/slot assertion on the exact original display view.
  names=set(NATIVE+REFS+DEPENDENCIES+[LEDGER]);self.original={p:prior_ux31_bytes(p,(ROOT/p).read_bytes())for p in names};self.restore()
 def tearDown(self):self.temp.cleanup()
 def restore(self):
  for name,raw in self.original.items():
   p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True)
   if p.is_symlink():p.unlink()
   p.write_bytes(raw)
 def data(self):return json.loads((self.root/'art/redesign/ta09.json').read_text())
 def write(self,m):(self.root/'art/redesign/ta09.json').write_text(json.dumps(m))
 def check(self):
  from ta09_inventory import validate_ta09
  from check_inventory import image_info
  return validate_ta09(self.root,image_info)
 def reject(self,m):
  self.write(m)
  with self.assertRaises(AssertionError):self.check()
 def changed_source(self,path,text):
  from ta09_inventory import OLD_CAPS,LEDGER
  raw=text.encode();(self.root/path).write_bytes(raw)
  for name in [LEDGER]+[x['ledger']for x in OLD_CAPS]:
   m=json.loads((self.root/name).read_text());changed=False
   for row in m['files']:
    if row['path']==path:row.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest());changed=True
   if changed:(self.root/name).write_text(json.dumps(m))
 def opening(self,path,component):
  import re
  text=(self.root/path).read_text();tags=re.findall(r'<'+component+r'(?=[\s/>])(?:[^>"\']|"[^"]*"|\'[^\']*\')*>',text)
  self.assertEqual(len(tags),1);self.assertEqual(text.count(tags[0]),1);return text,tags[0]
 def test_ta09_real_five_sources_zero_new_images_and_fixed_total(self):
  from ta09_inventory import NATIVE,LEDGER
  files,production,total=self.check();self.assertEqual(files,set(NATIVE)|{LEDGER});self.assertEqual(production,0);self.assertEqual(total,sum((self.root/p).stat().st_size for p in NATIVE));self.assertLessEqual(total,30000)
 def test_ta09_missing_ledger_rejects_present_implementation(self):
  (self.root/'art/redesign/ta09.json').unlink()
  with self.assertRaisesRegex(AssertionError,'Unrecorded TA09'):self.check()
 def test_ta09_header_and_human_boundary_cannot_be_aliases(self):
  original=self.data()
  for key,value in [('format','other'),('version',True),('version',1.0),('task','Goal4 ART03'),('scope','New rewards accepted'),('userAcceptance',True),('userAcceptance',0)]:
   m=copy.deepcopy(original);m[key]=value;self.reject(m)
 def test_ta09_shape_and_exact_refs_cannot_be_removed(self):
  original=self.data()
  for change in [lambda m:m.pop('reusedAssets'),lambda m:m.update(extra=True),lambda m:m.update(sourceReferences=[]),lambda m:m.update(bindings={})]:
   m=copy.deepcopy(original);change(m);self.reject(m)
 def test_ta09_all_budgets_are_fixed_integers(self):
  original=self.data()
  for key,value in original['budgets'].items():
   for bad in [value+1,True,float(value)]:
    m=copy.deepcopy(original);m['budgets'][key]=bad;self.reject(m)
 def test_ta09_native_inventory_is_ordered_complete_and_unique(self):
  original=self.data()
  for change in [lambda m:m['files'].pop(),lambda m:m['files'].reverse(),lambda m:m['files'].append(copy.deepcopy(m['files'][0])),lambda m:m['files'].__setitem__(1,copy.deepcopy(m['files'][0]))]:
   m=copy.deepcopy(original);change(m);self.reject(m)
 def test_ta09_hash_bytes_and_boolean_aliases_rejected(self):
  original=self.data()
  for key,value in [('bytes',True),('bytes',0),('bytes',float(original['files'][0]['bytes'])),('sha256','invalid'),('sha256','0'*64)]:
   m=copy.deepcopy(original);m['files'][0][key]=value;self.reject(m)
 def test_ta09_missing_sources_and_refs_rejected(self):
  from ta09_inventory import NATIVE,REFS
  for name in [NATIVE[0],NATIVE[-1],REFS[0]]:
   self.restore();(self.root/name).unlink()
   with self.subTest(name=name),self.assertRaisesRegex(AssertionError,'Missing or external'):self.check()
 def test_ta09_external_path_and_symlink_cannot_escape(self):
  m=self.data();m['files'][0]['path']='../escape.vue';self.reject(m);self.restore();name=m['files'][0]['path']='web/src/JadeEngraving.vue'
  with tempfile.TemporaryDirectory(prefix='ta09-outside-')as outer:
   target=Path(outer)/'actor.vue';target.write_bytes(self.original[name]);(self.root/name).unlink();(self.root/name).symlink_to(target)
   with self.assertRaisesRegex(AssertionError,'Missing or external'):self.check()
 def test_ta09_aggregate_native_cap_survives_rehash(self):
  m=self.data();path=m['files'][-1]['path'];total=sum(x['bytes']for x in m['files']);self.changed_source(path,(self.root/path).read_text()+'\n'*(30001-total))
  with self.assertRaisesRegex(AssertionError,'native code exceeds fixed budget'):self.check()
 def test_ta09_zero_new_raster_and_prompt_generation_is_enforced(self):
  original=self.data()
  for key,value in [('assets',[{'path':'new.webp'}]),('promptReferences',['fake-prompt.json'])]:
   m=copy.deepcopy(original);m[key]=value;self.reject(m)
 def test_ta09_four_reused_objects_cannot_change_order_ids_or_hashes(self):
  original=self.data()
  for change in [lambda m:m['reusedAssets'].pop(),lambda m:m['reusedAssets'].reverse(),lambda m:m['reusedAssets'][0].update(id='unknown'),lambda m:m['reusedAssets'][0]['runtime'].update(sha256='0'*64)]:
   m=copy.deepcopy(original);change(m);self.reject(m)
 def test_ta09_reused_runtime_and_source_bytes_are_real(self):
  for role in ['source','runtime']:
   self.restore();m=self.data();p=self.root/m['reusedAssets'][0][role]['path'];raw=p.read_bytes();p.write_bytes(b'INVALID!'+raw[8:])
   with self.subTest(role=role),self.assertRaisesRegex(AssertionError,'hash changed'):self.check()
 def test_ta09_old_caps_and_files_cannot_be_increased_or_moved(self):
  from ta09_inventory import OLD_CAPS
  for old in OLD_CAPS:
   for mode in ['cap','files']:
    self.restore();p=self.root/old['ledger'];m=json.loads(p.read_text())
    if mode=='cap':m[old['key']]+=1
    else:m['files'].pop()
    p.write_text(json.dumps(m))
    with self.subTest(ledger=old['ledger'],mode=mode),self.assertRaisesRegex(AssertionError,'old cap|moved old implementation'):self.check()
 def test_ta09_commented_import_or_opening_tag_is_not_a_live_child(self):
  from ta09_inventory import CONSUMERS
  for row in CONSUMERS:
   self.restore();path=row['host'];name=row['component'];text,tag=self.opening(path,name);self.changed_source(path,text.replace(tag,'<!--'+tag+'-->',1))
   with self.subTest(component=name),self.assertRaises(AssertionError):self.check()
 def test_ta09_trusted_props_and_readonly_events_are_real_attributes(self):
  import re
  from ta09_inventory import CONSUMERS
  self.assertGreaterEqual(len(CONSUMERS),3)
  for row in CONSUMERS:
   for attr,expected in row['attrs'].items():
    self.restore();path=row['host'];text,tag=self.opening(path,row['component']);pattern=re.escape(attr)+r'=("|\')(.*?)\1';matches=list(re.finditer(pattern,tag));self.assertEqual(len(matches),1);found=matches[0];self.assertEqual(found[2],expected)
    replacement='undefined'if expected!='undefined'else'null';changed=tag[:found.start(2)]+replacement+tag[found.end(2):];self.assertNotEqual(changed,tag);self.changed_source(path,text.replace(tag,changed,1))
    with self.subTest(component=row['component'],attr=attr),self.assertRaises(AssertionError):self.check()

  from ta09_inventory import Tags
  for row in CONSUMERS:
   for slot in row.get('requiredSlots',[]):
    for misplaced in [False,True]:
     self.restore();path=row['host'];text=(self.root/path).read_text();openings=re.findall(r'<template(?=[\s/>])(?:[^>"\']|"[^"]*"|\'[^\']*\')*>',text);tags=[tag for tag in openings if any(name=='template'and'#'+slot in attrs for name,attrs in Tags('<template>'+tag+'</template>').nodes)];self.assertEqual(len(tags),1);tag=tags[0];self.assertEqual(text.count(tag),1);start=text.index(tag);depth=0;end=None
     for match in re.finditer(r'</?template(?=[\s/>])(?:[^>"\']|"[^"]*"|\'[^\']*\')*>',text[start:]):
      token=match[0]
      if token.startswith('</'):depth-=1
      elif not token.endswith('/>'):depth+=1
      if depth==0:end=start+match.end();break
     self.assertIsNotNone(end);segment=text[start:end]
     if misplaced:
      remainder=text[:start]+text[end:];target=remainder.rfind('</template>');self.assertGreater(target,0);changed=remainder[:target]+segment+remainder[target:]
     else:
      comment='<!--'+tag+'-->';padding=len(segment.encode())-len(comment.encode());self.assertGreaterEqual(padding,0);changed=text[:start]+comment+' '*padding+text[end:]
     self.assertEqual(len(changed.encode()),len(text.encode()));self.changed_source(path,changed)
     with self.subTest(component=row['component'],slot=slot,misplaced=misplaced),self.assertRaisesRegex(AssertionError,'content slot|jade result'):self.check()
  path='web/src/JadeEngraving.vue';token='<span class="ta09-jade-result"><slot name="result"/></span>'
  for outside in [False,True]:
   self.restore();text=(self.root/path).read_text();self.assertEqual(text.count(token),1);changed='<span class="ta09-jade-result"></span><slot name="result"/>'if outside else'<span class="ta09-jade-result"><slot name="detached-result"/></span><!--<slot name="result"/>-->';self.changed_source(path,text.replace(token,changed,1))
   with self.subTest(outside=outside),self.assertRaisesRegex(AssertionError,'jade result slot'):self.check()
 def test_ta09_freeze_command_and_full_proof_cannot_be_detached(self):
  from ta09_inventory import BINDINGS
  for path,tokens in BINDINGS.items():
   for token in tokens:
    if path not in ['web/src/equipment-effects.ts','web/src/activity-effects.ts','web/src/use-activity-effect.ts']:continue
    self.restore();text=(self.root/path).read_text();self.assertEqual(text.count(token),1);self.changed_source(path,text.replace(token,'detached-proof',1))
    with self.subTest(path=path,token=token),self.assertRaisesRegex(AssertionError,'formal proof or consumer'):self.check()
 def test_ta09_children_and_projection_cannot_introduce_io_clocks_or_rewards(self):
  from ta09_inventory import NATIVE
  for path in NATIVE[:4]:
   for expression in ['setTimeout(()=>{},1)','requestAnimationFrame(()=>{})','Date.now()','indexedDB.open("hidden")','resolve(before,command)','useEquipmentCycle("learn",()=>"sword_mind")','game.core.player.stones=999']:
    self.restore();self.changed_source(path,(self.root/path).read_text()+'\n'+expression)
    with self.subTest(path=path,expression=expression),self.assertRaisesRegex(AssertionError,'Store/IO|IO, clocks|mutates Game'):self.check()
 def test_ta09_real_twelve_jade_map_and_four_relic_map_cannot_be_unused_literals(self):
  from ta09_inventory import NATIVE
  path=NATIVE[3]
  for token in ['sword_mind','talisman_return','frost_sword','cloud_mirror']:
   self.restore();text=(self.root/path).read_text();self.assertEqual(len(__import__('re').findall(r'\b'+token+r'\s*:',text)),1);changed=__import__('re').sub(r'\b'+token+r'(?=\s*:)',token+'_detached',text,count=1);self.changed_source(path,changed+'\n/* '+token+' */')
   with self.subTest(token=token),self.assertRaisesRegex(AssertionError,'twelve jade|four distinct relic'):self.check()
 def test_ta09_all_shape_branches_must_be_rendered_not_commented(self):
  from ta09_inventory import FORM_CONSUMERS
  self.assertTrue(FORM_CONSUMERS)
  for row in FORM_CONSUMERS:
   self.restore();path=row['source'];text=(self.root/path).read_text();tags=__import__('re').findall(r'<'+row['tag']+r'(?=[\s/>])(?:[^>"\']|"[^"]*"|\'[^\']*\')*>',text);from ta09_inventory import Tags
   matching=[tag for tag in tags if any(name==row['tag']and all(k in attrs and attrs[k]==v for k,v in row['attrs'].items())for name,attrs in Tags('<template>'+tag+'</template>').nodes)];self.assertEqual(len(matching),1);tag=matching[0];self.assertEqual(text.count(tag),1);self.changed_source(path,text.replace(tag,'<!--'+tag+'-->',1))
   with self.subTest(form=row['form']),self.assertRaisesRegex(AssertionError,'real SVG shape'):self.check()
 def test_ta09_stylesheet_import_must_be_a_real_consumer(self):
  import re
  from ta09_inventory import STYLESHEET_HOSTS
  count=0
  for path in STYLESHEET_HOSTS:
   text=(self.root/path).read_text();changed,n=re.subn(r'import\s+[\'\"]\./ta09-equipment\.css[\'\"];?','',text);count+=n
   if n:self.changed_source(path,changed)
  self.assertGreater(count,0)
  with self.assertRaisesRegex(AssertionError,'stylesheet is not actually consumed'):self.check()

 def test_ta09_queue_view_cannot_cache_command_runtime_or_game(self):
  path='web/src/equipment-choreography.ts';token='touched:boolean};'
  for field in ["command:Activity['nextCommand']",'runtime:unknown','game:Game']:
   self.restore();text=(self.root/path).read_text();self.assertEqual(text.count(token),1);self.changed_source(path,text.replace(token,'touched:boolean;'+field+'};',1))
   with self.subTest(field=field),self.assertRaisesRegex(AssertionError,'QueueView must contain only readonly'):self.check()
 def test_ta09_queue_view_restore_owner_emit_reset_and_page_clamp_are_real(self):
  from ta09_inventory import VIEW_BINDINGS
  for path,tokens in VIEW_BINDINGS.items():
   for token in tokens:
    if path.endswith('JadeEngraving.vue'):continue
    self.restore();text=(self.root/path).read_text();self.assertEqual(text.count(token),1);self.changed_source(path,text.replace(token,'detached-view-owner',1))
    with self.subTest(path=path,token=token),self.assertRaisesRegex(AssertionError,'formal proof or consumer'):self.check()
 def test_ta09_sealing_wins_open_preference_and_real_queue_entry_pagers_remain(self):
  from ta09_inventory import VIEW_BINDINGS,Tags
  path='web/src/JadeEngraving.vue';token=VIEW_BINDINGS[path][0];text=(self.root/path).read_text();self.assertEqual(text.count(token),1);self.changed_source(path,text.replace(token,'',1))
  with self.assertRaisesRegex(AssertionError,'formal proof or consumer'):self.check()
  for tid in ['queue-prev','queue-next','learning-plan-open']:
   self.restore();path='web/src/StudyQueueRail.vue'if tid!='learning-plan-open'else'web/src/LearningPlanner.vue';text=(self.root/path).read_text();element='div'if tid=='queue-next'else'button';openings=__import__('re').findall(r'<'+element+r'(?=[\s/>])(?:[^>"\']|"[^"]*"|\'[^\']*\')*>',text)
   tags=[tag for tag in openings if any(name==element and(attrs.get('class')=='ta09-queue-page'if tid=='queue-next'else attrs.get('data-testid')==tid)for name,attrs in Tags('<template>'+tag+'</template>').nodes)];self.assertEqual(len(tags),1);tag=tags[0];self.assertEqual(text.count(tag),1)
   old='v-if="pageCount>1"'if tid!='learning-plan-open'else'v-if="mode===\'manual\'"';self.assertEqual(tag.count(old),1);changed=tag.replace(old,'v-if="true"',1);self.changed_source(path,text.replace(tag,changed,1))
   with self.subTest(tid=tid),self.assertRaisesRegex(AssertionError,'pagination|real queue/manual'):self.check()

  path='web/src/JadeEngraving.vue';self.restore();text=(self.root/path).read_text();token=':opened.value?1:0';self.assertEqual(text.count(token),1);self.changed_source(path,text.replace(token,':props.mastered||opened.value?1:0',1))
  with self.assertRaisesRegex(AssertionError,'formal proof or consumer'):self.check()
  self.restore();text,tag=self.opening(path,'button');self.assertIn('data-testid="jade-object-inspect"',tag);self.assertEqual(tag.count(':disabled="locked"'),1);self.changed_source(path,text.replace(tag,tag.replace(':disabled="locked"',':disabled="false"',1),1))
  with self.assertRaisesRegex(AssertionError,'busy/open'):self.check()
  from ta09_inventory import REDUCED_SPREAD_RULES,css_rules
  path='web/src/ta09-equipment.css'
  for expected in REDUCED_SPREAD_RULES:
   self.restore();text=(self.root/path).read_text();rules=[rule for rule in css_rules(text)if rule['selector']==expected['selector']and rule['contexts']==expected['contexts']];self.assertEqual(len(rules),1);rule=rules[0];selector=text[rule['start']:rule['stop']];self.assertEqual(selector.count('[data-working=true]'),1);changed=text[:rule['start']]+selector.replace('[data-working=true]','',1)+text[rule['stop']:];self.changed_source(path,changed)
   with self.subTest(selector=expected['selector'],contexts=expected['contexts']),self.assertRaisesRegex(AssertionError,'reduced-motion spread override'):self.check()

class ART10InventoryTests(unittest.TestCase):
 def setUp(self):
  from art10_inventory import NATIVE,DEPENDENCIES,LEDGER
  self.temp=tempfile.TemporaryDirectory(prefix='chenyuan-art10-negative-');self.root=Path(self.temp.name)
  self.original={p:(ROOT/p).read_bytes() for p in set(NATIVE+DEPENDENCIES+[LEDGER])};self.restore()
 def tearDown(self):self.temp.cleanup()
 def restore(self):
  for name,raw in self.original.items():
   p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True)
   if p.is_symlink():p.unlink()
   p.write_bytes(raw)
 def data(self):return json.loads((self.root/'art/redesign/art10.json').read_text())
 def facts(self):return json.loads((self.root/'art/redesign/art10-relic-blanks/export-facts.json').read_text())
 def check(self):
  from art10_inventory import validate_art10
  from check_inventory import image_info
  return validate_art10(self.root,image_info)
 def write(self,path,data):(self.root/path).write_text(json.dumps(data))
 def sync(self,f):
  from art10_inventory import FACTS
  self.write(FACTS,f);m=self.data();m['assets']=copy.deepcopy(f['assets']);raw=(self.root/FACTS).read_bytes();m['provenance']['facts'].update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest());self.write('art/redesign/art10.json',m)
 def reject(self,m):
  self.write('art/redesign/art10.json',m)
  with self.assertRaises(AssertionError):self.check()
 def change_runtime(self,f,raw):
  r=f['assets'][0]['runtime'];(self.root/r['path']).write_bytes(raw);r.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest());proof=f['assets'][0]['exportProof'];proof.update(firstBytes=len(raw),secondBytes=len(raw),firstSHA256=r['sha256'],secondSHA256=r['sha256']);self.sync(f)
 def opening(self,component,css):
  from art10_inventory import Tags
  path='web/src/RelicInscription.vue';text=(self.root/path).read_text();tags=__import__('re').findall(r'<'+component+r'(?=[\s/>])(?:[^>"\']|"[^"]*"|\'[^\']*\')*>',text);matches=[tag for tag in tags if any(a.get('class')==css for _,a in Tags('<template>'+tag+'</template>').nodes)]
  self.assertEqual(len(matches),1);self.assertEqual(text.count(matches[0]),1);return path,text,matches[0]
 def test_art10_real_one_css_and_four_aligned_exports(self):
  from art10_inventory import NATIVE
  files,count,total=self.check();self.assertEqual(count,4);self.assertEqual(total,(self.root/NATIVE[0]).stat().st_size);self.assertLessEqual(total,12000);self.assertEqual(len([p for p in files if p.endswith('.webp')]),4)
 def test_art10_missing_ledger_rejects_present_producer(self):
  (self.root/'art/redesign/art10.json').unlink()
  with self.assertRaisesRegex(AssertionError,'Unrecorded ART10'):self.check()
 def test_art10_header_task_and_human_boundary_are_strict(self):
  for k,v in [('format','alias'),('version',True),('task','Goal4 complete'),('scope','user accepted'),('userAcceptance',True)]:
   self.restore();m=self.data();m[k]=v;self.reject(m)
  self.restore();f=self.facts();f['scope']='pixel and user accepted';self.sync(f)
  with self.assertRaisesRegex(AssertionError,'header/human'):self.check()
 def test_art10_exact_shape_source_refs_and_real_ref_files(self):
  m=self.data();del m['provenance'];self.reject(m);self.restore();m=self.data();m['sourceReferences']=[];self.reject(m);self.restore();(self.root/self.data()['sourceReferences'][0]).unlink()
  with self.assertRaises(AssertionError):self.check()
 def test_art10_fixed_budgets_reject_bool_and_increased_caps(self):
  for k in self.data()['budgets']:
   for value in [True,self.data()['budgets'][k]+1]:
    self.restore();m=self.data();m['budgets'][k]=value;self.reject(m)
 def test_art10_only_one_new_runtime_css_not_moved_old_code(self):
  for rows in [[],self.data()['files']*2,[dict(path='web/src/LearningPlanner.vue',bytes=1,sha256='0'*64)]]:
   self.restore();m=self.data();m['files']=rows;self.reject(m)
 def test_art10_actual_css_hash_bytes_and_types_are_bound(self):
  for k,v in [('sha256','0'*64),('bytes',True),('bytes',1)]:
   self.restore();m=self.data();m['files'][0][k]=v;self.reject(m)
 def test_art10_css_cap_survives_an_updated_hash(self):
  m=self.data();p=self.root/m['files'][0]['path'];raw=p.read_bytes()+b'\n'*12001;p.write_bytes(raw);m['files'][0].update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest());self.reject(m)
 def test_art10_four_asset_ids_order_and_facts_binding_are_fixed(self):
  for change in ['remove','duplicate','reorder','detach']:
   self.restore();m=self.data()
   if change=='remove':m['assets'].pop()
   elif change=='duplicate':m['assets'][1]=m['assets'][0]
   elif change=='reorder':m['assets'].reverse()
   else:m['assets'][0]['visualAcceptance']=True
   self.reject(m)
 def test_art10_relative_paths_and_symlinks_cannot_escape(self):
  m=self.data();m['provenance']['facts']['path']='../outside.json';self.reject(m);self.restore()
  with tempfile.TemporaryDirectory(prefix='art10-outside-') as folder:
   p=self.root/self.data()['assets'][0]['source']['path'];external=Path(folder)/'source.png';external.write_bytes(p.read_bytes());p.unlink();p.symlink_to(external)
   with self.assertRaises(AssertionError):self.check()
 def test_art10_original_and_runtime_hashes_are_actual(self):
  for field in ['source','runtime']:
   self.restore();p=self.root/self.data()['assets'][0][field]['path'];p.write_bytes(p.read_bytes()+b'changed')
   with self.assertRaises(AssertionError):self.check()
 def test_art10_transparency_requires_real_webp_alpha_header(self):
  f=self.facts();p=self.root/f['assets'][0]['runtime']['path'];raw=bytearray(p.read_bytes());self.assertEqual(raw[12:16],b'VP8X');raw[20]&=~16;self.change_runtime(f,bytes(raw))
  with self.assertRaisesRegex(AssertionError,'not transparent'):self.check()
 def test_art10_dimensions_and_alpha_counts_cannot_be_fabricated(self):
  for change in ['size','opaque','count','bbox']:
   self.restore();f=self.facts();r=f['assets'][0]['source']
   if change=='size':r['dimensions']['width']=512
   elif change=='opaque':r['alphaProof']['transparentPixels']=0
   elif change=='count':r['alphaProof']['intermediatePixels']+=1
   else:r['alphaBBox16'][2]=1255
   self.sync(f)
   with self.assertRaises(AssertionError):self.check()
 def test_art10_runtime_cap_survives_identity_and_export_rehash(self):
  f=self.facts();p=self.root/f['assets'][0]['runtime']['path'];raw=p.read_bytes();payload=b'\0'*(160010-len(raw)-8);self.assertEqual(len(payload)%2,0);padded=bytearray(raw+b'JUNK'+len(payload).to_bytes(4,'little')+payload);padded[4:8]=(len(padded)-8).to_bytes(4,'little');self.change_runtime(f,bytes(padded))
  with self.assertRaisesRegex(AssertionError,'single160000'):self.check()
 def test_art10_literal_and_document_prompt_hashes_are_distinct(self):
  f=self.facts();f['assets'][0]['prompt']['literalSHA256']=f['assets'][0]['prompt']['sha256'];self.sync(f)
  with self.assertRaisesRegex(AssertionError,'literal/document'):self.check()
 def test_art10_prompt_audit_and_copied_original_cannot_be_aliased(self):
  for key,value in [('copySHA256','0'*64),('promptSHA256','0'*64),('kind','provider signed'),('generatedOriginal','gone')]:
   self.restore();f=self.facts();r=f['assets'][0]['audit'];audit=json.loads((self.root/r['path']).read_text());audit[key]=value;self.write(r['path'],audit);raw=(self.root/r['path']).read_bytes();r.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest());self.sync(f)
   with self.assertRaises(AssertionError):self.check()
 def test_art10_current_finished_reference_identity_is_immutable(self):
  f=self.facts();f['assets'][0]['reference']['source']=copy.deepcopy(f['assets'][1]['reference']['source']);self.sync(f)
  with self.assertRaisesRegex(AssertionError,'reference source'):self.check()
 def test_art10_uniform_scale_translation_and_no_clip_are_derived(self):
  for key,value in [('scale',True),('scale',1),('translateX',0),('wholePaintedSourceInside',False)]:
   self.restore();f=self.facts();f['assets'][0]['transform'][key]=value;self.sync(f)
   with self.assertRaises(AssertionError):self.check()
 def test_art10_measured_bbox_residual_cannot_claim_exact_footprint(self):
  f=self.facts();self.assertNotEqual(f['assets'][3]['transform']['alpha16ResidualToReference'],[0,0,0,0]);f['assets'][3]['transform']['alpha16ResidualToReference']=[0,0,0,0];self.sync(f)
  with self.assertRaisesRegex(AssertionError,'recorded honestly'):self.check()
 def test_art10_double_export_proof_must_match_real_bytes(self):
  for key,value in [('bytesEqual',False),('secondSHA256','0'*64),('firstBytes',True),('sourceUnchanged',False)]:
   self.restore();f=self.facts();f['assets'][0]['exportProof'][key]=value;self.sync(f)
   with self.assertRaisesRegex(AssertionError,'double export'):self.check()
 def test_art10_actual_producer_and_reproducible_recipe_are_bound(self):
  for field,value in [('encoding',['cwebp','-q','1']),('alignment',{'nonuniformScale':True}),('decoderVersion','')]:
   self.restore();f=self.facts();f[field]=value;self.sync(f)
   with self.assertRaises(AssertionError):self.check()
  self.restore();m=self.data();m['provenance']['producer']['sha256']='0'*64;self.reject(m)
 def test_art10_real_blank_finished_and_fallback_openings_cannot_detach(self):
  for change in ['blank','fallback','finished']:
   self.restore()
   if change=='blank':
    path,text,tag=self.opening('AssetImage','relic-cold-blank');self.assertEqual(tag.count(':path='),1);changed=tag.replace("'art/v2/equipment/'+id+'-blank-v1.webp'","'art/v2/equipment/frost_sword-v1.webp'",1);self.assertNotEqual(tag,changed);(self.root/path).write_text(text.replace(tag,changed,1))
   else:
    path='web/src/RelicInscription.vue';text=(self.root/path).read_text();token='<GameIcon kind="relic" :id="id"/>'if change=='fallback'else'<slot name="artifact"/>';self.assertEqual(text.count(token),1);(self.root/path).write_text(text.replace(token,'<!--'+token+'-->',1))
   with self.assertRaises(AssertionError):self.check()
 def test_art10_real_proof_and_unique_css_consumers_remain(self):
  for path,token in [('web/src/equipment-effects.ts','cycleCommand.value=p.activity.value?.nextCommand??null;'),('web/src/main.ts',"import './art10-equipment.css'")]:
   self.restore();text=(self.root/path).read_text();self.assertEqual(text.count(token),1);changed=text.replace(token,' '*len(token),1);self.assertEqual(len(changed.encode()),len(text.encode()));(self.root/path).write_text(changed)
   with self.assertRaisesRegex(AssertionError,'consumer/proof'):self.check()
 def test_art10_old_caps_and_external_styles_cannot_expand_scope(self):
  from art10_inventory import OLD_CAPS
  for old in OLD_CAPS:
   self.restore();m=json.loads((self.root/old['ledger']).read_text());m[old['key']]+=1;self.write(old['ledger'],m)
   with self.assertRaisesRegex(AssertionError,'old budget'):self.check()
  self.restore();m=self.data();p=self.root/m['files'][0]['path'];raw=p.read_bytes()+b'\n@import "https://example.invalid/style.css";';p.write_bytes(raw);m['files'][0].update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest());self.reject(m)

class ART11InventoryTests(unittest.TestCase):
 def setUp(self):
  from art11_inventory import NATIVE,DEPENDENCIES,LEDGER
  self.temp=tempfile.TemporaryDirectory(prefix='chenyuan-art11-negative-');self.root=Path(self.temp.name)
  from ux31_inventory import prior_ux31_bytes
  # Standalone ART11 negatives exercise its exact pre-UX31 native contract.
  self.original={name:prior_ux31_bytes(name,(ROOT/name).read_bytes()) if name in NATIVE else (ROOT/name).read_bytes() for name in set(NATIVE+DEPENDENCIES+[LEDGER])};self.restore()
 def tearDown(self):self.temp.cleanup()
 def restore(self):
  for name,raw in self.original.items():
   path=self.root/name;path.parent.mkdir(parents=True,exist_ok=True)
   if path.is_symlink():path.unlink()
   path.write_bytes(raw)
 def data(self):return json.loads((self.root/'art/redesign/art11.json').read_text())
 def facts(self):return json.loads((self.root/'art/redesign/art11-items/export-facts.json').read_text())
 def check(self):
  from art11_inventory import validate_art11
  from check_inventory import image_info
  return validate_art11(self.root,image_info)
 def write(self,name,data):(self.root/name).write_text(json.dumps(data))
 def sync(self,f):
  from art11_inventory import FACTS
  self.write(FACTS,f);m=self.data();m['assets']=copy.deepcopy(f['assets']);raw=(self.root/FACTS).read_bytes();m['provenance']['facts'].update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest());self.write('art/redesign/art11.json',m)
 def reject(self,m):
  self.write('art/redesign/art11.json',m)
  with self.assertRaises(AssertionError):self.check()
 def change_native(self,index,text):
  m=self.data();row=m['files'][index];raw=text.encode();(self.root/row['path']).write_bytes(raw);row.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest());self.write('art/redesign/art11.json',m)
 def change_runtime(self,f,raw):
  row=f['assets'][0]['runtime'];(self.root/row['path']).write_bytes(raw);row.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest());proof=f['assets'][0]['exportProof'];proof.update(firstBytes=len(raw),secondBytes=len(raw),firstSHA256=row['sha256'],secondSHA256=row['sha256']);self.sync(f)
 def change_audit(self,key,value):
  f=self.facts();row=f['assets'][0]['audit'];data=json.loads((self.root/row['path']).read_text());data[key]=value;self.write(row['path'],data);raw=(self.root/row['path']).read_bytes();row.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest());self.sync(f)
 def test_art11_fourteen_real_exports_two_native_files_and_no_acceptance(self):
  files,count,total=self.check();self.assertEqual(count,14);self.assertEqual(total,sum(row['bytes'] for row in self.data()['files']));self.assertEqual(len([name for name in files if name.endswith('.webp')]),14);self.assertLessEqual(total,18000);self.assertIs(self.data()['userAcceptance'],False)
 def test_art11_missing_ledger_cannot_hide_present_production(self):
  (self.root/'art/redesign/art11.json').unlink()
  with self.assertRaisesRegex(AssertionError,'Unrecorded ART11'):self.check()
 def test_art11_header_scope_human_and_primitive_version_are_fixed(self):
  for key,value in [('format','alias'),('version',True),('task','Goal4 done'),('scope','accepted'),('userAcceptance',True)]:
   self.restore();m=self.data();m[key]=value;self.reject(m)
 def test_art11_exact_schema_references_and_actual_reference_files_required(self):
  for key in ['provenance','sourceReferences','bindings','consumers']:
   self.restore();m=self.data();del m[key];self.reject(m)
  self.restore();(self.root/self.data()['sourceReferences'][0]).unlink()
  with self.assertRaises(AssertionError):self.check()
 def test_art11_typed_caps_cannot_increase_or_use_boolean_aliases(self):
  for key,old in self.data()['budgets'].items():
   for value in [True,old+1]:
    self.restore();m=self.data();m['budgets'][key]=value;self.reject(m)
 def test_art11_exact_two_file_inventory_and_actual_identity_required(self):
  for rows in [[],self.data()['files']*2,list(reversed(self.data()['files']))]:
   self.restore();m=self.data();m['files']=rows;self.reject(m)
  for key,value in [('bytes',True),('bytes',1),('sha256','0'*64)]:
   self.restore();m=self.data();m['files'][0][key]=value;self.reject(m)
 def test_art11_each_native_cap_is_enforced_after_valid_rehash(self):
  for index,cap in [(0,4000),(1,14000)]:
   self.restore();name=self.data()['files'][index]['path'];self.change_native(index,(self.root/name).read_text()+'\n'*(cap+1))
   with self.assertRaisesRegex(AssertionError,'individual cap'):self.check()
 def test_art11_original_and_runtime_bytes_cannot_drift(self):
  for field in ['source','runtime']:
   self.restore();path=self.root/self.data()['assets'][0][field]['path'];path.write_bytes(path.read_bytes()+b'drift')
   with self.assertRaisesRegex(AssertionError,'actual bytes'):self.check()
 def test_art11_fourteen_ids_order_and_independent_source_paths_are_complete(self):
  for change in ['remove','duplicate','reorder','fake-path']:
   self.restore();m=self.data()
   if change=='remove':m['assets'].pop()
   elif change=='duplicate':m['assets'][1]=m['assets'][0]
   elif change=='reorder':m['assets'].reverse()
   else:m['assets'][0]['source']=copy.deepcopy(m['assets'][1]['source'])
   self.reject(m)
  self.restore();f=self.facts();generation=json.loads((self.root/f['assets'][0]['audit']['path']).read_text())['generatedOriginal'];row=f['assets'][1]
  for field,key in [('prompt','generatedPath'),('audit','generatedOriginal')]:
   data=json.loads((self.root/row[field]['path']).read_text());data[key]=generation;self.write(row[field]['path'],data);raw=(self.root/row[field]['path']).read_bytes();row[field].update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest())
  self.sync(f)
  with self.assertRaisesRegex(AssertionError,'independent paintings'):self.check()
 def test_art11_absolute_traversal_and_symlink_escape_rejected(self):
  for name in ['/tmp/outside.json','../outside.json']:
   self.restore();m=self.data();m['sourceReferences'][0]=name;self.reject(m)
  self.restore()
  with tempfile.TemporaryDirectory(prefix='art11-outside-') as folder:
   target=self.root/self.data()['assets'][0]['source']['path'];external=Path(folder)/'raw.png';external.write_bytes(target.read_bytes());target.unlink();target.symlink_to(external)
   with self.assertRaisesRegex(AssertionError,'external'):self.check()
 def test_art11_transparency_requires_real_webp_header_not_fact_alias(self):
  f=self.facts();raw=bytearray((self.root/f['assets'][0]['runtime']['path']).read_bytes());self.assertEqual(raw[12:16],b'VP8X');raw[20]&=~16;self.change_runtime(f,bytes(raw))
  with self.assertRaisesRegex(AssertionError,'not transparent'):self.check()
 def test_art11_dimensions_alpha_counts_and_nested_bounds_are_exact(self):
  for change in ['size','empty','count','bbox','primitive']:
   self.restore();f=self.facts();row=f['assets'][0]['source']
   if change=='size':row['dimensions']['width']=512
   elif change=='empty':row['alphaProof']['solidPixels']=0
   elif change=='count':row['alphaProof']['intermediatePixels']+=1
   elif change=='bbox':row['alphaBBox16'][2]=1255
   else:row['alphaBBox1'][0]=True
   self.sync(f)
   with self.assertRaises(AssertionError):self.check()
 def test_art11_actual_runtime_single_cap_survives_valid_riff_rehash(self):
  f=self.facts();raw=(self.root/f['assets'][0]['runtime']['path']).read_bytes();payload=b'\0'*(120010-len(raw)-8);self.assertEqual(len(payload)%2,0);changed=bytearray(raw+b'JUNK'+len(payload).to_bytes(4,'little')+payload);changed[4:8]=(len(changed)-8).to_bytes(4,'little');self.change_runtime(f,bytes(changed))
  with self.assertRaisesRegex(AssertionError,'single120000'):self.check()
 def test_art11_prompt_literal_and_document_hashes_cannot_be_confused(self):
  f=self.facts();self.assertNotEqual(f['assets'][0]['prompt']['literalSHA256'],f['assets'][0]['prompt']['sha256']);f['assets'][0]['prompt']['literalSHA256']=f['assets'][0]['prompt']['sha256'];self.sync(f)
  with self.assertRaisesRegex(AssertionError,'literal/document'):self.check()
 def test_art11_local_audit_cannot_claim_provider_metadata_or_altered_copy(self):
  for key,value in [('kind','provider signed'),('requestId','invented'),('model','invented'),('rawSha256','0'*64)]:
   self.restore();self.change_audit(key,value)
   with self.assertRaises(AssertionError):self.check()
 def test_art11_generated_original_path_keep_and_real_alpha_audit_are_bound(self):
  for key,value in [('generatedOriginal','not-original'),('originalKept',False),('alpha16Bbox',[0,0,1254,1254]),('workspaceRaw','other.png')]:
   self.restore();self.change_audit(key,value)
   with self.assertRaises(AssertionError):self.check()
 def test_art11_exact_producer_helper_and_codec_recipe_required(self):
  for field,value in [('encoding',['cwebp','-q','1']),('alignment',{}),('decoderVersion',''),('encoderVersion','')]:
   self.restore();f=self.facts();f[field]=value;self.sync(f)
   with self.assertRaises(AssertionError):self.check()
  for key in ['producer','helper']:
   self.restore();m=self.data();m['provenance'][key]['sha256']='0'*64;self.reject(m)
 def test_art11_partial_export_cannot_claim_fourteen_ready(self):
  for key,value in [('complete',False),('complete',1),('pending',['lotus'])]:
   self.restore();f=self.facts();f[key]=value;self.sync(f)
   with self.assertRaisesRegex(AssertionError,'incomplete'):self.check()
 def test_art11_uniform_whole_body_math_cannot_stretch_or_crop(self):
  for key,value in [('scale',True),('scale',1),('translateX',0),('wholePaintedSourceInside',False)]:
   self.restore();f=self.facts();f['assets'][0]['transform'][key]=value;self.sync(f)
   with self.assertRaises(AssertionError):self.check()
 def test_art11_actual_32px_margin_and_reported_runtime_boxes_are_honest(self):
  f=self.facts();a=f['assets'][0];a['runtime']['alphaBBox1'][0]=31;a['transform']['actualRuntimeAlphaBBox1'][0]=31;self.sync(f)
  with self.assertRaisesRegex(AssertionError,'raster32px'):self.check()
  self.restore();f=self.facts();f['assets'][0]['transform']['actualRuntimeAlphaBBox16'][0]+=1;self.sync(f)
  with self.assertRaisesRegex(AssertionError,'raster32px'):self.check()
 def test_art11_actual_double_export_bytes_and_source_unchanged_required(self):
  for key,value in [('bytesEqual',False),('sourceUnchanged',False),('secondSHA256','0'*64),('firstBytes',True)]:
   self.restore();f=self.facts();f['assets'][0]['exportProof'][key]=value;self.sync(f)
   with self.assertRaisesRegex(AssertionError,'export'):self.check()
 def test_art11_real_image_opening_and_nested_fallback_cannot_detach(self):
  from art11_inventory import NATIVE
  for token in [':path="path"','<GameIcon kind="item" :id="itemId"/>']:
   self.restore();text=(self.root/NATIVE[0]).read_text();self.assertEqual(text.count(token),1);changed=text.replace(token,'',1);self.assertNotEqual(text,changed);self.change_native(0,changed)
   with self.assertRaises(AssertionError):self.check()
 def test_art11_each_current_object_receives_actual_item_and_ownership(self):
  from art11_inventory import CONSUMERS,Tags
  for consumer in CONSUMERS:
   self.restore();path=consumer['host'];text=(self.root/path).read_text();openings=__import__('re').findall(r'<ItemArtifact(?=[\s/>])(?:[^>"\']|"[^"]*"|\'[^\']*\')*>',text)
   matches=[tag for tag in openings if any(name=='itemartifact' and all(attrs.get(k)==v for k,v in consumer['attrs'].items()) for name,attrs in Tags('<template>'+tag+'</template>').nodes)]
   self.assertEqual(len(matches),1);tag=matches[0];self.assertEqual(text.count(tag),1);self.assertEqual(tag.count(':owned='),1);changed=tag.replace(':owned=',':untrusted-owned=',1);self.assertNotEqual(tag,changed);(self.root/path).write_text(text.replace(tag,changed,1))
   with self.assertRaisesRegex(AssertionError,'consumer props'):self.check()
 def test_art11_native_object_has_no_io_timer_write_or_external_css(self):
  for suffix in ["\n<script>setTimeout(()=>{},1)</script>","\n<script>fetch('https://example.invalid')</script>"]:
   self.restore();text=(self.root/self.data()['files'][0]['path']).read_text();self.change_native(0,text.replace('</script>',suffix+'</script>',1))
   with self.assertRaises(AssertionError):self.check()
  self.restore();text=(self.root/self.data()['files'][1]['path']).read_text();self.change_native(1,text+'\n@import "https://example.invalid/style.css";')
  with self.assertRaisesRegex(AssertionError,'external IO'):self.check()
 def test_art11_supply_full_proof_and_unique_style_consumer_stay_strict(self):
  for path,token in [('web/src/supply-effects.ts','undefined,5'),('web/src/activity-effects.ts','resolve(before,command)'),('web/src/main.ts',"import './art11-inventory.css'")]:
   self.restore();text=(self.root/path).read_text();self.assertEqual(text.count(token),1);(self.root/path).write_text(text.replace(token,'/*'+token+'*/',1))
   with self.assertRaisesRegex(AssertionError,'consumer/proof'):self.check()
  self.restore();path=self.root/'web/src/main.ts';path.write_text(path.read_text()+"\nimport './art11-inventory.css';")
  with self.assertRaisesRegex(AssertionError,'uniquely'):self.check()
 def test_art11_all_old_caps_and_membership_remain_unchanged(self):
  from art11_inventory import CAPS
  for prior in CAPS:
   self.restore();data=json.loads((self.root/prior['ledger']).read_text());data[prior['key']]+=1;self.write(prior['ledger'],data)
   with self.assertRaisesRegex(AssertionError,'old budget'):self.check()
  self.restore();prior=CAPS[-1];path=self.root/prior['files'][0];path.write_text(path.read_text()+'\n'*(prior['limit']+1))
  with self.assertRaisesRegex(AssertionError,'old group'):self.check()

class ART12InventoryTests(unittest.TestCase):
 def setUp(self):
  from art12_inventory import NATIVE,DEPENDENCIES,LEDGER
  self.temp=tempfile.TemporaryDirectory(prefix='chenyuan-art12-negative-');self.root=Path(self.temp.name)
  self.original={name:(ROOT/name).read_bytes() for name in set(NATIVE+DEPENDENCIES+[LEDGER])};self.restore()
 def tearDown(self):self.temp.cleanup()
 def restore(self):
  for name,raw in self.original.items():
   p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True)
   if p.is_symlink():p.unlink()
   p.write_bytes(raw)
 def data(self):return json.loads((self.root/'art/redesign/art12.json').read_text())
 def write(self,path,value):(self.root/path).write_text(json.dumps(value))
 def check(self):
  from art12_inventory import validate_art12
  return validate_art12(self.root)
 def reject(self,m):
  self.write('art/redesign/art12.json',m)
  with self.assertRaises(AssertionError):self.check()
 def change_css(self,text):
  m=self.data();row=m['files'][0];raw=text.encode();(self.root/row['path']).write_bytes(raw);row.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest());self.write('art/redesign/art12.json',m)
 def replace(self,path,old,new):
  p=self.root/path;text=p.read_text();self.assertEqual(text.count(old),1);changed=text.replace(old,new,1);self.assertNotEqual(text,changed);p.write_text(changed)
 def opening(self,path,id):
  text=(self.root/path).read_text();tags=__import__('re').findall(r'<button(?=[\s/>])(?:[^>"\']|"[^"]*"|\'[^\']*\')*>',text);matched=[tag for tag in tags if 'data-testid="'+id+'"' in tag];self.assertEqual(len(matched),1);self.assertEqual(text.count(matched[0]),1);return text,matched[0]
 def test_art12_real_single_bounded_css_and_no_new_bitmaps(self):
  from art12_inventory import NATIVE
  files,total=self.check();self.assertEqual(files,set(NATIVE+['art/redesign/art12.json']));self.assertEqual(total,(self.root/NATIVE[0]).stat().st_size);self.assertLessEqual(total,14000);self.assertEqual(self.data()['assets'],[])
 def test_art12_missing_ledger_rejects_present_stylesheet(self):
  (self.root/'art/redesign/art12.json').unlink()
  with self.assertRaisesRegex(AssertionError,'Unrecorded ART12'):self.check()
 def test_art12_header_typed_budget_and_human_claim_are_fixed(self):
  for key,value in [('format','alias'),('version',True),('task','wholeGoal'),('maxNativeBytes',14001),('maxNativeBytes',True),('userAcceptance',True)]:
   self.restore();m=self.data();m[key]=value;self.reject(m)
 def test_art12_native_inventory_hash_types_and_rehashed_cap_are_real(self):
  for key,value in [('bytes',True),('bytes',1),('sha256','0'*64),('path','web/src/story-book.css')]:
   self.restore();m=self.data();m['files'][0][key]=value;self.reject(m)
  self.restore();m=self.data();m['files']=m['files']*2;self.reject(m)
  self.restore();name=self.data()['files'][0]['path'];self.change_css((self.root/name).read_text()+'\n'*14001)
  with self.assertRaisesRegex(AssertionError,'native cap'):self.check()
 def test_art12_references_shape_paths_and_symlinks_cannot_escape(self):
  for key in ['sourceReferences','bindings','dialogs','slots']:
   self.restore();m=self.data();m[key]={} if key!='sourceReferences' else [];self.reject(m)
  self.restore();(self.root/self.data()['sourceReferences'][0]).unlink()
  with self.assertRaisesRegex(AssertionError,'missing or external'):self.check()
  self.restore()
  with tempfile.TemporaryDirectory(prefix='art12-outside-') as folder:
   target=self.root/self.data()['files'][0]['path'];external=Path(folder)/'style.css';external.write_bytes(target.read_bytes());target.unlink();target.symlink_to(external)
   with self.assertRaisesRegex(AssertionError,'external'):self.check()
 def test_art12_zero_bitmap_boundary_cannot_alias_or_add_asset(self):
  for key,value in [('newBitmapAssets',True),('newBitmapAssets',1),('assets',[{'path':'new.png'}])]:
   self.restore();m=self.data();m[key]=value;self.reject(m)
 def test_art12_actual_unique_stylesheet_consumer_and_no_external_io(self):
  path='web/src/main.ts';self.replace(path,"import './art12-narrative.css'","/*import './art12-narrative.css'*/")
  with self.assertRaisesRegex(AssertionError,'consumer/reading/proof'):self.check()
  self.restore();p=self.root/path;p.write_text(p.read_text()+"\nimport './art12-narrative.css';")
  with self.assertRaisesRegex(AssertionError,'uniquely'):self.check()
  self.restore();name=self.data()['files'][0]['path'];self.change_css((self.root/name).read_text()+'\n@import "https://example.invalid/extra.css";')
  with self.assertRaisesRegex(AssertionError,'external IO'):self.check()
 def test_art12_all_real_readonly_dialog_content_slots_are_owned_once(self):
  from art12_inventory import DIALOGS
  for path,dialogs in DIALOGS.items():
   for dialog in dialogs:
    self.restore();slot=dialog['slots'][0];token='<slot name="'+slot+'" :close="close"/>';self.replace(path,token,'<!--'+token+'-->')
    with self.assertRaisesRegex(AssertionError,'dialog slot'):self.check()
  self.restore();self.replace('web/src/LifeCatalogue.vue','<template #management="{close}">','<template #retired-management="{close}">')
  with self.assertRaisesRegex(AssertionError,'parent content slot'):self.check()
 def test_art12_complete_management_gates_close_before_confirm_and_readonly_export(self):
  path='web/src/LifeCatalogue.vue'
  for id,old,new in [('retire',"close();emit('end','RETIRE')","emit('end','RETIRE')"),('end-life','record.overview.remainingMonths===1','true'),('life-restore','||!hasCheckpoint',''),('life-restart','||!!pendingError','')]:
   self.restore();text,tag=self.opening(path,id);self.assertIn(old,tag);changed=tag.replace(old,new,1);self.assertNotEqual(tag,changed);(self.root/path).write_text(text.replace(tag,changed,1))
   with self.assertRaises(AssertionError):self.check()
  self.restore();text,tag=self.opening(path,'export-life');(self.root/path).write_text(text.replace(tag,tag[:-1]+' disabled>',1))
  with self.assertRaisesRegex(AssertionError,'readonly export'):self.check()
 def test_art12_full_140_codepoints_four_chapters_and_anchor_fields_preserved(self):
  for path,old,new in [('web/src/story-pages.ts','size=140','size=139'),('web/src/story-pages.ts',"group:'seal',key:'scope'","group:'seal',key:'retired-scope'"),('web/src/LifeCatalogue.vue',"['seal','收卷']","['missing','收卷']"),('web/src/reading-memory.ts','list.indexOf(old.anchor)','-1')]:
   self.restore();self.replace(path,old,new)
   with self.assertRaisesRegex(AssertionError,'consumer/reading/proof'):self.check()
 def test_art12_one_claimant_stable_host_full_proof_and_visibility_lifecycle(self):
  for path,old,new in [('web/src/narrative-effects.ts','active,7','active,5'),('web/src/narrative-effects.ts','if(effect.value===e&&owner?.kind===k&&owner.id===target)return;','if(effect.value===e)return;'),('web/src/narrative-effects.ts','if(resumed)claimCurrent();','claimCurrent();'),('web/src/narrative-effects.ts','onDeactivated(()=>{visible.value=false;effect.value=null;owner=null;})','onDeactivated(()=>{visible.value=false;effect.value=null;})'),('web/src/narrative-effects.ts','if(!(element instanceof Element)||!visibleFocusTarget(element)||!e||!valid.value||!narrativeObjectMatches(k,target,e)){effect.value=null;owner=null;return;}','if(!e||!valid.value||!narrativeObjectMatches(k,target,e)){effect.value=null;owner=null;return;}'),('web/src/narrative-effects.ts','const element=instance?.vnode.el;',"const element=document.querySelector('.response-table');"),('web/src/narrative-effects.ts','onMounted(claimCurrent);','onMounted(()=>{});'),('web/src/focus.ts','!element.isConnected','false'),('web/src/activity-effects.ts','resolve(before,command)','resolve(before,otherCommand)'),('web/src/LifeScroll.vue','onDeactivated(()=>management.value?.close())','onDeactivated(()=>{})'),('web/src/LifeScroll.vue',"()=>props.game.core.runId);","()=>props.game.core.runId);useNarrativeObject(()=> 'life',()=>props.game.core.runId);")]:
   self.restore();self.replace(path,old,new)
   with self.assertRaises(AssertionError):self.check()
  self.restore();self.replace('web/src/App.vue','<KeepAlive :max="1"><LifeCatalogue','<Detached :max="1"><LifeCatalogue')
  with self.assertRaisesRegex(AssertionError,'stable host'):self.check()
 def test_art12_all_old_caps_and_native_memberships_remain_fixed(self):
  from art12_inventory import CAPS
  for prior in CAPS:
   self.restore();m=json.loads((self.root/prior['ledger']).read_text());m[prior['key']]+=1;self.write(prior['ledger'],m)
   with self.assertRaisesRegex(AssertionError,'old budgets'):self.check()
  self.restore();prior=CAPS[-1];m=json.loads((self.root/prior['ledger']).read_text());m['files']=list(reversed(m['files']));self.write(prior['ledger'],m)
  with self.assertRaisesRegex(AssertionError,'old budgets'):self.check()

class CultivationNotesTests(unittest.TestCase):
 def setUp(self):
  from art15_inventory import NATIVE,REFS,LEDGER
  from uir33_04_inventory import prior_uir3304_bytes
  self.temp=tempfile.TemporaryDirectory(prefix='chenyuan-art15-negative-');self.root=Path(self.temp.name)
  for name in NATIVE+REFS+[LEDGER,'web/src/App.vue']:
   p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(prior_uir3304_bytes(name,(ROOT/name).read_bytes()))
  self.ledger=json.loads((self.root/LEDGER).read_text());self.source=(self.root/NATIVE[0]).read_text();self.app=(self.root/'web/src/App.vue').read_text()
 def tearDown(self):self.temp.cleanup()
 def check(self):
  from art15_inventory import validate_art15
  return validate_art15(self.root)
 def write(self,name,text):
  p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text)
 def changed(self,text):
  m=copy.deepcopy(self.ledger);raw=text.encode();m['files'][0].update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest());self.write('web/src/CultivationNotes.vue',text);self.write('art/redesign/art15.json',json.dumps(m))
 def test_art15_bounded_native_and_identity(self):
  self.assertGreater(self.check()[1],0)
  for change in ['hash','bytes','cap','membership']:
   m=copy.deepcopy(self.ledger)
   if change=='hash':m['files'][0]['sha256']='0'*64
   elif change=='bytes':m['files'][0]['bytes']+=1
   elif change=='cap':m['maxNativeBytes']+=1
   else:m['files'].append(dict(m['files'][0]))
   self.write('art/redesign/art15.json',json.dumps(m))
   with self.subTest(change=change),self.assertRaisesRegex(AssertionError,'ART15'):self.check()
 def test_art15_actual_two_app_surfaces_and_slot_parent(self):
  import re
  for stage in ['gate','practice']:
   pattern=r'<CultivationNotes\b[^>]*data-notes-stage="'+stage+r'"[^>]*>(.*?)</CultivationNotes>'
   text,n=re.subn(pattern,lambda m:'<div>'+m[1]+'</div>',self.app,flags=re.S);self.assertEqual(n,1);self.write('web/src/App.vue',text)
   with self.subTest(stage=stage),self.assertRaisesRegex(AssertionError,'ART15 actual'):self.check()
  self.write('web/src/App.vue',self.app);self.changed(self.source.replace('<slot/>','').replace('</dialog>','</dialog><slot/>'))
  with self.assertRaisesRegex(AssertionError,'ART15 original slot'):self.check()
 def test_art15_readonly_book_cannot_add_io_clock_or_store(self):
  for token in ['setTimeout(()=>0,1);','indexedDB.open("unexpected");','fetch("unexpected");']:
   self.changed(self.source.replace('</script>',token+'</script>'))
   with self.subTest(token=token),self.assertRaisesRegex(AssertionError,'ART15 readonly'):self.check()
 def test_art15_original_routes_and_focus_lifecycle(self):
  text=self.app.replace("@click=\"openTradeoffs('cultivation',hubTrainingMethod)\"","@click=\"openHub('inventory')\"")
  self.assertNotEqual(text,self.app);self.write('web/src/App.vue',text)
  with self.assertRaisesRegex(AssertionError,'ART15 original view route'):self.check()
  self.write('web/src/App.vue',self.app)
  for token in ['onDeactivated(close)',"watch(()=>props.identity,close,{flush:'sync'})",'focus?.target(opener.value??null)']:
   self.changed(self.source.replace(token,''))
   with self.subTest(token=token),self.assertRaisesRegex(AssertionError,'ART15 original focus'):self.check()

 def _m04_recovery_button(self,stage):
  import re
  host=re.search(r'<CultivationNotes\b[^>]*data-notes-stage="'+stage+r'"[^>]*>(.*?)</CultivationNotes>',self.app,re.S)
  self.assertIsNotNone(host)
  nodes=re.findall(r'<button\b[^>]*data-testid="hub-trial-result"[^>]*>查看渡劫结果与恢复</button>',host[1])
  self.assertEqual(len(nodes),1);self.assertEqual(self.app.count(nodes[0]),1)
  return nodes[0]
 def test_m04_recovery_entry_cannot_leave_either_actual_book_parent(self):
  for stage in ['gate','practice']:
   node=self._m04_recovery_button(stage);self.write('web/src/App.vue',self.app.replace(node,'')+node)
   with self.subTest(stage=stage),self.assertRaisesRegex(AssertionError,'ART15 original readonly choices'):self.check()
 def test_m04_recovery_entry_requires_actual_trial_recovery(self):
  for stage in ['gate','practice']:
   node=self._m04_recovery_button(stage);self.assertIn('v-if="store.trialRecovery"',node)
   self.write('web/src/App.vue',self.app.replace(node,node.replace('v-if="store.trialRecovery"','v-if="store.activity"')))
   with self.subTest(stage=stage),self.assertRaisesRegex(AssertionError,'ART15 original view eligibility'):self.check()
 def test_m04_recovery_entry_cannot_capture_a_hidden_menu_event_opener(self):
  for stage in ['gate','practice']:
   node=self._m04_recovery_button(stage);self.assertIn("openHub('trial')",node)
   self.write('web/src/App.vue',self.app.replace(node,node.replace("openHub('trial')","openHub('trial',$event)")))
   with self.subTest(stage=stage),self.assertRaisesRegex(AssertionError,'ART15 original view route'):self.check()

class ART16SchoolInventoryTests(unittest.TestCase):
 def setUp(self):
  from art16_inventory import BASE,REFS,NATIVE,PRODUCER,FACTS,LEDGER,OLD,IDS
  self.temp=tempfile.TemporaryDirectory(prefix='chenyuan-art16-negative-');self.root=Path(self.temp.name)
  files=set(REFS+NATIVE+OLD+[PRODUCER,FACTS,LEDGER,'web/src/main.ts','art/redesign/art03.json','web/public/art/v2/workshop/furnace-v1.webp','art/tools/export_art10_blanks.py','art/tools/export_art11_items.py'])
  for key in IDS:files.update([f'{BASE}/{key}-station-v1.png',f'{BASE}/{key}-station-v1-prompt.json',f'{BASE}/receipts/{key}-station-v1.json',f'web/public/art/v2/schools/{key}-station-v1.webp'])
  for name in files:
   p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,p)
  self.ledger=json.loads((self.root/LEDGER).read_text());self.facts=json.loads((self.root/FACTS).read_text());self.actor=(self.root/'web/src/LoadoutConstellation.vue').read_text();self.css=(self.root/NATIVE[0]).read_text()
 def tearDown(self):self.temp.cleanup()
 def write(self,name,text):
  p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text if isinstance(text,str)else json.dumps(text))
 def restore(self):
  self.write('art/redesign/art16.json',self.ledger);self.write('art/redesign/art16-schools/export-facts.json',self.facts);self.write('web/src/LoadoutConstellation.vue',self.actor);self.write('web/src/art16-schools.css',self.css)
 def check(self):
  from art16_inventory import validate_art16
  from check_inventory import image_info
  return validate_art16(self.root,image_info)
 def factsChange(self,edit):
  f=copy.deepcopy(self.facts);edit(f);self.write('art/redesign/art16-schools/export-facts.json',f);m=copy.deepcopy(self.ledger);m['assets']=f['assets'];p=self.root/'art/redesign/art16-schools/export-facts.json';m['provenance']['facts'].update(bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest());self.write('art/redesign/art16.json',m)
 def test_art16_fixed_budget_and_actual_source_identity(self):
  self.assertEqual(self.check()[1],2)
  for key,value in [('nativeBytes',12001),('newAssets',3),('runtimeWidth',True),('maxTotalRuntimeBytes',320001)]:
   self.restore();m=copy.deepcopy(self.ledger);m['budgets'][key]=value;self.write('art/redesign/art16.json',m)
   with self.subTest(key=key),self.assertRaisesRegex(AssertionError,'ART16 fixed'):self.check()
  self.restore();p=self.root/'art/redesign/art16-schools/sword-station-v1.png';p.write_bytes(p.read_bytes()+b'changed')
  with self.assertRaisesRegex(AssertionError,'ART16 actual identity'):self.check()
 def test_art16_real_image_consumer_parent_and_fallback(self):
  import re
  asset=r'<AssetImage\b[^>]*:asset-id="\x27school-station-\x27\+school"[^>]*>.*?</AssetImage>'
  match=re.search(asset,self.actor,re.S);self.assertIsNotNone(match)
  for label,text in [('missing',self.actor[:match.start()]+self.actor[match.end():]),('wrong-parent',(self.actor[:match.start()]+self.actor[match.end():]).replace('</template>',match[0]+'</template>',1)),('fallback',self.actor.replace('<GameIcon kind="skill" :id="C.startingLoadouts[school].builder"/>',''))]:
   self.restore();self.write('web/src/LoadoutConstellation.vue',text)
   with self.subTest(label=label),self.assertRaisesRegex(AssertionError,'ART16 actual'):self.check()
 def test_art16_original_school_action_gate_and_echo(self):
  for token in ["emit('school',school)",'!!schoolReason(school)',"effect.result.type==='SCHOOL'&&game.school===school"]:
   self.restore();self.assertIn(token,self.actor);self.write('web/src/LoadoutConstellation.vue',self.actor.replace(token,'false',1))
   with self.subTest(token=token),self.assertRaisesRegex(AssertionError,'ART16'):self.check()
 def test_art16_alpha_and_double_export_facts_are_bound(self):
  for label,edit in [('alpha',lambda f:f['assets'][0]['runtime']['alphaProof'].update(transparentPixels=0)),('double',lambda f:f['assets'][0]['exportProof'].update(bytesEqual=False)),('margin',lambda f:f['assets'][0]['runtime'].update(alphaBBox1=[0,0,512,512]))]:
   self.restore();self.factsChange(edit)
   with self.subTest(label=label),self.assertRaisesRegex(AssertionError,'ART16'):self.check()
 def test_art16_old_caps_and_css_external_io_cannot_expand(self):
  prior=json.loads((self.root/'art/redesign/art03.json').read_text());prior['maxNativeBytes']+=1;self.write('art/redesign/art03.json',prior)
  with self.assertRaisesRegex(AssertionError,'ART16 old cap'):self.check()
  prior['maxNativeBytes']-=1;self.write('art/redesign/art03.json',prior);text=self.css+'\n@import "https://example.invalid/font.css";';self.write('web/src/art16-schools.css',text);m=copy.deepcopy(self.ledger);m['files'][0].update(bytes=len(text.encode()),sha256=hashlib.sha256(text.encode()).hexdigest());self.write('art/redesign/art16.json',m)
  with self.assertRaisesRegex(AssertionError,'ART16 external'):self.check()
 def test_art16_originals_provider_boundary_and_helper_identity(self):
  self.factsChange(lambda f:f['assets'][0].update(visualAcceptance=True))
  with self.assertRaisesRegex(AssertionError,'ART16 cannot assert'):self.check()
  self.restore();p=self.root/'art/tools/export_art10_blanks.py';p.write_bytes(p.read_bytes()+b'\n# changed\n')
  with self.assertRaisesRegex(AssertionError,'ART16 actual identity'):self.check()


class ART17CaveInventoryTests(unittest.TestCase):
 def setUp(self):
  from art17_inventory import LEDGER,NATIVE,REFS,ASSETS
  self.temp=tempfile.TemporaryDirectory(prefix='chenyuan-art17-negative-');self.root=Path(self.temp.name);self.names=NATIVE+REFS+ASSETS+[LEDGER,'web/src/App.vue','web/src/MilestoneGate.vue','art/redesign/cultivation-objects.json'];self.original={n:(ROOT/n).read_bytes()for n in self.names};self.restore()
 def tearDown(self):self.temp.cleanup()
 def write(self,n,raw):
  p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw if isinstance(raw,bytes)else raw.encode())
 def restore(self):
  for n,raw in self.original.items():self.write(n,raw)
 def check(self):
  from art17_inventory import validate_art17
  return validate_art17(self.root)
 def ledger(self,edit):
  n='art/redesign/art17.json';m=json.loads((self.root/n).read_text());edit(m);self.write(n,json.dumps(m))
 def resign(self,n,text):
  self.write(n,text);self.ledger(lambda m:[r.update(bytes=len(text.encode()),sha256=hashlib.sha256(text.encode()).hexdigest())for r in m['files']if r['path']==n])
 def test_art17_current_positive_preserves_zero_new_paint_and_fixed_native_cap(self):
  self.assertGreater(self.check()[1],0)
  for field,value in [('maxNativeBytes',20001),('newAssets',1),('userAcceptance',True)]:
   self.restore();self.ledger(lambda m:m.update({field:value}))
   with self.subTest(field=field),self.assertRaisesRegex(AssertionError,'ART17 fixed'):self.check()
 def test_art17_all_native_bytes_and_membership_are_real(self):
  for field in ['sha256','bytes','membership']:
   self.restore();self.ledger(lambda m:m['files'].append(dict(m['files'][0]))if field=='membership'else m['files'][0].update({field:'0'*64 if field=='sha256'else 1}))
   with self.subTest(field=field),self.assertRaisesRegex(AssertionError,'ART17'):self.check()
  self.restore();n='web/src/cave-threshold-view.ts';total=sum((self.root/f).stat().st_size for f in ['web/src/cave-threshold-view.ts','web/src/CaveThresholdObject.vue','web/src/art17-cave.css']);self.resign(n,self.original[n].decode()+' '*(20001-total))
  with self.assertRaisesRegex(AssertionError,'ART17 actual cap'):self.check()
 def test_art17_reused_painting_is_exact_not_a_claim_of_new_assets(self):
  from art17_inventory import ASSETS
  n=ASSETS[0];self.write(n,self.original[n]+b'changed')
  with self.assertRaisesRegex(AssertionError,'ART17 actual identity'):self.check()
 def test_art17_current_view_routes_cannot_start_travel_or_borrow_current_game(self):
  n='web/src/App.vue';source=self.original[n].decode()
  for old,new in [('@navigate="inspectCaveDestination"','@navigate="navigate"'),(':game="source"',':game="game"')]:
   self.restore();self.write(n,source.replace(old,new,1))
   with self.subTest(old=old),self.assertRaisesRegex(AssertionError,'ART17 view route'):self.check()
 def test_art17_slot_must_export_original_witness_and_preserve_old_cap(self):
  n='web/src/MilestoneGate.vue';self.write(n,self.original[n].decode().replace(':remaining="remaining"',':remaining="30"'))
  with self.assertRaisesRegex(AssertionError,'ART17 original witness'):self.check()
  self.restore();n='art/redesign/cultivation-objects.json';m=json.loads((self.root/n).read_text());m['budgets']['nativeBytes']+=1;self.write(n,json.dumps(m))
  with self.assertRaisesRegex(AssertionError,'ART17 old cap'):self.check()
 def test_art17_presentation_cannot_gain_clock_io_or_detach_paint(self):
  for token in ['setTimeout(()=>0,1);','indexedDB.open("unexpected");','fetch("unexpected");']:
   self.restore();n='web/src/CaveThresholdObject.vue';self.resign(n,self.original[n].decode().replace('</script>',token+'</script>'))
   with self.subTest(token=token),self.assertRaisesRegex(AssertionError,'ART17 readonly'):self.check()
  self.restore();n='web/src/CaveThresholdObject.vue';self.resign(n,self.original[n].decode().replace(':owned="view.have>0"',':owned="true"'))
  with self.assertRaisesRegex(AssertionError,'ART17 actual painting'):self.check()
  self.restore();n='web/src/CaveThresholdObject.vue';self.resign(n,self.original[n].decode().replace('path="art/v2/characters/player-seated-cold.webp"','path="art/v2/characters/wrong.webp"'))
  with self.assertRaisesRegex(AssertionError,'ART17 actual painting'):self.check()


class ART18MaterialInventoryTests(unittest.TestCase):
 def setUp(self):
  from art18_inventory import LEDGER,NATIVE,REFS,ASSETS
  self.temp=tempfile.TemporaryDirectory(prefix='chenyuan-art18-negative-');self.root=Path(self.temp.name)
  names=NATIVE+REFS+[LEDGER,'web/src/main.ts','web/src/App.vue','web/src/LocalExperiencePanel.vue','web/src/use-local-experience.ts']
  for name,_,_ in ASSETS:names += [f'web/public/art/v2/ui/{name}-v1.webp',f'art/production/art18/{name}-source.png',f'art/production/art18/{name}-receipt.json']
  self.original={n:(ROOT/n).read_bytes()for n in names};self.restore()
 def tearDown(self):self.temp.cleanup()
 def write(self,n,value):
  p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(value if isinstance(value,bytes)else value.encode())
 def restore(self):
  for n,raw in self.original.items():self.write(n,raw)
 def check(self):
  from art18_inventory import validate_art18
  return validate_art18(self.root)
 def edit(self,change):
  n='art/redesign/art18.json';m=json.loads((self.root/n).read_text());change(m);self.write(n,json.dumps(m))
 def resign(self,n,value):
  self.write(n,value);raw=(self.root/n).read_bytes()
  self.edit(lambda m:[r.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest())for field in ['files','runtimeAssets','originals']for r in m[field]if r['path']==n])
 def test_art18_positive_requires_bounded_real_materials_and_no_human_acceptance(self):
  self.assertGreater(self.check()[1],0)
  for key,value in [('maxNativeBytes',18001),('maxRuntimeBytes',144001),('userAcceptance',True)]:
   self.restore();self.edit(lambda m:m.update({key:value}))
   with self.subTest(key=key),self.assertRaisesRegex(AssertionError,'ART18'):self.check()
 def test_art18_real_byte_budget_cannot_be_evaded_by_resigning_the_ledger(self):
  n='web/src/art18-ui.css';size=self.check()[1];self.resign(n,self.original[n]+b' '*(18001-size))
  with self.assertRaisesRegex(AssertionError,'ART18 actual budget'):self.check()
  self.restore();n='web/public/art/v2/ui/dialog-jade-frame-v1.webp';self.resign(n,self.original[n]+b' '*(96001-len(self.original[n])))
  with self.assertRaisesRegex(AssertionError,'ART18 per-material budget'):self.check()
 def test_art18_unapproved_asset_or_native_membership_is_rejected(self):
  for field in ['runtimeAssets','originals','files']:
   self.restore();self.edit(lambda m:m[field].append(dict(m[field][0])))
   with self.subTest(field=field),self.assertRaisesRegex(AssertionError,'ART18.*membership'):self.check()
 def test_art18_source_and_runtime_alpha_are_real_even_with_updated_hashes(self):
  from PIL import Image
  for n in ['art/production/art18/action-jade-frame-source.png','web/public/art/v2/ui/action-jade-frame-v1.webp']:
   self.restore();p=self.root/n
   with Image.open(p)as image:opaque=image.convert('RGBA');opaque.putalpha(255)
   opaque.save(p,'PNG'if n.endswith('.png')else'WEBP',quality=82,method=6)
   self.resign(n,p.read_bytes())
   if n.endswith('.png'):
    receipt='art/production/art18/action-jade-frame-receipt.json';r=json.loads((self.root/receipt).read_text());r['sha256']=hashlib.sha256(p.read_bytes()).hexdigest();self.write(receipt,json.dumps(r))
   with self.subTest(path=n),self.assertRaisesRegex(AssertionError,'ART18 real (material shape|transparency)'):self.check()
 def test_art18_real_texture_and_stylesheet_consumers_must_remain_attached(self):
  n='web/src/art18-ui.css';self.resign(n,self.original[n].decode().replace('action-jade-frame-v1.webp','missing-material.webp'))
  with self.assertRaisesRegex(AssertionError,'ART18 material detached'):self.check()
  self.restore();n='web/src/main.ts';self.write(n,self.original[n].decode().replace("import './art18-ui.css';",''))
  with self.assertRaisesRegex(AssertionError,'ART18 stylesheet detached'):self.check()
 def test_art18_cancel_and_context_guards_cannot_turn_into_writes_or_browser_confirmation(self):
  n='web/src/App.vue';self.write(n,self.original[n].decode().replace('confirmation.answer($event)','confirmation.answer(true)'))
  with self.assertRaisesRegex(AssertionError,'ART18 confirmation consumer'):self.check()
  self.restore();self.write(n,self.original[n]+b"\nconfirm('unexpected');")
  with self.assertRaisesRegex(AssertionError,'ART18 browser confirmation'):self.check()
  self.restore();n='web/src/use-game-confirmation.ts';self.resign(n,self.original[n].decode().replace('source.resolve(value)','source.resolve(true)'))
  with self.assertRaisesRegex(AssertionError,'ART18 consent/return'):self.check()
  self.restore();self.resign(n,self.original[n]+b'\nsetInterval(()=>0,1000);')
  with self.assertRaisesRegex(AssertionError,'ART18 presentation gained'):self.check()


class UX27ContextOwnershipTests(unittest.TestCase):
 def test_ux27_two_approved_views_reverse_to_full_unchanged_parent_sources(self):
  from art26_inventory import normalize_ux27_equipment
  from art33_inventory import normalize_ux27_app
  for name,normalize in [('EquipmentPanel.vue',normalize_ux27_equipment),('App.vue',normalize_ux27_app)]:
   actual=(ROOT/('web/src/'+name)).read_text();before=(ROOT/('goal-4/evidence/ux27/'+name+'.before.txt')).read_text()
   self.assertEqual(normalize(actual),before)
  self.assertLessEqual((ROOT/'web/src/App.vue').stat().st_size,157235+2400)
  self.assertLessEqual((ROOT/'web/src/EquipmentPanel.vue').stat().st_size,5000)
 def test_ux27_same_size_old_controller_and_callback_edits_are_not_authorized_by_display_evolution(self):
  from art26_inventory import normalize_ux27_equipment
  from art33_inventory import normalize_ux27_app
  from ux33_inventory import prior_ux33_bytes
  cases=[('App.vue',normalize_ux27_app,'navigationRevision++;','navigationRevision--;'),('App.vue',normalize_ux27_app,'@act="act"','@act="bad"'),('EquipmentPanel.vue',normalize_ux27_equipment,"if(p)section.value=","if(0)section.value="),('EquipmentPanel.vue',normalize_ux27_equipment,"emit('start',$event)","emit('start',null  )")]
  for name,normalize,old,new in cases:
   source=prior_ux33_bytes(name,(ROOT/('web/src/'+name)).read_bytes()).decode();self.assertIn(old,source);self.assertEqual(len(old),len(new))
   with self.subTest(path=name,mutation=old),self.assertRaisesRegex(AssertionError,'UX27'):normalize(source.replace(old,new,1))
 def test_ux27_life_scope_report_and_consumer_cannot_be_detached(self):
  from art26_inventory import normalize_ux27_equipment
  from art33_inventory import normalize_ux27_app
  from ux33_inventory import prior_ux33_bytes
  cases=[('EquipmentPanel.vue',normalize_ux27_equipment,'[props.game.core.runId,section.value]','[props.game.core.runId]'),('App.vue',normalize_ux27_app,"equipmentReading.value.runId===game.value?.core.runId","true"),('App.vue',normalize_ux27_app,'@section="equipmentReading=$event"','@section="equipmentReading=undefined"')]
  for name,normalize,old,new in cases:
   source=prior_ux33_bytes(name,(ROOT/('web/src/'+name)).read_bytes()).decode();self.assertIn(old,source)
   with self.subTest(path=name,mutation=old),self.assertRaisesRegex(AssertionError,'UX27'):
    normalized=normalize(source.replace(old,new,1));before=(ROOT/('goal-4/evidence/ux27/'+name+'.before.txt')).read_text()
    assert hashlib.sha256(normalized.encode()).hexdigest()==hashlib.sha256(before.encode()).hexdigest(),'UX27 full source fallback proof'


class UIR3308ExactTemplateTests(unittest.TestCase):
 def test_current_template_reverses_to_the_full_old_controller_and_rules(self):
  from uir33_08_inventory import validate_uir3308,prior_uir3308_bytes,MANIFEST
  self.assertLessEqual(validate_uir3308(ROOT)[1],22000)
  self.assertEqual(prior_uir3308_bytes(MANIFEST['path'],(ROOT/MANIFEST['path']).read_bytes()),(ROOT/MANIFEST['before']).read_bytes())
 def test_same_size_controller_rules_and_gate_mutations_are_rejected(self):
  from uir33_08_inventory import prior_uir3308_bytes,MANIFEST
  raw=(ROOT/MANIFEST['path']).read_text()
  for a,b in [("emit('start')","emit('badxx')"),('停炉与续接规则','停炉与假的规则'),('quote.allowed','quote.failure')]:
   self.assertIn(a,raw)
   with self.subTest(mutation=a),self.assertRaisesRegex(AssertionError,'UIR33-08'):prior_uir3308_bytes(MANIFEST['path'],raw.replace(a,b,1).encode())


class UIR3401LifespanDisplayTests(unittest.TestCase):
 def test_exact_current_sources_reconstruct_all_old_controllers_and_controls(self):
  from uir34_01_inventory import validate_uir3401,prior_uir3401_bytes,MANIFEST
  self.assertLessEqual(validate_uir3401(ROOT)[1],6000)
  for name,r in MANIFEST['files'].items():self.assertEqual(prior_uir3401_bytes(name,(ROOT/r['path']).read_bytes()),(ROOT/r['before']).read_bytes())
 def test_changed_clock_save_focus_or_manager_activation_cannot_hide_inside_display_evolution(self):
  from uir34_01_inventory import prior_uir3401_bytes
  cases=[('App.vue','@click="startTraining(hubTrainingPlan)"','@click="startTraining(defaultTraining)"'),('App.vue','if(owns(owner??null))','if(true)'),('LifeScroll.vue','opener.value?.click()','management.value?.showModal()'),('LifeCatalogue.vue',"emit('end','RETIRE')","emit('end','END_LIFE')")]
  for name,a,b in cases:
   raw=(ROOT/('web/src/'+name)).read_text();self.assertIn(a,raw)
   with self.subTest(name=name,mutation=a),self.assertRaisesRegex(AssertionError,'UIR34-01'):prior_uir3401_bytes(name,raw.replace(a,b,1).encode())

class UIR3402FocusTests(unittest.TestCase):
 setUp=InventoryTests.setUp
 write=InventoryTests.write
 tearDown=InventoryTests.tearDown
 def test_uir3402_original_cap_whole_inverse_and_readonly_owners(self):
  from uir34_02_inventory import validate_uir3402,prior_uir3402_bytes,MANIFEST
  self.assertLessEqual(validate_uir3402(ROOT)[1],30000)
  for name,r in MANIFEST['files'].items():self.assertEqual(prior_uir3402_bytes(name,(ROOT/r['path']).read_bytes()),(ROOT/r['before']).read_bytes())
 def test_uir3402_rejects_changed_confirm_notes_marker_css_scope_and_budget(self):
  from uir34_02_inventory import validate_uir3402,MANIFEST,LEDGER
  for name,old,new in [('MilestoneReview.vue',"@click=\"emit('confirm')\"","@click=\"emit('close')\""),('MilestoneReview.vue','data-focus','data-wrong'),('MilestoneReview.vue','busy||!available||stale','busy||!available'),('MilestoneReview.vue','来由与执行说明','删减说明'),('idle-milestones.css','min-height:160px','min-height:159px'),('idle-milestones.css','display:none','display:block')]:
   r=MANIFEST['files'][name];p=self.root/r['path'];raw=p.read_text();self.assertIn(old,raw);self.write(r['path'],raw.replace(old,new,1))
   with self.subTest(name=name,mutation=old),self.assertRaisesRegex(AssertionError,'UIR34-02'):validate_uir3402(self.root)
   self.write(str(p.relative_to(self.root)),raw)
  for key,value in [('maxNativeBytes',30001),('userAcceptance',True)]:
   p=self.root/LEDGER;raw=p.read_text();m=json.loads(raw);m[key]=value;self.write(LEDGER,m)
   with self.subTest(scope=key),self.assertRaisesRegex(AssertionError,'UIR34-02'):validate_uir3402(self.root)
   self.write(str(p.relative_to(self.root)),raw)

class UIR3403FocusTests(unittest.TestCase):
 setUp=InventoryTests.setUp
 write=InventoryTests.write
 tearDown=InventoryTests.tearDown
 def test_original_cap_full_inverse_and_unchanged_configuration(self):
  from uir34_03_inventory import validate_uir3403,prior_uir3403_bytes,MANIFEST
  self.assertLessEqual(validate_uir3403(ROOT)[1],60000)
  self.assertEqual(prior_uir3403_bytes(MANIFEST['path'],(ROOT/MANIFEST['path']).read_bytes()),(ROOT/MANIFEST['before']).read_bytes())
 def test_effects_comparison_confirm_and_budget_cannot_change_outside_display(self):
  from uir34_03_inventory import validate_uir3403,MANIFEST,LEDGER
  for a,b in [("emit('confirm')","emit('close')"),('!q.allowed||!!error','!q.allowed'),('config-full','missing-full'),("key==='cultivationBonus'","key==='guard'"),('ConfigurationOutlook v-else','div v-else')]:
   raw=(ROOT/MANIFEST['path']).read_text();self.assertIn(a,raw);self.write(MANIFEST['path'],raw.replace(a,b,1))
   with self.subTest(mutation=a),self.assertRaisesRegex(AssertionError,'UIR34-03'):validate_uir3403(self.root)
   self.write(MANIFEST['path'],raw)
  for key,value in [('maxComponentBytes',5644),('maxGroupBytes',60001),('userAcceptance',True)]:
   m=json.loads((ROOT/LEDGER).read_text());m[key]=value;self.write(LEDGER,m)
   with self.subTest(scope=key),self.assertRaisesRegex(AssertionError,'UIR34-03'):validate_uir3403(self.root)
   self.write(LEDGER,MANIFEST)

class UIR3404ResumeCopyTests(unittest.TestCase):
 setUp=InventoryTests.setUp
 write=InventoryTests.write
 tearDown=InventoryTests.tearDown
 def test_complete_copy_inverse_original_guards_owners_and_caps(self):
  from uir34_04_inventory import validate_uir3404,prior_uir3404_bytes,MANIFEST
  validate_uir3404(ROOT)
  for name,r in MANIFEST['files'].items():self.assertEqual(prior_uir3404_bytes(name,(ROOT/r['path']).read_bytes()),(ROOT/r['before']).read_bytes())
 def test_resume_pause_retry_reading_clock_and_budget_cannot_hide_in_copy(self):
  from uir34_04_inventory import validate_uir3404,MANIFEST,LEDGER
  for name,a,b in [('TrainingActivity.vue','@click="store.resumeCultivation"','@click="store.retry"'),('TrainingActivity.vue','!store.canRetry','true'),('TrainingActivity.vue','runtime.value?.remainingMs','1'),('TrainingActivity.vue','待继续 · 本轮重计','待接管'),('CultivationOngoing.vue','@click="store.resumeCultivation"','@click="store.retry"'),('CultivationOngoing.vue','离线无收益','离线有收益'),('OpeningOffering.vue',"emit('inspect',$event)","emit('start',$event)")]:
   p=MANIFEST['files'][name]['path'];raw=(ROOT/p).read_text();self.assertIn(a,raw);self.write(p,raw.replace(a,b,1))
   with self.subTest(file=name,mutation=a),self.assertRaisesRegex(AssertionError,'UIR34-04'):validate_uir3404(self.root)
   self.write(p,raw)
  for key,value in [('userAcceptance',True),('newRasterAssets',1)]:
   m=json.loads((ROOT/LEDGER).read_text());m[key]=value;self.write(LEDGER,m)
   with self.subTest(scope=key),self.assertRaisesRegex(AssertionError,'UIR34-04'):validate_uir3404(self.root)
   self.write(LEDGER,MANIFEST)
  m=json.loads((ROOT/LEDGER).read_text());m['caps']['idle-cultivation']+=1;self.write(LEDGER,m)
  with self.assertRaisesRegex(AssertionError,'UIR34-04'):validate_uir3404(self.root)

class Check340204ReadonlyCloseTests(unittest.TestCase):
 setUp=InventoryTests.setUp
 write=InventoryTests.write
 tearDown=InventoryTests.tearDown
 def test_busy_readonly_inverse_retains_all_original_commands_and_caps(self):
  from check_uir34_02_04_inventory import validate_check340204,prior_check340204_bytes,MANIFEST
  self.assertLessEqual(validate_check340204(ROOT)[1],30000)
  self.assertEqual(prior_check340204_bytes(MANIFEST['path'],(ROOT/MANIFEST['path']).read_bytes()),(ROOT/MANIFEST['before']).read_bytes())
 def test_unapproved_close_confirmation_retry_and_clock_cannot_change(self):
  from check_uir34_02_04_inventory import validate_check340204,MANIFEST,LEDGER
  raw=(ROOT/MANIFEST['path']).read_text()
  for a,b in [('busy&&!review.activity','false'),('(!busy||review.activity)','true'),("emit('confirm')","emit('close')"),('pendingError','false'),('milestone-retry','new-retry')]:
   self.assertIn(a,raw);self.write(MANIFEST['path'],raw.replace(a,b,1))
   with self.subTest(mutation=a),self.assertRaisesRegex(AssertionError,'CHECK34'):validate_check340204(self.root)
   self.write(MANIFEST['path'],raw)
  for key,value in [('originalMilestoneCap',30001),('userAcceptance',True)]:
   m=json.loads((ROOT/LEDGER).read_text());m[key]=value;self.write(LEDGER,m)
   with self.subTest(scope=key),self.assertRaisesRegex(AssertionError,'CHECK34'):validate_check340204(self.root)
   self.write(LEDGER,MANIFEST)

if __name__=='__main__':unittest.main()

class Uir3405Tests(unittest.TestCase):
 def test_complete_current_inverse_and_original_caps(self):
  from uir34_05_inventory import validate_uir3405,prior_uir3405_bytes,MANIFEST
  self.assertLessEqual(validate_uir3405(ROOT)[1],2200)
  self.assertEqual(prior_uir3405_bytes(MANIFEST['path'],(ROOT/MANIFEST['path']).read_bytes()),(ROOT/MANIFEST['before']).read_bytes())
 def test_reject_writer_gate_clock_and_missing_disclosure(self):
  from uir34_05_inventory import prior_uir3405_bytes,MANIFEST
  source=(ROOT/MANIFEST['path']).read_text()
  for old,new in [('@click="confirmTrial"','@click="confirmEnd"'),('trialStale','false'),('15秒','1秒'),('class="milestone-notes"','class="removed-notes"'),('startPreparedMilestone(review.intent)','startPreparedMilestone(null)')]:
   self.assertIn(old,source)
   with self.subTest(old=old),self.assertRaisesRegex(AssertionError,'UIR34-05'):prior_uir3405_bytes(MANIFEST['path'],source.replace(old,new,1).encode())

class Uir3406Tests(unittest.TestCase):
 def test_whole_original_inverse_and_actual_added_cap(self):
  from uir34_06_inventory import validate_uir3406,prior_uir3406_bytes,MANIFEST
  self.assertLessEqual(validate_uir3406(ROOT)[1],6000)
  self.assertEqual(prior_uir3406_bytes((ROOT/MANIFEST['path']).read_bytes()),(ROOT/MANIFEST['before']).read_bytes())
 def test_reject_authority_identity_empty_slot_and_readable_layout_changes(self):
  from uir34_06_inventory import prior_uir3406_bytes,MANIFEST
  source=(ROOT/MANIFEST['path']).read_text()
  for old,new in [('props.game','null'),("emit('inspect',$event)","emit('inspect',null)"),('detailsOnly?\'section\':\'details\'','\'details\''),('font-size:18px!important','font-size:12px!important'),('尚未装备','已装备'),('life.remainingMonths','0')]:
   self.assertIn(old,source)
   with self.subTest(old=old),self.assertRaisesRegex(AssertionError,'UIR34-06'):prior_uir3406_bytes(source.replace(old,new,1).encode())
 def test_reject_manifest_type_substitution(self):
  from uir34_06_inventory import validate_uir3406,MANIFEST,LEDGER
  with tempfile.TemporaryDirectory()as d:
   root=Path(d)
   for name in {LEDGER,MANIFEST['path'],MANIFEST['before'],*MANIFEST['sourceReferences'],*MANIFEST['unchanged']}:
    p=root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((ROOT/name).read_bytes())
   for key,value in [('version',True),('maxAddedNativeBytes',7000),('userAcceptance',True),('beforeSHA256','0'*64)]:
    changed=copy.deepcopy(MANIFEST);changed[key]=value;(root/LEDGER).write_text(json.dumps(changed))
    with self.subTest(key=key),self.assertRaisesRegex(AssertionError,'UIR34-06'):validate_uir3406(root)

 def test_compiled_style_cannot_hide_the_single_screen_root(self):
  import subprocess
  script=r"""import fs from 'node:fs';import assert from 'node:assert/strict';import {parse,compileStyle} from './web/node_modules/@vue/compiler-sfc/dist/compiler-sfc.esm-browser.js';const s=parse(fs.readFileSync('web/src/CharacterPanel.vue','utf8')).descriptor.styles[0],r=compileStyle({source:s.content,filename:'CharacterPanel.vue',id:'data-v-scopecheck',scoped:true});assert.deepEqual(r.errors,[]);assert.ok(!/\.single-screen\s*\{/.test(r.code),'ancestor swallowed local selector');assert.ok(r.code.includes('.single-screen .character-sheet.character-folio[data-v-scopecheck]::before'));"""
  result=subprocess.run(['node','--input-type=module','-e',script],cwd=ROOT,text=True,capture_output=True)
  self.assertEqual(result.returncode,0,result.stdout+result.stderr)

class Uir3407Tests(unittest.TestCase):
 def test_full_inverse_and_actual_original_caps(self):
  from uir34_07_inventory import validate_uir3407,prior_uir3407_bytes,MANIFEST
  self.assertLessEqual(validate_uir3407(ROOT)[1],48000)
  for r in MANIFEST['files'].values():self.assertEqual(prior_uir3407_bytes(r['path'],(ROOT/r['path']).read_bytes()),(ROOT/r['before']).read_bytes())
 def test_original_query_identity_callbacks_clock_and_complete_text_are_not_mutable(self):
  from uir34_07_inventory import prior_uir3407_bytes,MANIFEST
  for name,r in MANIFEST['files'].items():
   source=(ROOT/r['path']).read_text()
   pairs=[('row.text','row.title'),("emit('act',","emit('resume',"),('getRelationships(props.game)','[]')]if name=='FateCatalogue.vue'else[('useNarrativeObject','useUnknownObject'),('pending','false'),('onDeactivated(close)','onDeactivated(()=>{})')]
   for a,b in pairs:
    self.assertIn(a,source)
    with self.subTest(name=name,a=a),self.assertRaisesRegex(AssertionError,'UIR34-07'):prior_uir3407_bytes(r['path'],source.replace(a,b,1).encode())
 def test_ledger_types_budget_and_acceptance_cannot_change(self):
  from uir34_07_inventory import validate_uir3407,MANIFEST,LEDGER
  with tempfile.TemporaryDirectory()as d:
   root=Path(d)
   names={LEDGER,*[r[k]for r in MANIFEST['files'].values()for k in ['path','before']],*MANIFEST['unchanged'],*MANIFEST['sourceReferences']}
   for n in names:p=root/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((ROOT/n).read_bytes())
   for key,value in [('version',True),('userAcceptance',True),('caps',{'story-journey':49000,'narrative-objects':45000})]:
    m=copy.deepcopy(MANIFEST);m[key]=value;(root/LEDGER).write_text(json.dumps(m))
    with self.subTest(key=key),self.assertRaisesRegex(AssertionError,'UIR34-07'):validate_uir3407(root)

class Uir3501Tests(unittest.TestCase):
 setUp=InventoryTests.setUp
 write=InventoryTests.write
 tearDown=InventoryTests.tearDown
 def test_complete_display_inverse_and_original_authority_caps(self):
  from uir35_01_inventory import MANIFEST,prior_uir3501_bytes,validate_uir3501
  validate_uir3501(ROOT)
  for n,row in MANIFEST['files'].items():self.assertEqual(prior_uir3501_bytes(n,(ROOT/n).read_bytes()),(ROOT/row['before']).read_bytes())
 def test_false_count_free_cost_and_new_authority_are_rejected(self):
  from uir35_01_inventory import validate_uir3501
  for n,a,b in [('CultivationOngoing.vue','a.completedCycles','a.plan.maxCycles'),('CultivationOngoing.vue',"a.plan.method==='assisted'",'false'),('TrainingActivity.vue','store.pauseCultivation','store.retry'),('TrainingActivity.vue','runtime.value?.remainingMs','0')]:
   p='web/src/'+n;s=(ROOT/p).read_text();self.assertIn(a,s);self.write(p,s.replace(a,b,1))
   with self.subTest(file=n,change=a),self.assertRaisesRegex(AssertionError,'UIR35-01'):validate_uir3501(self.root)
   self.write(p,s)
 def test_original_limits_cannot_be_raised_or_human_acceptance_forged(self):
  from uir35_01_inventory import LEDGER,MANIFEST,validate_uir3501
  for key,value in [('newRasterAssets',1),('userAcceptance',True)]:
   m=copy.deepcopy(MANIFEST);m[key]=value;self.write(LEDGER,m)
   with self.subTest(key=key),self.assertRaisesRegex(AssertionError,'UIR35-01'):validate_uir3501(self.root)
  m=copy.deepcopy(MANIFEST);m['caps']['idle-cultivation']+=1;self.write(LEDGER,m)
  with self.assertRaisesRegex(AssertionError,'UIR35-01'):validate_uir3501(self.root)

 def test_missing_new_ledger_and_corrupted_original_are_rejected(self):
  from uir35_01_inventory import LEDGER,MANIFEST,validate_uir3501
  p=self.root/LEDGER;p.unlink()
  with self.assertRaisesRegex(AssertionError,'UIR35-01'):validate_uir3501(self.root)
  self.write(LEDGER,MANIFEST);row=next(iter(MANIFEST['files'].values()));self.write(row['before'],'not the preserved source')
  with self.assertRaisesRegex(AssertionError,'UIR35-01'):validate_uir3501(self.root)

class Uir3502Tests(unittest.TestCase):
 setUp=InventoryTests.setUp
 write=InventoryTests.write
 tearDown=InventoryTests.tearDown
 def test_full_app_inverse_and_existing_controller_and_caps_remain(self):
  from uir35_02_inventory import MANIFEST,prior_uir3502_bytes,validate_uir3502
  self.assertLessEqual(validate_uir3502(ROOT)[1],6000);self.assertEqual(prior_uir3502_bytes(MANIFEST['app']['path'],(ROOT/MANIFEST['app']['path']).read_bytes()),(ROOT/MANIFEST['app']['before']).read_bytes())
 def reject(self,n,a,b):
  from uir35_02_inventory import validate_uir3502
  raw=(ROOT/n).read_text();self.assertIn(a,raw);self.write(n,raw.replace(a,b,1))
  with self.assertRaisesRegex(AssertionError,'UIR35-02'):validate_uir3502(self.root)
 def test_existing_boolean_safety_cannot_be_bypassed(self):self.reject('web/src/App.vue','store.busy||!store.available','false')
 def test_preview_cannot_replace_original_begin_or_retry(self):self.reject('web/src/App.vue',"hubTrainingMethod='natural'","startTraining(hubTrainingPlan)")
 def test_unit_xp_cannot_be_replaced_by_whole_plan_or_resource_gate(self):
  for a,b in [('xp:unit.delta.xp','xp:quote.xp'),("unit.costs.stones!==0",'false'),("paid.failure.code!=='INSUFFICIENT_STONES'",'false')]:self.reject('web/src/cultivation-fallback.ts',a,b)
 def test_selection_focus_cannot_escape_its_original_life(self):self.reject('web/src/CultivationFallback.vue','props.game.core.runId===run','true')
 def test_old_caps_and_user_acceptance_cannot_change(self):
  from uir35_02_inventory import LEDGER,MANIFEST,validate_uir3502
  for key,value in [('newRasterAssets',1),('userAcceptance',True)]:
   m=copy.deepcopy(MANIFEST);m[key]=value;self.write(LEDGER,m)
   with self.assertRaisesRegex(AssertionError,'UIR35-02'):validate_uir3502(self.root)
  m=copy.deepcopy(MANIFEST);m['caps']['app']+=1;self.write(LEDGER,m)
  with self.assertRaisesRegex(AssertionError,'UIR35-02'):validate_uir3502(self.root)
 def test_missing_ledger_and_corrupt_original_cannot_pass(self):
  from uir35_02_inventory import LEDGER,MANIFEST,validate_uir3502
  (self.root/LEDGER).unlink()
  with self.assertRaisesRegex(AssertionError,'UIR35-02'):validate_uir3502(self.root)
  self.write(LEDGER,MANIFEST);self.write(MANIFEST['app']['before'],'lost original')
  with self.assertRaisesRegex(AssertionError,'UIR35-02'):validate_uir3502(self.root)

class CheckUi35Tests(unittest.TestCase):
 setUp=InventoryTests.setUp
 write=InventoryTests.write
 tearDown=InventoryTests.tearDown
 def test_whole_feedback_inverse_and_all_original_budgets(self):
  from check_ui35_inventory import MANIFEST,validate_check_ui35,prior_check_ui35_bytes
  self.assertLessEqual(validate_check_ui35(ROOT)[1],34000)
  for n,row in MANIFEST['files'].items():self.assertEqual(prior_check_ui35_bytes(n,(ROOT/n).read_bytes()),(ROOT/row['before']).read_bytes())
 def test_receipt_guards_timer_and_original_actors_cannot_change(self):
  from check_ui35_inventory import validate_check_ui35
  for n,a,b in [('ActionFeedbackStage.vue','store.saved&&store.available','true'),('ActionFeedbackStage.vue','setTimeout(clear,1600)','setTimeout(clear,16000)'),('ActionFeedbackStage.vue','fresh&&','true&&'),('action-motion.css','scale(.16)','scale(2)')]:
   p='web/src/'+n;raw=(ROOT/p).read_text();self.assertIn(a,raw);self.write(p,raw.replace(a,b,1))
   with self.subTest(change=a),self.assertRaises(AssertionError):validate_check_ui35(self.root)
   self.write(p,raw)
 def test_missing_receipt_scope_and_higher_budget_cannot_pass(self):
  from check_ui35_inventory import MANIFEST,LEDGER,validate_check_ui35
  for key,value in [('userAcceptance',True),('maxFeedbackBytes',34001),('newRasterAssets',1)]:
   m=copy.deepcopy(MANIFEST);m[key]=value;self.write(LEDGER,m)
   with self.subTest(key=key),self.assertRaises(AssertionError):validate_check_ui35(self.root)
  self.write(LEDGER,MANIFEST);(self.root/LEDGER).unlink()
  with self.assertRaises(AssertionError):validate_check_ui35(self.root)

class Uir3503Tests(unittest.TestCase):
 setUp=InventoryTests.setUp
 write=InventoryTests.write
 tearDown=InventoryTests.tearDown
 def test_exact_whole_native_stylesheet_inverse_and_original_fallbacks(self):
  from uir35_03_inventory import MANIFEST,validate_uir3503,prior_uir3503_bytes
  self.assertEqual(validate_uir3503(ROOT)[1],16577)
  self.assertEqual(prior_uir3503_bytes(MANIFEST['path'],(ROOT/MANIFEST['path']).read_bytes()),(ROOT/MANIFEST['before']).read_bytes())
 def test_original_values_timers_and_atomic_writers_cannot_change(self):
  from uir35_03_inventory import MANIFEST,validate_uir3503
  for n in ['web/src/CultivationSite.vue','web/src/RecoveryRitual.vue','web/src/activity-clock.ts','web/src/store.ts']:
   raw=(ROOT/n).read_text();self.write(n,raw+'\n/* unauthorized */')
   with self.subTest(file=n),self.assertRaisesRegex(AssertionError,'UIR35-03'):validate_uir3503(self.root)
   self.write(n,raw)
  n=MANIFEST['path'];raw=(ROOT/n).read_text();self.write(n,raw.replace('var(--game-jade,#52796e)','#52796e',1))
  with self.assertRaises(AssertionError):validate_uir3503(self.root)
 def test_missing_ledger_corrupt_original_and_scope_inflation_cannot_pass(self):
  from uir35_03_inventory import MANIFEST,LEDGER,validate_uir3503
  for key,value in [('userAcceptance',True),('maxAddedBytes',101),('newRasterAssets',1)]:
   m=copy.deepcopy(MANIFEST);m[key]=value;self.write(LEDGER,m)
   with self.subTest(key=key),self.assertRaisesRegex(AssertionError,'UIR35-03'):validate_uir3503(self.root)
  self.write(LEDGER,MANIFEST);(self.root/LEDGER).unlink()
  with self.assertRaisesRegex(AssertionError,'UIR35-03'):validate_uir3503(self.root)
  self.write(LEDGER,MANIFEST);self.write(MANIFEST['before'],'lost preserved stylesheet')
  with self.assertRaisesRegex(AssertionError,'UIR35-03'):validate_uir3503(self.root)

class Uir3504Tests(unittest.TestCase):
 setUp=InventoryTests.setUp
 write=InventoryTests.write
 tearDown=InventoryTests.tearDown
 def test_complete_parent_inverse_and_actual_original_caps_include_projection(self):
  from uir35_04_inventory import MANIFEST,validate_uir3504,prior_uir3504_bytes
  self.assertLessEqual(validate_uir3504(ROOT)[1],45000)
  for n,r in MANIFEST['files'].items():self.assertEqual(prior_uir3504_bytes(n,(ROOT/n).read_bytes()),(ROOT/r['before']).read_bytes())
 def test_projection_cannot_change_drafts_rules_cycles_or_atomic_writers(self):
  from uir35_04_inventory import MANIFEST,validate_uir3504
  for n in [MANIFEST['projection']['path'],'web/src/store.ts','src/full/adventure.ts','web/src/full-persistence.ts']:
   raw=(ROOT/n).read_text();self.write(n,raw+'\n/* unauthorized */')
   with self.subTest(file=n),self.assertRaisesRegex(AssertionError,'UIR35-04'):validate_uir3504(self.root)
   self.write(n,raw)
  n='web/src/AdventurePlanner.vue';raw=(ROOT/n).read_text();self.write(n,raw.replace("emit('start',plan)","emit('start',{...plan,maxCycles:999})",1))
  with self.assertRaisesRegex(AssertionError,'UIR35-04'):validate_uir3504(self.root)
 def test_missing_ledger_corrupt_original_and_larger_caps_cannot_pass(self):
  from uir35_04_inventory import MANIFEST,LEDGER,validate_uir3504
  for key,value in [('maxAdventureBytes',45001),('maxArt02Bytes',45001),('maxProjectionBytes',2001),('userAcceptance',True),('newRasterAssets',1)]:
   m=copy.deepcopy(MANIFEST);m[key]=value;self.write(LEDGER,m)
   with self.subTest(key=key),self.assertRaisesRegex(AssertionError,'UIR35-04'):validate_uir3504(self.root)
  self.write(LEDGER,MANIFEST);(self.root/LEDGER).unlink()
  with self.assertRaisesRegex(AssertionError,'UIR35-04'):validate_uir3504(self.root)
  self.write(LEDGER,MANIFEST);self.write(next(iter(MANIFEST['files'].values()))['before'],'lost original')
  with self.assertRaisesRegex(AssertionError,'UIR35-04'):validate_uir3504(self.root)
