"""ART37 presentation facts; the original consent/clock/store owners remain pinned."""
import hashlib,json,re
from pathlib import Path
from PIL import Image
LEDGER='art/redesign/art37.json'
CSS='web/src/art37-dialog-actions.css'
MAIN='web/src/main.ts'
IMPORT=b"import './art37-dialog-actions.css';\n"
BASE_SHA='d9ce62905a960f11fb8aecdf5c0fbe9b5e65c850ffb76e1fd3ee2ec83feb0c0e'
BUDGETS={'cssBytes': 5000, 'mainDeltaBytes': 64, 'combinedArt18NativeBytes': 18000, 'newRasterAssets': 2, 'combinedArt18RuntimeBytes': 144000}
UNCHANGED={'web/src/art18-ui.css': '2a536ea2393e233d0d610bb9feb1af1fd74d906592b3abd4e2b24340a639b947', 'web/src/GameConfirmDialog.vue': 'e607ab9f4eb60ee6725fb57f4d38a5c7f983ef82c6028539f7fe5e70b70a52cd', 'web/src/use-game-confirmation.ts': '6835e6c1ae8dc8435aa57d18ea6529bef0808c3f326cae0adb10d235124df2e4', 'web/src/focus.ts': '8ae91e78a4db7a854c293fc4b1bc28f02dd0d542b3119cff383f9245b4944eea', 'web/src/App.vue': 'ace7316243691e708ee80dac26aca866a9c28b7dbd8633cde11bf584a83ece71', 'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7', 'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21', 'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73', 'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815', 'art/redesign/art18.json': 'b9f4bddcb03ffec75b942e4198887f929408ea5eb2d1787b258aed10520a77e9'}
REFS=['docs/decisions/0089-dialog-action-overflow-art37-contract.md', 'goal-4/amendments/2026-11-02-art37-input.txt', 'goal-4/evidence/art37/main.ts.before.txt', 'goal-4/amendments/2026-11-02-art37-artwork-input.txt', 'art/production/art37/prompts.json', 'art/production/art37/exports.json', 'art/tools/export_art37_ui.py', 'goal-4/evidence/art37/art18-dialog-controls.spec.ts.before.txt', 'goal-4/evidence/art37/art18-dialog-gallery.spec.ts.before.txt']
TEST_BASELINES=[{'path': 'goal-4/evidence/art37/art18-dialog-controls.spec.ts.before.txt', 'consumer': 'web/e2e/art18-dialog-controls.spec.ts', 'sha256': 'ca5f099acec50a8342457a52dd1de02c4780c364b7a8694efc5495a485b05004'}, {'path': 'goal-4/evidence/art37/art18-dialog-gallery.spec.ts.before.txt', 'consumer': 'web/e2e/art18-dialog-gallery.spec.ts', 'sha256': '054437d1001eb3e8118a8eefac56eb95d16690433612f7082a54682d44d1267b'}]
def fact(raw,row):
 assert type(row['bytes'])is int and row['bytes']==len(raw)and row['sha256']==hashlib.sha256(raw).hexdigest(),'ART37 exact bytes'
def original_art37_main(root,raw):
 root=Path(root)
 if IMPORT not in raw:
  assert not(root/LEDGER).exists(),'ART37 detached main import'
  return raw
 assert (root/LEDGER).is_file()and raw.count(IMPORT)==1,'ART37 unrecorded or duplicate main evolution'
 m=json.loads((root/LEDGER).read_text());assert m['consumer']['path']==MAIN,'ART37 main consumer';fact(raw,m['consumer'])
 before=raw.replace(IMPORT,b'',1);assert hashlib.sha256(before).hexdigest()==BASE_SHA,'ART37 main gained code beyond one style import'
 return before

