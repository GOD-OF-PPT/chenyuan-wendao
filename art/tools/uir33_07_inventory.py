"""Pure outcome emphasis; original feedback authorization reconstructs exactly."""
import json,hashlib,re
from pathlib import Path
LEDGER='art/redesign/uir33-07.json'
MANIFEST={'format': 'chenyuan-outcome-focus-uir33-07',
 'version': 1,
 'userAcceptance': False,
 'maxPresentationDelta': 2400,
 'files': {'action-feedback.ts': {'path': 'web/src/action-feedback.ts',
                                  'before': 'goal-4/evidence/uir33-07/before/web/src/action-feedback.ts',
                                  'sha256': 'af4f938bd1dae6b00ed089e1fbc44eb0c3b2751cbe67786713b06d95030d88df',
                                  'beforeSHA256': 'e947bb62b1de54e51f172a2d412110ea662a01b599f0b97061e8c238f31a3606',
                                  'bytes': 11193,
                                  'beforeBytes': 11195,
                                  'operations': [['import {formatCosts,formatDelta} from '
                                                  "'./presentation.ts';\n",
                                                  "import {formatCosts,outcome} from './presentation.ts';\n"],
                                                 [' return '
                                                  "{...row,key:JSON.stringify([result.runId,result.commandId]),operation:result.type,major:result.type==='BREAKTHROUGH'||result.type==='BATTLE'||result.phaseBefore.startsWith('trial-')||result.phaseAfter.startsWith('trial-'),terminal,delta:formatDelta(result.delta),summary:`实际 "
                                                  '${result.executedSteps} / ${result.requestedSteps} 次 · '
                                                  '${result.stopReason?.message??formatCosts(result.costs)}`,numbers};\n',
                                                  ' return '
                                                  "{...row,key:JSON.stringify([result.runId,result.commandId]),operation:result.type,major:result.type==='BREAKTHROUGH'||result.type==='BATTLE'||result.phaseBefore.startsWith('trial-')||result.phaseAfter.startsWith('trial-'),terminal,delta:outcome(result,game,action),summary:`实际 "
                                                  '${result.executedSteps} / ${result.requestedSteps} 次 · '
                                                  '${result.stopReason?.message??formatCosts(result.costs)}`,numbers};\n']]},
           'presentation.ts': {'path': 'web/src/presentation.ts',
                               'before': 'goal-4/evidence/uir33-07/before/web/src/presentation.ts',
                               'sha256': 'afb0da3d1dbbb9c58095a1ef97bb04e1411c088c06ba2941685704bbc717eca0',
                               'beforeSHA256': 'bca83aeae9d595d7b23882de8d54feb7f4912b31c19d7581adcc0d64da6b4649',
                               'bytes': 2574,
                               'beforeBytes': 1486,
                               'operations': [["import { items, realms } from '../../src/full/content.ts';\n"
                                               'import type { ActionCosts, StateDelta } from '
                                               "'../../src/full/contracts.ts';\n",
                                               "import type {Game} from '../../src/full/types.ts';\n"
                                               "import type {Observation} from './local-events.ts';\n"
                                               'import { items, realms, skills, relics } from '
                                               "'../../src/full/content.ts';\n"
                                               'import type { ActionCosts, StateDelta, ActionResult } from '
                                               "'../../src/full/contracts.ts';\n"],
                                              ['}\n',
                                               '}\n'
                                               '\n'
                                               '/** Read a confirmed current outcome; never infer an old '
                                               'slot or alter the receipt. */\n'
                                               'export function '
                                               "outcome(result:ActionResult,game:Game,action?:Observation['action']) "
                                               '{\n'
                                               ' const fallback=()=>formatDelta(result.delta);\n'
                                               ' '
                                               'if(result.runId!==game.core.runId||result.revisionAfter!==game.core.revision||result.executedSteps!==1)return '
                                               'fallback();\n'
                                               " if(result.type==='SCHOOL'&&game.school){const "
                                               "id=game.loadout.mind;return(game.school==='sword'?'剑修':'符修')+' "
                                               "· '+(id?skills[id].description:'配装已保存');}\n"
                                               " if(result.type==='EQUIP_RELIC'&&game.loadout.relic){const "
                                               "r=relics[game.loadout.relic];return r.name+' · "
                                               "'+r.description;}\n"
                                               " if(result.type==='EQUIP'){\n"
                                               '  const id=typeof '
                                               "action?.skill==='string'?action.skill:null,s=id?skills[id]:null;\n"
                                               '  '
                                               "if(s&&game.loadout[s.slot]===id)return({mind:'心法',builder:'起手',finisher:'终结'}[s.slot])+'：'+s.name+' "
                                               "· '+s.description;\n"
                                               '  return game.journal.at(-1)??fallback();\n'
                                               ' }\n'
                                               ' return fallback();\n'
                                               '}\n']]},
           'StageOutcome.vue': {'path': 'web/src/StageOutcome.vue',
                                'before': 'goal-4/evidence/uir33-07/before/web/src/StageOutcome.vue',
                                'sha256': '93abd506844b685f992420045b122f3e0356ee1e0aefe8111b6eedaf30c4c1be',
                                'beforeSHA256': 'deb66c8e9e2e58ded008dd10cd26dfcbe51b9204c4fb65a57b1f4cc4a2fdeeaf',
                                'bytes': 3899,
                                'beforeBytes': 4221,
                                'operations': [["import {formatDelta} from './presentation';\n",
                                                "import {formatDelta,outcome} from './presentation';\n"],
                                               ['import {items,realms,skills,relics} from '
                                                "'../../src/full/content.ts';\n",
                                                "import {items,realms} from '../../src/full/content.ts';\n"],
                                               ['  const '
                                                "g=props.game,rows=receipt.value.type==='EQUIP_RELIC'?[`本命法宝：${g.loadout.relic?relics[g.loadout.relic].name:'未装备'}`]:[`${g.school==='sword'?'剑修':g.school==='talisman'?'符修':'尚未择法'} "
                                                '· '
                                                '配装已保存`,...Object.values(g.loadout).filter(id=>!!id&&!!skills[id]).map(id=>skills[id!].name)];return{visible:props.compact?rows.slice(0,1):rows,extra:props.compact?rows.length-1:0};\n',
                                                '  const '
                                                "rows=[outcome(receipt.value,props.game),'配装已保存'];return{visible:rows,extra:0};\n"]]}},
 'unchanged': {'web/src/ActionFeedbackStage.vue': 'c0430cb6202624a1f4135556cfadfb17541fa38ca7d8bf29c8079080bc8ffcdb',
               'web/src/ActionFeedback.vue': '6c17e5134c3e195342a4711492e1798eee26065b2806de55c4b726aaf52f7833',
               'web/src/action-motion.css': 'b14bcc27fa59527b32e817a164ca7f546337f4520aa02f4cb7001895460bd495',
               'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7',
               'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21',
               'web/src/equipment-effects.ts': '0946c3b6b76e5ea39ebd80571175e2835ce49abe94fe6499f480b1635a934888',
               'web/src/ConfigurationDialog.vue': 'cc50327d03b19836dc9e41df9ff0e36185e2f64b846d510b795b6aad671f8b52',
               'src/full/configuration.ts': 'ca9880f727c5798a55d4a8590c57c1fbe5ba71ef0e6cfb0c59fdebfb86205520',
               'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73'},
 'oldLedgers': {'action-feedback': '9bef4b2288f3321a5da90870b778377afd3f407df9a0abf318034cdbc7704c75',
                'catalogue-art/manifest': '33e06718012b516e423ae0c10c55dbb5ca7b7abe150f49c0b9c9fe3ac7520952',
                'ux33': 'ca0c3a052c3f9508957a38da9a8acada9821104c2461aa127bccd0743f27c3b8'},
 'sourceReferences': ['docs/decisions/0102-outcome-focus-uir33-07-contract.md',
                      'goal-4/amendments/2026-11-05-uir33-07-input.md']}
