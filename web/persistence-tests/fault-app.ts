/** Standalone fault seam. Never imported by the production entry or copied to dist. */
import {createApp} from 'vue';
import {createPinia,disposePinia} from 'pinia';
import App from '../src/App.vue';
import {useGame} from '../src/store';
import {FullSaveRepository} from '../src/full-persistence';
import {RuleError} from '../../src/full/errors.ts';
import '../src/style.css';
import '../src/shell.css';

type DeliveryMethod='execute'|'create'|'importText'|'restoreCheckpoint';
export function mountFaultApp(){
 document.body.innerHTML='<div id="app"></div>';
 const pinia=createPinia(),app=createApp(App).use(pinia),store=useGame(pinia);app.mount('#app');
 let lost:{intent:any;outcome:any;method:DeliveryMethod}|null=null;
 const restores:Array<()=>void>=[];
 function loseNextDelivery(method:DeliveryMethod){
  const prototype=FullSaveRepository.prototype as any,original=prototype[method];
  const restore=()=>prototype[method]=original;restores.push(restore);
  prototype[method]=async function(...args:any[]){
   const outcome=await original.apply(this,args);restore();
   const intent=method==='execute'||method==='restoreCheckpoint'?args[0]:args[1];
   lost={intent:structuredClone(intent),outcome:structuredClone(outcome),method};
   throw new RuleError('STORAGE_ABORTED','测试注入：事务已提交，但结果交付中断；请核实原指令。');
  };
 }
 return{store,loseNextDelivery,get lost(){return lost;},dispose(){for(const restore of restores)restore();app.unmount();disposePinia(pinia);}};
}
