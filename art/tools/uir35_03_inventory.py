from cend06_f02a_inventory import prior_f02a_bytes
from uir35_04_inventory import prior_uir3504_bytes
"""Native saved progress theme only; preserve every original selector, layout and writing owner."""
import hashlib,json
from pathlib import Path
LEDGER='art/redesign/uir35-03.json'
MANIFEST={'format': 'chenyuan-uir35-03-saved-progress',
 'version': 1,
 'userAcceptance': False,
 'newRasterAssets': 0,
 'maxAddedBytes': 100,
 'path': 'web/src/style.css',
 'before': 'goal-4/evidence/uir35-03/before/web/src/style.css',
 'beforeBytes': 16526,
 'beforeSha256': '5f1c1bdd58ff91debf24606c039780af729957b013a320332f2dc02c73d932a9',
 'bytes': 16577,
 'sha256': '9290ad9cb1e75c09222bcb4f6b5e1af427ca5ea77550e1d53e101e7658b15c27',
 'operations': [[1453, '', 'var(--game-base,'],
                [1476, '', ')'],
                [1556, '', 'var(--game-base,'],
                [1579, '', ')'],
                [1626, '', 'var(--game-jade,'],
                [1649, '', ')']],
 'unchanged': {'web/src/App.vue': '9f3f6c4596d9c8d4801e5ff0fecd1f9cda7a0842a13f3083ae4613d58e14e78f',
               'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7',
               'web/src/CultivationSite.vue': 'b39966928306502220b66ebd3a4bd8f6eaae88243fbd306de80a08aa353072d5',
               'web/src/RecoveryRitual.vue': '9cc10138931c8006053ea658022112ec2edd99f9b63078ab998e5ae3fd02c6f7',
               'web/src/TrainingActivity.vue': '601e58f6b9edc237031d77337e527e529ac4d619447980bf9e5cddb0b700e4d3',
               'web/src/ActionExecution.vue': 'f01edb8a65e07fd91c0b90519f3e542e9261644564f63bc72f27bc4acafbe5f9',
               'web/src/immersive-theme.css': '6f55f39540dd49a1708dd585cee61e91ae114441e20fb1d1731f024501288197',
               'web/src/activity-clock.ts': '21fc98e4a430464a6dc3554091c022c53b17714938ae6e05491d27e1ab3f0901',
               'web/src/activity-persistence.ts': 'a5100e6f2d84b627ef17800bfc8f17f3f533566db47f35faab3833da66bab4cf',
               'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815',
               'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73'},
 'sourceReferences': ['docs/decisions/0121-saved-progress-hierarchy-uir35-03.md',
                      'goal-4/amendments/2026-11-06-uir35-03-input.md',
                      'goal-4/research/uir35-03-sources.json']}
def prior_uir3503_bytes(path,raw):
 raw=prior_uir3504_bytes(path,raw)
 if Path(path).name!='style.css' or b'background:var(--game-base,#dcdccc)'not in raw:return raw
 assert len(raw)==MANIFEST['bytes']and hashlib.sha256(raw).hexdigest()==MANIFEST['sha256'],'UIR35-03 exact complete stylesheet'
 text=raw.decode()
 for at,before,after in reversed(MANIFEST['operations']):
  assert text[at:at+len(after)]==after,'UIR35-03 exact native theme span'
  text=text[:at]+before+text[at+len(after):]
 assert hashlib.sha256(text.encode()).hexdigest()==MANIFEST['beforeSha256'],'UIR35-03 complete prior stylesheet'
 return text.encode()
def validate_uir3503(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'UIR35-03 local source';return p
 raw=local(MANIFEST['path']).read_bytes()
 if not(root/LEDGER).exists():
  assert b'background:var(--game-base,#dcdccc)'not in raw,'UIR35-03 unrecorded native theme';return set(),0
 assert json.loads(local(LEDGER).read_text())==MANIFEST,'UIR35-03 immutable scope and original added-byte cap'
 before=local(MANIFEST['before']).read_bytes();assert len(before)==MANIFEST['beforeBytes']and hashlib.sha256(before).hexdigest()==MANIFEST['beforeSha256'],'UIR35-03 preserved original stylesheet'
 assert prior_uir3503_bytes(MANIFEST['path'],raw)==before,'UIR35-03 exact whole stylesheet inverse'
 assert len(raw)-len(before)<=100,'UIR35-03 actual added-byte cap'
 for n,h in MANIFEST['unchanged'].items():assert hashlib.sha256(prior_f02a_bytes(n,local(n).read_bytes())).hexdigest()==h,'UIR35-03 original Game DOM numbers timers and saves'
 kit=next(a for a in json.loads(local('art/asset-manifest.json').read_text())['assets']if a['id']=='native-ui-kit')
 assert kit['bytes']+sum(local(c['path']).stat().st_size for c in kit['codeComponents'])<=80000,'UIR35-03 actual original native-kit cap'
 for n in MANIFEST['sourceReferences']:local(n)
 assert raw.count(b'var(--game-base,#dcdccc)')==2 and raw.count(b'var(--game-jade,#52796e)')==1,'UIR35-03 theme with original non-themed fallback'
 return {LEDGER,MANIFEST['path'],MANIFEST['before'],*MANIFEST['unchanged'],*MANIFEST['sourceReferences']},len(raw)
