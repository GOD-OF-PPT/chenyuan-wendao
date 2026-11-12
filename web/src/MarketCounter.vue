<script setup lang="ts">
import {computed} from 'vue';
import type {Game} from '../../src/full/types';
import * as C from '../../src/full/content';
import {useSupplyCycle} from './supply-effects';
import ItemArtifact from './ItemArtifact.vue';
const props=defineProps<{game:Game;mode:'buy'|'sell';itemId:string}>();
const emit=defineEmits<{source:[]}>();
const item=computed(()=>C.items[props.itemId]);
const stock=computed(()=>props.game.core.inventory[props.itemId]??0);
const {store,activity,runtime,phase,progress,engaged,effect}=useSupplyCycle(()=>props.mode,()=>props.itemId);
const working=computed(()=>engaged.value&&phase.value==='running'&&!!store?.available&&!store.error&&!store.activityPausing);
const state=computed(()=>!store?.available||store.error?'failed':store.activityPausing&&activity.value?'stopping':engaged.value&&phase.value==='saving'?'saving':working.value?'trading':activity.value?.status==='paused'?'paused':'idle');
const status=computed(()=>({failed:store?.syncIssue?'进度待核对':'查看上方提示',stopping:'正在停手，保存后暂停',saving:'落账保存中 · 尚未成交',trading:props.mode==='buy'?'购入中 · 保存后入囊':'售出中 · 保存后得石',paused:'这段交易已暂停',idle:activity.value?.status==='stopped'?'这段交易已结束':'确认安排后逐件成交'})[state.value]);
const tradable=computed(()=>!!item.value&&(props.mode==='buy'||item.value.sell!==null));
const signed=(n:number)=>n>0?'+'+n:String(n);
const result=computed(()=>{const r=effect.value?.result;if(!r||r.type!==(props.mode==='buy'?'BUY':'SELL'))return null;return{quantity:r.delta.inventory[props.itemId]??0,stones:r.delta.stones,sequence:effect.value!.sequence};});
const totals=computed(()=>{const a=activity.value;if(a?.version!==5||a.plan.kind!==props.mode)return null;return{count:a.completedCycles,stones:props.mode==='buy'?a.spentStones:a.gainedStones};});
</script>
<template>
 <section class="market-counter art11-market" data-testid="market-counter" :data-state="phase" :data-status="state" :data-mode="mode" :data-item="itemId" :data-working="working" :data-engaged="engaged" :data-tradable="tradable">
  <div class="counter-shelves counter-library-control"><slot name="shelves"/></div>
  <div v-if="item" class="counter-table" :style="{'--trade-progress':(working?progress:0)*100+'%'}">
   <div class="counter-goods" aria-label="所选物资与实际库存"><div class="counter-item-rest"><ItemArtifact :item-id="itemId" :owned="stock>0"/><i aria-hidden="true"/></div><strong data-testid="market-counter-stock">行囊实存 {{stock}} 件</strong><small v-if="!stock">图谱 · 尚未持有</small></div>
   <div class="counter-exchange"><strong>{{mode==='buy'?'购入\n灵石换物':tradable?'售出\n物资换石':'突破物\n不可出售'}}</strong><p v-if="effect&&result" class="counter-result" data-testid="market-result" :data-sequence="effect.sequence" role="status"><b>成交</b><span>{{item.name}} {{signed(result.quantity)}}</span><span>灵石 {{signed(result.stones)}}</span></p><template v-else><span class="counter-direction" aria-hidden="true">{{tradable?mode==='buy'?'←':'→':'─'}}</span><small>{{mode==='buy'?'支付灵石\n物资入囊':tradable?'交出物资\n收取灵石':'保留此物\n用于突破筹备'}}</small></template><i class="counter-trade-progress" aria-hidden="true"/></div>
   <div class="counter-purse" aria-label="随身灵石"><div class="counter-stones" aria-hidden="true"><i/><i/><i/></div><strong data-testid="market-counter-stones">{{game.core.player.stones}} 灵石</strong></div>
   <div v-if="state!=='idle'||totals" class="counter-cycle" data-testid="market-cycle-status"><strong>{{status}}</strong><span v-if="engaged&&runtime" data-testid="market-cycle-clock">{{Math.ceil(runtime.remainingMs/1000)}} / {{runtime.totalMs/1000}} 秒</span><small v-else>15 秒 / 件</small><small v-if="totals&&totals.count" class="counter-committed" data-testid="market-committed">本段已成交 {{totals.count}} 件 · 灵石累计{{mode==='buy'?'支出':'收入'}} {{totals.stones}}</small></div>
  </div>
  <article v-if="item" class="counter-description market-object" data-testid="market-object"><h3>{{item.name}}<small v-if="mode==='buy'" class="counter-realm">需{{C.realms[item.min].name}}</small></h3><p>{{item.description}}</p><button @click="emit('source')">查看来源与筹备</button></article>
  <div class="counter-decision"><slot name="decision"/></div>
 </section>
