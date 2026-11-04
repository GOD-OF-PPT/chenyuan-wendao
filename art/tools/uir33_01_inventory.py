"""Current cultivation controls, strict complete inverse and separate added surface budget."""
import hashlib,json,re
from pathlib import Path
LEDGER='art/redesign/uir33-01.json'
FACTS={'App.vue': {'path': 'web/src/App.vue',
             'bytes': 159464,
             'sha256': '2549b27003e11cf12f44e2ba41a1053b2de996c3636110f277ac84babd1dd4fd',
             'before': 'goal-4/evidence/uir33-01/before/web/src/App.vue',
             'beforeSHA256': '8d1b128ef7e927f2df9c869d827030908fbef620962333a06a2969f2b39978fc'},
 'CultivationSite.vue': {'path': 'web/src/CultivationSite.vue',
                         'bytes': 4319,
                         'sha256': 'b39966928306502220b66ebd3a4bd8f6eaae88243fbd306de80a08aa353072d5',
                         'before': 'goal-4/evidence/uir33-01/before/web/src/CultivationSite.vue',
                         'beforeSHA256': 'e142a23b35f435c73ca10a99332d41fdbb0baf5bfae4fbd46b2775841a2ac851'}}
MANIFEST={'format': 'chenyuan-cultivation-ongoing-uir33-01',
 'version': 1,
 'userAcceptance': False,
 'newRasterAssets': 0,
 'maxAddedNativeBytes': 6000,
 'added': {'path': 'web/src/CultivationOngoing.vue',
           'bytes': 3250,
           'sha256': '06984ea4f6dd663a32fb274a47321eecc9c618b4fdb1ff0f10f4df8301e4c72d'},
 'sourceReferences': ['docs/decisions/0096-cultivation-active-uir33-01-contract.md',
                      'goal-4/amendments/2026-11-04-uir33-01-input.md',
                      'art/redesign/uir33-01-edits.json',
                      'goal-4/evidence/uir33-01/before/web/src/App.vue',
                      'goal-4/evidence/uir33-01/before/web/src/CultivationSite.vue'],
 'originalLedgers': {'art/redesign/ux33.json': 'ca0c3a052c3f9508957a38da9a8acada9821104c2461aa127bccd0743f27c3b8',
                     'art/redesign/cultivation-objects.json': '280f616867bc0f01262e68cfc7df1b14d647b215c652e690fc96b42dc367abeb'}}
OPERATIONS={'web/src/App.vue': [["import CultivationSite from './CultivationSite.vue';",
                      "import CultivationSite from './CultivationSite.vue';\n"
                      'import CultivationOngoing from '
                      "'./CultivationOngoing.vue';"],
                     ['<CultivationSite v-else :game="game" '
                      ':method="hubTrainingMethod" '
                      '@method="hubTrainingMethod=$event">',
                      '<CultivationSite v-else :game="game" '
                      ':method="store.activity?.version===1&&store.activity.status!==\'stopped\'?store.activity.plan.method:hubTrainingMethod" '
                      '@method="hubTrainingMethod=$event">\n'
                      '             <template '
                      'v-if="store.activity&&store.activity.status!==\'stopped\'" '
                      '#activity><CultivationOngoing '
                      '@inspect="viewActivityPlan"/></template>'],
                     ['               <button '
                      'v-else-if="store.activity?.status===\'paused\'" '
                      'class="text-button" '
                      'data-testid="hub-training-rearrange" '
                      '@click="openHub(\'cultivation\',$event)">另排一段潜修</button>\n'
                      '               <button v-else class="primary '
                      'cultivate-primary" data-testid="cultivate" '
                      '@click="startTraining(hubTrainingPlan)" '
                      ':disabled="!!pendingStoryError||!store.available||store.busy||store.activityRunning||!hubTrainingQuote?.allowed">{{store.activityRunning?\'已有活动 '
                      '· '
                      "先暂停再安排':'开始'+(hubTrainingMethod==='natural'?'自然吐纳':'灵石辅助')}}</button>\n",
                      '               <button v-else class="primary '
                      'cultivate-primary" data-testid="cultivate" '
                      '@click="startTraining(hubTrainingPlan)" '
                      ':disabled="!!pendingStoryError||!store.available||store.busy||store.activityRunning||!hubTrainingQuote?.allowed">{{store.activityRunning?\'已有活动 '
                      '· '
                      "先暂停再安排':'开始'+(hubTrainingMethod==='natural'?'自然吐纳':'灵石辅助')}}</button>\n"],
                     ["{{store.activityRunning?'已有活动 · "
                      "先暂停再安排':'开始'+(hubTrainingMethod==='natural'?'自然吐纳':'灵石辅助')}}",
                      "{{'开始'+(hubTrainingMethod==='natural'?'自然吐纳':'灵石辅助')}}"],
                     ['<template '
                      'v-if="store.activity?.status===\'paused\'">原活动已暂停 · '
                      '上方继续保留原预算；另排只查看草案。</template><template v-else>圆满即停 · '
                      '最多50轮 · 灵石上限{{hubTrainingPlan.stoneBudget}}</template>',
                      '圆满即停 · 最多50轮 · 灵石上限{{hubTrainingPlan.stoneBudget}}']],
 'web/src/CultivationSite.vue': [['<div class="art06-status"><small>',
                                  '<div class="art06-status"><small '
                                  'v-if="!$slots.activity">'],
                                 ['<nav class="art06-methods"',
                                  '<nav v-if="!$slots.activity" '
                                  'class="art06-methods"'],
                                 ['<div class="art06-main-decision"><slot '
                                  'name="decision"/></div>',
                                  '<slot name="activity"/><div '
                                  'v-if="!$slots.activity" '
                                  'class="art06-main-decision"><slot '
                                  'name="decision"/></div>']]}
