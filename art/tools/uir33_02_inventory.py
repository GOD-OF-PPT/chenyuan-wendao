"""Exact local-view wiring; original travel defaults, receipts and caps are retained."""
import hashlib,json
from pathlib import Path
LEDGER='art/redesign/uir33-02.json'
FACTS={'AdventurePlanner.vue': {'path': 'web/src/AdventurePlanner.vue',
                          'bytes': 12166,
                          'sha256': 'aba45902b0f308011603edad8c839f25741ab875b17ac10cb481f01c5966dde7',
                          'before': 'goal-4/evidence/uir33-02/before/web/src/AdventurePlanner.vue',
                          'beforeSHA256': 'e4e8f93d86fd923464a62d3a21e851de88f6f96934d65c886e5190aaa3948a17'},
 'ExplorePanel.vue': {'path': 'web/src/ExplorePanel.vue',
                      'bytes': 11666,
                      'sha256': 'a8cc8ed9be8c9a7f57bb919978b2e5566f069e057a6304901269a66b589f78d1',
                      'before': 'goal-4/evidence/uir33-02/before/web/src/ExplorePanel.vue',
                      'beforeSHA256': '1c2be3163e7238ba0376dc9b91415c4f911e0a3d3508061d97ed7255ded1a871'},
 'JourneyMap.vue': {'path': 'web/src/JourneyMap.vue',
                    'bytes': 3875,
                    'sha256': 'a598cfa4f6279a4a7f98aeec78fe018fa5a13ed2964531b53ded0727b880840e',
                    'before': 'goal-4/evidence/uir33-02/before/web/src/JourneyMap.vue',
                    'beforeSHA256': 'aef00e927bf9c49430b3b89b5e5d9012431fad43adc9cd348845cc06203e5277'}}
MANIFEST={'format': 'chenyuan-local-exploration-uir33-02',
 'version': 1,
 'userAcceptance': False,
 'newRasterAssets': 0,
 'newCSSBytes': 0,
 'maxAddedNativeBytes': 2500,
 'added': {'path': 'web/src/JourneyLocalAction.vue',
           'bytes': 1452,
           'sha256': '640bf5362cb743162b64e7b9c3f07ae26329a8d6c5a12c8ffa643464fcb405db'},
 'sourceReferences': ['docs/decisions/0097-local-exploration-uir33-02-contract.md',
                      'goal-4/amendments/2026-11-04-uir33-02-input.md',
                      'goal-4/research/uir33-02-sources.json',
                      'art/redesign/uir33-02-edits.json',
                      'goal-4/evidence/uir33-02/before/web/src/AdventurePlanner.vue',
                      'goal-4/evidence/uir33-02/before/web/src/ExplorePanel.vue',
                      'goal-4/evidence/uir33-02/before/web/src/JourneyMap.vue'],
 'oldLedgers': {'idle-adventure': 'ce5cf186d5f11a9ec23f9762caf7310e2a367599b911c1376e27e6105f7a5ba9',
                'art02': '697f41e90df96108c1e1d330d511bc91b019aa36f1e1124a152f91d1946a6e9c',
                'playable-flow': 'd516844473a772bc1fdd2225a05c23a083d5a1a3145291f0d13c9beb4479d3b8'}}
