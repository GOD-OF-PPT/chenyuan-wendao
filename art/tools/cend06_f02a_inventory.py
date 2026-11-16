from cend09_source_inventory import prior_source_stage_bytes
from cend06_f02b_inventory import prior_f02b_bytes
"""Exact readonly response inverse; original writers and proof unchanged."""
import hashlib,json,re
from pathlib import Path
LEDGER='art/redesign/cend06-f02a.json'
MANIFEST={'format': 'chenyuan-cend06-f02a-opening-response',
 'version': 1,
 'userAcceptance': False,
 'newRasterAssets': 0,
 'maxAddedNativeBytes': 8000,
 'maxAppDelta': 500,
 'actualART33Cap': 12000,
 'actualParentDeltaCap': 2400,
 'files': {'web/src/App.vue': {'before': 'goal-4/evidence/cend06-f02a/before/web/src/App.vue',
                               'beforeBytes': 159410,
                               'beforeSha256': '9f3f6c4596d9c8d4801e5ff0fecd1f9cda7a0842a13f3083ae4613d58e14e78f',
                               'bytes': 159627,
                               'sha256': 'ccc2a0ffe54211fbeff8ef0b5f4937ebc84e55a1910ad292109bb59a71b0b8d8',
                               'operations': [[2210,
                                               "import OpeningOffering from './OpeningOffering.vue';",
                                               "import OpeningOffering from './OpeningOffering.vue';\n"
                                               "import OpeningResponse from './OpeningResponse.vue';"],
                                              [81166,
                                               '<p>本次已安排，读秒与停手在上方；保存后显示成果。</p><button '
                                               '@click="viewActivityPlan">查看原安排</button>',
                                               '<OpeningResponse v-if="store.activity.plan.action.type===\'CHOOSE\'" '
                                               ':game="game" :activity="store.activity" '
                                               '@inspect="viewActivityPlan"/><template '
                                               'v-else><p>本次已安排，读秒与停手在上方；保存后显示成果。</p><button '
                                               '@click="viewActivityPlan">查看原安排</button></template>']]},
           'web/src/OpeningOffering.vue': {'before': 'goal-4/evidence/cend06-f02a/before/web/src/OpeningOffering.vue',
                                           'beforeBytes': 2902,
                                           'beforeSha256': '67663a49903252fdfb91751422a72a577b072cb9e7c84e357e06a1e8b2a96d47',
                                           'bytes': 2898,
                                           'sha256': 'fd775d201b0955c24469c3a7efa8e03656c358550b224b0bbb921e06aabbce9f',
                                           'operations': [[890, "'所选回应进行中'", "'正回应此念'"],
                                                          [1419, '破庙求药 · 静候你的抉择', "{{arranged?viewTitle:'破庙求药'}}"],
                                                          [2339,
                                                           '<div class="art33-state" '
                                                           'role="status"><strong>{{state}}</strong><span '
                                                           'v-if="engaged&&phase===\'running\'" '
                                                           'data-testid="milestone-cycle-clock">{{remaining}} / '
                                                           '{{seconds}} 秒</span><small '
                                                           "v-else>{{arranged?viewTitle:'选择只核对 · 确认后回应'}} · 每次 "
                                                           '{{total}} 秒 · 仅一次</small></div>',
                                                           '<div class="art33-state" '
                                                           'role="status"><strong>{{state}}</strong><span '
                                                           'v-if="reading&&engaged&&phase===\'running\'" '
                                                           'data-testid="milestone-cycle-clock">{{remaining}} / '
                                                           '{{seconds}} 秒</span><small v-else-if="!arranged">选择只核对 · '
                                                           '确认后回应 · 每次 {{total}} 秒 · 仅一次</small></div>']]}},
 'added': {'web/src/OpeningResponse.vue': {'bytes': 3462,
                                           'sha256': '725a3f03b21310890c795509d1c008d9fb28ba408b5c2b2fd7e2a753b987a05a'},
           'web/src/opening-response.css': {'bytes': 2608,
                                            'sha256': 'baa00c4aeef67ffb36eba3062c538c7408513e06b3ab61cff841d932cd13d1c5'}},
 'unchanged': {'web/src/MilestoneGate.vue': '13f0335382f633755b3a8559adfde5821c97917df5aabfaa77829340f11ba1f1',
               'web/src/milestone-view.ts': 'af1a2045781e806806140092349b2ecde690524436b254a0c1f326a94e108efd',
               'web/src/cultivation-effects.ts': '656c74686b1e1cee2f68c61074172d5c3c23f86cf12d5c3eed7205f215de409a',
               'web/src/opening-offering.css': 'de2c9ed1d70de4f1b937f6d518e181c728f2fc28a0c80a9a3b3896ffea2f678a',
               'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7',
               'web/src/activity-clock.ts': '21fc98e4a430464a6dc3554091c022c53b17714938ae6e05491d27e1ab3f0901',
               'web/src/activity-persistence.ts': 'a5100e6f2d84b627ef17800bfc8f17f3f533566db47f35faab3833da66bab4cf',
               'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21',
               'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815',
               'src/full/milestones.ts': 'e91f58cf0002945f679649964b5a70e7226e0890b623719b24df2c02bac09492',
               'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73'},
 'sourceReferences': ['docs/decisions/0125-opening-response-cend06-f02a.md',
                      'goal-4/amendments/2026-11-06-cend06-f02a-input.md',
                      'goal-4/research/cend06-f02a-sources.json']}