MARKERS={'App.vue':'import CultivationOngoing','CultivationSite.vue':'<slot name="activity"/>'}
def prior_uir3301_bytes(path,raw):
 name=Path(path).name
 if name not in FACTS or MARKERS[name].encode() not in raw:return raw
 f=FACTS[name]
 assert hashlib.sha256(raw).hexdigest()==f['sha256'], 'UIR33-01 current parent source'
 text=raw.decode()
 for before,after in reversed(OPERATIONS[f['path']]):
  assert after and text.count(after)==1, 'UIR33-01 unique inverse'
  text=text.replace(after,before,1)
 assert hashlib.sha256(text.encode()).hexdigest()==f['beforeSHA256'], 'UIR33-01 complete original source'
 return text.encode()
def validate_uir3301(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n
  assert p.is_file() and not p.is_symlink() and p.resolve().is_relative_to(root), 'UIR33-01 local input'
  return p
 if not (root/LEDGER).exists():
  assert not (root/MANIFEST['added']['path']).exists(), 'UIR33-01 unrecorded view'
  return set(),0
 assert json.loads(local(LEDGER).read_text())==MANIFEST, 'UIR33-01 exact ledger'
 assert json.loads(local('art/redesign/uir33-01-edits.json').read_text())==OPERATIONS, 'UIR33-01 exact edits'
 for name,f in FACTS.items():
  raw=local(f['path']).read_bytes();before=local(f['before']).read_bytes()
  assert len(raw)==f['bytes'] and hashlib.sha256(raw).hexdigest()==f['sha256'], 'UIR33-01 current complete parent'
  assert hashlib.sha256(before).hexdigest()==f['beforeSHA256'], 'UIR33-01 original preserved'
  assert prior_uir3301_bytes(name,raw)==before, 'UIR33-01 inverse'
  script=re.search(rb'<script setup.*?</script>',raw,re.S).group()
  if name=='App.vue':script=script.replace(b"\nimport CultivationOngoing from './CultivationOngoing.vue';",b'')
  assert script==re.search(rb'<script setup.*?</script>',before,re.S).group(), 'UIR33-01 original controller stays owned'
 v=MANIFEST['added'];raw=local(v['path']).read_bytes()
 assert len(raw)==v['bytes']<=6000 and hashlib.sha256(raw).hexdigest()==v['sha256'], 'UIR33-01 exact added surface'
 assert local('web/src/App.vue').stat().st_size<=159635, 'UIR33-01 original parent cap'
 old=json.loads(local('art/redesign/cultivation-objects.json').read_text())
 assert sum(local(r['path']).stat().st_size for r in old['files'])<=45000, 'UIR33-01 original cultivation cap'
 for n,pin in MANIFEST['originalLedgers'].items():assert hashlib.sha256(local(n).read_bytes()).hexdigest()==pin, 'UIR33-01 old ledger immutable'
 for n in MANIFEST['sourceReferences']:local(n)
 return {LEDGER,v['path'],*[f['path']for f in FACTS.values()],*MANIFEST['sourceReferences']},len(raw)
