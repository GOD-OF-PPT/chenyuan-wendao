from cend08_f03_inventory import prior_source_material_bytes
"""Exact source activity/draft hierarchy; original authorization and timing kept."""
import hashlib,json,re
from pathlib import Path
LEDGER='art/redesign/cend07-f02c.json'
MANIFEST={'format': 'chenyuan-cend07-f02c-source-intent',
 'version': 1,
 'userAcceptance': False,
 'newRasterAssets': 0,
 'maxNativeDeltaBytes': 2200,
 'maxScopedCSSBytes': 240,
 'files': {'web/src/SourcePlanner.vue': {'before': 'goal-4/evidence/cend07-f02c/before/web/src/SourcePlanner.vue',
                                         'beforeBytes': 8460,
                                         'beforeSha256': '8dafd06a0827172d18518ef41d68de7293d0e381205d51d8533819cd51ca60ac',
                                         'bytes': 9726,
                                         'sha256': 'ea42a57110db234205d8ef8f1d46f4969802a7757ed16ede9d0ff3e33e3b9e72',
                                         'operations': [[4355,
                                                         '',
                                                         'const currentActivity=computed(()=>{const '
                                                         'a=props.activity===undefined?scene?.activity:props.activity;return '
                                                         "a&&a.runId===props.game.core.runId&&a.status!=='stopped'?a:null;});\n"
                                                         'const localClock=computed(()=>{const '
                                                         'a=currentActivity.value,r=props.runtime===undefined?scene?.activityRuntime:props.runtime;return '
                                                         'a&&r&&r.id===a.id&&r.generation===a.generation?r:null;});\n'
                                                         'const '
                                                         "actionLabel=computed(()=>scene?.unresolved?(scene.syncIssue?'先重新读取进度':'先处理本次存档'):scene?.activityPausing?'正在停手 "
                                                         "· 保存后暂停':props.busy?'处理中 · "
                                                         "暂不新安排':props.running?(!localClock.value?'本页待接续 · "
                                                         "上方继续':currentActivity.value?.version===2&&currentActivity.value.plan.sourceId===selectedId.value?'本段进行中 "
                                                         "· 上方暂停':'其他活动进行中 · "
                                                         "上方暂停'):(currentActivity.value?'新安排':props.savedPlan?'重新安排':'安排')+(source.value?.name??''));\n"],
                                                        [5732, 'r', 'c'],
                                                        [5734, '', 'rre'],
                                                        [5738, 'n', 'tAct'],
                                                        [5743, 'ng', 'vity'],
                                                        [5968, 'r', 'c'],
                                                        [5970, '', 'rre'],
                                                        [5974, 'n', 'tAct'],
                                                        [5979, 'ng', 'vity'],
                                                        [5985, '当前执行以已保存活动条为准', '原安排与暂停／继续见上方'],
                                                        [6580, 'primary ', ''],
                                                        [6592,
                                                         '',
                                                         '" '
                                                         ':class="currentActivity||busy||!available||scene?.unresolved?\'text-button\':\'primary\''],
                                                        [6811,
                                                         "scene?.unresolved?(scene.syncIssue?'先重新读取进度':'先处理本次存档'):running?'已有活动进行中，请先暂停':(s",
                                                         ''],
                                                        [6812, "vedPlan?'重新安排':'安排')+sour", ''],
                                                        [6813, 'e.', 'tio'],
                                                        [6817, '', 'L'],
                                                        [6819, 'm', 'b'],
                                                        [6821, '', 'l'],
                                                        [6947,
                                                         '',
                                                         "。':scene?.activityPausing?'正在核对本轮结算，稍候再安排。':currentActivity?running?localClock?'先在上方暂停，再执行下次安排。':'上方继续接续原安排；草案不会自动执行。':'上方继续沿用原额度；新安排按草案授权"],
                                                        [7449, 'r', 'c'],
                                                        [7451, '', 'rre'],
                                                        [7455, 'n', 'tAct'],
                                                        [7460, 'ng', 'vity'],
                                                        [8743,
                                                         '',
                                                         '\n'
                                                         '<style scoped>\n'
                                                         '#app '
                                                         '.source-start.text-button{background:transparent!important;box-shadow:none!important;transition:none!important}\n'
                                                         '</style>\n']]}},
 'groups': {'idle-sources': {'ledger': 'art/redesign/idle-sources.json',
                             'ledgerSha256': '8933162178a3c16c0af38cb50487a265b6d692d0bc1e53837b7a7032c1d76131',
                             'cap': 24000,
                             'files': ['web/src/SourcePlanner.vue', 'web/src/idle-sources.css']},
            'art02': {'ledger': 'art/redesign/art02.json',
                      'ledgerSha256': '697f41e90df96108c1e1d330d511bc91b019aa36f1e1124a152f91d1946a6e9c',
                      'cap': 45000,
                      'files': ['web/src/SourceField.vue',
                                'web/src/JourneyMap.vue',
                                'web/src/BattlePresence.vue',
                                'web/src/BattleDeck.vue',
                                'web/src/activity-effects.ts',
                                'web/src/use-activity-effect.ts',
                                'web/src/art02-source.css',
                                'web/src/art02-journey.css',
                                'web/src/art02-battle.css']},
            'ta08': {'ledger': 'art/redesign/ta08.json',
                     'ledgerSha256': '3dacde3abdbbc6f2476213ed353bd89b5c9ddaab6b9d656f0d4e316a5270db37',
                     'cap': 42000,
                     'files': ['web/src/SourceObject.vue',
                               'web/src/SourceCommission.vue',
                               'web/src/SourceSatchel.vue',
                               'web/src/source-choreography.ts',
                               'web/src/ta08-source.css']}},
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
               'web/src/AssetImage.vue': 'ecfc476d074c16c14b181abbf62863ebc6d5c014d9473d3118e761433115a8da',
               'web/src/SourceField.vue': '0f3a665944b28a27d52843c6bbe6e05925b3e9a5aaad8e859459fa69091c36be',
               'web/src/TrainingActivity.vue': '601e58f6b9edc237031d77337e527e529ac4d619447980bf9e5cddb0b700e4d3',
               'web/src/ExplorePanel.vue': 'a8cc8ed9be8c9a7f57bb919978b2e5566f069e057a6304901269a66b589f78d1',
               'web/src/SourceObject.vue': 'fd8b7bc3062c935e7fce82214ceb0aa09b5cc6df49e5bd38a3f710bc3e450752',
               'web/src/SourceCommission.vue': '9d385a237a24f51277fa8dae9dd4c7cb7e81c563923370066c89efeea0702314',
               'web/src/SourceSatchel.vue': 'f28a144f928cd9358df91e600118fcb19aaef2667f9eb3cb198ccb15cc8521fd',
               'web/src/source-choreography.ts': '665cb8c1d7bf0537b992b628720ff3be2bf0206536b36f487799bf67fe1f96f2',
               'web/src/activity-effects.ts': 'dd697069d134e4e9a935c0186758ebd243d26b29dd9856f4100d21596b4a0f8b',
               'web/src/ta08-source.css': '0bcaa542dca4f1dc9bb862e63ead388dee2f996bf483507d77813710181f3522',
               'web/src/art02-source.css': '0baf30d5065609265e7ba9baf45a5bde25e2b4d3d31bb62cdbe7badfbe921188',
               'web/src/idle-sources.css': 'e26dee84f2cdb8b47d6295d345fb390622c5b45b6db7e49273b6690a2d42815f'},
 'sourceReferences': ['docs/decisions/0134-source-primary-cend07-f02c.md',
                      'goal-4/amendments/2026-11-08-cend07-f02c-input.md',
                      'goal-4/research/cend07-f02c-sources.json',
                      'goal-4/evidence/cend07-f02c/scoped-selector-diagnostic.json']}