def validate_art37(root):
 root=Path(root).resolve()
 if not(root/LEDGER).exists():
  assert not(root/CSS).exists()and(not(root/MAIN).exists()or IMPORT not in(root/MAIN).read_bytes()),'ART37 unrecorded presentation'
  return set(),0,0
 def local(name):
  p=root/name;assert not p.is_symlink()and p.is_file()and p.resolve().is_relative_to(root),'ART37 local input';return p
 m=json.loads(local(LEDGER).read_text());assert m['format']=='chenyuan-dialog-actions-art37'and type(m['version'])is int and m['version']==1 and m['userAcceptance']is False,'ART37 header'
 assert m['budgets']==BUDGETS and all(type(v)is int for v in m['budgets'].values()),'ART37 original fixed caps'
 assert [r['path']for r in m['files']]==[CSS]and m['baseline']['path']=='goal-4/evidence/art37/main.ts.before.txt'and m['sourceReferences']==REFS and m['unchanged']==UNCHANGED,'ART37 fixed scope'
 for r in m['files']+[m['consumer'],m['baseline']]:fact(local(r['path']).read_bytes(),r)
 old=local(m['baseline']['path']).read_bytes();assert hashlib.sha256(old).hexdigest()==BASE_SHA and original_art37_main(root,local(MAIN).read_bytes())==old,'ART37 frozen whole main'
 assert local(MAIN).stat().st_size-len(old)<=64 and local(CSS).stat().st_size<=5000,'ART37 actual presentation cap'
 for name,h in UNCHANGED.items():assert hashlib.sha256(local(name).read_bytes()).hexdigest()==h,'ART37 consent focus writer or old ledger changed'
 old18=json.loads(local('art/redesign/art18.json').read_text());assert sum(local(r['path']).stat().st_size for r in old18['files'])+local(CSS).stat().st_size<=18000,'ART37 original ART18 combined cap'
 for name in REFS:local(name)
 assert m['testBaselines']==TEST_BASELINES,'ART37 exact original behavior tests'
 replacements={'dialog-jade-frame-v1.webp':'dialog-ink-rim-art37-v1.webp','action-jade-frame-v1.webp':'action-jade-plaque-art37-v1.webp','*-jade-frame-v1.webp':'*-art37-v1.webp'}
 for r in TEST_BASELINES:
  raw=local(r['path']).read_bytes();assert hashlib.sha256(raw).hexdigest()==r['sha256'],'ART37 original test source'
  expected=raw.decode()
  for old,new in replacements.items():expected=expected.replace(old,new)
  assert local(r['consumer']).read_text()==expected,'ART37 only material expectations may evolve'
 exports=json.loads(local('art/production/art37/exports.json').read_text())
 assert m['runtimeAssets']==exports['rows']and len(m['originals'])==2,'ART37 exact material export facts'
 assets=[('dialog-ink-rim',(512,512),(0,0,1254,1254)),('action-jade-plaque',(512,144),(0,39,2172,648))]
 assert len(m['runtimeAssets'])==2,'ART37 two material membership'
 material_refs=set()
 for r,origin,(key,size,box)in zip(m['runtimeAssets'],m['originals'],assets):
  src='art/production/art37/'+key+'-source.png';out='web/public/art/v2/ui/'+key+'-art37-v1.webp';receipt='art/production/art37/'+key+'-receipt.json'
  assert r['path']==out and r['source']==src and origin['path']==src and tuple(r['size'])==size and tuple(r['crop'])==box,'ART37 material shape'
  fact(local(out).read_bytes(),r);fact(local(src).read_bytes(),origin)
  proof=json.loads(local(receipt).read_text());assert proof['tool']=='built-in image_gen'and proof['transparent_background']is True and proof['archivedSource']==src and proof['sha256']==origin['sha256']==r['sourceSHA256'],'ART37 real generated provenance'
  with Image.open(local(src))as source,Image.open(local(out))as runtime:
   assert source.mode=='RGBA'and runtime.mode=='RGBA'and runtime.size==size and source.getchannel('A').getextrema()==runtime.getchannel('A').getextrema()==(0,255),'ART37 real alpha material'
   assert box==(source.getchannel('A').getbbox()if key=='action-jade-plaque'else(0,0,*source.size)),'ART37 only transparent exterior trim'
   packed=source.crop(box).resize(size,Image.Resampling.LANCZOS)
   assert packed.getchannel('A').tobytes()==runtime.getchannel('A').tobytes(),'ART37 packed alpha preserved'
   center=runtime.getpixel((size[0]//2,size[1]//2))[3];assert(center==0 if key=='dialog-ink-rim'else center>=250),'ART37 genuine text opening or jade face'
  material_refs.update([src,out,receipt])
 assert sum(local(r['path']).stat().st_size for r in old18['runtimeAssets']+m['runtimeAssets'])<=144000,'ART37 original combined material cap' 
 text=re.sub(r'/\*.*?\*/','',local(CSS).read_text(),flags=re.S)
 assert not re.search(r'overflow\s*:\s*(hidden|clip)|display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0\s*[;}]|font-size|https?:|indexedDB|localStorage|fetch\s*\(|\beval\s*\(',text),'ART37 cannot hide shrink or gain a writer'
 assert not re.search(r'@media(?!\(prefers-reduced-motion:reduce\))',text),'ART37 compatibility scope'
 for token in ['max-inline-size:calc(100vw - 64px)','max-block-size:calc(100dvh - 64px)','overflow-wrap:anywhere','min-block-size:44px','button.primary::before{inset:0',':focus-visible',':disabled',':active',':hover','button.primary.danger','[data-testid=restart]','animation:none!important','dialog-ink-rim-art37-v1.webp','action-jade-plaque-art37-v1.webp','border-image-slice:48 fill!important','border-image-slice:32 fill','transform:translateY(0)']:
  assert token in text,'ART37 actual presentation contract missing '+token
 return {LEDGER,CSS,MAIN,m['baseline']['path'],*UNCHANGED,*REFS,*material_refs,*[r['consumer']for r in TEST_BASELINES]},2,local(CSS).stat().st_size
