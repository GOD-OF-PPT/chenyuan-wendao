from uir35_02_inventory import prior_uir3502_bytes
"""Exact display-only growth and authorization separation; all historical complete pins remain."""
import hashlib,json,re
from pathlib import Path
LEDGER='art/redesign/uir35-01.json'
MANIFEST={'format': 'chenyuan-uir35-01-growth-authorization',
 'version': 1,
 'userAcceptance': False,
 'newRasterAssets': 0,
 'caps': {'CultivationOngoing.vue': 6000, 'idle-cultivation': 22000},
 'files': {'web/src/CultivationOngoing.vue': {'before': 'goal-4/evidence/uir35-01/before/web/src/CultivationOngoing.vue',
                                              'beforeSHA256': 'f58baa4c24d8ed9908bc31cfad9f61a436813e0382bc68cbf40c7025c4f684b1',
                                              'bytes': 3477,
                                              'sha256': '36ff8a84502f8031e6d4410f650e5aa264faf3346051ac932f5cc35715726253',
                                              'operations': [[1307,
                                                              '/',
                                                              '{{view.unit}}<template v-if="a.version!==1"> · 上限'],
                                                             [1391, '', '</template>'],
                                                             [1563,
                                                              '',
                                                              '上限 {{a.plan.maxCycles}} 轮<template '
                                                              'v-if="a.plan.method===\'assisted\'"> · '],
                                                             [1709, '', '</template><template v-else> · 不耗灵石</template>']]},
           'web/src/TrainingActivity.vue': {'before': 'goal-4/evidence/uir35-01/before/web/src/TrainingActivity.vue',
                                            'beforeSHA256': '4c753b882ce0d1fde7457c61453c64b00df90b8941356dc8a72abbbc06e32e70',
                                            'bytes': 7734,
                                            'sha256': '601e58f6b9edc237031d77337e527e529ac4d619447980bf9e5cddb0b700e4d3',
                                            'operations': [[4822, '/', '{{view.unit}} · 上限'],
                                                           [5038, '/', '{{view.unit}} · 上限']]},
           'web/e2e/check-matrix-keyboard.spec.ts': {'before': 'goal-4/evidence/uir35-01/before/web/e2e/check-matrix-keyboard.spec.ts',
                                                     'beforeSHA256': '13361b1ccf13faf6efec339f82dd0ecabb4ec37c0ca15788578767b76b9fe4f2',
                                                     'bytes': 59559,
                                                     'sha256': '4ef25591dfd66660209514919a4c06d72a814c32a14ba9b7eeeb29d12bc4d627',
                                                     'operations': [[28099, '/', "'+view.unit+' · 上限"]]},
           'web/e2e/matrix-ui-cancel.spec.ts': {'before': 'goal-4/evidence/uir35-01/before/web/e2e/matrix-ui-cancel.spec.ts',
                                                'beforeSHA256': '1e9c6713b915f8699578fba1b8e2eea33b38e975bd090a7e3aa822e5b189feef',
                                                'bytes': 28481,
                                                'sha256': 'd000559d3469364fd7f12ab685979a372f2283a3cb6a121307d421f7c5545bc5',
                                                'operations': [[27535, '/', '次动作 · 上限'], [27545, '', ' 次动作']]},
           'web/e2e/battle-actors.spec.ts': {'before': 'goal-4/evidence/uir35-01/before/web/e2e/battle-actors.spec.ts',
                                             'beforeSHA256': 'b989f4ac9f7ab5310dbd007816927a03f49c7298f0d8a081d9165840a5ece416',
                                             'bytes': 64827,
                                             'sha256': 'e40f15d0f3d520b08dcaaaa0601ba252d9cbd0599232bfa2f79aa8219e5dc34c',
                                             'operations': [[41343, '/', '次动作 · 上限'],
                                                            [41353, '', ' 次动作'],
                                                            [45138, '/', '次动作 · 上限'],
                                                            [45148, '', ' 次动作'],
                                                            [62727, '/', '次动作 · 上限'],
                                                            [62737, '', ' 次动作'],
                                                            [64175, '/', '次动作 · 上限'],
                                                            [64185, '', ' 次动作']]},
           'web/e2e/uir33-05-activity-detail.spec.ts': {'before': 'goal-4/evidence/uir35-01/before/web/e2e/uir33-05-activity-detail.spec.ts',
                                                        'beforeSHA256': '67be5f7817c0aa63160b99b68fc21cd9ebdbf44f604630b2eb8c5709b061acda',
                                                        'bytes': 17722,
                                                        'sha256': '4e1705fbc38922695f2ed7f48a7e47ad8941a9799cef65d7c6f4cc415428ba41',
                                                        'operations': [[0,
                                                                        '',
                                                                        "import{activityView}from'../src/activity-view';\n"],
                                                                       [11873,
                                                                        '/',
                                                                        "'+activityView((await activity(page))!,await "
                                                                        "snapshot(page)).unit+' · 上限"]]}},
 'unchanged': {'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7',
               'web/src/App.vue': '5e6a59b75b7021914ab4bdd356ef6608ec3f391d3522c9ac6eb8272698e7146a',
               'web/src/activity-view.ts': '020a7580936a2019a78e766cb3c1c3863666c48fe4e3707a6b60b8abd74cd5a3',
               'web/src/activity-clock.ts': '21fc98e4a430464a6dc3554091c022c53b17714938ae6e05491d27e1ab3f0901',
               'web/src/TrainingPlanner.vue': 'aee9eeb8b91bea2a748bb84b5257a0dd601a134a24598d827fef548da5ce669f',
               'web/src/activity-persistence.ts': 'a5100e6f2d84b627ef17800bfc8f17f3f533566db47f35faab3833da66bab4cf',
               'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815',
               'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73'},
 'sourceReferences': ['docs/decisions/0117-cultivation-goal-limit-uir35-01.md',
                      'goal-4/amendments/2026-11-06-uir35-01-input.md']}
