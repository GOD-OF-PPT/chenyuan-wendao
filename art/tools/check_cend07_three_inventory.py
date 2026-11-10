from cend13c_gap_inventory import prior_preparation_gap_bytes
from cend11_mainline_inventory import prior_mainline_hud_bytes
from cend07_f02b_inventory import prior_relic_focus_bytes
"""Three-task view-only return and goal artwork repairs; all original authority/caps."""
import hashlib,json,re
from pathlib import Path
LEDGER='art/redesign/check-cend07-three.json'
MANIFEST={'format': 'chenyuan-check-cend07-three',
 'version': 1,
 'userAcceptance': False,
 'newRasterAssets': 0,
 'files': {'web/src/PreparationPanel.vue': {'before': 'goal-4/evidence/check-cend07-three/before/web/src/PreparationPanel.vue',
                                            'beforeBytes': 8384,
                                            'beforeSha256': '9b7c90c115e661d14d5bf9a30f188ded9616b55afb548270ad4a39aa1c60520a',
                                            'bytes': 8431,
                                            'sha256': '76945687903fd9c01a510f76c9e7d65b7cb9ef60bb4949bad0035103dda78d95',
                                            'operations': [[31, ' ', ''],
                                                           [76, ' ', ''],
                                                           [80, ' ', ''],
                                                           [98, ' ', ''],
                                                           [111, ' ', ''],
                                                           [115, ' ', ''],
                                                           [160, ' ', ''],
                                                           [195, ' ', ''],
                                                           [226, ' ', ''],
                                                           [230, ' ', ''],
                                                           [265, ' ', ''],
                                                           [278, ' ', ''],
                                                           [282, ' ', ''],
                                                           [306, ' ', ''],
                                                           [365, ' ', ''],
                                                           [369, ' ', ''],
                                                           [395, ' ', ''],
                                                           [414, ' ', ''],
                                                           [418, ' ', ''],
                                                           [460, ' ', ''],
                                                           [505, ' ', ''],
                                                           [548, ' ', ''],
                                                           [597, ' ', ',{restoreMaterialFocus}'],
                                                           [624, ' ', ''],
                                                           [982, '', ';page:number'],
                                                           [1072,
                                                            '',
                                                            '),pill=computed(()=>model.value.pill),have=computed(()=>pill.value?props.game.core.inventory[pill.value]:0'],
                                                           [2701, '', ',page:focus.value?.page??page.value'],
                                                           [2750,
                                                            '',
                                                            ';}\n'
                                                            'function back(e:Event){const '
                                                            'f=focus.value;if(!f)return;page.value=f.page;focus.value=null;restoreMaterialFocus(e,f.item)'],
                                                           [3071, '', '('],
                                                           [3086, '', '||!source.navigation)'],
                                                           [3473, '', ':data-route="route" '],
                                                           [3704, 'focus=null;p', 'b'],
                                                           [3706, 'ge=0', 'ck'],
                                                           [3887, 'model.', ''],
                                                           [3905, 'model.', ''],
                                                           [3974, 'model.', ''],
                                                           [4020, 'model.', ''],
                                                           [4074, 'model.', ''],
                                                           [4116, 'model.', ''],
                                                           [4156, 'model.', ''],
                                                           [4162, 'g', 'h'],
                                                           [4164, 'me.core.in', ''],
                                                           [4166, 'ntory[model.pill]', ''],
                                                           [4281, 'model.', ''],
                                                           [4292, 'g', 'h'],
                                                           [4294, 'me.core.in', ''],
                                                           [4296, 'ntory[model.pill]', ''],
                                                           [4344, 'model.', ''],
                                                           [4435, 'model.', ''],
                                                           [4485, 'model.', ''],
                                                           [4549, 'model.', ''],
                                                           [4677, 'g', 'h'],
                                                           [4679, 'me.core.in', ''],
                                                           [4681, 'ntory[model.pill]', ''],
                                                           [4734, 'model.', ''],
                                                           [4766, 'g', 'h'],
                                                           [4768, 'me.core.in', ''],
                                                           [4770, 'ntory[model.pill]', ''],
                                                           [5818, 'model.', ''],
                                                           [5825, 'g', 'h'],
                                                           [5827, 'me.core.in', ''],
                                                           [5829, 'ntory[model.pill]', ''],
                                                           [6968, 'model.', ''],
                                                           [6975, 'g', 'h'],
                                                           [6977, 'me.core.in', ''],
                                                           [6979, 'ntory[model.pill]', ''],
                                                           [7635, 'model.', '']]},
           'web/src/PreparationMaterials.vue': {'before': 'goal-4/evidence/check-cend07-three/before/web/src/PreparationMaterials.vue',
                                                'beforeBytes': 1582,
                                                'beforeSha256': '90d11d536fa62d004d51af35dd68a41bca6dbf56acaef53556de87d922326e62',
                                                'bytes': 3232,
                                                'sha256': '6dfcc98b007f571257b410d9db0c2bd70e1a38d7ab16877cd92e2c6198b58613',
                                                'operations': [[0,
                                                                '',
                                                                '<script lang="ts">\n'
                                                                "import{nextTick}from 'vue';\n"
                                                                'import{visibleFocusTarget,revealFocus}from '
                                                                "'./focus';\n"
                                                                'const materialOrigins=new '
                                                                'WeakMap<HTMLElement,{id:string;route:string|undefined}>();\n'
                                                                'function '
                                                                'rememberMaterialOrigin(event:Event,id:string|null){\n'
                                                                ' const opener=event.currentTarget;if(!(opener '
                                                                'instanceof HTMLElement))return;\n'
                                                                ' const '
                                                                "root=opener.closest<HTMLElement>('[data-testid=preparation-catalogue]');if(root)materialOrigins.set(root,{id:id??'stones',route:root.dataset.route});\n"
                                                                '}\n'
                                                                'export async function '
                                                                'restoreMaterialFocus(event:Event,id:string|null){\n'
                                                                ' const opener=event.currentTarget;if(!(opener '
                                                                'instanceof HTMLElement))return;\n'
                                                                ' const '
                                                                "root=opener.closest<HTMLElement>('[data-testid=preparation-catalogue]'),route=root?.dataset.route,origin=root?materialOrigins.get(root):undefined,prior=document.activeElement;\n"
                                                                ' await nextTick();\n'
                                                                ' '
                                                                "if(!root||!visibleFocusTarget(root)||root.dataset.route!==route||root.querySelector('[data-testid=prepare-back]')||document.querySelector('dialog[open]'))return;\n"
                                                                ' const '
                                                                'active=document.activeElement;if(active!==document.body&&active!==prior&&visibleFocusTarget(active))return;\n'
                                                                ' const '
                                                                'suffix=CSS.escape(origin&&origin.route===route?origin.id:id??\'stones\'),button=root.querySelector<HTMLElement>(\'[data-testid="prepare-source-\'+suffix+\'"]\'),row=root.querySelector<HTMLElement>(\'[data-testid="prepare-need-\'+suffix+\'"]\');\n'
                                                                ' const '
                                                                'target=visibleFocusTarget(button)?button:visibleFocusTarget(row)?row:root;target.focus({preventScroll:true});revealFocus(target);materialOrigins.delete(root);\n'
                                                                '}\n'
                                                                '</script>\n'],
                                                               [1747,
                                                                '',
                                                                '\n'
                                                                'function '
                                                                "inspect(e:Event,id:string|null,q:number){rememberMaterialOrigin(e,id);emit('inspect',id,q);}"],
                                                               [2111, '', '" tabindex="-1'],
                                                               [2546, "emit('", ''],
                                                               [2553, "'", '($event']]},
           'web/src/GoalPanel.vue': {'before': 'goal-4/evidence/check-cend07-three/before/web/src/GoalPanel.vue',
                                     'beforeBytes': 18961,
                                     'beforeSha256': '417e46b09e64471b3bbc72d2ab6514b13af253b47409fb1af529a8077c63e0cd',
                                     'bytes': 18881,
                                     'sha256': '3f0e30aa122c32d0f04ae49c11cecf528e74eb0a45f3760b9759c3516f0a4f34',
                                     'operations': [[382,
                                                     '',
                                                     ".vue';\nimport ItemArtifact from './ItemArtifact"],
                                                    [2738, '  ', ''],
                                                    [2811, '  ', ''],
                                                    [3003, '  ', ''],
                                                    [3045, '  ', ''],
                                                    [3154, '  ', ''],
                                                    [3191, '  ', ''],
                                                    [3246, '  ', ''],
                                                    [3313, '  ', ''],
                                                    [3404, '  ', ''],
                                                    [3640, '  ', ''],
                                                    [3737, '  ', ''],
                                                    [6190, '  ', ''],
                                                    [6311, '  ', ''],
                                                    [6421, '  ', ''],
                                                    [6637, '  ', ''],
                                                    [6674, '  ', ''],
                                                    [6811, '  ', ''],
                                                    [6840, '  ', ''],
                                                    [6937, '    ', ''],
                                                    [7070, '  ', ''],
                                                    [7116, '    ', ''],
                                                    [7194, '    ', ''],
                                                    [7435, '    ', ''],
                                                    [7508, '    ', ''],
                                                    [7922, '  ', ''],
                                                    [8010, '  ', ''],
                                                    [8102, '  ', ''],
                                                    [8224, '    ', ''],
                                                    [9036,
                                                     '',
                                                     'painted=computed(()=>Object.hasOwn(C.items,boardObject.value.id));\n'
                                                     'const '],
                                                    [9395, '  ', ''],
                                                    [9489, '    ', ''],
                                                    [9836, '      ', ''],
                                                    [9957, '        ', ''],
                                                    [10000, '        ', ''],
                                                    [10154, '        ', ''],
                                                    [10313, '        ', ''],
                                                    [10446, '        ', ''],
                                                    [10603, '      ', ''],
                                                    [10621, '      ', ''],
                                                    [10810, '      ', ''],
                                                    [10854, '    ', ''],
                                                    [11178, '    ', ''],
                                                    [11349, '    ', ''],
                                                    [11698,
                                                     '',
                                                     "painted&&!game.core.inventory[boardObject.id]?'图谱 · "
                                                     "未持有':"],
                                                    [11939, '', '<template'],
                                                    [11949, '', 'v-if="painted"'],
                                                    [11964, '', '#artifact><ItemArtifact'],
                                                    [11988, '', ':item-id="boardObject.id"'],
                                                    [12014,
                                                     '',
                                                     ':owned="game.core.inventory[boardObject.id]>0"'],
                                                    [12061, ' ', 'style="height:174px"/></template>\n'],
                                                    [12115, '        ', ''],
                                                    [12376, '        ', ''],
                                                    [12703, '        ', ''],
                                                    [12763, '        ', ''],
                                                    [12849, '        ', ''],
                                                    [12964, '      ', ''],
                                                    [12976, '      ', ''],
                                                    [13026, '        ', ''],
                                                    [13097, '          ', ''],
                                                    [13317, '          ', ''],
                                                    [13476, '          ', ''],
                                                    [13582, '          ', ''],
                                                    [13692, '          ', ''],
                                                    [13787, '        ', ''],
                                                    [13794, '        ', ''],
                                                    [14165, '          ', ''],
                                                    [14349, '          ', ''],
                                                    [14670, '        ', ''],
                                                    [14683, '        ', ''],
                                                    [14835, '      ', ''],
                                                    [14847, '      ', ''],
                                                    [14888, '        ', ''],
                                                    [14919, '          ', ''],
                                                    [15059, '            ', ''],
                                                    [15170, '            ', ''],
                                                    [15370, '            ', ''],
                                                    [15423, '            ', ''],
                                                    [15515, '            ', ''],
                                                    [15720, '            ', ''],
                                                    [15986, '            ', ''],
                                                    [16046, '          ', ''],
                                                    [16053, '        ', ''],
                                                    [16195, '      ', ''],
                                                    [16207, '      ', ''],
                                                    [16228, '        ', ''],
                                                    [16304, '        ', ''],
                                                    [16704, '        ', ''],
                                                    [16861, '        ', ''],
                                                    [16981, '      ', ''],
                                                    [16993, '    ', ''],
                                                    [17007, '  ', ''],
                                                    [17337,
                                                     '',
                                                     ':none}\n'
                                                     '#app #goal-panel '
                                                     ':deep(.goal-board-pill:has(.item-artifact)):before{display']]},
           'web/src/preparation-bench.css': {'before': 'goal-4/evidence/check-cend07-three/before/web/src/preparation-bench.css',
                                             'beforeBytes': 4732,
                                             'beforeSha256': '389800e4cc9b56d9e6519e23567b67641122177c7820a8af4173a6d2db294455',
                                             'bytes': 4829,
                                             'sha256': 'a23ce1429d3ebde40d6bb78c7e57192e7ca1623cb4e45fa8d50605280c77fd22',
                                             'operations': [[4732,
                                                             '',
                                                             '\n'
                                                             '#app '
                                                             '.preparation-materials>article:focus-visible{outline:2px '
                                                             'solid #b7d6a8;outline-offset:2px}\n']]}},
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
 'goalPanelCap': 19000,
 'displayCap': 12000,
 'display': ['web/src/PreparationMaterials.vue', 'web/src/preparation-bench.css'],
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
               'web/src/focus.ts': '8ae91e78a4db7a854c293fc4b1bc28f02dd0d542b3119cff383f9245b4944eea'},
 'legacyPreparationLedgerSha256': '3bf1b1f89b68c97a22e53326d1c98f1b25138dec4c220d1b11f4450f9b7885db',
 'sourceReferences': ['docs/decisions/0132-three-task-check-cend07-contract.md',
                      'goal-4/amendments/2026-11-08-check-cend07-three-input.md',
                      'goal-4/research/check-cend07-three-sources.json']}
