"""Exact relic hierarchy, actual ownership and original forge/save authority."""
import hashlib,json,re
from pathlib import Path
LEDGER="art/redesign/cend07-f02b.json"
MANIFEST={'format': 'chenyuan-cend07-f02b-relic-focus',
 'version': 1,
 'userAcceptance': False,
 'newRasterAssets': 0,
 'maxNativeDeltaBytes': 0,
 'files': {'web/src/RelicAtelier.vue': {'before': 'goal-4/evidence/cend07-f02b/before/web/src/RelicAtelier.vue',
                                        'beforeBytes': 16052,
                                        'beforeSha256': '3e9260aed7c6050d220faf3ba8256d0b5f595f2a5418f732e4014d9cff64e5f2',
                                        'bytes': 16052,
                                        'sha256': '237bb209544cf0e3c40e91fa84fddf307daa11e350c8be55a2b5165fd4134170',
                                        'operations': [[3014,
                                                        "owned.value?'器纹已凝':activity.value?.status==='stopped'?",
                                                        ''],
                                                       [3020, "':'待铸造", ''],
                                                       [6120, ' ', ''],
                                                       [6305, '  ', ''],
                                                       [6493, '\n  ', ''],
                                                       [6604, 'small', 'button'],
                                                       [6611, 'v-if', ':style'],
                                                       [6624, '">择器只查看 · 炼成后另行比较认主</s', "&&'"],
                                                       [6629, '', 'rgin-'],
                                                       [6635, 'l><b', 'eft:a'],
                                                       [6642, 't', ''],
                                                       [6643, 'n', '\'"'],
                                                       [7091, '\n  ', ''],
                                                       [7114, '\n   ', ''],
                                                       [7146, '\n    ', ''],
                                                       [7581, '', ' v-if="!owned"'],
                                                       [8483, '\n    ', ''],
                                                       [8594,
                                                        '',
                                                        ' '
                                                        'v-if="state!==\'idle\'||!owned&&activity?.status===\'stopped\'"'],
                                                       [8975,
                                                        '',
                                                        'component :is="owned?\'details\':\'div\'"><summary '
                                                        'v-if="owned" '
                                                        'style="min-height:44px;font-size:18px">铸造资料</summary><'],
                                                       [9219, '', '/component><'],
                                                       [9234, '', ' v-if="!bound&&currentRelic"'],
                                                       [9321, '实际', '当前'],
                                                       [9343, "bound?'当前本命即此器':", ''],
                                                       [9355, '?', ''],
                                                       [9360, "??'尚未装备'", ''],
                                                       [9373, ' v-if="!bound"', ''],
                                                       [9388, '?', ''],
                                                       [9400, "??'铸成只获得器物，不自动认主。'", ''],
                                                       [9423, '   ', ''],
                                                       [9429, '\n   ', ''],
                                                       [9804, '    ', ''],
                                                       [9967, '    ', ''],
                                                       [10161, '    ', ''],
                                                       [10474, '    ', ''],
                                                       [10826, '    ', ''],
                                                       [10832,
                                                        '',
                                                        ' v-if="!owned||conflict||!bound&&equipment?.failure"'],
                                                       [11052, '\n  ', ''],
                                                       [11063, '\n  ', ''],
                                                       [12258, '  ', ''],
                                                       [12625, '   ', ''],
                                                       [13621, '   ', ''],
                                                       [14630, '  ', ''],
                                                       [14640, ' ', '']]}},
 'groups': {'art03': {'ledger': 'art/redesign/art03.json',
                      'ledgerSha256': 'a2a078e6ee338a17286a6c159767334f26a2698cd5848767932993ad7f124cef',
                      'cap': 45000,
                      'files': ['web/src/JadeStudyScene.vue',
                                'web/src/RelicAtelier.vue',
                                'web/src/LoadoutConstellation.vue',
                                'web/src/equipment-effects.ts',
                                'web/src/art03-equipment.css']},
            'art10': {'ledger': 'art/redesign/art10.json',
                      'ledgerSha256': '8cd48a189b340271c3c9321c48804c47a2d0c110573ddb8e25cdb7b74b06b121',
                      'cap': 12000,
                      'files': ['web/src/art10-equipment.css']},
            'ta09': {'ledger': 'art/redesign/ta09.json',
                     'ledgerSha256': 'b52562bd4fc17b77cf00a171beec5624361a7c0ba1bb13160220299b2cfca76d',
                     'cap': 30000,
                     'files': ['web/src/JadeEngraving.vue',
                               'web/src/StudyQueueRail.vue',
                               'web/src/RelicInscription.vue',
                               'web/src/equipment-choreography.ts',
                               'web/src/ta09-equipment.css']},
            'idle-production': {'ledger': 'art/redesign/idle-production.json',
                                'ledgerSha256': 'c14fcd8b33061ef85369511ad7e765462c60ebb15f56b37f07bd2a307580b569',
                                'cap': 26000,
                                'files': ['web/src/ProductionPlanner.vue',
                                          'web/src/idle-production.css',
                                          'web/src/activity-view.ts']}},
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
               'web/src/AdventurePlanner.vue': '101d7ff094c31c600c8bab8b03601ebf11feffc03e260eab4064c2f6a80e9e1a',
               'web/src/focus.ts': '8ae91e78a4db7a854c293fc4b1bc28f02dd0d542b3119cff383f9245b4944eea',
               'web/src/RelicInscription.vue': 'b85438dafb0f5a3139cefdb6586d7f224ba5f04fc32710958c3517966caae789',
               'web/src/EquipmentPanel.vue': 'd831e2b08bd70f8ed9fd0480b14be62c0b66e04b6e446916f07dc82d838abedd',
               'web/src/ProductionPlanner.vue': '6ebbc6551f6c68605b4e634196579787bf50e91d71d8fa84938bcc8cb9f1306b',
               'web/src/art03-equipment.css': '040f879e7b73de6df289373f8e68ddf698f12f22787c4200c356b3dbdbecbe17',
               'web/src/art10-equipment.css': 'd7dcafbfed487c825c607812a9a3d04be600f5d49e62c5add44f9464d83ce627',
               'web/src/ta09-equipment.css': 'de13ed9cc306774407d7ee97efcc122ba24ed3c2cf64a99580d1782ed557b607',
               'web/src/AssetImage.vue': 'ecfc476d074c16c14b181abbf62863ebc6d5c014d9473d3118e761433115a8da'},
 'sourceReferences': ['docs/decisions/0133-relic-stage-cend07-f02b.md',
                      'goal-4/amendments/2026-11-08-cend07-f02b-input.md',
                      'goal-4/research/cend07-f02b-sources.json']} 
