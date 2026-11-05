from uir34_05_inventory import prior_uir3405_bytes
"""Strict display evolution for lifespan state and the original readonly life-manager entry."""
import hashlib,json
from pathlib import Path
LEDGER='art/redesign/uir34-01.json'
MANIFEST={'format': 'chenyuan-lifespan-guidance-uir34-01',
 'version': 1,
 'userAcceptance': False,
 'maxAddedNativeBytes': 6000,
 'newRasterAssets': 0,
 'files': {'App.vue': {'path': 'web/src/App.vue',
                       'bytes': 159427,
                       'sha256': 'ecffa3d113dd0980f272b56e809c379d8fe87842f80aef7298db234dd3e97ec0',
                       'before': 'goal-4/evidence/uir34-01/before/web/src/App.vue',
                       'beforeSHA256': '2549b27003e11cf12f44e2ba41a1053b2de996c3636110f277ac84babd1dd4fd',
                       'operations': [["import LifeCatalogue from './LifeCatalogue.vue';",
                                       "import LifeCatalogue from './LifeCatalogue.vue';\n"
                                       "import LifespanGuide from './LifespanGuide.vue';\n"
                                       "import {lifespanGuidance} from './lifespan-guidance';"],
                                      ['const hubGoal=computed(',
                                       'const lifeBook=ref<{manage():void}>();\n'
                                       'const '
                                       'lifeState=computed(()=>game.value?lifespanGuidance(game.value):null);\n'
                                       'async function inspectLifespan(event:Event){const '
                                       'owns=inspectionOwner();const owner=await '
                                       'showLife(event);if(owns(owner??null))lifeBook.value?.manage();}\n'
                                       'const hubGoal=computed('],
                                      [':gap="hubGoalHint"', ':gap="lifeState?.hint??hubGoalHint"'],
                                      ['    <section v-if="!hubMain && game && overview?.status===\'active\' '
                                       '&& overview.remainingMonths!==null && overview.remainingMonths<=12" '
                                       'class="paper lifespan-warning" role="status" '
                                       'data-testid="lifespan-warning"><strong>余寿 '
                                       '{{overview.remainingMonths}} 游戏月 · '
                                       "{{overview.ageLabel}}</strong><p>{{overview.remainingMonths===1?'耗时行动将停止。若修为与突破物已备齐，仍可核对突破条件；也可恢复准备检查点，或确认度过最后1游戏月后收卷。':'游戏月在行动完成时消耗；在线修炼在切页后仍继续。暂停后阅读与离线不扣减余寿，请核对当前准备与检查点。'}}</p><button "
                                       'data-testid="lifespan-open-life" '
                                       '@click="showLife">查看生平与收卷选择</button></section>',
                                       '    <LifespanGuide v-if="!hubMain&&game" :game="game" '
                                       '@life="showLife" @checkpoint="showSettings"/>'],
                                      ['             <template #decision>\n'
                                       '              <div v-if="step?.kind',
                                       '             <template #decision>\n'
                                       '              <LifespanGuide '
                                       'v-if="lifeState?.blocked&&step?.kind===\'cultivate\'&&!pendingStoryError" '
                                       ':game="game" stage @life="inspectLifespan" '
                                       '@checkpoint="showSettings"/><template v-else>\n'
                                       '              <div v-if="step?.kind'],
                                      ['              </div></div>\n             </template>',
                                       '              </div></div></template>\n             </template>'],
                                      ['focus.target(title??lifeSection.value??currentContent());\n}',
                                       'focus.target(title??lifeSection.value??currentContent());return '
                                       'owner;\n'
                                       '}'],
                                      ['<LifeCatalogue :key=', '<LifeCatalogue ref="lifeBook" :key=']]},
           'LifeCatalogue.vue': {'path': 'web/src/LifeCatalogue.vue',
                                 'bytes': 4146,
                                 'sha256': 'fcdf511cd55ed9cacd55cf37e6a8d07ddac48db5807d93895c36f2fbfa12fb70',
                                 'before': 'goal-4/evidence/uir34-01/before/web/src/LifeCatalogue.vue',
                                 'beforeSHA256': 'a6f96b99c510280e78a261c9d16c728dc715fb74f6f06e2f9b3dd6330037a403',
                                 'operations': [["const mode=ref('life'),record=",
                                                 'const book=ref<{manage():void}>();\n'
                                                 'defineExpose({manage:()=>book.value?.manage()});\n'
                                                 "const mode=ref('life'),record="],
                                                ['<LifeScroll :game=', '<LifeScroll ref="book" :game=']]},
           'LifeScroll.vue': {'path': 'web/src/LifeScroll.vue',
                              'bytes': 4265,
                              'sha256': 'b3e3f98f4ca731518a01f3d38050d5f471188a15ecca80552fca1b5aa08b3c3f',
                              'before': 'goal-4/evidence/uir34-01/before/web/src/LifeScroll.vue',
                              'beforeSHA256': '1130d9cadbe7d57c4afea5ba3a18bbe84db7a519f6ed0540000a71b3e6890788',
                              'operations': [['function close(){',
                                              'defineExpose({manage:()=>opener.value?.click()});\n'
                                              'function close(){']]}},
 'added': {'web/src/LifespanGuide.vue': {'bytes': 2273,
                                         'sha256': '1d70ff1c6a8b2ffe422056ccb0bfd3d427e9d5679416324dbfdbe4a20608cc4c'},
           'web/src/lifespan-guidance.ts': {'bytes': 1082,
                                            'sha256': '28e3c849d1782af018bc520fb4d0b19d0ac966ab08dd0e28359069306199ff4e'}},
 'caps': {'app': 159635, 'story-journey': 48000, 'narrative-objects': 45000, 'cultivation-objects': 45000},
 'unchanged': {'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7',
               'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21',
               'web/src/focus.ts': '8ae91e78a4db7a854c293fc4b1bc28f02dd0d542b3119cff383f9245b4944eea',
               'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73',
               'src/full/queries.ts': 'eab721ecd066440d8babe11f36664300d21df2d1cf15f10d1160c7cb2a880d48',
               'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815',
               'web/src/GameHud.vue': '43cde88a2e545bce6d475735783bc6d66f487a7ffb8643220ac8297b63a529c5'},
 'sourceReferences': ['docs/decisions/0106-lifespan-guidance-uir34-01-contract.md',
                      'goal-4/amendments/2026-11-05-uir34-01-input.md',
                      'art/redesign/uir34-01-edits.json']}
