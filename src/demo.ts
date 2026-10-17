import {newGame,advance,validateGame} from './full/engine.ts';
import {currentVersions} from './full/versions.ts';
import {canonicalFingerprint} from './full/receipts.ts';
import {getTrialPreparation} from './full/queries.ts';
import type {Game,Command} from './full/types.ts';

export const DEMO_VERSION=1;
export const demoCatalog=Object.freeze([
 {id:'opening',label:'凡心入道',description:'从破庙开始选择，演示进度独立保存。',school:null,phase:'opening'},
 {id:'battle-sword',label:'剑修 · 山野实战',description:'以积蓄、破势与防御完成一场真实战斗。',school:'sword',phase:'battle'},
 {id:'battle-talisman',label:'符修 · 山野实战',description:'以符印、术法与补给完成一场真实战斗。',school:'talisman',phase:'battle'},
 {id:'causal-help',label:'赠丹之后 · 故人重逢',description:'查看赠丹开场实际带来的称呼与选项。',school:'sword',phase:'causal'},
 {id:'causal-trade',label:'交易之后 · 故人重逢',description:'查看交易开场的回响与继续结缘的代价。',school:'talisman',phase:'causal'},
 {id:'trial-sword',label:'剑修 · 渡劫筹备',description:'资源由合法行动备齐；亲自确认入场、问心与三关。',school:'sword',phase:'trial'},
 {id:'trial-talisman',label:'符修 · 渡劫筹备',description:'从合法准备状态体验符修渡劫与完整检查点。',school:'talisman',phase:'trial'},
 {id:'ending-sword',label:'剑修 · 结尾与生平',description:'三关已通过，可选择留道传承或独赴上界。',school:'sword',phase:'ending'},
 {id:'ending-talisman',label:'符修 · 结尾与生平',description:'三关已通过，查看真实来路并选择结尾。',school:'talisman',phase:'ending'},
] as const);
export type DemoId=typeof demoCatalog[number]['id'];
export interface DemoNode {format:'chenyuan-demo-node';version:1;nodeId:DemoId;sourceDigest:string;versions:typeof currentVersions;seed:{name:string;runId:string};commands:Command[];game:Game;}
export function demoSpec(id:unknown){const spec=demoCatalog.find(item=>item.id===id);if(!spec)throw new Error('演示节点不存在，请从演示菜单选择。');return spec;}
const equal=(a:unknown,b:unknown)=>canonicalFingerprint(a)===canonicalFingerprint(b);
export function assertDemoPhase(id:DemoId,game:Game){
 const spec=demoSpec(id);validateGame(game);
 if(spec.school!==null&&game.school!==spec.school)throw new Error('演示修法与节点不一致。');
 if(game.status!=='active')throw new Error('演示节点必须尚可操作。');
 const valid=spec.phase==='opening'?game.core.activeEvent?.id==='temple'&&game.core.openingChoice===null:
  spec.phase==='battle'?game.battle?.enemy==='wolf':
  spec.phase==='causal'?game.core.activeEvent?.id==='shen_return'&&game.core.openingChoice===(id==='causal-help'?'help':'trade'):
  spec.phase==='trial'?getTrialPreparation(game).canEnter:
  game.trial?.stage===4&&!game.battle;
 if(!valid)throw new Error('演示状态与节点阶段不一致。');
}
export function validateDemoNode(value:unknown,expectedId?:DemoId,expectedDigest?:string):DemoNode{
 if(!value||typeof value!=='object')throw new Error('演示节点格式无效。');const node=value as DemoNode;
 if(Object.keys(node).sort().join(',')!=='commands,format,game,nodeId,seed,sourceDigest,version,versions'||node.format!=='chenyuan-demo-node'||node.version!==DEMO_VERSION)throw new Error('演示节点版本不受支持。');
 demoSpec(node.nodeId);
 if(expectedId&&node.nodeId!==expectedId||!/^[a-f0-9]{64}$/.test(node.sourceDigest)||expectedDigest&&node.sourceDigest!==expectedDigest||!equal(node.versions,currentVersions))throw new Error('演示节点来自另一版本，未读取任何正常存档。');
 if(!node.seed||Object.keys(node.seed).sort().join(',')!=='name,runId'||node.seed.name!=='演示顾长青'||!Array.isArray(node.commands)||node.commands.length>2000)throw new Error('演示回放初值或指令数量无效。');
 let game=newGame(node.seed.name,node.seed.runId);const commands=new Set<string>();
 for(const command of node.commands){if(commands.has(command.commandId))throw new Error('演示指令身份重复。');commands.add(command.commandId);game=advance(game,command);}
 if(!equal(game,node.game))throw new Error('演示结果与正式规则回放不一致。');assertDemoPhase(node.nodeId,game);return structuredClone(node);
}
export function demoSave(nodeId:DemoId,sourceDigest:string,game:Game){validateGame(game);return{format:'chenyuan-demo-save',version:DEMO_VERSION,nodeId,sourceDigest,game};}
export function parseDemoSave(raw:string,nodeId:DemoId,sourceDigest:string):Game{
 const value=JSON.parse(raw);if(!value||Object.keys(value).sort().join(',')!=='format,game,nodeId,sourceDigest,version'||value.format!=='chenyuan-demo-save'||value.version!==DEMO_VERSION||value.nodeId!==nodeId||value.sourceDigest!==sourceDigest)throw new Error('请选择本版本、当前节点导出的演示存档；正常存档未受影响。');validateGame(value.game);return structuredClone(value.game);
}
