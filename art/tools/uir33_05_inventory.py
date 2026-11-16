from check_uir33_02_inventory import prior_check_uir3302_bytes
"""Current activity record presentation; one CSS import, unchanged state owners."""
import hashlib,json,re
from pathlib import Path
LEDGER='art/redesign/uir33-05.json'
IMPORT=b"import './activity-detail.css';\n"
MANIFEST={'format': 'chenyuan-activity-detail-uir33-05',
 'version': 1,
 'userAcceptance': False,
 'maxAddedNativeBytes': 3200,
 'newRasterAssets': 0,
 'files': [{'path': 'web/src/activity-detail.css',
            'bytes': 2872,
            'sha256': 'd96f9458dbd3ee7d64a437f0256b3d25dba0b6c0687f1aa96eebe0fd3d72a2f6'}],
 'consumer': {'path': 'web/src/main.ts',
              'bytes': 1598,
              'sha256': 'ba7d484e521876911b756fee5e81c25be7ea86b8d92a9d46391d2f98454d25ee'},
 'before': {'path': 'goal-4/evidence/uir33-05/before/web/src/main.ts',
            'bytes': 1566,
            'sha256': 'e985976803f0ff98cff52445b1300df7bf7471f34e4594fffc8d34ea327a81b6'},
 'sourceReferences': ['docs/decisions/0100-activity-detail-uir33-05-contract.md',
                      'goal-4/amendments/2026-11-04-uir33-05-input.md',
                      'goal-4/research/uir33-05-sources.json'],
 'unchanged': {'web/src/TrainingActivity.vue': 'cf52d3aa3d5063585ac52dd4b0eb1ff8afc46d088c911ed6b5939ce6601e544c',
               'web/src/App.vue': '2549b27003e11cf12f44e2ba41a1053b2de996c3636110f277ac84babd1dd4fd',
               'web/src/activity-clock.ts': '21fc98e4a430464a6dc3554091c022c53b17714938ae6e05491d27e1ab3f0901',
               'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7',
               'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21',
               'web/src/activity-persistence.ts': 'a5100e6f2d84b627ef17800bfc8f17f3f533566db47f35faab3833da66bab4cf',
               'web/src/stage-r1.css': '1ed138017fb93db1156aea3db518ea7f930864a0503e3adb7363f4e4eb68112d',
               'web/src/idle-preparation.css': '9832321f25817d059c4a95e6bc16ac31e7476eac800afaa788575cd00278396a',
               'web/src/idle-activity.css': '17ef27c763e8c2e5a7d57f11b5f24f1604cc4df97562abf6f4e4a909a30c13e6',
               'art/redesign/stage-r1.json': '3ce30ea55cf43ef9f335df7a0cc744f0f0c9afc40cdef5997fdf7dcc5dedc967',
               'art/redesign/idle-cultivation.json': 'b1443902e2ed89bcfd861b9704ec1a544ac1c3a0c7de7161e64d5553a3838f39'}}
def prior_uir3305_main(raw):
 if IMPORT not in raw:return raw
 assert hashlib.sha256(raw).hexdigest()==MANIFEST['consumer']['sha256'],'UIR33-05 exact main'
 assert raw.count(IMPORT)==1,'UIR33-05 unique import'
 old=raw.replace(IMPORT,b'',1)
 assert hashlib.sha256(old).hexdigest()==MANIFEST['before']['sha256'],'UIR33-05 exact main inverse'
 return old

def validate_uir3305(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file() and not p.is_symlink() and p.resolve().is_relative_to(root),'UIR33-05 local input';return p
 if not(root/LEDGER).exists():
  assert not(root/MANIFEST['files'][0]['path']).exists(),'UIR33-05 unrecorded style'
  assert not(root/'web/src/main.ts').exists() or IMPORT not in(root/'web/src/main.ts').read_bytes(),'UIR33-05 unrecorded import'
  return set(),0
 assert json.loads(local(LEDGER).read_text())==MANIFEST,'UIR33-05 immutable ledger and cap'
 for r in [*MANIFEST['files'],MANIFEST['consumer'],MANIFEST['before']]:
  raw=local(r['path']).read_bytes();assert len(raw)==r['bytes'] and hashlib.sha256(raw).hexdigest()==r['sha256'],'UIR33-05 exact current source'
 raw=local(MANIFEST['consumer']['path']).read_bytes();assert prior_uir3305_main(raw)==local(MANIFEST['before']['path']).read_bytes(),'UIR33-05 bootstrap unchanged'
 css=local(MANIFEST['files'][0]['path']).read_text();assert len(css.encode())<=3200 and len(raw)-MANIFEST['before']['bytes']==len(IMPORT),'UIR33-05 fixed new budget'
 assert not re.search(r'overflow\s*:\s*(hidden|clip|auto|scroll)|display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0\s*[;}]|@media|https?:|indexedDB|localStorage|fetch\s*\(',css),'UIR33-05 no hidden content writer or compatibility'
 for rule in css.split('}'):
  if '{' in rule:
   selectors=rule.rsplit('/*',1)[-1].split('*/')[-1].split('{')[0].strip()
   assert all(x.strip().startswith('.immersive-stage') and 'activity-detail-surface' in x for x in selectors.split(',')),'UIR33-05 only activity detail'
 for n,pin in MANIFEST['unchanged'].items():assert hashlib.sha256(prior_check_uir3302_bytes(n,local(n).read_bytes())).hexdigest()==pin,'UIR33-05 original state owner or cap'
 for n in MANIFEST['sourceReferences']:local(n)
 return {LEDGER,*[r['path'] for r in MANIFEST['files']],MANIFEST['consumer']['path'],MANIFEST['before']['path'],*MANIFEST['unchanged'],*MANIFEST['sourceReferences']},len(css.encode())
