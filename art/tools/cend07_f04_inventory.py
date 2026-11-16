"""Exact preparation art slots and readonly materials, original authority/caps retained."""
from check_cend07_three_inventory import prior_three_check_bytes
import hashlib,json,re
from pathlib import Path
LEDGER='art/redesign/cend07-f04.json'
MANIFEST={'format': 'chenyuan-cend07-f04-preparation-bench',
 'version': 1,
 'userAcceptance': False,
 'newRasterAssets': 0,
 'maxDisplayBytes': 12000,
 'files': {'web/src/PreparationPanel.vue': {'before': 'goal-4/evidence/cend07-f04/before/web/src/PreparationPanel.vue',
                                            'beforeBytes': 8416,
                                            'beforeSha256': 'cc8e14c4d44401a5c1173273b1d287511866a3ff5595c6c76bc118f866689d5c',
                                            'bytes': 8384,
                                            'sha256': '9b7c90c115e661d14d5bf9a30f188ded9616b55afb548270ad4a39aa1c60520a',
                                            'operations': [[552, 'Game', ''],
                                                           [553, '', 'temArtifa'],
                                                           [563, 'on', 't'],
                                                           [573, 'Game', ''],
                                                           [574, '', 'temArtifa'],
                                                           [584, 'on', 't'],
                                                           [589,
                                                            '',
                                                            "';\n"
                                                            'import PreparationMaterials from '
                                                            "'./PreparationMaterials.vue';\n"
                                                            "import './preparation-bench.css"],
                                                           [3750,
                                                            '',
                                                            'state="(!focus||focus.item)&&(focus?.item??model.pill)&&!game.core.inventory[(focus?.item??model.pill)!]?\'图谱 '
                                                            '· 未持有\':undefined" :'],
                                                           [4102,
                                                            '',
                                                            '>\n'
                                                            '<template v-if="focus?.item||!focus&&model.pill" '
                                                            '#artifact><span '
                                                            'class="preparation-target-art"><ItemArtifact '
                                                            ':item-id="(focus?.item??model.pill)!" '
                                                            ':owned="game.core.inventory[(focus?.item??model.pill)!]>0"/></span></template'],
                                                           [5471, 'div class="catalogue-grid p', 'P'],
                                                           [5482, '-', 'Materials :'],
                                                           [5498, '"><article v-for', ''],
                                                           [5500, 'need in ', ''],
                                                           [5515,
                                                            ':key="need.id??\'stones\'" '
                                                            ':data-testid="\'prepare-need-\'+(need.id??\'stones\')"><div><GameIcon '
                                                            'v-if="need.id" k',
                                                            '@'],
                                                           [5518,
                                                            'd="item" '
                                                            ':id="need.id"/><strong>{{need.label}}</strong><',
                                                            ''],
                                                           [5520, 'an>{{n', ''],
                                                           [5521,
                                                            'ed.have}} / '
                                                            "{{need.required}}</span></div><small>{{need.have>=need.required?'已经备齐':'尚缺 "
                                                            "'+(need.required-need.have)}}</small><button "
                                                            'v-if="need.have<need.required" @',
                                                            ''],
                                                           [5522, 'lick', 't'],
                                                           [5532, '(need.id,need.required)', ''],
                                                           [5533,
                                                            ' '
                                                            ':data-testid="\'prepare-source-\'+(need.id??\'stones\')">查看来源 '
                                                            '→<',
                                                            ''],
                                                           [5534, 'button></article></div', '']]},
           'web/src/GoalBoard.vue': {'before': 'goal-4/evidence/cend07-f04/before/web/src/GoalBoard.vue',
                                     'beforeBytes': 8480,
                                     'beforeSha256': 'f9c6164d41fca71125a3ae63b592a8cc3e1c036c6c0e8e47fc2547a1b721d70e',
                                     'bytes': 8458,
                                     'sha256': 'bc908d0ce123a15066f7950b77c1a09db67eda1592e3a50a1ff45cfbfd70a7fd',
                                     'operations': [[635, ' ', ''],
                                                    [753, '  ', ''],
                                                    [785, '   ', ''],
                                                    [899, '   ', ''],
                                                    [1186, '    ', ''],
                                                    [1235, '', '<slot name="artifact">'],
                                                    [1450, '    ', ''],
                                                    [1501, '    ', '</slot>\n'],
                                                    [1593, '   ', ''],
                                                    [1606, '   ', ''],
                                                    [1652, '   ', ''],
                                                    [1717, '   ', ''],
                                                    [1775, '   ', ''],
                                                    [1858, '  ', ''],
                                                    [1865, '  ', ''],
                                                    [1895, '   ', ''],
                                                    [1987, '   ', ''],
                                                    [2067, '   ', ''],
                                                    [2153, '  ', ''],
                                                    [2160, ' ', '']]}},
 'display': [{'path': 'web/src/PreparationMaterials.vue',
              'bytes': 1582,
              'sha256': '90d11d536fa62d004d51af35dd68a41bca6dbf56acaef53556de87d922326e62'},
             {'path': 'web/src/preparation-bench.css',
              'bytes': 4732,
              'sha256': '389800e4cc9b56d9e6519e23567b67641122177c7820a8af4173a6d2db294455'}],
 'groups': {'flow': {'ledger': 'art/redesign/playable-flow.json',
                     'ledgerSha256': 'd516844473a772bc1fdd2225a05c23a083d5a1a3145291f0d13c9beb4479d3b8',
                     'cap': 60000,
                     'files': ['web/src/action-timing.ts',
                               'web/src/ActionExecution.vue',
                               'web/src/play-flow.ts',
                               'web/src/CataloguePager.vue',
                               'web/src/PreparationPanel.vue',
                               'web/src/ExplorePanel.vue',
                               'web/src/GoodsPanel.vue',
                               'web/src/CultivationPanel.vue',
                               'web/src/play-flow.css']},
            'cultivation': {'ledger': 'art/redesign/cultivation-objects.json',
                            'ledgerSha256': '280f616867bc0f01262e68cfc7df1b14d647b215c652e690fc96b42dc367abeb',
                            'cap': 45000,
                            'files': ['web/src/CultivationStageHost.vue',
                                      'web/src/CultivationSite.vue',
                                      'web/src/MilestoneGate.vue',
                                      'web/src/GoalBoard.vue',
                                      'web/src/cultivation-effects.ts',
                                      'web/src/cultivation-objects.css',
                                      'web/src/milestone-objects.css']}},
 'reusedAssets': [{'path': 'web/public/art/v2/items/ascension_seal-v1.webp',
                   'bytes': 26514,
                   'sha256': 'e3d81134f7a6bf663fda8d653beb1553429a5f514a882cc2137a760fc60d1885'},
                  {'path': 'web/public/art/v2/items/core-v1.webp',
                   'bytes': 48484,
                   'sha256': 'cac701143dda662cda3e218c53d5daf2ff043228e1afc0aea6dc83a503b9eedf'},
                  {'path': 'web/public/art/v2/items/dao-v1.webp',
                   'bytes': 42156,
                   'sha256': 'a7bf3830b88190ee674685ee092106731f20e172a5b5b4eab8dfda94ef673e3a'},
                  {'path': 'web/public/art/v2/items/dew-v1.webp',
                   'bytes': 31894,
                   'sha256': '9fd9a56e6a407fd39587676313dec3562524dc767d14a026f5aadfa727938c25'},
                  {'path': 'web/public/art/v2/items/foundation_pill-v1.webp',
                   'bytes': 33140,
                   'sha256': 'db5c298534d4bd55fdc42b64bb16a330d07cd52ea08167b1a32f09bb5950de2e'},
                  {'path': 'web/public/art/v2/items/golden_pill-v1.webp',
                   'bytes': 34612,
                   'sha256': 'eeedde783c0b5851146972c5cf13f87a33026f100e4a4c60128ce4d25bd13e62'},
                  {'path': 'web/public/art/v2/items/healing_pill-v1.webp',
                   'bytes': 25168,
                   'sha256': 'f6114f224f6a136f020f179eb7995058f1cdee72dcac8a9ce9bdf57bb69059d9'},
                  {'path': 'web/public/art/v2/items/herb-v1.webp',
                   'bytes': 59714,
                   'sha256': '4289eafba0f0d726051d47594dc6268a0bc493f9403799d59f70e76ad173a4b0'},
                  {'path': 'web/public/art/v2/items/jade-v1.webp',
                   'bytes': 62058,
                   'sha256': 'fa6b37a3b23c402adc7d5a714e929bba55336baaaf056978831fb5c65694119b'},
                  {'path': 'web/public/art/v2/items/lotus-v1.webp',
                   'bytes': 38208,
                   'sha256': 'e10f4caef6b351b6995523ec2a30e5bd615e3ffdb9859be773848a7282d796b6'},
                  {'path': 'web/public/art/v2/items/nascent_pill-v1.webp',
                   'bytes': 36040,
                   'sha256': '37a62d61299c641d9849a819494a4d54b9a0bc09bff249716fb4c9a115483e03'},
                  {'path': 'web/public/art/v2/items/soul-v1.webp',
                   'bytes': 50648,
                   'sha256': 'ebdff7f234e55907683b058450c20f897b3091df710e1b6f9a3c3e9cf3677337'},
                  {'path': 'web/public/art/v2/items/spirit_pill-v1.webp',
                   'bytes': 24492,
                   'sha256': '1ab2931f9c4202b283dbe95afa8b7fe61b5c33156faeb3d8ca9add2927b487b4'},
                  {'path': 'web/public/art/v2/items/spirit_seed-v1.webp',
                   'bytes': 33160,
                   'sha256': 'd1934ce9d1f018d866b03671666541f3406d64a10aa8c2ea6950481e3afc5e4f'}],
 'reusedItemArtifactSha256': 'b651e6b9bc5675ca1ccaecc08d62f5c45ef8d70ae6915bae8b75b507a17328b0',
 'sourceReferences': ['docs/decisions/0130-preparation-bench-cend07-f04.md',
                      'goal-4/amendments/2026-11-07-cend07-f04-input.md',
                      'goal-4/research/cend07-f04-sources.json']}
