"""Allow only readonly busy dismissal; retain unapproved confirmations and original writers."""
import hashlib,json
from pathlib import Path
LEDGER='art/redesign/check-uir34-02-04.json'
MANIFEST={'format': 'chenyuan-check-uir34-02-04-readonly-close',
 'version': 1,
 'userAcceptance': False,
 'path': 'web/src/MilestoneReview.vue',
 'bytes': 5051,
 'sha256': '4b6481898c6401fa58ea9dd4c9d6bdd5a16e23ca6e75b7898c0a0265b63af46d',
 'before': 'goal-4/evidence/check-uir34-02-04/before/MilestoneReview.vue',
 'beforeSHA256': '20de4cb9497fab63f9a4b9e4265e116d5fd05c6f7fc22c7e114e3fca2d634354',
 'operations': [[2118, '', '('], [2124, '', '||review.activity)'], [2448, '', 'y&&!review.activit']],
 'originalMilestoneCap': 30000,
 'newRasterAssets': 0,
 'unchanged': {'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7',
               'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21',
               'web/src/activity-persistence.ts': 'a5100e6f2d84b627ef17800bfc8f17f3f533566db47f35faab3833da66bab4cf',
               'web/src/activity-clock.ts': '21fc98e4a430464a6dc3554091c022c53b17714938ae6e05491d27e1ab3f0901',
               'web/src/milestone-view.ts': 'af1a2045781e806806140092349b2ecde690524436b254a0c1f326a94e108efd',
               'web/src/App.vue': 'ecffa3d113dd0980f272b56e809c379d8fe87842f80aef7298db234dd3e97ec0',
               'web/src/ConfigurationDialog.vue': '74067880f132af079130acea336dfd559901cc088d09124f4a26b97d2504ee86',
               'web/src/TrainingActivity.vue': '4c753b882ce0d1fde7457c61453c64b00df90b8941356dc8a72abbbc06e32e70',
               'web/src/idle-milestones.css': '496d9959423622607290aab8f8d8ce35f04c1361310a7a2f9545e17fcbf03054',
               'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815',
               'src/full/milestones.ts': 'e91f58cf0002945f679649964b5a70e7226e0890b623719b24df2c02bac09492',
               'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73'},
 'sourceReferences': ['docs/decisions/0111-confirm-configuration-resume-check.md',
                      'goal-4/amendments/2026-11-06-check-uir34-02-04-input.md']}
def prior_check340204_bytes(path,raw):
 if Path(path).name!='MilestoneReview.vue'or b'busy&&!review.activity'not in raw:return raw
 assert len(raw)==MANIFEST['bytes']and hashlib.sha256(raw).hexdigest()==MANIFEST['sha256'],'UIR34-02 CHECK34 exact complete readonly close source'
 text=raw.decode()
 for at,old,new in reversed(MANIFEST['operations']):
  assert text[at:at+len(new)]==new,'UIR34-02 CHECK34 exact guarded close span'
  text=text[:at]+old+text[at+len(new):]
 assert hashlib.sha256(text.encode()).hexdigest()==MANIFEST['beforeSHA256'],'UIR34-02 CHECK34 original whole inverse'
 return text.encode()
def validate_check340204(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'CHECK34 local source';return p
 if not(root/LEDGER).exists():
  assert b'busy&&!review.activity'not in local(MANIFEST['path']).read_bytes(),'CHECK34 unrecorded close guard'
  return set(),0
 assert json.loads(local(LEDGER).read_text())==MANIFEST,'CHECK34 immutable scope'
 raw=local(MANIFEST['path']).read_bytes();old=local(MANIFEST['before']).read_bytes();assert len(raw)==MANIFEST['bytes']and hashlib.sha256(raw).hexdigest()==MANIFEST['sha256'],'CHECK34 actual complete close source';assert hashlib.sha256(old).hexdigest()==MANIFEST['beforeSHA256'],'CHECK34 original preserved';assert prior_check340204_bytes(MANIFEST['path'],raw)==old,'CHECK34 full inverse'
 total=sum(local(r['path']).stat().st_size for r in json.loads(local('art/redesign/idle-milestones.json').read_text())['files']);assert total<=30000,'CHECK34 original milestone cap'
 for n,h in MANIFEST['unchanged'].items():assert hashlib.sha256(local(n).read_bytes()).hexdigest()==h,'CHECK34 original writes conditions clock and other consumers'
 for n in MANIFEST['sourceReferences']:local(n)
 return{LEDGER,MANIFEST['path'],MANIFEST['before'],*MANIFEST['unchanged'],*MANIFEST['sourceReferences']},total
