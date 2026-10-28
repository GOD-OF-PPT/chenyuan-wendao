/** Standalone fault seam. Never imported by the production entry or copied to dist. */
import {createApp} from 'vue';
import {createPinia,disposePinia} from 'pinia';
import App from '../src/App.vue';
import {useGame} from '../src/store';
import {FullSaveRepository} from '../src/full-persistence';
import {RuleError} from '../../src/full/errors.ts';
// Match the production theme order; this standalone harness does not mount main.ts.
import '../src/style.css';
import '../src/shell.css';
import '../src/demo.css';
import '../src/game-hub.css';
import '../src/panel-materials.css';
import '../src/immersive-theme.css';
import '../src/action-motion.css';
import '../src/play-flow.css';
import '../src/story-book.css';
import '../src/catalogue-art.css';
import '../src/idle-activity.css';
import '../src/idle-sources.css';
import '../src/idle-production.css';
import '../src/idle-preparation.css';
import '../src/stage-r1.css';
import '../src/stage-r2.css';
import '../src/stage-r3.css';
import '../src/stage-r4.css';
import '../src/idle-tradeoffs.css';
import '../src/local-loading.css';
import '../src/alchemy-workshop.css';
import '../src/art03-equipment.css';
import '../src/art16-schools.css';
import '../src/game-menus.css';
import '../src/art10-equipment.css';
import '../src/art11-inventory.css';
import '../src/art12-narrative.css';
import '../src/art18-ui.css';

type DeliveryMethod='execute'|'settleActivity'|'create'|'importText'|'restoreCheckpoint';
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
   const intent=method==='execute'||method==='settleActivity'||method==='restoreCheckpoint'?args[0]:args[1];
   lost={intent:structuredClone(intent),outcome:structuredClone(outcome),method};
   throw new RuleError('STORAGE_ABORTED','测试注入：事务已提交，但结果交付中断；请核实原指令。');
  };
 }
 return{store,loseNextDelivery,get lost(){return lost;},dispose(){for(const restore of restores)restore();app.unmount();disposePinia(pinia);}};
}
