import hashlib,json,shutil,tempfile,unittest
from pathlib import Path
from art35_inventory import validate_art35,FILES,PARENTS,REFS,UNCHANGED
from check_inventory import image_info

ROOT=Path(__file__).resolve().parents[2]

class ART35InventoryTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='chenyuan-art35-negative-');self.root=Path(self.temp.name)
  shutil.copytree(ROOT/'art',self.root/'art',ignore=shutil.ignore_patterns('__pycache__'))
  names={*FILES,*PARENTS,*REFS,*UNCHANGED,'web/public/art/v2/characters/player-seated-cold.webp','web/public/art/v2/catalogue/study-v1.webp'}
  for ledger in ['ta09','art04','art03','art10','idle-preparation']:
   names.update(r['path']for r in json.loads((ROOT/f'art/redesign/{ledger}.json').read_text())['files'])
  names.update(r['runtime']['path']for r in json.loads((ROOT/'art/production/art35/export-facts.json').read_text())['assets'])
  for name in names:
   dest=self.root/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,dest)
 def tearDown(self):self.temp.cleanup()
 def check(self):return validate_art35(self.root,image_info)
 def resign(self,name,text):
  raw=text.encode()if isinstance(text,str)else text;(self.root/name).write_bytes(raw)
  path=self.root/'art/redesign/art35.json';m=json.loads(path.read_text())
  for field in ['files','parents']:
   for row in m[field]:
    if row['path']==name:row.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest())
  path.write_text(json.dumps(m))
 def test_current_full_sources_real_alpha_eight_domains_and_all_original_caps_pass(self):
  files,count,total=self.check();self.assertEqual(count,8);self.assertGreater(total,0);self.assertLessEqual(total,740000)
  self.assertIn('art/production/art35/heart-source.png',files)
  self.assertIn('art/production/art35/heart-source-v2.png',files)
 def test_resigned_original_controller_changes_cannot_become_artwork_authorization(self):
  name='web/src/JadeEngraving.vue';text=(self.root/name).read_text();self.resign(name,text.replace('opened=!opened','opened=true   ',1))
  with self.assertRaisesRegex(AssertionError,'ART35'):self.check()
 def test_resigned_new_loader_cannot_gain_clocks_storage_or_skip_image_ownership(self):
  name=FILES[0];original=(self.root/name).read_text()
  for change in [original+'\nsetTimeout(()=>0,1);',original+'\nindexedDB.open("unexpected");',original.replace("image.getAttribute('href')!==(part==='cover'?cover.value:page)",'false'),original.replace('const loaded=ref({cover:false,page:false})','const loaded=ref({cover:true,page:true})')]:
   self.resign(name,change)
   with self.subTest(change=change[-100:]),self.assertRaisesRegex(AssertionError,'ART35'):self.check()
 def test_resigned_styles_cannot_hide_primary_paint_or_replace_real_spread(self):
  name=FILES[1];original=(self.root/name).read_text()
  for extra in ['\n.jade-painted-cover{display:none}','\n.ta09-jade{--jade-spread:1}','\n.jade-painted-cover{opacity:0}']:
   self.resign(name,original+extra)
   with self.subTest(extra=extra),self.assertRaisesRegex(AssertionError,'ART35'):self.check()
 def test_existing_and_new_budgets_are_fixed_even_after_ledger_resigning(self):
  path=self.root/'art/redesign/art35.json';original=path.read_text()
  for field in ['newNativeBytes','jadeDeltaBytes','maxRuntimeBytes','newRasterAssets']:
   m=json.loads(original);m['budgets'][field]+=1;path.write_text(json.dumps(m))
   with self.subTest(field=field),self.assertRaisesRegex(AssertionError,'ART35'):self.check()
  path.write_text(original);name=FILES[0];self.resign(name,(self.root/name).read_bytes()+b' '*2401)
  with self.assertRaisesRegex(AssertionError,'ART35'):self.check()
 def test_each_runtime_is_frozen_and_cannot_be_replaced_by_a_forged_alpha_flag(self):
  facts_path=self.root/'art/production/art35/export-facts.json';facts=json.loads(facts_path.read_text());row=facts['assets'][0]['runtime'];path=self.root/row['path'];path.write_bytes(path.read_bytes()+b'forged')
  raw=path.read_bytes();row.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest());facts_path.write_text(json.dumps(facts));m_path=self.root/'art/redesign/art35.json';m=json.loads(m_path.read_text());m['facts'].update(bytes=facts_path.stat().st_size,sha256=hashlib.sha256(facts_path.read_bytes()).hexdigest());m_path.write_text(json.dumps(m))
  with self.assertRaisesRegex(AssertionError,'ART35'):self.check()

if __name__=='__main__':unittest.main()
