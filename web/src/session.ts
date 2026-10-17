import {hasInjectionContext,inject,type InjectionKey} from 'vue';
import {FULL_DB_NAME} from './full-persistence';
import {LOCAL_DB_NAME} from './local-experience';
import {demoSpec,type DemoNode} from '../../src/demo.ts';
export type SessionScope=Readonly<{kind:'normal'|'demo';gameDatabase:string;localDatabase:string;gameChannel:string;localChannel:string;trackingKey:string;node?:DemoNode}>;
export const normalScope:SessionScope=Object.freeze({kind:'normal',gameDatabase:FULL_DB_NAME,localDatabase:LOCAL_DB_NAME,gameChannel:'chenyuan-full-progress',localChannel:'chenyuan-local-experience',trackingKey:'chenyuan-tracked-goal-v1'});
export const sessionKey:InjectionKey<SessionScope>=Symbol('game-session');
export function demoScope(node:DemoNode):SessionScope{
 demoSpec(node.nodeId);if(!/^[a-f0-9]{64}$/.test(node.sourceDigest))throw new Error('演示版本无效。');const suffix=node.sourceDigest+'-'+node.nodeId;
 return Object.freeze({kind:'demo',gameDatabase:'chenyuan-demo-game-v1-'+suffix,localDatabase:'chenyuan-demo-local-v1-'+suffix,gameChannel:'chenyuan-demo-progress-'+suffix,localChannel:'chenyuan-demo-records-'+suffix,trackingKey:'chenyuan-demo-target-'+suffix,node});
}
export function useSession(){return hasInjectionContext()?inject(sessionKey,normalScope):normalScope;}