MARKER='铸造资料'.encode()
def prior_relic_focus_bytes(path,raw):
 if Path(path).name!='RelicAtelier.vue':return raw
 row=MANIFEST['files']['web/src/RelicAtelier.vue']
 if hashlib.sha256(raw).hexdigest()==row['beforeSha256']or MARKER not in raw:return raw
 assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'RF02 complete current source'
 text=raw.decode()
 for at,before,after in reversed(row['operations']):
  assert text[at:at+len(after)]==after,'RF02 exact display span';text=text[:at]+before+text[at+len(after):]
 assert hashlib.sha256(text.encode()).hexdigest()==row['beforeSha256'],'RF02 complete original source'
 return text.encode()
def validate_relic_focus(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'RF02 missing local source';return p
 if not(root/LEDGER).exists():
  assert not(root/'web/src/RelicAtelier.vue').exists()or MARKER not in(root/'web/src/RelicAtelier.vue').read_bytes(),'RF02 missing ledger';return set(),0
 m=json.loads(local(LEDGER).read_text());assert m==MANIFEST and all(type(m[k])is int for k in ['version','newRasterAssets','maxNativeDeltaBytes'])and m['userAcceptance']is False,'RF02 immutable scope/caps'
 delta=0
 for n,row in MANIFEST['files'].items():
  raw=local(n).read_bytes();old=local(row['before']).read_bytes();assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'RF02 current source';assert len(old)==row['beforeBytes']and hashlib.sha256(old).hexdigest()==row['beforeSha256'],'RF02 original source';assert prior_relic_focus_bytes(n,raw)==old,'RF02 full inverse';delta+=len(raw)-len(old)
  script=raw.split(b'</script>')[0].decode();original=old.split(b'</script>')[0].decode();assert script.replace("idle:'安排已停止'","idle:owned.value?'器纹已凝':activity.value?.status==='stopped'?'安排已停止':'待铸造'",1)==original,'RF02 original controller clock and save authority'
  assert re.findall(rb'@[\w:.-]+="[^"]*"',raw)==re.findall(rb'@[\w:.-]+="[^"]*"',old),'RF02 original complete view/writing callbacks'
 assert delta<=0,'RF02 actual native delta cap'
 for g in MANIFEST['groups'].values():
  assert hashlib.sha256(local(g['ledger']).read_bytes()).hexdigest()==g['ledgerSha256'],'RF02 original regional ledger'
  assert sum(local(n).stat().st_size for n in g['files'])<=g['cap'],'RF02 actual original regional cap'
 for n,h in MANIFEST['authority'].items():assert hashlib.sha256(local(n).read_bytes()).hexdigest()==h,'RF02 original Game control or rendering source'
 for n in MANIFEST['sourceReferences']:local(n)
 text=local('web/src/RelicAtelier.vue').read_text()
 for token in ['<div v-if="!owned" class="relic-material-slots"','<component :is="owned?\'details\':\'div\'">','<summary v-if="owned" style="min-height:44px;font-size:18px">铸造资料</summary>','<div v-if="!bound&&currentRelic"','v-if="state!==\'idle\'||!owned&&activity?.status===\'stopped\'"']:
  assert token in text,'RF02 actual ownership and disclosure binding'
 return {LEDGER,*MANIFEST['files'],*[row['before']for row in MANIFEST['files'].values()],*MANIFEST['sourceReferences'],*MANIFEST['authority']},delta
