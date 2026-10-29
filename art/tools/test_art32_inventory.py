import hashlib,json,tempfile,unittest
from pathlib import Path
from art32_inventory import validate_art32,normalize_art32_view,LEDGER,FILES,REFS,BASE,BASELINES,UNCHANGED,RUNTIMES
from check_inventory import image_info
ROOT=Path(__file__).resolve().parents[2]
class ART32Tests(unittest.TestCase):
 def setUp(self):
  t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup);self.root=Path(t.name);m=json.loads((ROOT/LEDGER).read_text());names={LEDGER,*FILES,*REFS,*UNCHANGED,BASE+'/export-facts.json'}
  for key,f in m['asset']['assets'].items():
   a=json.loads((ROOT/f['audit']['path']).read_text());names.update([BASE+'/'+key+'-export-facts.json',BASE+'/'+key+'-prompt.txt',f['source']['path'],f['runtime']['path'],f['producer']['path'],f['helper']['path'],f['audit']['path'],*[r['candidate']['path']for r in a['calls']],*[p['path']for p in f['prompts']]])
  for key in ['narrative-objects','story-journey','action-feedback']:
   n='art/redesign/'+key+'.json';names.add(n);names.update(r['path']for r in json.loads((ROOT/n).read_text())['files'])
  for n in names:
   p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((ROOT/n).read_bytes())
  self.original={n:(self.root/n).read_bytes()for n in names}
 def check(self):return validate_art32(self.root,image_info)
 def edit(self,fn):
  p=self.root/LEDGER;m=json.loads(p.read_text());fn(m);p.write_text(json.dumps(m))
 def resign(self):self.edit(lambda m:[r.update(bytes=(self.root/r['path']).stat().st_size,sha256=hashlib.sha256((self.root/r['path']).read_bytes()).hexdigest())for r in m['files']])
 def syncFacts(self):
  combined=json.loads((self.root/LEDGER).read_text())['asset'];(self.root/BASE/'export-facts.json').write_text(json.dumps(combined))
  for key,value in combined['assets'].items():(self.root/BASE/(key+'-export-facts.json')).write_text(json.dumps(value))
 def reject(self,fn,message=None):
  for n,b in self.original.items():
   p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
  self.check();fn()
  if message:
   with self.assertRaisesRegex(AssertionError,message):self.check()
  else:
   with self.assertRaises((AssertionError,KeyError,ValueError)):self.check()
 def test_current_root_and_complete_sandbox_keep_both_actual_stages(self):
  self.assertEqual(self.check()[1:],(2,253116));self.assertEqual(validate_art32(ROOT,image_info)[1:],(2,253116))
 def test_original_caps_scope_and_human_acceptance_cannot_expand(self):
  self.reject(lambda:self.edit(lambda m:m['files'].pop()))
  self.reject(lambda:self.edit(lambda m:m['budgets'].update(oldNarrativeCap=45001)))
  self.reject(lambda:self.edit(lambda m:m.update(userAcceptance=True)))
  def grow():
   p=self.root/FILES[-1];p.write_text(p.read_text()+' '*(45001-p.stat().st_size));self.resign()
  self.reject(grow)
 def test_phase_views_preserve_full_old_scripts_and_every_original_callback(self):
  for index,old,new in [(0,"@change=\"page=$event\"","@change=\"page=0\""),(1,"['question','ending'].includes(identity)","['question','ending','lu_intro'].includes(identity)"),(1,'aria-hidden="true"','aria-hidden="false"')]:
   def change(index=index,old=old,new=new):
    p=self.root/FILES[index];p.write_text(p.read_text().replace(old,new,1));self.resign()
   self.reject(change)
  def script():
   p=self.root/FILES[1];p.write_text(p.read_text().replace('function close(){','function close(){/*changed*/',1));self.resign()
  self.reject(script)
 def test_backward_view_proof_cannot_hide_controller_renderer_or_baseline_edits(self):
  for i,n in enumerate(FILES[:2]):self.assertEqual(normalize_art32_view(n,(ROOT/n).read_text()),(ROOT/BASELINES[i]['path']).read_text())
  self.reject(lambda:(self.root/'web/src/reading-memory.ts').write_text('new reader'))
  self.reject(lambda:(self.root/'web/src/ActionFeedbackStage.vue').write_text('new renderer'))
  self.reject(lambda:(self.root/BASELINES[0]['path']).write_text('new old source'))
 def test_previous_styles_and_real_opaque_uniform_assets_cannot_be_relabelled(self):
  def style():
   p=self.root/FILES[-1];p.write_text(p.read_text().replace('font-size:18px','font-size:12px',1));self.resign()
  self.reject(style)
  def hide():
   p=self.root/FILES[-1];p.write_text(p.read_text()+'\n.art32-threshold .reading-text{display:none}');self.resign()
  self.reject(hide)
  self.reject(lambda:(self.root/RUNTIMES['ending']).write_bytes(b'fake valid artwork'))
  def crop():
   p=self.root/LEDGER;m=json.loads(p.read_text());m['asset']['assets']['question']['transform']['crop']=True;p.write_text(json.dumps(m));self.syncFacts()
  self.reject(crop,'ART32 whole deterministic export')
 def test_literal_tool_audit_does_not_fabricate_model_or_reference_input(self):
  def audit():
   f=json.loads((self.root/LEDGER).read_text())['asset']['assets']['question'];p=self.root/f['audit']['path'];a=json.loads(p.read_text());a['model']='claimed-model';p.write_text(json.dumps(a));self.edit(lambda m:m['asset']['assets']['question']['audit'].update(bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()));self.syncFacts()
  self.reject(audit,'ART32 honest actual audit')
  self.reject(lambda:(self.root/BASE/'ending-prompt.txt').write_text('different literal request'))
if __name__=='__main__':unittest.main()
