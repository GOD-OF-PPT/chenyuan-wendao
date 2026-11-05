"""Strict player-facing resume copy; original state guards and atomic owners unchanged."""
import hashlib,json,re
from pathlib import Path
LEDGER='art/redesign/uir34-04.json'
MANIFEST={'format': 'chenyuan-resume-wording-uir34-04',
 'version': 1,
 'userAcceptance': False,
 'files': {'CultivationOngoing.vue': {'path': 'web/src/CultivationOngoing.vue',
                                      'bytes': 3279,
                                      'sha256': 'f58baa4c24d8ed9908bc31cfad9f61a436813e0382bc68cbf40c7025c4f684b1',
                                      'before': 'goal-4/evidence/uir34-04/before/CultivationOngoing.vue',
                                      'beforeSHA256': '16a814b95344928cdf3b8eef6ab6ab0aca757bc86cd335c2446b869ca2cfcf85',
                                      'operations': [[940, '等', ''],
                                                     [941, '接管', '继续 · 本轮重计'],
                                                     [2162, "takeover?'此页接管':", ''],
                                                     [2255, '段', ''],
                                                     [2265, '关闭期间不补', '离线无'],
                                                     [2270, '', '，继续后其他页停手']]},
           'TrainingActivity.vue': {'path': 'web/src/TrainingActivity.vue',
                                    'bytes': 7690,
                                    'sha256': '4c753b882ce0d1fde7457c61453c64b00df90b8941356dc8a72abbbc06e32e70',
                                    'before': 'goal-4/evidence/uir34-04/before/TrainingActivity.vue',
                                    'beforeSHA256': '153c7621131e635df954f2467776c060ad90daf73d9c91ba82b0e2ed3e5e843a',
                                    'operations': [[1514, '接管', '继续 · 本轮重计'],
                                                   [4651, '继续后', '沿用原额度，'],
                                                   [4664, '关闭或刷新期间不补发', '离线无'],
                                                   [4669, '', '，继续后其他页停手'],
                                                   [5639, ':aria-', 'sty'],
                                                   [5643, 'ab', ''],
                                                   [5644, 'l', ''],
                                                   [5646, '(', 'min-wid'],
                                                   [5654, '', 'h:m'],
                                                   [5658, 'k', 'x-cont'],
                                                   [5665, "over?'在此页接管':'继续')+view.", ''],
                                                   [5666, 'oun', 't'],
                                                   [5786, 'takeover?', ''],
                                                   [5787, '此页接管 · 重计本轮', '继续'],
                                                   [5790, ':rail||compact&&', '+('],
                                                   [5804, '6', '7'],
                                                   [5806, "'继续'", 'view.name'],
                                                   [5816, "'继续'+", ''],
                                                   [5825, '', ')']]},
           'OpeningOffering.vue': {'path': 'web/src/OpeningOffering.vue',
                                   'bytes': 2902,
                                   'sha256': '67663a49903252fdfb91751422a72a577b072cb9e7c84e357e06a1e8b2a96d47',
                                   'before': 'goal-4/evidence/uir34-04/before/OpeningOffering.vue',
                                   'beforeSHA256': 'c523497e96fc105e69f77d2b41c28da79f399aa19f091ad6e02e9e016313f897',
                                   'operations': [[926, '或接管', '']]}},
 'caps': {'idle-cultivation': 22000, 'CultivationOngoing.vue': 6000, 'art33': 12000},
 'newRasterAssets': 0,
 'unchanged': {'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7',
               'web/src/activity-clock.ts': '21fc98e4a430464a6dc3554091c022c53b17714938ae6e05491d27e1ab3f0901',
               'web/src/activity-persistence.ts': 'a5100e6f2d84b627ef17800bfc8f17f3f533566db47f35faab3833da66bab4cf',
               'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21',
               'web/src/activity-view.ts': '020a7580936a2019a78e766cb3c1c3863666c48fe4e3707a6b60b8abd74cd5a3',
               'web/src/focus.ts': '8ae91e78a4db7a854c293fc4b1bc28f02dd0d542b3119cff383f9245b4944eea',
               'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815',
               'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73',
               'src/full/milestones.ts': 'e91f58cf0002945f679649964b5a70e7226e0890b623719b24df2c02bac09492',
               'web/src/App.vue': 'ecffa3d113dd0980f272b56e809c379d8fe87842f80aef7298db234dd3e97ec0',
               'web/src/idle-activity.css': '17ef27c763e8c2e5a7d57f11b5f24f1604cc4df97562abf6f4e4a909a30c13e6',
               'web/src/stage-r1.css': '1ed138017fb93db1156aea3db518ea7f930864a0503e3adb7363f4e4eb68112d'},
 'sourceReferences': ['docs/decisions/0110-resume-player-wording-uir34-04-contract.md',
                      'goal-4/amendments/2026-11-05-uir34-04-input.md']}
