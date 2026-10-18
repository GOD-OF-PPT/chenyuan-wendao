import copy,hashlib,json,os,shutil,tempfile,unittest
from pathlib import Path
from check_inventory import validate,SCOPES
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
  for f in files:
   out=self.root/f.relative_to(ROOT);out.parent.mkdir(parents=True,exist_ok=True);os.link(f,out)
  self.write('art/asset-manifest.json',self.manifest)
 def tearDown(self):self.temp.cleanup()
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
  self.assertEqual(result['productionAssets'],(38 if (self.root/'art/redesign/manifest.json').exists() else 20)+(30 if (self.root/'art/redesign/character-battle-manifest.json').exists() else 0))
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

if __name__=='__main__':unittest.main()
