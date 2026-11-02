"""ART37 presentation facts; the original consent/clock/store owners remain pinned."""
import hashlib,json,re
from pathlib import Path
LEDGER='art/redesign/art37.json'
CSS='web/src/art37-dialog-actions.css'
MAIN='web/src/main.ts'
IMPORT=b"import './art37-dialog-actions.css';\n"
BASE_SHA='d9ce62905a960f11fb8aecdf5c0fbe9b5e65c850ffb76e1fd3ee2ec83feb0c0e'
BUDGETS={'cssBytes':5000,'mainDeltaBytes':64,'combinedArt18NativeBytes':18000,'newRasterAssets':0}
UNCHANGED={'web/src/art18-ui.css': '2a536ea2393e233d0d610bb9feb1af1fd74d906592b3abd4e2b24340a639b947', 'web/src/GameConfirmDialog.vue': 'e607ab9f4eb60ee6725fb57f4d38a5c7f983ef82c6028539f7fe5e70b70a52cd', 'web/src/use-game-confirmation.ts': '6835e6c1ae8dc8435aa57d18ea6529bef0808c3f326cae0adb10d235124df2e4', 'web/src/focus.ts': '8ae91e78a4db7a854c293fc4b1bc28f02dd0d542b3119cff383f9245b4944eea', 'web/src/App.vue': 'ace7316243691e708ee80dac26aca866a9c28b7dbd8633cde11bf584a83ece71', 'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7', 'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21', 'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73', 'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815', 'art/redesign/art18.json': 'b9f4bddcb03ffec75b942e4198887f929408ea5eb2d1787b258aed10520a77e9'}
REFS=['docs/decisions/0089-dialog-action-overflow-art37-contract.md','goal-4/amendments/2026-11-02-art37-input.txt','goal-4/evidence/art37/main.ts.before.txt']
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
 assert [r['path']for r in m['files']]==[CSS]and m['baseline']['path']==REFS[-1]and m['sourceReferences']==REFS and m['unchanged']==UNCHANGED,'ART37 fixed scope'
 for r in m['files']+[m['consumer'],m['baseline']]:fact(local(r['path']).read_bytes(),r)
 old=local(m['baseline']['path']).read_bytes();assert hashlib.sha256(old).hexdigest()==BASE_SHA and original_art37_main(root,local(MAIN).read_bytes())==old,'ART37 frozen whole main'
 assert local(MAIN).stat().st_size-len(old)<=64 and local(CSS).stat().st_size<=5000,'ART37 actual presentation cap'
 for name,h in UNCHANGED.items():assert hashlib.sha256(local(name).read_bytes()).hexdigest()==h,'ART37 consent focus writer or old ledger changed'
 old18=json.loads(local('art/redesign/art18.json').read_text());assert sum(local(r['path']).stat().st_size for r in old18['files'])+local(CSS).stat().st_size<=18000,'ART37 original ART18 combined cap'
 for name in REFS:local(name)
 text=re.sub(r'/\*.*?\*/','',local(CSS).read_text(),flags=re.S)
 assert not re.search(r'overflow\s*:\s*(hidden|clip)|display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0\s*[;}]|font-size|https?:|indexedDB|localStorage|fetch\s*\(|\beval\s*\(',text),'ART37 cannot hide shrink or gain a writer'
 assert not re.search(r'@media(?!\(prefers-reduced-motion:reduce\))',text),'ART37 compatibility scope'
 for token in ['max-inline-size:calc(100vw - 64px)','max-block-size:calc(100dvh - 64px)','overflow-wrap:anywhere','min-block-size:44px','button.primary::before{inset:0',':focus-visible',':disabled',':active',':hover','button.primary.danger','[data-testid=restart]','animation:none!important']:
  assert token in text,'ART37 actual presentation contract missing '+token
 return {LEDGER,CSS,MAIN,m['baseline']['path'],*UNCHANGED,*REFS},0,local(CSS).stat().st_size