MARKERS={'App.vue':"import LifespanGuide from './LifespanGuide.vue';",'LifeCatalogue.vue':'defineExpose({manage:()=>book.value?.manage()});','LifeScroll.vue':'defineExpose({manage:'}
def prior_uir3401_bytes(path,raw):
 raw=prior_uir3405_bytes(path,raw)
 name=Path(path).name
 if name not in MANIFEST['files']or MARKERS[name].encode()not in raw:return raw
 row=MANIFEST['files'][name];assert hashlib.sha256(raw).hexdigest()==row['sha256'],'UIR34-01 exact complete source'
 text=raw.decode()
 for old,new in reversed(row['operations']):
  assert new and text.count(new)==1,'UIR34-01 unique full inverse';text=text.replace(new,old,1)
 assert hashlib.sha256(text.encode()).hexdigest()==row['beforeSHA256'],'UIR34-01 full original source'
 return text.encode()
def validate_uir3401(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'UIR34-01 local source';return p
 if not(root/LEDGER).exists():
  assert all(not(root/n).exists()for n in MANIFEST['added']),'UIR34-01 unrecorded additions'
  return set(),0
 assert json.loads(local(LEDGER).read_text())==MANIFEST,'UIR34-01 immutable scope'
 assert json.loads(local('art/redesign/uir34-01-edits.json').read_text())=={r['path']:r['operations']for r in MANIFEST['files'].values()},'UIR34-01 immutable edits'
 for name,row in MANIFEST['files'].items():
  raw=prior_uir3405_bytes(row['path'],local(row['path']).read_bytes());old=local(row['before']).read_bytes();assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'UIR34-01 actual current source';assert hashlib.sha256(old).hexdigest()==row['beforeSHA256'],'UIR34-01 original preserved';assert prior_uir3401_bytes(name,raw)==old,'UIR34-01 inverse'
 total=0
 for n,row in MANIFEST['added'].items():
  raw=local(n).read_bytes();assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'UIR34-01 actual new source';total+=len(raw)
 assert total<=6000,'UIR34-01 added surface budget';assert local('web/src/App.vue').stat().st_size<=159635,'UIR34-01 original App cap'
 for group,cap in MANIFEST['caps'].items():
  if group=='app':continue
  assert sum(local(row['path']).stat().st_size for row in json.loads(local('art/redesign/'+group+'.json').read_text())['files'])<=cap,'UIR34-01 original actual regional cap'
 for n,h in MANIFEST['unchanged'].items():assert hashlib.sha256(prior_uir3405_bytes(n,local(n).read_bytes())).hexdigest()==h,'UIR34-01 original writing clock and focus owner'
 for n in MANIFEST['sourceReferences']:local(n)
 return{LEDGER,*MANIFEST['sourceReferences'],*[v[k]for v in MANIFEST['files'].values()for k in ['path','before']],*MANIFEST['added'],*MANIFEST['unchanged']},total
