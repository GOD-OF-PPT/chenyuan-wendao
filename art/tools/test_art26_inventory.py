import hashlib,json,tempfile,unittest
from pathlib import Path
from art26_inventory import validate_art26,LEDGER,FILES,REFS,BASE,BASELINES,UNCHANGED,RUNTIME
from check_inventory import image_info
ROOT=Path(__file__).resolve().parents[2]
class ART26Tests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name);m=json.loads((ROOT/LEDGER).read_text());f=m['asset'];audit=json.loads((ROOT/f['audit']['path']).read_text());names={LEDGER,*FILES,*REFS,*UNCHANGED,BASE+'/export-facts.json',f['source']['path'],RUNTIME,f['producer']['path'],f['helper']['path'],f['audit']['path'],*[r['path']for r in f['prompts']],*[r['path']for r in m['candidates']],*[r['path']for r in m['reusedAssets']],audit['reference']['path']}
  for key in ['art03','art16','idle-production','idle-preparation','ta09']:
   n='art/redesign/'+key+'.json';names.add(n);names.update(r['path']for r in json.loads((ROOT/n).read_text())['files'])
  for n in names:
   p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((ROOT/n).read_bytes())
 def check(self):return validate_art26(self.root,image_info)
 def edit(self,fn):
  p=self.root/LEDGER;j=json.loads(p.read_text());fn(j);p.write_text(json.dumps(j))
 def resign(self):
  def change(j):
   for r in j['files']:
    b=(self.root/r['path']).read_bytes();r.update(bytes=len(b),sha256=hashlib.sha256(b).hexdigest())
  self.edit(change)
 def facts(self,fn):
  p=self.root/BASE/'export-facts.json';j=json.loads(p.read_text());fn(j);p.write_text(json.dumps(j));self.edit(lambda m:m.update(asset=j))
 def test_real_and_complete_sandbox_positive_and_exact_legacy_reader_succession(self):
  from art25_inventory import validate_art25
  self.assertEqual(self.check()[1:],(1,83104));self.assertEqual(validate_art26(ROOT,image_info)[1:],(1,83104));self.assertEqual(validate_art25(ROOT)[1:],(0,0))
 def test_missing_ledger_and_reference_do_not_disappear(self):
  p=self.root/LEDGER;b=p.read_bytes();p.unlink()
  with self.assertRaises(AssertionError):self.check()
  p.write_bytes(b);(self.root/REFS[0]).unlink()
  with self.assertRaises(AssertionError):self.check()
 def test_fixed_typed_caps_and_actual_native_cap_survive_resigning(self):
  for key,value in [('maxRuntimeBytes',240001),('parentCap',5001),('newRasterAssets',True)]:
   p=self.root/LEDGER;b=p.read_bytes();self.edit(lambda m:m['budgets'].update({key:value}))
   with self.assertRaises(AssertionError):self.check()
   p.write_bytes(b)
  p=self.root/'web/src/art03-equipment.css';p.write_text(p.read_text()+' '*45000);self.resign()
  with self.assertRaisesRegex(AssertionError,'old cap'):self.check()
 def test_actual_idle_and_owned_relic_consumers_keep_fallback_and_readonly_slot(self):
  p=self.root/FILES[0];s=p.read_text()
  for text in [s.replace('path="art/v2/actors/player-loadout-idle-v1.webp"','path="art/v2/actors/player-standing-cold-v1.webp"'),s.replace('asset-id="loadout-portrait-fallback"','asset-id="missing-fallback"'),s.replace("slot===\'relic\'&&game.loadout.relic","slot===\'relic\'"),s.replace("emit('slot',slot)","emit('act',slot)")]:
   p.write_text(text);self.resign()
   with self.assertRaises(AssertionError):self.check()
 def test_original_controller_lifetimes_and_configuration_cannot_be_resigned(self):
  p=self.root/FILES[1];s=p.read_text()
  for text in [s+' ',s.replace('relicInspection.value=null;','',1)]:
   p.write_text(text);self.resign()
   with self.assertRaises(AssertionError):self.check()
  p.write_text(s);self.resign();p=self.root/FILES[2];s=p.read_text();p.write_text(s.replace("Object.hasOwn(C.relics,r.id)","true"));self.resign()
  with self.assertRaises(AssertionError):self.check()
 def test_alpha_deterministic_export_and_human_claims_are_bound(self):
  p=self.root/RUNTIME;b=p.read_bytes();p.write_bytes(b+b'x')
  with self.assertRaises(AssertionError):self.check()
  p.write_bytes(b)
  p=self.root/BASE/'export-facts.json';original=p.read_bytes();ledger=(self.root/LEDGER).read_bytes()
  for fn in [lambda f:f['sourceAlphaQuality'].update(core250Pixels=0),lambda f:f['doubleExport'].update(bytesEqual=False)]:
   self.facts(fn)
   with self.assertRaises(AssertionError):self.check()
   p.write_bytes(original);(self.root/LEDGER).write_bytes(ledger)
  self.edit(lambda m:m.update(userAcceptance=True))
  with self.assertRaises(AssertionError):self.check()