MARKERS={'CultivationOngoing.vue':'待继续 · 本轮重计','TrainingActivity.vue':'待继续 · 本轮重计','OpeningOffering.vue':'此念已保存 · 继续见上方'}
def prior_uir3404_bytes(path,raw):
 name=Path(path).name
 if name not in MANIFEST['files']or MARKERS[name].encode()not in raw:return raw
 row=MANIFEST['files'][name];assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'UIR34-04 exact complete display source'
 text=raw.decode()
 for at,old,new in reversed(row['operations']):
  assert text[at:at+len(new)]==new,'UIR34-04 exact display span'
  text=text[:at]+old+text[at+len(new):]
 assert hashlib.sha256(text.encode()).hexdigest()==row['beforeSHA256'],'UIR34-04 original full inverse'
 return text.encode()
def validate_uir3404(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'UIR34-04 local source';return p
 if not(root/LEDGER).exists():
  assert all(MARKERS[n].encode()not in local(r['path']).read_bytes()for n,r in MANIFEST['files'].items()),'UIR34-04 unrecorded copy'
  return set(),0
 assert json.loads(local(LEDGER).read_text())==MANIFEST,'UIR34-04 immutable scope'
 for name,r in MANIFEST['files'].items():
  raw=local(r['path']).read_bytes();old=local(r['before']).read_bytes();assert len(raw)==r['bytes']and hashlib.sha256(raw).hexdigest()==r['sha256'],'UIR34-04 actual source';assert hashlib.sha256(old).hexdigest()==r['beforeSHA256'],'UIR34-04 original preserved';assert prior_uir3404_bytes(name,raw)==old,'UIR34-04 full inverse'
  assert re.findall(rb'@[\w:.-]+="[^"]*"',raw)==re.findall(rb'@[\w:.-]+="[^"]*"',old),'UIR34-04 original event authority'
  assert re.findall(rb':disabled="[^"]*"',raw)==re.findall(rb':disabled="[^"]*"',old),'UIR34-04 original safety guards'
  assert re.findall(rb'<style.*?</style>',raw,re.S)==re.findall(rb'<style.*?</style>',old,re.S),'UIR34-04 original styles'
 for group,cap in MANIFEST['caps'].items():
  if group.endswith('.vue'):assert local('web/src/'+group).stat().st_size<=cap,'UIR34-04 original view cap'
  else:assert sum(local(r['path']).stat().st_size for r in json.loads(local('art/redesign/'+group+'.json').read_text())['files'])<=cap,'UIR34-04 original actual group cap'
 for n,h in MANIFEST['unchanged'].items():assert hashlib.sha256(local(n).read_bytes()).hexdigest()==h,'UIR34-04 original owner and rules'
 for n in MANIFEST['sourceReferences']:local(n)
 return{LEDGER,*MANIFEST['sourceReferences'],*[r[k]for r in MANIFEST['files'].values()for k in ['path','before']],*MANIFEST['unchanged']},sum(local(r['path']).stat().st_size for r in MANIFEST['files'].values())