def prior_uir3307_bytes(path,raw):
 name=Path(path).name
 if name not in MANIFEST['files']:return raw
 f=MANIFEST['files'][name]
 markers={'presentation.ts':'export function outcome','StageOutcome.vue':'outcome(receipt.value','action-feedback.ts':'delta:outcome('}
 if markers[name].encode()not in raw:return raw
 assert hashlib.sha256(raw).hexdigest()==f['sha256'],'UIR33-07 current full source'
 text=raw.decode()
 for old,new in reversed(f['operations']):
  assert new and text.count(new)==1,'UIR33-07 unique inverse';text=text.replace(new,old,1)
 assert hashlib.sha256(text.encode()).hexdigest()==f['beforeSHA256'],'UIR33-07 original full source'
 return text.encode()
def validate_uir3307(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'UIR33-07 local input';return p
 if not(root/LEDGER).exists():
  p=root/'web/src/presentation.ts';assert not p.exists()or 'export function outcome'not in p.read_text(),'UIR33-07 unrecorded outcome';return set(),0
 assert json.loads(local(LEDGER).read_text())==MANIFEST,'UIR33-07 immutable scope'
 for name,f in MANIFEST['files'].items():
  raw=local(f['path']).read_bytes();old=local(f['before']).read_bytes();assert len(raw)==f['bytes']and hashlib.sha256(raw).hexdigest()==f['sha256'],'UIR33-07 current facts';assert hashlib.sha256(old).hexdigest()==f['beforeSHA256'],'UIR33-07 preserved original';assert prior_uir3307_bytes(name,raw)==old,'UIR33-07 original inverse'
  if name.endswith('.vue'):assert re.findall(rb'@[\w:.-]+="[^"]*"',raw)==re.findall(rb'@[\w:.-]+="[^"]*"',old),'UIR33-07 events unchanged'
 delta=MANIFEST['files']['presentation.ts']['bytes']-MANIFEST['files']['presentation.ts']['beforeBytes'];assert 0<delta<=2400,'UIR33-07 added projection cap'
 for n,cap in [('action-feedback',34000),('catalogue-art/manifest',18000)]:
  ledger=local('art/redesign/'+n+'.json');assert hashlib.sha256(ledger.read_bytes()).hexdigest()==MANIFEST['oldLedgers'][n],'UIR33-07 original ledger';assert sum(local(r['path']).stat().st_size for r in json.loads(ledger.read_text())['files'])<=cap,'UIR33-07 actual original cap'
 for n,h in MANIFEST['unchanged'].items():assert hashlib.sha256(local(n).read_bytes()).hexdigest()==h,'UIR33-07 original proof and write owners'
 for ref in MANIFEST['sourceReferences']:local(ref)
 return {LEDGER,*[f[k]for f in MANIFEST['files'].values()for k in ['path','before']],*MANIFEST['unchanged'],*MANIFEST['sourceReferences']},delta