def f02a_parent(path,raw):
 try:return prior_f02b_bytes(path,raw)
 except AssertionError as error:raise AssertionError('F02A parent: '+str(error))from error
def prior_f02a_bytes(path,raw):
 raw=prior_source_stage_bytes(path,raw)
 raw=f02a_parent(path,raw)
 matches=[n for n in MANIFEST['files']if Path(n).name==Path(path).name]
 if not matches:return raw
 row=MANIFEST['files'][matches[0]]
 if hashlib.sha256(raw).hexdigest()==row['beforeSha256']:return raw
 marker=b'import OpeningResponse'if Path(path).name=='App.vue'else "arranged?viewTitle:'破庙求药'".encode()
 if marker not in raw:return raw
 assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'F02A complete current source'
 text=raw.decode()
 for at,before,after in reversed(row['operations']):
  assert text[at:at+len(after)]==after,'F02A exact readonly display span'
  text=text[:at]+before+text[at+len(after):]
 assert hashlib.sha256(text.encode()).hexdigest()==row['beforeSha256'],'F02A complete parent source'
 return text.encode()
def validate_f02a(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'F02A local source';return p
 if not(root/LEDGER).exists():
  assert not(root/'web/src/OpeningResponse.vue').exists(),'F02A missing ledger'
  return set(),0
 assert json.loads(local(LEDGER).read_text())==MANIFEST,'F02A immutable scope and original caps'
 for n,row in MANIFEST['files'].items():
  raw=f02a_parent(n,local(n).read_bytes());old=local(row['before']).read_bytes();assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'F02A current source';assert len(old)==row['beforeBytes']and hashlib.sha256(old).hexdigest()==row['beforeSha256'],'F02A original source';assert prior_f02a_bytes(n,raw)==old,'F02A complete inverse'
  if n.endswith('App.vue'):assert raw.split(b'</script>')[0].replace(b"\nimport OpeningResponse from './OpeningResponse.vue';",b'')==old.split(b'</script>')[0],'F02A only parent display import'
 for n,h in MANIFEST['unchanged'].items():assert hashlib.sha256(local(n).read_bytes()).hexdigest()==h,'F02A original rules clocks stores proof and gate'
 total=0
 for n,row in MANIFEST['added'].items():
  raw=local(n).read_bytes();assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'F02A new readonly surface';total+=len(raw)
 assert total<=8000,'F02A new display cap'
 app=MANIFEST['files']['web/src/App.vue'];assert app['bytes']-app['beforeBytes']<=500 and app['bytes']-157235<=2400,'F02A actual original parent cap'
 assert local('web/src/OpeningOffering.vue').stat().st_size+local('web/src/opening-offering.css').stat().st_size<=12000,'F02A actual original ART33 cap'
 d=json.loads(local('art/redesign/cultivation-objects.json').read_text());assert d['budgets']['nativeBytes']==45000 and sum(local(x['path']).stat().st_size for x in d['files'])<=45000,'F02A original cultivation cap'
 view=local('web/src/OpeningResponse.vue').read_text();assert not re.search(r'\b(?:setTimeout|setInterval|requestAnimationFrame|Date|performance|fetch|indexedDB|localStorage|resolve|onMounted)\b|v-html|eval\s*\(',view),'F02A no own timer IO or reward'
 assert "defineEmits<{inspect:[Event]}>()"in view and all(x in view for x in ['activityLocal','activityOwned','generation','gameRevision','originGame','remainingMs','totalMs','data-state','data-choice']),'F02A real source and readonly callback'
 for n in MANIFEST['sourceReferences']:local(n)
 return {LEDGER,*MANIFEST['files'],*[x['before']for x in MANIFEST['files'].values()],*MANIFEST['added'],*MANIFEST['unchanged'],*MANIFEST['sourceReferences']},total
