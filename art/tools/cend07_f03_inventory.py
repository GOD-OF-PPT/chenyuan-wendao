from cend11_mainline_inventory import prior_mainline_hud_bytes
"""Exact painted travel presentation; original timing/authority/asset ledger intact."""
import hashlib,json,re
from pathlib import Path
LEDGER='art/redesign/cend07-f03.json'
MANIFEST={'format': 'chenyuan-cend07-f03-painted-travel',
 'version': 1,
 'userAcceptance': False,
 'newRasterAssets': 0,
 'maxNativeBytes': 8500,
 'maxUncommittedProgress': 0.94,
 'files': {'web/src/TravelPassage.vue': {'before': 'goal-4/evidence/cend07-f03/before/web/src/TravelPassage.vue',
                                         'beforeBytes': 4209,
                                         'beforeSha256': '3a9c8b2e671e82e58d60135fa253fd1bb7174a39f9ac629d2957ff2873e53f71',
                                         'bytes': 4419,
                                         'sha256': 'a9e59c40a77e8c9ca51f90239726970c3bcfccb289a0c024db7c2225fb74832f',
                                         'operations': [[355, '', "';\nimport AssetImage from './AssetImage.vue"],
                                                        [3255, 's', 'di'],
                                                        [3258, 'g', ''],
                                                        [3341,
                                                         '',
                                                         'aria-hidden="true"><AssetImage '
                                                         'path="art/v2/actors/player-loadout-idle-v1.webp" '
                                                         'asset-id="travel-player-cold" fit="contain" eager><svg '
                                                         'class="travel-passage-fallback" '],
                                                        [3527, '" aria-hidden="true', ''],
                                                        [3855, '', '></AssetImage></div']]},
           'web/src/travel-passage.css': {'before': 'goal-4/evidence/cend07-f03/before/web/src/travel-passage.css',
                                          'beforeBytes': 3714,
                                          'beforeSha256': '3d8e598154392104a1f2e197a675f03f1e50564decaa28abeed4ee721d506b46',
                                          'bytes': 4076,
                                          'sha256': 'cfa3426dc778aa81a910fe22daf05f9a979135fc257f831878d268869da0f173',
                                          'operations': [[475, '112', '60'],
                                                         [561, '8', '2'],
                                                         [565, '24px', '0'],
                                                         [578, 'li', 'no'],
                                                         [582, 'ar-gradient(110deg,#102e33ec,#102c30a6)', ''],
                                                         [589, '-left', ''],
                                                         [590, '1px solid #93b29b99', '0'],
                                                         [774,
                                                          '',
                                                          ';padding:8px '
                                                          '12px;background:linear-gradient(90deg,#102e33e8,#102e33c9)'],
                                                         [956, '', ';text-align:left'],
                                                         [1086, '', ';text-align:left'],
                                                         [1372, '-bottom', ''],
                                                         [1376, '', ' 12px;background:#102e33c9'],
                                                         [1688, '5', '9'],
                                                         [1719,
                                                          '',
                                                          ';background:radial-gradient(ellipse at 50% '
                                                          '65%,#09252b88,transparent 70%)'],
                                                         [1909, '2', '1.5'],
                                                         [2376, '', ';background:#102e33c9;padding:0 4px'],
                                                         [2465, '64', '120'],
                                                         [2482, '96', '180'],
                                                         [2650,
                                                          '',
                                                          '}\n'
                                                          '#app '
                                                          '.travel-passage-walker>.asset-image,.travel-passage-fallback{width:100%;height:100%;background:none'],
                                                         [3084, '-top', ''],
                                                         [3088,
                                                          '',
                                                          ' '
                                                          '12px;background:linear-gradient(90deg,#102e33e8,#102e33c9)'],
                                                         [3678, ' ', '>.asset-ima'],
                                                         [3690, '', 'e[data-art-state=ready]']]}},
 'reused': [{'path': 'web/public/art/v2/actors/player-loadout-idle-v1.webp',
             'bytes': 83104,
             'sha256': '8d07006f041943a73e9cd9e32fea87a921d0c508cff6fb0cc922a34c7a10ad90'},
            {'path': 'art/production/art26/player-loadout-idle-v1.png',
             'bytes': 2440466,
             'sha256': '662372d16decd1e4286d4a0df9ab920f42074f3afc73f7723ea439df70ab3e2e'},
            {'path': 'art/production/art26/player-loadout-idle-audit.json',
             'bytes': 2344,
             'sha256': '96dbe489167eeb322836d6c34b267ebac96a410ebb5e871bf5ae63c6c0e7afeb'},
            {'path': 'art/production/art26/player-loadout-idle-v1-prompt.json',
             'bytes': 2147,
             'sha256': 'b055edfaf06c4272fb3ec3e1e07e72f6409ad6ced97a9594498aa1a8a871ccb2'},
            {'path': 'art/production/art26/player-loadout-idle-cutout-prompt.json',
             'bytes': 1476,
             'sha256': 'ac95c0f827781846614b49da18891ba0d5a66ffc1e3486e7e1253f8146f46d23'},
            {'path': 'web/src/AssetImage.vue',
             'bytes': 1865,
             'sha256': 'ecfc476d074c16c14b181abbf62863ebc6d5c014d9473d3118e761433115a8da'}],
 'authority': {'src/full/preparation.ts': '3f62889885fa24b74d3c06c2c906462697d1072d846ae2959b427b7c512fa25a',
               'src/full/story-context.ts': '9a4106925e7b798e7549b1062a21a74c6c08ba050971a33f95ba315ee0f79950',
               'src/full/mechanisms.ts': '5a256eb552f25ce726b1107f29cd5010e3eb87bd060e06ab95ecd6cf6369b221',
               'src/full/economy-ledger.ts': '9c6bb6c70c0958a78eac8293d0f793754486c6be74c1aa9a39ff8c5f922816b0',
               'src/full/versions.ts': '10fb7ed2b9930bd064e876a87c3b3c0c6bdd6a5c4e8f2d3e3270ff3037584e64',
               'src/full/errors.ts': 'ce2c7107d702a1b2e477edaa7d01d93c1a22e53d2859b5da31335bf67a961bd4',
               'src/full/queries.ts': 'eab721ecd066440d8babe11f36664300d21df2d1cf15f10d1160c7cb2a880d48',
               'src/full/contracts.ts': '24ce86f2158312db2c9bf46d9479f67ebefcd435296c945807b7e356128541aa',
               'src/full/costs.ts': '71075aa81f7b27cc3d0bbcfe4a3a3b681532d0cdad98e4ebfc105fceb0aaf8bb',
               'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73',
               'src/full/content.ts': 'e5602fa6c0ccac95372d5f668a3234d7d6054ea5f3a4b36d72798f1b9e40878c',
               'src/full/ascension.ts': '39654a2a6f19a43cf99f3429a5cb62ba950296d5a02485eb41e1d3a7ace9132a',
               'src/full/types.ts': 'be3db5f0a91ac3ced01315643400ab23de14fbe19ca003f6126f0c834397a064',
               'src/full/growth.ts': '42076ba5b572e519d64c3d85b570b223d36af1dac8510f4dedc928e137beaf26',
               'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815',
               'src/full/adventure.ts': '8693c958f984b4b03043df5b83518323358fd7e033779f4711f4d766046b8015',
               'src/full/events.ts': 'bc4d14b95708bd9cbd4c6154484f1537490ce3dd9adfd580fd6cf65cca87a41d',
               'src/full/milestones.ts': 'e91f58cf0002945f679649964b5a70e7226e0890b623719b24df2c02bac09492',
               'src/full/life-record.ts': '02c8acc2908257ee01b73b3c5b715600491364fb40c2bb9bd919d6b6c1b61ba7',
               'src/full/goals.ts': '10dc1cc0f88889fad39afff762811502f004af3e478a331e1ed4908b6c73e883',
               'src/full/validate-content.ts': '72bd297d0f44036ba0b0b84d587f00a11d6b14b8fd2656f0381681d9fefb02d1',
               'src/full/receipts.ts': '185597443e21bf88949232a97afa426410b0dcc8ce8e07cf240a08af0f2dd0ae',
               'src/full/trial-rules.ts': '5db194881d1a98cf5582ed84af4f46ffa2b7802fed2f437febbbf8e26f745c53',
               'src/full/progression.ts': '8c81eecb1e406a7c004d308bf0e9be2e2e32fddeecafa8b5913e459c61e34406',
               'src/full/configuration.ts': 'ca9880f727c5798a55d4a8590c57c1fbe5ba71ef0e6cfb0c59fdebfb86205520',
               'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7',
               'web/src/activity-clock.ts': '21fc98e4a430464a6dc3554091c022c53b17714938ae6e05491d27e1ab3f0901',
               'web/src/activity-persistence.ts': 'a5100e6f2d84b627ef17800bfc8f17f3f533566db47f35faab3833da66bab4cf',
               'web/src/configuration-persistence.ts': 'a78887adcb6a622a9904a8db070aa9b9fea873ccab1282769660885079696c00',
               'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21',
               'web/src/equipment-effects.ts': '0946c3b6b76e5ea39ebd80571175e2835ce49abe94fe6499f480b1635a934888',
               'web/src/equipment-choreography.ts': '871e41e7555f640fecbc8f26706fac34a5249225a6acb5f1db9c63789a8011bb',
               'web/src/use-activity-effect.ts': 'e15a7b41b897e7d4f29e8be277703efd1f8c32d2dec11d278a41a37c89425163',
               'web/src/activity-view.ts': '166671b5bc26461fcea557d41c12fd1ed89e900458702f298cb6507e92866b05',
               'web/src/StudyQueueRail.vue': '2ee9119806fa68b31c97c28d754fe2589981ad58b832a8c1f43287e955c13997',
               'web/src/App.vue': 'daeff1fbef8791ec6558150c189e41324c6f3db2ec1d3518b74899c605d8ff47',
               'web/src/ScenePanel.vue': 'f2043fefced6a9eec9407cbe794e3abb331297c8574f5f257ea53897d532d4d2',
               'web/src/JourneyMap.vue': 'a598cfa4f6279a4a7f98aeec78fe018fa5a13ed2964531b53ded0727b880840e',
               'web/src/AdventurePlanner.vue': '101d7ff094c31c600c8bab8b03601ebf11feffc03e260eab4064c2f6a80e9e1a'},
 'legacyLedger': 'art/redesign/cend06-f02b.json',
 'legacyLedgerSha256': '03c3703d1febe042dff685bd0371f1eb23f7ce8431944e85af55856cc274b8f5',
 'sourceReferences': ['docs/decisions/0131-travel-painted-actor-cend07-f03.md',
                      'goal-4/amendments/2026-11-07-cend07-f03-input.md',
                      'goal-4/research/cend07-f03-sources.json']}
