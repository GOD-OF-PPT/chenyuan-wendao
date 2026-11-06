"""Exact small read-only fallback; existing controls, sources, and budgets remain pinned."""
import hashlib,json,re
from pathlib import Path
LEDGER='art/redesign/uir35-02.json'
MANIFEST={'format': 'chenyuan-uir35-02-assisted-fallback',
 'version': 1,
 'userAcceptance': False,
 'newRasterAssets': 0,
 'app': {'path': 'web/src/App.vue',
         'before': 'goal-4/evidence/uir35-02/before/web/src/App.vue',
         'beforeSHA256': '5e6a59b75b7021914ab4bdd356ef6608ec3f391d3522c9ac6eb8272698e7146a',
         'bytes': 159410,
         'sha256': '9f3f6c4596d9c8d4801e5ff0fecd1f9cda7a0842a13f3083ae4613d58e14e78f',
         'operations': [[3865, '', ".vue';\nimport CultivationFallback from './CultivationFallback"],
                        [6703, '', 'uiLocked=computed(()=>store.busy||!store.available);\nconst '],
                        [73935, 'store.busy||!store.available', 'uiLocked'],
                        [77302, 'store.busy||!store.available', 'uiLocked'],
                        [77434, 'store.busy || !store.available', 'uiLocked'],
                        [77862, 'store.busy || !store.available', 'uiLocked'],
                        [85229, 'store.busy||!store.available', 'uiLocked'],
                        [85394, 'store.busy||!store.available', 'uiLocked'],
                        [86516, 'template', 'CultivationFallback'],
                        [86542,
                         '',
                         ' :game="game" :plan="hubTrainingPlan" '
                         ':blocked="pendingStoryError||uiLocked||store.activityRunning" '
                         '@natural="hubTrainingMethod=\'natural\'"'],
                        [87995, 'store.busy||!store.available', 'uiLocked'],
                        [88184, 'store.busy||!store.available', 'uiLocked'],
                        [88583, 'store.busy||!store.available', 'uiLocked'],
                        [88834, '!store.available||store.busy', 'uiLocked'],
                        [89293, 'template', 'CultivationFallback'],
                        [92672, 'store.busy||!store.available', 'uiLocked'],
                        [92860, 'store.busy||!store.available', 'uiLocked'],
                        [93265, '!store.available||store.busy', 'uiLocked'],
                        [93448, '!store.available||store.busy', 'uiLocked'],
                        [94843, '!store.available||store.busy', 'uiLocked'],
                        [119556, '!store.available||store.busy', 'uiLocked'],
                        [137436, 'store.busy || !store.available', 'uiLocked'],
                        [137625, 'store.busy || !store.available', 'uiLocked'],
                        [137874, 'store.busy || !store.available', 'uiLocked'],
                        [138099, 'store.busy || !store.available', 'uiLocked'],
                        [141584, 'store.busy || !store.available', 'uiLocked'],
                        [143977, 'store.busy || !store.available', 'uiLocked'],
                        [146007, 'store.busy || !store.available', 'uiLocked'],
                        [148528, 'store.busy || !store.available', 'uiLocked']]},
 'added': {'web/src/CultivationFallback.vue': {'bytes': 1949,
                                               'sha256': '8db348a488f4c70947a8974579f26816d25657f1fbabee632d049448cc369883'},
           'web/src/cultivation-fallback.ts': {'bytes': 1434,
                                               'sha256': '579ff1b15aa9195c9d5d05e973118ae2e1cbafebd0415af3fb23fbbf0aedd9d1'}},
 'caps': {'app': 159635, 'added': 6000, 'cultivation-objects': 45000, 'idle-cultivation': 22000},
 'unchanged': {'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7',
               'web/src/focus.ts': '8ae91e78a4db7a854c293fc4b1bc28f02dd0d542b3119cff383f9245b4944eea',
               'web/src/CultivationSite.vue': 'b39966928306502220b66ebd3a4bd8f6eaae88243fbd306de80a08aa353072d5',
               'web/src/CultivationOngoing.vue': '36ff8a84502f8031e6d4410f650e5aa264faf3346051ac932f5cc35715726253',
               'web/src/TrainingPlanner.vue': 'aee9eeb8b91bea2a748bb84b5257a0dd601a134a24598d827fef548da5ce669f',
               'web/src/activity-clock.ts': '21fc98e4a430464a6dc3554091c022c53b17714938ae6e05491d27e1ab3f0901',
               'web/src/activity-persistence.ts': 'a5100e6f2d84b627ef17800bfc8f17f3f533566db47f35faab3833da66bab4cf',
               'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21',
               'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73',
               'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815',
               'src/full/queries.ts': 'eab721ecd066440d8babe11f36664300d21df2d1cf15f10d1160c7cb2a880d48'},
 'sourceReferences': ['docs/decisions/0118-assisted-cultivation-fallback.md',
                      'goal-4/amendments/2026-11-06-uir35-02-input.md']}