MARKERS={'PreparationPanel.vue':b'PreparationMaterials','GoalBoard.vue':b'<slot name="artifact">'}
def prior_preparation_bench_bytes(path,raw):
 raw=prior_three_check_bytes(path,raw)
 name=Path(path).name;rows=[r for n,r in MANIFEST['files'].items()if Path(n).name==name]
 if not rows:return raw
 row=rows[0]
 if hashlib.sha256(raw).hexdigest()==row['beforeSha256']:return raw
 if MARKERS[name]not in raw:return raw
 assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'PB04 complete current source'
 text=raw.decode()
 for at,before,after in reversed(row['operations']):
  assert text[at:at+len(after)]==after,'PB04 exact display span';text=text[:at]+before+text[at+len(after):]
 assert hashlib.sha256(text.encode()).hexdigest()==row['beforeSha256'],'PB04 complete original source'
 return text.encode()
def validate_preparation_bench(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'PB04 missing local source';return p
 if not(root/LEDGER).exists():
  assert not any((root/r['path']).exists()for r in MANIFEST['display']),'PB04 missing ledger';return set(),0
 m=json.loads(local(LEDGER).read_text());assert m==MANIFEST and all(type(m[k])is int for k in ['version','newRasterAssets','maxDisplayBytes'])and m['userAcceptance']is False,'PB04 immutable scope/caps'
 for n,row in MANIFEST['files'].items():
  try:raw=prior_three_check_bytes(n,local(n).read_bytes())
  except AssertionError as error:raise AssertionError('PB04 current source: '+str(error))from error
  old=local(row['before']).read_bytes();assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'PB04 current source';assert len(old)==row['beforeBytes']and hashlib.sha256(old).hexdigest()==row['beforeSha256'],'PB04 original source';assert prior_preparation_bench_bytes(n,raw)==old,'PB04 full inverse'
  assert re.findall(rb'<style.*?</style>',raw,re.S)==re.findall(rb'<style.*?</style>',old,re.S),'PB04 original component styles'
  current=raw.split(b'</script>')[0];prior=old.split(b'</script>')[0]
  if n.endswith('PreparationPanel.vue'):
   current=re.sub(rb'^import [^\n]*\n',b'',current,flags=re.M);prior=re.sub(rb'^import [^\n]*\n',b'',prior,flags=re.M)
  assert current==prior,'PB04 original authority'
 total=0
 for row in MANIFEST['display']+MANIFEST['reusedAssets']:
  try:raw=prior_three_check_bytes(row['path'],local(row['path']).read_bytes())
  except AssertionError as error:raise AssertionError('PB04 display/asset identity: '+str(error))from error
  assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'PB04 display/asset identity'
  if row in MANIFEST['display']:total+=len(raw)
 assert total<=12000,'PB04 new display cap'
 assert hashlib.sha256(local('web/src/ItemArtifact.vue').read_bytes()).hexdigest()==MANIFEST['reusedItemArtifactSha256'],'PB04 original artifact owner'
 for g in MANIFEST['groups'].values():
  assert hashlib.sha256(local(g['ledger']).read_bytes()).hexdigest()==g['ledgerSha256'],'PB04 original ledger';assert sum(local(n).stat().st_size for n in g['files'])<=g['cap'],'PB04 actual regional cap'
 assert local('web/src/GoalPanel.vue').stat().st_size<=19000,'PB04 original goal cap'
 display=prior_three_check_bytes(MANIFEST['display'][0]['path'],local(MANIFEST['display'][0]['path']).read_bytes()).decode();css=prior_three_check_bytes(MANIFEST['display'][1]['path'],local(MANIFEST['display'][1]['path']).read_bytes()).decode()
 assert not re.search(r'useGame|indexedDB|localStorage|fetch\s*\(|setTimeout|setInterval|requestAnimationFrame|v-html|\beval\s*\(',display),'PB04 display acquired authority/clock'
 assert not re.search(r'@import|https?://|url\s*\(',css),'PB04 external CSS'
 assert all(x in display for x in ["emit('inspect',need.id,need.required)",':owned="need.have>0"',"need.have>=need.required"]),'PB04 actual material interaction'
 for n in MANIFEST['sourceReferences']:local(n)
 return {LEDGER,*MANIFEST['files'],*[r['before']for r in MANIFEST['files'].values()],*[r['path']for r in MANIFEST['display']+MANIFEST['reusedAssets']],*MANIFEST['sourceReferences']},total