READONLY="const currentActivity=computed(()=>{const a=props.activity===undefined?scene?.activity:props.activity;return a&&a.runId===props.game.core.runId&&a.status!=='stopped'?a:null;});\nconst localClock=computed(()=>{const a=currentActivity.value,r=props.runtime===undefined?scene?.activityRuntime:props.runtime;return a&&r&&r.id===a.id&&r.generation===a.generation?r:null;});\nconst actionLabel=computed(()=>scene?.unresolved?(scene.syncIssue?'先重新读取进度':'先处理本次存档'):scene?.activityPausing?'正在停手 · 保存后暂停':props.busy?'处理中 · 暂不新安排':props.running?(!localClock.value?'本页待接续 · 上方继续':currentActivity.value?.version===2&&currentActivity.value.plan.sourceId===selectedId.value?'本段进行中 · 上方暂停':'其他活动进行中 · 上方暂停'):(currentActivity.value?'新安排':props.savedPlan?'重新安排':'安排')+(source.value?.name??''));\n"
STYLE='\n<style scoped>\n#app .source-start.text-button{background:transparent!important;box-shadow:none!important;transition:none!important}\n</style>\n'

MARKER=b'const currentActivity=computed('
def prior_source_intent_bytes(path,raw):
 if Path(path).name!='SourcePlanner.vue':return raw
 row=MANIFEST['files']['web/src/SourcePlanner.vue']
 if hashlib.sha256(raw).hexdigest()==row['beforeSha256']or MARKER not in raw:return raw
 assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'SC02 complete current source'
 text=raw.decode()
 for at,before,after in reversed(row['operations']):
  assert text[at:at+len(after)]==after,'SC02 exact display span';text=text[:at]+before+text[at+len(after):]
 assert hashlib.sha256(text.encode()).hexdigest()==row['beforeSha256'],'SC02 entire original source'
 return text.encode()
