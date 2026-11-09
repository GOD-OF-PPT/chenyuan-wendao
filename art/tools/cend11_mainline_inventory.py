import hashlib,json
from pathlib import Path
LEDGER="art/redesign/cend11-mainline.json"
MANIFEST={'format': 'chenyuan-mainline-hud-object',
 'version': 1,
 'userAcceptance': False,
 'newRasterAssets': 0,
 'maxChildBytes': 4200,
 'maxProjectionBytes': 3000,
 'maxAppDeltaBytes': 400,
 'oldR1Cap': 18000,
 'parents': [{'path': 'web/src/GameHud.vue',
              'before': 'goal-4/evidence/cend11-mainline/before/web/src/GameHud.vue',
              'beforeBytes': 2332,
              'beforeSHA256': '43cde88a2e545bce6d475735783bc6d66f487a7ffb8643220ac8297b63a529c5',
              'bytes': 2328,
              'sha256': 'aa92a63df6bacaedde2217ce835f58455940628e8ef27d2b11cfe601023de732',
              'operations': [["import GameIcon from './GameIcon.vue';",
                              "import GameIcon from './GameIcon.vue';\n"
                              "import HudGoal from './HudGoal.vue';\n"
                              "import type {HudGoalContext} from './hud-goal.ts';"],
                             ['demo?:boolean}>', 'demo?:boolean;context?:HudGoalContext|null}>'],
                             ['<small>当前目标</small><strong data-testid="hub-target">{{goal}}</strong><small '
                              'data-testid="hub-gap">{{gap}}</small><span '
                              'data-testid="hub-goal-open">查看缺口与来源 ›</span>',
                              '<HudGoal :game="game" :goal="goal" :gap="gap" :context="context"/>']],
              'indentLines': []},
             {'path': 'web/src/App.vue',
              'before': 'goal-4/evidence/cend11-mainline/before/web/src/App.vue',
              'beforeBytes': 159629,
              'beforeSHA256': 'daeff1fbef8791ec6558150c189e41324c6f3db2ec1d3518b74899c605d8ff47',
              'bytes': 159623,
              'sha256': 'e48a2a03faad3bb9e4061b4e7c088c122c8a29d12edfe007ebe3e5cb39f9730d',
              'operations': [['const hubGoalHint=computed',
                              'const hudGoalContext=computed(()=>{const g=game.value,o=hubGoal.value;return '
                              'g&&o&&!lifeState.value?.hint?{runId:g.core.runId,revision:g.core.revision,goal:o}:null;});\n'
                              'const hubGoalHint=computed'],
                             [':goal="hubGoal?.title??\'当前目标\'"',
                              ':goal="hubGoal?.title??\'当前目标\'" :context="hudGoalContext"']],
              'indentLines': [640,
                              641,
                              642,
                              643,
                              644,
                              645,
                              646,
                              647,
                              648,
                              649,
                              650,
                              651,
                              652,
                              653,
                              654,
                              655,
                              656,
                              657,
                              658,
                              659,
                              660,
                              661,
                              662,
                              663,
                              664,
                              665,
                              666,
                              667,
                              668,
                              669,
                              670,
                              671,
                              672,
                              673,
                              674,
                              675,
                              676,
                              677,
                              678,
                              679,
                              680,
                              681,
                              682,
                              683,
                              684,
                              685,
                              686,
                              687,
                              688,
                              689]}],
 'display': {'path': 'web/src/HudGoal.vue',
             'bytes': 2156,
             'sha256': '0d602115ad69e16cd1f97d5b91f63be81fabb212c2e97048dd309ea45bdd1258'},
 'projection': {'path': 'web/src/hud-goal.ts',
                'bytes': 1259,
                'sha256': '170e5341c25cfbc99419569785ab23f9376eb83b86219f4cc50821916a11c8c5'},
 'authority': {'web/src/GoalPanel.vue': '3f0e30aa122c32d0f04ae49c11cecf528e74eb0a45f3760b9759c3516f0a4f34',
               'web/src/GoalBoard.vue': 'bc908d0ce123a15066f7950b77c1a09db67eda1592e3a50a1ff45cfbfd70a7fd',
               'web/src/stage-r1.css': '1ed138017fb93db1156aea3db518ea7f930864a0503e3adb7363f4e4eb68112d',
               'web/src/AssetImage.vue': 'ecfc476d074c16c14b181abbf62863ebc6d5c014d9473d3118e761433115a8da',
               'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7',
               'web/src/activity-clock.ts': '21fc98e4a430464a6dc3554091c022c53b17714938ae6e05491d27e1ab3f0901',
               'web/src/focus.ts': '8ae91e78a4db7a854c293fc4b1bc28f02dd0d542b3119cff383f9245b4944eea',
               'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21',
               'web/src/activity-persistence.ts': 'a5100e6f2d84b627ef17800bfc8f17f3f533566db47f35faab3833da66bab4cf',
               'src/full/goals.ts': '10dc1cc0f88889fad39afff762811502f004af3e478a331e1ed4908b6c73e883',
               'src/full/queries.ts': 'eab721ecd066440d8babe11f36664300d21df2d1cf15f10d1160c7cb2a880d48',
               'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73',
               'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815',
               'src/full/content.ts': 'e5602fa6c0ccac95372d5f668a3234d7d6054ea5f3a4b36d72798f1b9e40878c'},
 'reusedAssets': {'web/public/art/v2/items/foundation_pill-v1.webp': 'db5c298534d4bd55fdc42b64bb16a330d07cd52ea08167b1a32f09bb5950de2e',
                  'web/public/art/v2/items/golden_pill-v1.webp': 'eeedde783c0b5851146972c5cf13f87a33026f100e4a4c60128ce4d25bd13e62',
                  'web/public/art/v2/items/nascent_pill-v1.webp': '37a62d61299c641d9849a819494a4d54b9a0bc09bff249716fb4c9a115483e03',
                  'web/public/art/v2/items/spirit_seed-v1.webp': 'd1934ce9d1f018d866b03671666541f3406d64a10aa8c2ea6950481e3afc5e4f',
                  'web/public/art/v2/items/ascension_seal-v1.webp': 'e3d81134f7a6bf663fda8d653beb1553429a5f514a882cc2137a760fc60d1885'},
 'oldLedgers': {'art/redesign/stage-r1.json': '3ce30ea55cf43ef9f335df7a0cc744f0f0c9afc40cdef5997fdf7dcc5dedc967',
                'art/redesign/cend10-source-goal.json': '7e00d92f84e9cd35d579ef5d72f2e25b70c8ac4ffd45edc55dac7238df5dcabf'},
 'sourceReferences': ['docs/decisions/0142-mainline-hud-object-cend11-contract.md',
                      'goal-4/amendments/2026-11-10-cend11-mainline-input.md',
                      'goal-4/research/cend11-mainline-sources.json']}
