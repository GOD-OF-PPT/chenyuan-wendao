from cend11_mainline_inventory import prior_mainline_hud_bytes
import hashlib,json
from pathlib import Path
LEDGER="art/redesign/cend10-source-goal.json"
MANIFEST={'format': 'chenyuan-source-stock-goal',
 'version': 1,
 'userAcceptance': False,
 'newRasterAssets': 0,
 'maxParentDeltaBytes': 400,
 'maxChildBytes': 2400,
 'maxProjectionBytes': 2200,
 'parent': {'path': 'web/src/SourceSatchel.vue',
            'before': 'goal-4/evidence/cend10-source-goal/before/web/src/SourceSatchel.vue',
            'beforeBytes': 5930,
            'beforeSHA256': 'f28a144f928cd9358df91e600118fcb19aaef2667f9eb3cb198ccb15cc8521fd',
            'bytes': 6074,
            'sha256': '6d7e160291fae878805b12550b40e583d8980f35e1d138a8c89227806b034510',
            'additions': ["import SourceStockGoal from './SourceStockGoal.vue';\n",
                          '<SourceStockGoal :game="game" :source-id="sourceId" :row-id="row.id" '
                          ':activity="activity"/>']},
 'display': {'path': 'web/src/SourceStockGoal.vue',
             'bytes': 1150,
             'sha256': '679a554f55882e1fb417687fb4854665f699c1aa23c68c31ca91e559f0cb8583'},
 'projection': {'path': 'web/src/source-stock-goal.ts',
                'bytes': 1009,
                'sha256': '7e93d44c53a4223de2d4faabae3cbf32846a71c393bb78cf8c357465e1bf1891'},
 'authority': {'web/src/SourceField.vue': '360709cea5fa93a86e01f254b70248b410dbc2cf62c37a22c2658a4d42a3e46d',
               'web/src/SourcePlanner.vue': 'ea42a57110db234205d8ef8f1d46f4969802a7757ed16ede9d0ff3e33e3b9e72',
               'web/src/source-choreography.ts': '665cb8c1d7bf0537b992b628720ff3be2bf0206536b36f487799bf67fe1f96f2',
               'web/src/src-stage.css': '2f55d1156f00802daf6d14094bf6cf1380d6d60797fa72dae6a326977a34fed6',
               'web/src/ta08-source.css': '0bcaa542dca4f1dc9bb862e63ead388dee2f996bf483507d77813710181f3522',
               'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7',
               'web/src/use-activity-effect.ts': 'e15a7b41b897e7d4f29e8be277703efd1f8c32d2dec11d278a41a37c89425163',
               'web/src/activity-clock.ts': '21fc98e4a430464a6dc3554091c022c53b17714938ae6e05491d27e1ab3f0901',
               'web/src/activity-persistence.ts': 'a5100e6f2d84b627ef17800bfc8f17f3f533566db47f35faab3833da66bab4cf',
               'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21',
               'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815',
               'src/full/content.ts': 'e5602fa6c0ccac95372d5f668a3234d7d6054ea5f3a4b36d72798f1b9e40878c',
               'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73',
               'src/full/types.ts': 'be3db5f0a91ac3ced01315643400ab23de14fbe19ca003f6126f0c834397a064'},
 'sourceReferences': ['docs/decisions/0141-source-stock-goal-cend10-contract.md',
                      'goal-4/amendments/2026-11-09-cend10-source-goal-input.md',
                      'goal-4/research/cend10-source-goal-sources.json']}
def prior_stock_goal_bytes(path,raw):
 raw=prior_mainline_hud_bytes(path,raw)
 row=MANIFEST['parent']
 if Path(path).name!=Path(row['path']).name or hashlib.sha256(raw).hexdigest()!=row['sha256']:return raw
 for addition in row['additions']:
  assert raw.count(addition.encode())==1,'SG10 unique display-only addition'
  raw=raw.replace(addition.encode(),b'',1)
 assert len(raw)==row['beforeBytes']and hashlib.sha256(raw).hexdigest()==row['beforeSHA256'],'SG10 exact original inverse'
 return raw

def validate_stock_goal(root):
 root=Path(root).resolve()
 def local(n):
  assert type(n)is str and n and not Path(n).is_absolute()and '..'not in Path(n).parts and '\\'not in n,'SG10 local path'
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'SG10 actual local source'
  return p
 if not(root/LEDGER).exists():
  assert not any((root/MANIFEST[k]['path']).exists()for k in ['display','projection']),'SG10 missing ledger'
  p=root/MANIFEST['parent']['path'];assert not(p.exists()or p.is_symlink())or hashlib.sha256(local(MANIFEST['parent']['path']).read_bytes()).hexdigest()==MANIFEST['parent']['beforeSHA256'],'SG10 missing ledger current parent'
  return set(),0
 assert json.dumps(json.loads(local(LEDGER).read_text()),sort_keys=True)==json.dumps(MANIFEST,sort_keys=True),'SG10 immutable typed ledger'
 row=MANIFEST['parent'];raw=local(row['path']).read_bytes();old=local(row['before']).read_bytes()
 assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'SG10 complete display parent'
 assert len(old)==row['beforeBytes']and hashlib.sha256(old).hexdigest()==row['beforeSHA256'],'SG10 preserved original'
 assert prior_stock_goal_bytes(row['path'],raw)==old and len(raw)-len(old)<=400,'SG10 exact inverse and original cap'
 total=0
 for key,cap in [('display',2400),('projection',2200)]:
  d=MANIFEST[key];b=local(d['path']).read_bytes();assert len(b)==d['bytes']and hashlib.sha256(b).hexdigest()==d['sha256']and len(b)<=cap,'SG10 exact pure display source and cap';total+=len(b)
 for n,h in MANIFEST['authority'].items():assert hashlib.sha256(local(n).read_bytes()).hexdigest()==h,'SG10 original authority'
 for n in MANIFEST['sourceReferences']:local(n)
 return{LEDGER,row['path'],row['before'],MANIFEST['display']['path'],MANIFEST['projection']['path'],*MANIFEST['authority'],*MANIFEST['sourceReferences']},total