def validate_source_intent(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'SC02 local source';return p
 if not(root/LEDGER).exists():
  assert not(root/'web/src/SourcePlanner.vue').exists()or MARKER not in(root/'web/src/SourcePlanner.vue').read_bytes(),'SC02 missing ledger';return set(),0
 m=json.loads(local(LEDGER).read_text());assert m==MANIFEST and all(type(m[k])is int for k in ['version','newRasterAssets','maxNativeDeltaBytes','maxScopedCSSBytes'])and m['userAcceptance']is False,'SC02 immutable scope/caps'
 delta=0
 for n,row in MANIFEST['files'].items():
  raw=local(n).read_bytes();old=local(row['before']).read_bytes();assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'SC02 current source';assert len(old)==row['beforeBytes']and hashlib.sha256(old).hexdigest()==row['beforeSha256'],'SC02 preserved original';assert prior_source_intent_bytes(n,raw)==old,'SC02 full inverse';delta+=len(raw)-len(old)
  script=raw.split(b'</script>')[0].decode();original=old.split(b'</script>')[0].decode();assert script.count(READONLY)==1 and script.replace(READONLY,'',1)==original,'SC02 original planner and quote/writing ownership'
  assert re.findall(rb'@[\w:.-]+="[^"]*"',raw)==re.findall(rb'@[\w:.-]+="[^"]*"',old),'SC02 original complete events'
  assert re.findall(rb':disabled="[^"]*"',raw)==re.findall(rb':disabled="[^"]*"',old),'SC02 original authorization gates'
  assert raw.decode().endswith(STYLE)and len(STYLE.encode())<=240 and not re.findall(rb'<style.*?</style>',old,re.S),'SC02 exact local scoped style'
 assert delta<=2200,'SC02 actual delta cap'
 for g in MANIFEST['groups'].values():
  assert hashlib.sha256(local(g['ledger']).read_bytes()).hexdigest()==g['ledgerSha256'],'SC02 original group ledger'
  assert sum(local(n).stat().st_size for n in g['files'])<=g['cap'],'SC02 actual old group cap'
 for n,h in MANIFEST['authority'].items():
  try:raw=prior_source_material_bytes(n,local(n).read_bytes())
  except AssertionError as error:raise AssertionError('SC02 original Game clock renderer or controller: '+str(error))from error
  assert hashlib.sha256(raw).hexdigest()==h,'SC02 original Game clock renderer or controller'
 for n in MANIFEST['sourceReferences']:local(n)
 return {LEDGER,*MANIFEST['files'],*[x['before']for x in MANIFEST['files'].values()],*MANIFEST['authority'],*MANIFEST['sourceReferences']},delta