def prior_mainline_hud_bytes(path,raw):
 row=next((r for r in MANIFEST['parents']if Path(r['path']).name==Path(path).name),None)
 if not row or hashlib.sha256(raw).hexdigest()!=row['sha256']:return raw
 if row.get('indentLines'):
  lines=raw.decode().splitlines(keepends=True)
  for i in row['indentLines']:lines[i]='    '+lines[i]
  raw=''.join(lines).encode()
 for before,after in reversed(row['operations']):
  assert raw.count(after.encode())==1,'MH11 unique approved display operation'
  raw=raw.replace(after.encode(),before.encode(),1)
 assert len(raw)==row['beforeBytes']and hashlib.sha256(raw).hexdigest()==row['beforeSHA256'],'MH11 exact whole original'
 return raw

def validate_mainline_hud(root):
 root=Path(root).resolve()
 def local(n):
  assert type(n)is str and n and not Path(n).is_absolute()and '..'not in Path(n).parts and '\\'not in n,'MH11 local path'
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'MH11 actual local source'
  return p
 if not(root/LEDGER).exists():
  assert not any((root/MANIFEST[k]['path']).exists()for k in ['display','projection']),'MH11 missing ledger'
  for row in MANIFEST['parents']:
   p=root/row['path'];assert not(p.exists()or p.is_symlink())or hashlib.sha256(local(row['path']).read_bytes()).hexdigest()==row['beforeSHA256'],'MH11 missing ledger current parent'
  return set(),0
 assert json.dumps(json.loads(local(LEDGER).read_text()),sort_keys=True)==json.dumps(MANIFEST,sort_keys=True),'MH11 immutable typed scope'
 total=0
 for row in MANIFEST['parents']:
  raw=local(row['path']).read_bytes();before=local(row['before']).read_bytes()
  assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'MH11 exact current parent'
  assert len(before)==row['beforeBytes']and hashlib.sha256(before).hexdigest()==row['beforeSHA256'],'MH11 original retained'
  assert prior_mainline_hud_bytes(row['path'],raw)==before,'MH11 complete parent inverse'
  if Path(row['path']).name=='App.vue':assert len(raw)<=159635 and len(raw)-len(before)<=400,'MH11 actual App cap'
 assert local('web/src/GameHud.vue').stat().st_size+local('web/src/stage-r1.css').stat().st_size<=18000,'MH11 original R1 cap'
 for key,cap in [('display',4200),('projection',3000)]:
  d=MANIFEST[key];raw=local(d['path']).read_bytes();assert len(raw)==d['bytes']and hashlib.sha256(raw).hexdigest()==d['sha256']and len(raw)<=cap,'MH11 exact pure display and cap';total+=len(raw)
 for key in ['authority','reusedAssets','oldLedgers']:
  for n,h in MANIFEST[key].items():assert hashlib.sha256(local(n).read_bytes()).hexdigest()==h,'MH11 original '+key
 for n in MANIFEST['sourceReferences']:local(n)
 return{LEDGER,*[r[k]for r in MANIFEST['parents']for k in ['path','before']],MANIFEST['display']['path'],MANIFEST['projection']['path'],*MANIFEST['authority'],*MANIFEST['reusedAssets'],*MANIFEST['oldLedgers'],*MANIFEST['sourceReferences']},total
