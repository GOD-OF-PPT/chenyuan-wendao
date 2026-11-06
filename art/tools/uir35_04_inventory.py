from check_cend07_inventory import prior_forecast_bytes
from cend06_f02a_inventory import prior_f02a_bytes
from check_ui35_source_inventory import prior_check_ui35_source_bytes
"""Exact readonly medicine summaries and encounter footer; original plans and transaction owners stay pinned."""
import hashlib,json,re
from pathlib import Path
LEDGER='art/redesign/uir35-04.json'
MANIFEST={'format': 'chenyuan-uir35-04-battle-medicine',
 'version': 1,
 'userAcceptance': False,
 'newRasterAssets': 0,
 'maxProjectionBytes': 2000,
 'maxAdventureBytes': 45000,
 'maxArt02Bytes': 45000,
 'files': {'web/src/AdventurePlanner.vue': {'before': 'goal-4/evidence/uir35-04/before/web/src/AdventurePlanner.vue',
                                            'beforeBytes': 12166,
                                            'beforeSha256': 'aba45902b0f308011603edad8c839f25741ab875b17ac10cb481f01c5966dde7',
                                            'bytes': 12023,
                                            'sha256': '19f1eacdc32f2bf7e03d76de4b344a26c5758f5435e62844fdc22d77edb5ac9f',
                                            'operations': [[847,
                                                            '',
                                                            "';\n"
                                                            "import{medicineSummary}from'./battle-medicine-summary"],
                                                           [10196, '；回春', '</small><small'],
                                                           [10211, '', 'v-if="mode===\'encounter\'">'],
                                                           [10239, '', 'medicineSummary('],
                                                           [10273, '.healingBudget', ')'],
                                                           [10276,
                                                            ' / 保留 '
                                                            '{{encounter.strategy.healingReserve}}（{{encounter.strategy.healBelowPercent}}%），回灵 '
                                                            '{{encounter.strategy.spiritBudget}} / 保留 '
                                                            '{{encounter.strategy.spiritReserve}}（{{encounter.strategy.restoreBelowPercent}}%）',
                                                            '']]},
           'web/src/BattleStrategy.vue': {'before': 'goal-4/evidence/uir35-04/before/web/src/BattleStrategy.vue',
                                          'beforeBytes': 16586,
                                          'beforeSha256': '82ea2a3699c26c6e95b76540eeba0f0f30103de1d9e0822b516f864f11c7eda3',
                                          'bytes': 16351,
                                          'sha256': '081a5cd941deb75115655b3181aba4593966a5793c085fc1044b8c22b312fbbc',
                                          'operations': [[764,
                                                          '',
                                                          "';\nimport{medicineSummary}from'./battle-medicine-summary"],
                                                         [2779,
                                                          '',
                                                          '((a.spentItems.healing_pill??0)||(a.spentItems.spirit_pill??0)?'],
                                                         [2916, '', "):'未耗丹药'"],
                                                         [3356, '回春授权 ', ''],
                                                         [3358, 's.h', 'm'],
                                                         [3360, 'al', 'dic'],
                                                         [3365, 'gB', 'eS'],
                                                         [3368, 'dget', 'mmary(s)'],
                                                         [3378,
                                                          "（留 '+s.healingReserve+'，气血 '+s.healBelowPercent+'%），回灵授权 "
                                                          "'+s.spiritBudget+'（留 '+s.spiritReserve+'，灵力 "
                                                          "'+s.restoreBelowPercent+'%）",
                                                          ''],
                                                         [13649, '回春最多 ', ''],
                                                         [13651, '', 'medicineSummary('],
                                                         [13672, '.healingBudget', ')'],
                                                         [13675,
                                                          ' / 保留 {{state.healingReserve}}（气血 '
                                                          '{{state.healBelowPercent}}%）；回灵最多 {{state.spiritBudget}} / '
                                                          '保留 {{state.spiritReserve}}（灵力 '
                                                          '{{state.restoreBelowPercent}}%）',
                                                          '']]},
           'web/src/art02-journey.css': {'before': 'goal-4/evidence/uir35-04/before/web/src/art02-journey.css',
                                         'beforeBytes': 4541,
                                         'beforeSha256': '5dca76ca35a7516bd1b596722b3d5a0f572d81214d844636106bcbea1bf1ee87',
                                         'bytes': 4545,
                                         'sha256': '7f5e8d5faa518aa82dc876fe512aab7fc6689b75294c6fa992720fb71dacc8e1',
                                         'operations': [[4234, '13', 'minmax('], [4242, 'px ', ','], [4246, '', ')']]}},
 'projection': {'path': 'web/src/battle-medicine-summary.ts',
                'bytes': 532,
                'sha256': '62c47eea0df8f5c237574dd4b61ad5dee2c668d6e8c172c92643f1f74b1322ae'},
 'unchanged': {'web/src/App.vue': '9f3f6c4596d9c8d4801e5ff0fecd1f9cda7a0842a13f3083ae4613d58e14e78f',
               'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7',
               'web/src/activity-clock.ts': '21fc98e4a430464a6dc3554091c022c53b17714938ae6e05491d27e1ab3f0901',
               'web/src/activity-persistence.ts': 'a5100e6f2d84b627ef17800bfc8f17f3f533566db47f35faab3833da66bab4cf',
               'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21',
               'web/src/AdventureHistory.vue': '40d8eb49cdee409fbcb048849158037dec9fc54c6f4483282869a3ab7dae5e12',
               'web/src/TrainingActivity.vue': '601e58f6b9edc237031d77337e527e529ac4d619447980bf9e5cddb0b700e4d3',
               'web/src/BattleDeck.vue': 'cdab3a1aaa6eb40d0c8a943a5f2e466074b4e927844b7e2ac0191fa2e9da0ed9',
               'src/full/adventure.ts': '8693c958f984b4b03043df5b83518323358fd7e033779f4711f4d766046b8015',
               'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815',
               'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73'},
 'sourceReferences': ['docs/decisions/0122-battle-medicine-summary-uir35-04.md',
                      'goal-4/amendments/2026-11-06-uir35-04-input.md',
                      'goal-4/research/uir35-04-sources.json']}