def prior_uir3501_bytes(path,raw):
 raw=prior_uir3502_bytes(path,raw)
 key=str(path).replace('\\','/')
 if key not in MANIFEST['files']:
  matches=[n for n in MANIFEST['files']if Path(n).name==Path(path).name]
  if not matches:return raw
  key=matches[0]
 row=MANIFEST['files'][key];h=hashlib.sha256(raw).hexdigest()
 markers={'CultivationOngoing.vue':b'{{view.goal}} \xc2\xb7 \xe4\xb8\x8a\xe9\x99\x90','TrainingActivity.vue':b'{{view.unit}} \xc2\xb7 \xe4\xb8\x8a\xe9\x99\x90 {{a.plan.maxCycles}}','check-matrix-keyboard.spec.ts':"' · 上限 '+a.plan.maxCycles".encode(),'matrix-ui-cancel.spec.ts':'已完成 1 次动作 · 上限 1 次动作'.encode(),'battle-actors.spec.ts':'已完成 1 次动作 · 上限 1 次动作'.encode(),'uir33-05-activity-detail.spec.ts':b"import{activityView}from"}
 if h==row['beforeSHA256']or markers[Path(key).name]not in raw:return raw
 assert len(raw)==row['bytes']and h==row['sha256'],'UIR34-04 UIR35-01 exact display source'
 text=raw.decode()
 for at,old,new in reversed(row['operations']):
  assert text[at:at+len(new)]==new,'UIR35-01 exact display span'
  text=text[:at]+old+text[at+len(new):]
 assert hashlib.sha256(text.encode()).hexdigest()==row['beforeSHA256'],'UIR35-01 complete historical inverse'
 return text.encode()
def validate_uir3501(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'UIR35-01 local input';return p
 if not(root/LEDGER).exists():
  assert all(hashlib.sha256(local(n).read_bytes()).hexdigest()!=row['sha256']for n,row in MANIFEST['files'].items()),'UIR35-01 unrecorded display source'
  return set(),0
 assert json.loads(local(LEDGER).read_text())==MANIFEST,'UIR35-01 immutable scope'
 for n,row in MANIFEST['files'].items():
  raw=local(n).read_bytes();old=local(row['before']).read_bytes();assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'UIR35-01 current source';assert hashlib.sha256(old).hexdigest()==row['beforeSHA256'],'UIR35-01 preserved original';assert prior_uir3501_bytes(n,raw)==old,'UIR35-01 inverse'
  if n.endswith('.vue'):
   for pattern in [rb'<script.*?</script>',rb'<style.*?</style>',rb'@[\w:.-]+="[^"]*"',rb':disabled="[^"]*"']:
    assert re.findall(pattern,raw,re.S)==re.findall(pattern,old,re.S),'UIR35-01 original controller styles events and safety'
 for n,h in MANIFEST['unchanged'].items():assert hashlib.sha256(prior_uir3502_bytes(n,local(n).read_bytes())).hexdigest()==h,'UIR35-01 original authority clock and rules'
 for n,cap in MANIFEST['caps'].items():
  total=local('web/src/'+n).stat().st_size if n.endswith('.vue')else sum(local(x['path']).stat().st_size for x in json.loads(local('art/redesign/'+n+'.json').read_text())['files'])
  assert total<=cap,'UIR35-01 actual original cap'
 for n in MANIFEST['sourceReferences']:local(n)
 return{LEDGER,*MANIFEST['files'],*[x['before']for x in MANIFEST['files'].values()],*MANIFEST['unchanged'],*MANIFEST['sourceReferences']},sum(local(n).stat().st_size for n in MANIFEST['files']if n.endswith('.vue'))