OPERATIONS={'web/src/AdventurePlanner.vue': [["import JourneyMap from './JourneyMap.vue';",
                                   'import JourneyMap from '
                                   "'./JourneyMap.vue';\n"
                                   'import JourneyLocalAction from '
                                   "'./JourneyLocalAction.vue';"],
                                  ['track:[TrackingTarget];locations:[]',
                                   "track:[TrackingTarget];locations:['travel'|'source'|'purchase']"],
                                  ['const conflict=computed',
                                   'const '
                                   "here=computed(()=>props.mode==='travel'&&trip.value.location===props.game.core.world.location);\n"
                                   'const conflict=computed'],
                                  ["mode==='travel'?'行旅 · "
                                   "'+C.locations[trip.location].name",
                                   "mode==='travel'?(here?'此地 · ':'行旅 · "
                                   "')+C.locations[trip.location].name"],
                                  ["{{sameSaved&&planSaved?'已保存安排；修改后须另行确认':'待确认的新安排；选择不会旅行或开战'}}",
                                   "{{sameSaved&&planSaved?'已保存安排；修改后须另行确认':here?'当前所在 "
                                   "· 可查看本地活动或点选异地':'待确认的新安排；选择不会旅行或开战'}}"],
                                  ['@click="emit(\'locations\')"',
                                   '@click="emit(\'locations\',\'travel\')"'],
                                  ['<div class="adventure-preview"',
                                   '<div v-if="!here" '
                                   'class="adventure-preview"'],
                                  ['<footer class="adventure-confirm">',
                                   '<JourneyLocalAction v-if="here" '
                                   ':location="location" '
                                   '@locations="emit(\'locations\',$event)" '
                                   '@track="emit(\'track\',$event)"/>\n'
                                   '   <footer v-else '
                                   'class="adventure-confirm">']],
 'web/src/ExplorePanel.vue': [['@start="emit(\'start\',$event)" '
                               '@track="emit(\'track\',$event)" '
                               '@locations="selectMode(\'travel\')"',
                               '@start="emit(\'start\',$event)" '
                               '@track="emit(\'track\',$event)" '
                               '@locations="selectMode"']],
 'web/src/JourneyMap.vue': [['<strong>当前：{{C.locations[game.core.world.location].name}} '
                             '→ {{C.locations[selected].name}}</strong>',
                             "<strong>{{selected===game.core.world.location?'当前所在：'+C.locations[selected].name:'当前：'+C.locations[game.core.world.location].name+' "
                             "→ '+C.locations[selected].name}}</strong>"],
                            ['<small>一次6秒 · 不消耗游戏月',
                             '<small '
                             'v-if="selected!==game.core.world.location">一次6秒 '
                             '· 不消耗游戏月']]}
CAPS={'idle-adventure': 45000, 'art02': 45000, 'playable-flow': 60000}
MARKERS={'AdventurePlanner.vue':'import JourneyLocalAction','ExplorePanel.vue':'@locations="selectMode"','JourneyMap.vue':"'当前所在：'+C.locations[selected].name"}
def prior_uir3302_bytes(path,raw):
 name=Path(path).name
 if name not in FACTS or MARKERS[name].encode() not in raw:return raw
 f=FACTS[name];assert hashlib.sha256(raw).hexdigest()==f['sha256'], 'UIR33-02 current complete parent'
 text=raw.decode()
 for before,after in reversed(OPERATIONS[f['path']]):
  assert after and text.count(after)==1, 'UIR33-02 unique inverse'
  text=text.replace(after,before,1)
 assert hashlib.sha256(text.encode()).hexdigest()==f['beforeSHA256'], 'UIR33-02 original complete parent'
 return text.encode()
def validate_uir3302(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n
  assert p.is_file() and not p.is_symlink() and p.resolve().is_relative_to(root), 'UIR33-02 local source'
  return p
 if not (root/LEDGER).exists():
  assert not (root/MANIFEST['added']['path']).exists(), 'UIR33-02 unrecorded local viewing'
  return set(),0
 assert json.loads(local(LEDGER).read_text())==MANIFEST, 'UIR33-02 exact ledger'
 assert json.loads(local('art/redesign/uir33-02-edits.json').read_text())==OPERATIONS, 'UIR33-02 exact edits'
 for name,f in FACTS.items():
  raw=local(f['path']).read_bytes();before=local(f['before']).read_bytes()
  assert len(raw)==f['bytes'] and hashlib.sha256(raw).hexdigest()==f['sha256'], 'UIR33-02 current source'
  assert hashlib.sha256(before).hexdigest()==f['beforeSHA256'], 'UIR33-02 preserved original'
  assert prior_uir3302_bytes(name,raw)==before, 'UIR33-02 full inverse'
 v=MANIFEST['added'];raw=local(v['path']).read_bytes()
 assert len(raw)==v['bytes']<=2500 and hashlib.sha256(raw).hexdigest()==v['sha256'], 'UIR33-02 exact readonly mapping'
 for name,cap in CAPS.items():
  p=local('art/redesign/'+name+'.json');assert hashlib.sha256(p.read_bytes()).hexdigest()==MANIFEST['oldLedgers'][name], 'UIR33-02 old ledger unchanged'
  assert sum(local(r['path']).stat().st_size for r in json.loads(p.read_text())['files'])<=cap, 'UIR33-02 original cap'
 for ref in MANIFEST['sourceReferences']:local(ref)
 return {LEDGER,v['path'],*[f['path']for f in FACTS.values()],*MANIFEST['sourceReferences']},len(raw)