def prior_uir3502_bytes(path,raw):
 if Path(path).name!='App.vue'or b'import CultivationFallback 'not in raw:return raw
 row=MANIFEST['app'];assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'UIR34-01 UIR34-05 UIR34-06 UIR34-07 UIR35-01 UIR35-02 exact whole App display'
 text=raw.decode()
 for at,old,new in reversed(row['operations']):
  assert text[at:at+len(new)]==new,'UIR35-02 exact original span'
  text=text[:at]+old+text[at+len(new):]
 assert hashlib.sha256(text.encode()).hexdigest()==row['beforeSHA256'],'UIR35-02 complete prior App'
 return text.encode()
def validate_uir3502(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'UIR35-02 local source';return p
 if not(root/LEDGER).exists():
  assert all(not(root/n).exists()for n in MANIFEST['added']),'UIR35-02 unrecorded added view';return set(),0
 assert json.loads(local(LEDGER).read_text())==MANIFEST,'UIR35-02 immutable scope'
 row=MANIFEST['app'];raw=local(row['path']).read_bytes();old=local(row['before']).read_bytes();assert hashlib.sha256(old).hexdigest()==row['beforeSHA256'],'UIR35-02 preserved parent';assert prior_uir3502_bytes(row['path'],raw)==old,'UIR35-02 complete inverse'
 script=re.search(rb'<script.*?</script>',raw,re.S).group().replace(b"\nimport CultivationFallback from './CultivationFallback.vue';",b'').replace(b'const uiLocked=computed(()=>store.busy||!store.available);\n',b'')
 assert script==re.search(rb'<script.*?</script>',old,re.S).group(),'UIR35-02 original App controller'
 assert re.findall(rb'@[\w:.-]+="[^"]*"',raw.replace(b' @natural="hubTrainingMethod=\'natural\'"',b''))==re.findall(rb'@[\w:.-]+="[^"]*"',old),'UIR35-02 original event authority'
 assert len(raw)<=159635 and raw.count(b'uiLocked')==26,'UIR35-02 original parent cap and24 equivalent bindings'
 total=0
 for n,r in MANIFEST['added'].items():
  value=local(n).read_bytes();assert len(value)==r['bytes']and hashlib.sha256(value).hexdigest()==r['sha256'],'UIR35-02 exact added projection';total+=len(value)
 assert total<=6000,'UIR35-02 added budget'
 for n,h in MANIFEST['unchanged'].items():assert hashlib.sha256(local(n).read_bytes()).hexdigest()==h,'UIR35-02 original writer clock rules and focus'
 for n,cap in MANIFEST['caps'].items():
  if n in ['app','added']:continue
  actual=sum(local(x['path']).stat().st_size for x in json.loads(local('art/redesign/'+n+'.json').read_text())['files']);assert actual<=cap,'UIR35-02 original group cap'
 for n in MANIFEST['sourceReferences']:local(n)
 return{LEDGER,row['path'],row['before'],*MANIFEST['added'],*MANIFEST['unchanged'],*MANIFEST['sourceReferences']},total