def prior_uir3504_bytes(path,raw):
 raw=prior_check_ui35_source_bytes(path,raw)
 matches=[n for n in MANIFEST['files']if Path(n).name==Path(path).name]
 if not matches:return raw
 n=matches[0];marker=b'medicineSummary'if n.endswith('.vue')else b'grid-column:2;grid-row:4;display:grid;grid-template-columns:minmax(0,1fr)'
 if marker not in raw:return raw
 row=MANIFEST['files'][n];assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'UIR35-04 complete source'
 text=raw.decode()
 for at,before,after in reversed(row['operations']):
  assert text[at:at+len(after)]==after,'UIR35-04 exact display span'
  text=text[:at]+before+text[at+len(after):]
 assert hashlib.sha256(text.encode()).hexdigest()==row['beforeSha256'],'UIR35-04 complete original source'
 return text.encode()
def validate_uir3504(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'UIR35-04 local source';return p
 if not(root/LEDGER).exists():
  assert not(root/MANIFEST['projection']['path']).exists(),'UIR35-04 unrecorded projection';return set(),0
 assert json.loads(local(LEDGER).read_text())==MANIFEST,'UIR35-04 immutable scope and original caps'
 for n,row in MANIFEST['files'].items():
  try:raw=prior_forecast_bytes(n,local(n).read_bytes())
  except AssertionError as error:raise AssertionError('UIR35-04 parent: '+str(error))from error
  old=local(row['before']).read_bytes();assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'UIR35-04 current source';assert len(old)==row['beforeBytes']and hashlib.sha256(old).hexdigest()==row['beforeSha256'],'UIR35-04 preserved complete original';assert prior_uir3504_bytes(n,raw)==old,'UIR35-04 full inverse'
  if n.endswith('.vue'):assert re.findall(rb'@[\w:.-]+="[^"]*"',raw)==re.findall(rb'@[\w:.-]+="[^"]*"',old),'UIR35-04 original writing and view callbacks'
 row=MANIFEST['projection'];raw=local(row['path']).read_bytes();assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256']and len(raw)<=2000,'UIR35-04 pure projected medicine text'
 for n,h in MANIFEST['unchanged'].items():assert hashlib.sha256(prior_f02a_bytes(n,local(n).read_bytes())).hexdigest()==h,'UIR35-04 original rules input CAS clocks atomic stores and history'
 adventure=json.loads(local('art/redesign/idle-adventure.json').read_text());total=sum(local(row['path']).stat().st_size for row in adventure['files'])+len(raw);assert adventure['maxNativeBytes']==45000 and total<=45000,'UIR35-04 actual original45000 includes added projection'
 art02=json.loads(local('art/redesign/art02.json').read_text());assert art02['maxNativeBytes']==45000 and sum(local(row['path']).stat().st_size for row in art02['files'])<=45000,'UIR35-04 actual original ART02 cap'
 for n in MANIFEST['sourceReferences']:local(n)
 return {LEDGER,*MANIFEST['files'],*[row['before']for row in MANIFEST['files'].values()],MANIFEST['projection']['path'],*MANIFEST['unchanged'],*MANIFEST['sourceReferences']},total
