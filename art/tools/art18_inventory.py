"""Validate ART18's real UI materials, bounded presentation, and consent consumers."""
from pathlib import Path
import hashlib,json,re
from PIL import Image
from ta09_inventory import Tags

LEDGER='art/redesign/art18.json'
NATIVE=['web/src/art18-ui.css','web/src/GameConfirmDialog.vue','web/src/use-game-confirmation.ts']
ASSETS=[('dialog-jade-frame',768,96000),('action-jade-frame',512,48000)]
REFS=['docs/decisions/0050-game-dialog-buttons-art18-contract.md','goal-4/amendments/2026-10-28-art18-dialog-buttons.md','goal-4/research/art18-dialog-sources.json','art/production/art18/prompts.json','art/production/art18/exports.json','art/tools/export_art18_ui.py']

def validate_art18(root):
 root=root.resolve()
 if not(root/LEDGER).exists():
  assert not any((root/n).exists()for n in NATIVE),'Unrecorded ART18 UI'
  return set(),0
 m=json.loads((root/LEDGER).read_text())
 assert m['format']=='chenyuan-art18-ui'and type(m['version'])is int and m['version']==1 and m['userAcceptance']is False,'ART18 format/acceptance'
 assert type(m['maxNativeBytes'])is int and m['maxNativeBytes']==18000 and type(m['maxRuntimeBytes'])is int and m['maxRuntimeBytes']==144000,'ART18 fixed budgets'
 assert [r['path']for r in m['files']]==NATIVE and m['sourceReferences']==REFS,'ART18 membership'
 expected=[f'web/public/art/v2/ui/{name}-v1.webp'for name,_,_ in ASSETS]
 assert [r['path']for r in m['runtimeAssets']]==expected,'ART18 runtime membership'
 assert [r['path']for r in m['originals']]==[f'art/production/art18/{name}-source.png'for name,_,_ in ASSETS],'ART18 original membership'
 total=0;recorded={LEDGER,*REFS}
 for row in m['files']+m['runtimeAssets']+m['originals']:
  p=(root/row['path']).resolve();assert p.is_relative_to(root)and p.is_file(),'ART18 source missing'
  raw=p.read_bytes();assert type(row['bytes'])is int and row['bytes']==len(raw)and row['sha256']==hashlib.sha256(raw).hexdigest(),'ART18 actual identity'
  recorded.add(row['path'])
  if row['path']in NATIVE:total+=len(raw)
 assert total<=18000 and sum(r['bytes']for r in m['runtimeAssets'])<=144000,'ART18 actual budget'
 for row,(name,size,budget)in zip(m['runtimeAssets'],ASSETS):
  assert type(row['maxBytes'])is int and row['maxBytes']==budget and row['bytes']<=budget,'ART18 per-material budget'
  source=f'art/production/art18/{name}-source.png';receipt=f'art/production/art18/{name}-receipt.json';recorded.update([source,receipt])
  assert source in [r['path']for r in m['originals']],'ART18 original membership'
  proof=json.loads((root/receipt).read_text());assert proof['tool']=='built-in image_gen'and proof['archivedSource']==source and proof['sha256']==hashlib.sha256((root/source).read_bytes()).hexdigest(),'ART18 generated provenance'
  with Image.open(root/source)as original,Image.open(root/row['path'])as runtime:
   assert original.mode=='RGBA'and runtime.mode=='RGBA'and runtime.size==(size,size),'ART18 real material shape'
   assert original.getchannel('A').getextrema()==(0,255)and runtime.getchannel('A').getextrema()==(0,255),'ART18 real transparency'
   normalized=original.resize((size,size),Image.Resampling.LANCZOS)
   assert normalized.getchannel('A').tobytes()==runtime.getchannel('A').tobytes(),'ART18 exported alpha changed'
 for ref in REFS:assert (root/ref).is_file(),'ART18 reference missing'
 css=(root/NATIVE[0]).read_text();hook=(root/NATIVE[2]).read_text();widget=(root/NATIVE[1]).read_text()
 assert all(f"url('/art/v2/ui/{name}-v1.webp')"in css for name,_,_ in ASSETS)and 'border-image:var(--art18-frame)'in css and 'border-image:var(--art18-command)'in css,'ART18 material detached'
 assert "import './art18-ui.css';"in(root/'web/src/main.ts').read_text(),'ART18 stylesheet detached'
 assert all(t in widget for t in ['<Teleport to="body">','data-testid="game-confirmation"','data-testid="game-confirmation-confirm"',':disabled="!!blocked"','if(!blocked.value)emit(\'answer\',true)']),'ART18 real modal detached'
 assert 'if(value&&(!source.request.current()||source.request.blocked?.()))return;'in hook and 'source.resolve(value)'in hook and 'source.parent' in hook,'ART18 consent/return detached'
 assert not re.search(r'indexedDB|localStorage|useGame\(|fetch\s*\(|setTimeout|setInterval|v-html|\beval\s*\(',hook+widget),'ART18 presentation gained writer/clock'
 for name in ['web/src/App.vue','web/src/LocalExperiencePanel.vue']:
  text=(root/name).read_text();tags=Tags(text)
  nodes=[a for tag,a in tags.nodes if tag=='gameconfirmdialog']
  assert len(nodes)==1 and nodes[0].get(':request')=='confirmation.request.value'and nodes[0].get('@answer')=='confirmation.answer($event)','ART18 confirmation consumer missing'
  assert not re.search(r'(?<![\w])(?:window\.)?confirm\s*\(',text),'ART18 browser confirmation returned'
 assert all("kind:'"+kind+"'"in(root/'web/src/App.vue').read_text()for kind in ['import','restart','restore']),'ART18 game consent routes missing'
 assert all("kind:'"+kind+"'"in(root/'web/src/LocalExperiencePanel.vue').read_text()for kind in ['clear-local','clear-memory']),'ART18 local consent routes missing'
 assert 'confirmationScope:()=>meta?'in(root/'web/src/use-local-experience.ts').read_text(),'ART18 readonly scope missing'
 return recorded,total