</template>
<style>
#app .market-planner:has(>.market-counter){display:flex;flex-direction:column;gap:8px;min-height:0;height:100%}
.market-counter .counter-table{grid-area:1/2;position:relative;isolation:isolate;display:grid;grid-template-columns:minmax(100px,1fr) 160px minmax(100px,1fr);grid-template-rows:auto auto;align-content:center;gap:6px 10px;padding:6px 12px 4px;border-top:1px solid #7f9b8266;background:radial-gradient(ellipse at 50% 75%,#42625155,transparent 68%);min-height:0}
.market-counter .counter-table:before{content:'';position:absolute;inset:35% 3% 12%;z-index:-1;border-block:2px solid #b7ab7b44;border-radius:50% 50% 8px 8px/12% 12% 6px 6px;background:linear-gradient(110deg,#2d5048bf,#153a3e99,#2e5043aa);box-shadow:0 9px 10px #071e2855;pointer-events:none}
.market-counter :is(.counter-goods,.counter-purse){display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;min-width:0;text-align:center}
.market-counter :is(.counter-goods,.counter-purse)>span{font-size:14px;color:#c4d3b8}.market-counter :is(.counter-goods,.counter-purse)>strong{font-size:20px;line-height:1.4;color:#d9eac1}.market-counter :is(.counter-goods,.counter-purse)>small{font-size:14px;line-height:1.4;color:#c3d2bd}
.counter-item-rest{height:88px;width:112px;position:relative;display:grid;place-items:center;isolation:isolate}.counter-item-rest>i{position:absolute;inset:58% 7% 8%;z-index:-1;border:1px solid #a1b58c66;background:#163d3a;border-radius:50%}
#app .art11-market .counter-table>.counter-goods{align-self:stretch;min-height:0;padding:6px 0;box-sizing:border-box}
#app .art11-market .counter-goods>.counter-item-rest{height:160px;flex:0 1 160px;min-height:0;max-height:100%}
#app .art11-market[data-status=failed] .counter-goods>.counter-item-rest{height:140px;flex-basis:140px}
.counter-stones{height:88px;width:112px;position:relative}.counter-stones i{position:absolute;left:35px;top:5px;width:44px;height:72px;clip-path:polygon(50% 0,94% 26%,78% 82%,37% 100%,6% 73%,13% 26%);background:linear-gradient(112deg,#d7f4d1 0 23%,#8bc7c5 24% 48%,#326f81 49% 70%,#a0d7c3 71%);filter:drop-shadow(0 5px 4px #031c25)}.counter-stones i:nth-child(2){left:9px;top:33px;width:30px;height:47px;rotate:-19deg;opacity:.8}.counter-stones i:nth-child(3){left:77px;top:42px;width:25px;height:40px;rotate:24deg;opacity:.75}
.counter-exchange{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-align:center;min-width:0}.counter-exchange strong{font-size:18px;color:#e0dfb2;line-height:1.4;white-space:pre-line}.counter-exchange small{font-size:14px;line-height:1.45;white-space:pre-line}.counter-direction{font-size:42px;line-height:1;color:#b9d3a6}.counter-trade-progress{width:100%;height:4px;margin-top:5px;border-radius:2px;background:linear-gradient(90deg,#bddcad var(--trade-progress),#44665a44 var(--trade-progress))}
.market-counter[data-tradable=false] .counter-exchange{color:#d0b39b}.market-counter[data-tradable=false] .counter-direction{color:#a4977f}
.counter-cycle{grid-column:1/-1;display:flex;justify-content:center;align-items:center;gap:2px 12px;flex-wrap:wrap;font-size:18px;line-height:1.4;min-height:28px}.counter-cycle>span{font-variant-numeric:tabular-nums}.counter-cycle>small{font-size:14px;color:#c1d3bb}.counter-cycle>.counter-committed{text-align:center}
#app .market-counter .counter-result{display:flex;flex-direction:column;gap:0;margin:0;padding:3px 6px;font-size:14px;line-height:1.45;border-block:1px solid #c8d5a480;background:#1e4b42f5;color:#f1eccc;animation:counter-settle .7s ease-out}.counter-result :is(b,span){font-size:14px;line-height:1.45}
#app .market-counter .counter-description{grid-area:2/2;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 18px;align-items:center;padding:8px 12px;border:0;border-left:2px solid #97bb9555;background:linear-gradient(90deg,#153d3cc9,transparent);min-width:0;min-height:min-content}
#app .market-counter .counter-description>h3{grid-column:1;display:flex;flex-wrap:wrap;align-items:center;gap:2px 12px;font-size:24px;line-height:1.35;margin:0}#app .market-counter .counter-description>p{grid-column:1/-1;font-size:18px;line-height:1.5;margin:0!important}.counter-description .counter-realm{font-size:14px;line-height:1.5;margin:0}.counter-description>button{grid-column:2;grid-row:1;min-height:44px;font-size:14px;padding:6px 12px;background:#1b4942;border-color:#84a98c}
#app .market-counter .market-decision{display:flex;flex-direction:column;gap:10px;padding:0;min-width:0;width:100%;grid-area:auto;position:static;justify-content:center}#app .market-counter .market-decision>.preparation-reason{position:static;font-size:14px;line-height:1.5;margin:0;min-height:0}.market-counter .market-price{font-size:18px;line-height:1.5}.market-counter .preparation-estimate{padding-top:9px;font-size:18px}.market-counter .preparation-estimate strong{font-size:18px}.market-counter .preparation-estimate small{font-size:14px;line-height:1.5}.market-counter .market-decision>button{min-height:48px;font-size:18px}
.market-counter[data-status=failed] .counter-cycle{color:#efd1b2}
@keyframes counter-settle{from{filter:brightness(1.2)}to{filter:none}}
.hub-reduced .market-counter *{animation:none!important;transition:none!important}.hub-reduced .market-counter .market-shelves>button:active{translate:none}
@media(prefers-reduced-motion:reduce){.market-counter *{animation:none!important;transition:none!important}.market-counter .market-shelves>button:active{translate:none}}
</style>