MARKERS={'TravelPassage.vue':b'travel-player-cold','travel-passage.css':b'travel-passage-fallback'}
def prior_painted_travel_bytes(path,raw):
 name=Path(path).name;rows=[r for n,r in MANIFEST['files'].items()if Path(n).name==name]
 if not rows:return raw
 row=rows[0]
 if hashlib.sha256(raw).hexdigest()==row['beforeSha256']:return raw
 if MARKERS[name]not in raw:return raw
 assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'TP03 complete current source'
 text=raw.decode()
 for at,before,after in reversed(row['operations']):
  assert text[at:at+len(after)]==after,'TP03 exact display span';text=text[:at]+before+text[at+len(after):]
 assert hashlib.sha256(text.encode()).hexdigest()==row['beforeSha256'],'TP03 complete original source'
 return text.encode()
def validate_painted_travel(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'TP03 missing local source';return p
 if not(root/LEDGER).exists():
  assert not any((root/n).exists()and MARKERS[Path(n).name]in(root/n).read_bytes()for n in MANIFEST['files']),'TP03 missing ledger';return set(),0
 m=json.loads(local(LEDGER).read_text());assert m==MANIFEST and all(type(m[k])is int for k in ['version','newRasterAssets','maxNativeBytes'])and m['userAcceptance']is False,'TP03 immutable scope/caps'
 total=0
 for n,row in MANIFEST['files'].items():
  raw=local(n).read_bytes();old=local(row['before']).read_bytes();assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'TP03 current source';assert len(old)==row['beforeBytes']and hashlib.sha256(old).hexdigest()==row['beforeSha256'],'TP03 original source';assert prior_painted_travel_bytes(n,raw)==old,'TP03 full inverse';total+=len(raw)
  if n.endswith('.vue'):
   assert raw.split(b'</script>')[0].replace(b"import AssetImage from './AssetImage.vue';\n",b'')==old.split(b'</script>')[0],'TP03 original timing and ownership';assert re.findall(rb'@[\w:.-]+="[^"]*"',raw)==re.findall(rb'@[\w:.-]+="[^"]*"',old),'TP03 original inspect callback'
  else:assert raw[raw.index(b'@media'):]==old[old.index(b'@media'):],'TP03 original effect preferences'
 assert total<=8500,'TP03 actual native cap'
 for row in MANIFEST['reused']:
  raw=local(row['path']).read_bytes();assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'TP03 original raster/provenance/widget'
 for n,h in MANIFEST['authority'].items():assert hashlib.sha256(prior_mainline_hud_bytes(n,local(n).read_bytes())).hexdigest()==h,'TP03 original Game or controller'
 assert hashlib.sha256(local(MANIFEST['legacyLedger']).read_bytes()).hexdigest()==MANIFEST['legacyLedgerSha256'],'TP03 original ledger/caps'
 s=local('web/src/TravelPassage.vue').read_text();css=local('web/src/travel-passage.css').read_text()
 assert not re.search(r'\b(?:setTimeout|setInterval|requestAnimationFrame|Date|performance|fetch|indexedDB|localStorage|resolve|startPlannedActivity|pauseCultivation|resumeCultivation)\b|v-html|eval\s*\(',s),'TP03 acquired clock IO writing'
 assert 'art/v2/actors/player-loadout-idle-v1.webp'in s and "Math.min(.94"in s and 'activityLocal'in s and 'generation'in s,'TP03 actual painted/current owner bindings'
 assert not re.search(r'@import|https?://|url\s*\(',css),'TP03 external CSS'
 for n in MANIFEST['sourceReferences']:local(n)
 return {LEDGER,*MANIFEST['files'],*[r['before']for r in MANIFEST['files'].values()],*[r['path']for r in MANIFEST['reused']],*MANIFEST['authority'],*MANIFEST['sourceReferences']},total
