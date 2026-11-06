"""Exact travel-only scene adapter and unchanged authority, with original caps."""
import hashlib,json,re
from pathlib import Path
LEDGER='art/redesign/cend06-f02b.json'
MANIFEST={'format': 'chenyuan-cend06-f02b-travel-passage',
 'version': 1,
 'userAcceptance': False,
 'newRasterAssets': 0,
 'maxAddedNativeBytes': 8500,
 'maxSceneDelta': 400,
 'originalAppCap': 159635,
 'originalParentDeltaCap': 2400,
 'maxUncommittedProgress': 0.94,
 'files': {'web/src/App.vue': {'before': 'goal-4/evidence/cend06-f02b/before/web/src/App.vue',
                               'beforeBytes': 159627,
                               'beforeSha256': 'ccc2a0ffe54211fbeff8ef0b5f4937ebc84e55a1910ad292109bb59a71b0b8d8',
                               'bytes': 159629,
                               'sha256': 'daeff1fbef8791ec6558150c189e41324c6f3db2ec1d3518b74899c605d8ff47',
                               'operations': [[4323,
                                               "import TrialReturnChoices from './TrialReturnChoices.vue';\n"
                                               "import {actionSeconds} from './action-timing';\n",
                                               "import TrialReturnChoices from './TrialReturnChoices.vue';\n"],
                                              [79329,
                                               'description="一念尘缘起，千山共问道。"/>',
                                               'description="一念尘缘起，千山共问道。" :passage="immersive" '
                                               '@inspect="viewActivityPlan"/>']]},
           'web/src/ScenePanel.vue': {'before': 'goal-4/evidence/cend06-f02b/before/web/src/ScenePanel.vue',
                                      'beforeBytes': 9410,
                                      'beforeSha256': '3bbb2c3e8777d0d7a5713a3125a0fbbb78542c33f4a9faeaea103f781db34ea1',
                                      'bytes': 9604,
                                      'sha256': 'f2043fefced6a9eec9407cbe794e3abb331297c8574f5f257ea53897d532d4d2',
                                      'operations': [[198,
                                                      "import AssetImage from './AssetImage.vue';",
                                                      "import AssetImage from './AssetImage.vue';\n"
                                                      "import TravelPassage from './TravelPassage.vue';"],
                                                     [507,
                                                      'withAction?:boolean',
                                                      'withAction?:boolean;passage?:boolean'],
                                                     [550,
                                                      'const scene = computed',
                                                      'const emit=defineEmits<{inspect:[Event]}>();\n'
                                                      'const scene = computed'],
                                                     [6292,
                                                      '    <slot/>',
                                                      '    <TravelPassage v-if="passage" :game="game" '
                                                      '@inspect="emit(\'inspect\',$event)"/>\n'
                                                      '    <slot/>']]}},
 'added': {'web/src/TravelPassage.vue': {'bytes': 4209,
                                         'sha256': '3a9c8b2e671e82e58d60135fa253fd1bb7174a39f9ac629d2957ff2873e53f71'},
           'web/src/travel-passage.css': {'bytes': 3714,
                                          'sha256': '3d8e598154392104a1f2e197a675f03f1e50564decaa28abeed4ee721d506b46'}},
 'unchanged': {'web/src/OpeningResponse.vue': '725a3f03b21310890c795509d1c008d9fb28ba408b5c2b2fd7e2a753b987a05a',
               'web/src/opening-response.css': 'baa00c4aeef67ffb36eba3062c538c7408513e06b3ab61cff841d932cd13d1c5',
               'web/src/OpeningOffering.vue': 'fd775d201b0955c24469c3a7efa8e03656c358550b224b0bbb921e06aabbce9f',
               'web/src/JourneyMap.vue': 'a598cfa4f6279a4a7f98aeec78fe018fa5a13ed2964531b53ded0727b880840e',
               'web/src/AdventurePlanner.vue': '19f1eacdc32f2bf7e03d76de4b344a26c5758f5435e62844fdc22d77edb5ac9f',
               'web/src/action-timing.ts': '13868c2e6f7a0047cf8665179ffb34af654395c93e094c3eabbb2892c264d897',
               'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7',
               'web/src/activity-clock.ts': '21fc98e4a430464a6dc3554091c022c53b17714938ae6e05491d27e1ab3f0901',
               'web/src/activity-persistence.ts': 'a5100e6f2d84b627ef17800bfc8f17f3f533566db47f35faab3833da66bab4cf',
               'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21',
               'web/src/focus.ts': '8ae91e78a4db7a854c293fc4b1bc28f02dd0d542b3119cff383f9245b4944eea',
               'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815',
               'src/full/adventure.ts': '8693c958f984b4b03043df5b83518323358fd7e033779f4711f4d766046b8015',
               'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73'},
 'sourceReferences': ['docs/decisions/0126-travel-passage-cend06-f02b.md',
                      'goal-4/amendments/2026-11-06-cend06-f02b-input.md',
                      'goal-4/research/cend06-f02b-sources.json']}