MARKERS={'PreparationPanel.vue':b'restoreMaterialFocus','PreparationMaterials.vue':b'restoreMaterialFocus','GoalPanel.vue':b'const painted=','preparation-bench.css':b'article:focus-visible'}
def prior_three_check_bytes(path,raw):
 raw=prior_preparation_gap_bytes(path,raw)
 raw=prior_relic_focus_bytes(path,raw)
 name=Path(path).name;rows=[v for n,v in MANIFEST['files'].items()if Path(n).name==name]
 if not rows:return raw
 row=rows[0]
 if hashlib.sha256(raw).hexdigest()==row['beforeSha256']:return raw
 if MARKERS[name]not in raw:return raw
 assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'CT03 complete current source'
 text=raw.decode()
 for at,before,after in reversed(row['operations']):
  assert text[at:at+len(after)]==after,'CT03 exact view span';text=text[:at]+before+text[at+len(after):]
 assert hashlib.sha256(text.encode()).hexdigest()==row['beforeSha256'],'CT03 complete original source'
 return text.encode()
def validate_three_check(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'CT03 missing local source';return p
 if not(root/LEDGER).exists():
  assert not any((root/n).exists()and MARKERS[Path(n).name]in(root/n).read_bytes()for n in MANIFEST['files']),'CT03 missing ledger';return set(),0
 m=json.loads(local(LEDGER).read_text());assert m==MANIFEST and all(type(m[k])is int for k in ['version','newRasterAssets','goalPanelCap','displayCap'])and m['userAcceptance']is False,'CT03 immutable scope/caps'
 delta=0
 for n,row in MANIFEST['files'].items():
  raw=prior_preparation_gap_bytes(n,local(n).read_bytes());before=local(row['before']).read_bytes();assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'CT03 current source';assert len(before)==row['beforeBytes']and hashlib.sha256(before).hexdigest()==row['beforeSha256'],'CT03 preserved original';assert prior_three_check_bytes(n,raw)==before,'CT03 whole inverse';delta+=len(raw)-len(before)
 for g in MANIFEST['groups'].values():
  assert hashlib.sha256(local(g['ledger']).read_bytes()).hexdigest()==g['ledgerSha256'],'CT03 original ledger';assert sum(local(n).stat().st_size for n in g['files'])<=g['cap'],'CT03 actual original regional cap'
 assert local('web/src/GoalPanel.vue').stat().st_size<=19000 and sum(local(n).stat().st_size for n in MANIFEST['display'])<=12000,'CT03 actual goal/display cap'
 assert hashlib.sha256(local('art/redesign/cend07-f04.json').read_bytes()).hexdigest()==MANIFEST['legacyPreparationLedgerSha256'],'CT03 original preparation contract'
 for n,h in MANIFEST['authority'].items():assert hashlib.sha256(prior_mainline_hud_bytes(n,local(n).read_bytes())).hexdigest()==h,'CT03 original Game/store/clock/focus authority'
 text=local('web/src/PreparationMaterials.vue').read_text();script=re.search(r'<script lang="ts">(.*?)</script>',text,re.S)[1]
 assert not re.search(r'useGame|indexedDB|localStorage|fetch\s*\(|setTimeout|setInterval|requestAnimationFrame|\bDate\b|\bperformance\b|v-html|\beval\s*\(|emit\s*\(',script),'CT03 DOM return acquired IO clock or actions'
 assert all(s in script for s in ['await nextTick()','root.dataset.route!==route','[data-testid=prepare-back]',"dialog[open]",'active!==document.body&&active!==prior','visibleFocusTarget','CSS.escape','revealFocus']),'CT03 actual return ownership guards'
 assert all(s in text for s in ['new WeakMap<HTMLElement','materialOrigins.delete(root)',"rememberMaterialOrigin(e,id);emit('inspect',id,q);",'need.have<need.required&&inspect($event,need.id,need.required)']),'CT03 actual original material intent and origin'
 original=local(MANIFEST['files']['web/src/PreparationMaterials.vue']['before']).read_text();assert re.search(r'<script setup lang="ts">(.*?)</script>',text,re.S)[1].replace("function inspect(e:Event,id:string|null,q:number){rememberMaterialOrigin(e,id);emit('inspect',id,q);}\n",'')==re.search(r'<script setup lang="ts">(.*?)</script>',original,re.S)[1],'CT03 original material-view authority'
 p=prior_preparation_gap_bytes('web/src/PreparationPanel.vue',local('web/src/PreparationPanel.vue').read_bytes()).decode();old=local(MANIFEST['files']['web/src/PreparationPanel.vue']['before']).read_text()
 for name in ['go','earn']:
  rule=r'function '+name+r'\([^\n]*';assert re.search(rule,p)[0]==re.search(rule,old)[0],'CT03 original navigation/earn callback'
 assert '(!props.running||!source.navigation)'in p and 'focus.value?.page??page.value'in p and 'page.value=f.page'in p,'CT03 local-only view and return page'
 goal=local('web/src/GoalPanel.vue').read_bytes();oldgoal=local(MANIFEST['files']['web/src/GoalPanel.vue']['before']).read_bytes();assert re.findall(rb'@[\w:.-]+="[^"]*"',goal)==re.findall(rb'@[\w:.-]+="[^"]*"',oldgoal),'CT03 original goal actions and tracking callbacks'
 for n in MANIFEST['sourceReferences']:local(n)
 return {LEDGER,*MANIFEST['files'],*[v['before']for v in MANIFEST['files'].values()],*MANIFEST['authority'],*MANIFEST['sourceReferences']},delta