def prior_f02b_bytes(path,raw):
 matches=[n for n in MANIFEST['files']if Path(n).name==Path(path).name]
 if not matches:return raw
 row=MANIFEST['files'][matches[0]]
 if hashlib.sha256(raw).hexdigest()==row['beforeSha256']:return raw
 marker=b':passage="immersive"'if Path(path).name=='App.vue'else b'import TravelPassage'
 if marker not in raw:return raw
 assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'F02B complete current source'
 text=raw.decode()
 for at,before,after in reversed(row['operations']):
  assert text[at:at+len(after)]==after,'F02B exact scene display span'
  text=text[:at]+before+text[at+len(after):]
 assert hashlib.sha256(text.encode()).hexdigest()==row['beforeSha256'],'F02B complete original scene source'
 return text.encode()
def validate_f02b(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'F02B local source';return p
 if not(root/LEDGER).exists():
  assert not(root/'web/src/TravelPassage.vue').exists(),'F02B missing ledger'
  return set(),0
 assert json.loads(local(LEDGER).read_text())==MANIFEST,'F02B immutable scope and original caps'
 for n,row in MANIFEST['files'].items():
  raw=local(n).read_bytes();old=local(row['before']).read_bytes();assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'F02B current source';assert len(old)==row['beforeBytes']and hashlib.sha256(old).hexdigest()==row['beforeSha256'],'F02B preserved original';assert prior_f02b_bytes(n,raw)==old,'F02B whole inverse'
  if n.endswith('App.vue'):assert raw.split(b'</script>')[0]==old.split(b'</script>')[0].replace(b"import {actionSeconds} from './action-timing';\n",b''),'F02B only unused pure import removed'
  else:assert raw.split(b'<style')[1]==old.split(b'<style')[1],'F02B original scene styles and media unchanged'
 total=0
 for n,row in MANIFEST['added'].items():
  raw=local(n).read_bytes();assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'F02B readonly passage identity';total+=len(raw)
 assert total<=8500,'F02B new native cap'
 assert MANIFEST['files']['web/src/ScenePanel.vue']['bytes']-MANIFEST['files']['web/src/ScenePanel.vue']['beforeBytes']<=400,'F02B scene delta'
 app=local('web/src/App.vue').stat().st_size;assert app<=159635 and app-157235<=2400,'F02B actual original App caps'
 for n,h in MANIFEST['unchanged'].items():assert hashlib.sha256(local(n).read_bytes()).hexdigest()==h,'F02B original maps clocks stores rules and focus'
 s=local('web/src/TravelPassage.vue').read_text();assert not re.search(r'\b(?:setTimeout|setInterval|requestAnimationFrame|Date|performance|fetch|indexedDB|localStorage|resolve|startPlannedActivity|pauseCultivation|resumeCultivation)\b|v-html|eval\s*\(',s),'F02B no own clock IO writes or rewards'
 assert "defineEmits<{inspect:[Event]}>()"in s and all(x in s for x in ['activityLocal','gameRevision','generation','remainingMs','Teleport','defer','data-testid=hub-current']),'F02B real clock and original target'
 for n in MANIFEST['sourceReferences']:local(n)
 return{LEDGER,*MANIFEST['files'],*[x['before']for x in MANIFEST['files'].values()],*MANIFEST['added'],*MANIFEST['unchanged'],*MANIFEST['sourceReferences']},total
