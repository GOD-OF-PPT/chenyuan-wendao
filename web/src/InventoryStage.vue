<script setup lang="ts">
import {useRuleContent} from './rule-content';

import {computed,inject,onDeactivated,onScopeDispose,ref,useId,watch} from 'vue';
import type {useGame} from './store';
import {formatDelta} from './presentation';
import type {Action,Game} from '../../src/full/types.ts';
import * as C from '../../src/full/content.ts';
import {previewAction} from '../../src/full/queries.ts';
import type {TrackingTarget} from '../../src/full/goals.ts';
import {pageSlice} from './play-flow';
import {gameFocusKey} from './focus';
import CataloguePager from './CataloguePager.vue';
import ItemArtifact from './ItemArtifact.vue';
import AssetImage from './AssetImage.vue';
const ruleContent=useRuleContent(()=>props.game);
const props=defineProps<{game:Game;itemId:string;available:boolean;reason:string;consumption:(a:Action)=>string}>();
const emit=defineEmits<{act:[Action];quick:[Action];track:[TrackingTarget]}>();
const scene=inject<ReturnType<typeof useGame>>('game-scene');
const quickBlock=computed(()=>!props.available?'存档未就绪':scene?.busy?'保存中，请稍候':scene?.unresolved?'请先核对上次行动':scene?.activityRunning?'先暂停当前活动':'');
const useQuote=computed(()=>item.value&&(item.value.hp||item.value.mp)?previewAction(props.game,{type:'USE',item:props.itemId}):null);
const replacement=computed(()=>scene?.activity?.status==='paused'?'本次行动将结束已暂停活动；已完成成果保留，未完成部分不再续行。':'');
function quick(kind:'use'|'sell',event:MouseEvent){if(quickBlock.value||event.detail>1)return;emit('quick',kind==='use'?{type:'USE',item:props.itemId}:{type:'SELL',item:props.itemId,quantity:1});}
const focus=inject(gameFocusKey),library=ref<HTMLDialogElement>(),purposes=ref<HTMLDialogElement>(),instance=useId(),page=ref(0);
const item=computed(()=>ruleContent.value.items[props.itemId]),stock=computed(()=>props.game.core.inventory[props.itemId]??0);
const uses=computed(()=>[...Object.entries(ruleContent.value.recipes).filter(([,r])=>r.inputs[props.itemId]>0).map(([id,r])=>({key:'recipe-'+id,name:r.name,kind:'丹方',amount:r.inputs[props.itemId]})),...Object.entries(ruleContent.value.relics).filter(([,r])=>r.inputs[props.itemId]>0).map(([id,r])=>({key:'relic-'+id,name:r.name,kind:'器物',amount:r.inputs[props.itemId]}))]);
const shown=computed(()=>pageSlice(uses.value,page.value,4));
const sellReason=computed(()=>item.value&&item.value.sell!==null?previewAction(props.game,{type:'SELL',item:props.itemId,quantity:1}).failure?.message??'':'');
function close(){library.value?.close();purposes.value?.close();}
function open(dialog:HTMLDialogElement|undefined,event:Event){close();if(focus)focus.open(dialog,event.currentTarget as HTMLElement);else dialog?.showModal();}
function view(kind:'use'|'sell'|'source'){
 if(!item.value)return;
 if(kind!=='source'&&(!props.available||kind==='use'&&!item.value.hp&&!item.value.mp||kind==='sell'&&item.value.sell===null))return;
 close();if(kind==='source')emit('track',{kind:'item',id:props.itemId,quantity:1});else emit('act',kind==='use'?{type:'USE',item:props.itemId}:{type:'SELL',item:props.itemId,quantity:1});
}
watch(()=>props.itemId,()=>{page.value=0;purposes.value?.close();});
watch(()=>props.game.core.runId,()=>{page.value=0;close();});
onDeactivated(close);onScopeDispose(()=>{focus?.release(library.value);focus?.release(purposes.value);});
</script>
<template>
 <div class="inventory-stage art11-inventory" data-testid="inventory-stage" :data-item="itemId" :data-owned="stock>0" :data-stock="stock">
  <AssetImage class="study-sanctum" style="inset:-12px -18px" path="art/v2/workshops/inventory-v1.webp" asset-id="inventory-chamber" eager aria-hidden="true"><span class="study-sanctum-fallback"/></AssetImage>
  <header class="inventory-stage-heading"><small>选择、查看不消耗</small><button data-testid="inventory-library-open" @click="open(library,$event)">翻找行囊 · 全部物资</button></header>
  <template v-if="item">
   <div class="inventory-selected">
    <button v-if="stock>0" class="inventory-held" data-testid="inventory-uses-open" :aria-label="'查看'+item.name+'用途与价格，不消耗'" @click="open(purposes,$event)"><ItemArtifact :item-id="itemId" :owned="true"/><span>查用途 · 不消耗</span></button>
    <div v-else class="inventory-blueprint"><ItemArtifact :item-id="itemId" :owned="false"/><small>图谱 · 尚未持有</small></div>
    <article class="inventory-object" data-testid="inventory-object"><small>{{item.kind==='medicine'?'随身丹药':item.kind==='breakthrough'?'破境之物':'修行灵材'}}</small><h3>{{item.name}}</h3><strong data-testid="inventory-selected-stock">实存 {{stock}} 件</strong><p>{{item.description}}</p><small>{{stock?(item.hp||item.mp?'可查看服丹调息或出售换石安排。':item.sell===null?'此物不可出售；可查看用途与来源。':'可查看材料用途或出售安排。'):'查来源只查看获得方式；不自动取材、采购或旅行。'}}</small><footer class="inventory-main-decision" :style="stock>0?{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:'10px'}:undefined"><button v-if="!stock" class="primary" data-testid="inventory-main-source" @click="view('source')">查找{{item.name}}来源</button><button v-else class="text-button" data-testid="inventory-main-uses" @click="open(purposes,$event)">查看用途与价格</button><template v-if="stock>0"><div v-if="item.hp||item.mp" class="inventory-quick-use"><p>{{useQuote?.delta?formatDelta(useQuote.delta):useQuote?.failure?.message}}</p><button class="primary" :data-testid="'quick-use-'+itemId" :disabled="!!quickBlock||!useQuote?.allowed" @click="quick('use',$event)">服用1枚{{item.name}}</button></div><div v-if="item.sell!==null" class="inventory-quick-sell"><small>售出1件得 {{item.sell}} 灵石{{sellReason?' · '+sellReason:''}}</small><button :data-testid="'quick-sell-'+itemId" :disabled="!!quickBlock||!!sellReason" @click="quick('sell',$event)">售出1件</button></div><small v-if="replacement">{{replacement}}</small><small v-if="quickBlock">{{quickBlock}}</small><small v-if="item.hp||item.mp">{{consumption({type:'USE',item:itemId})}}</small><small v-if="item.sell!==null">{{consumption({type:'SELL',item:itemId,quantity:1})}}</small></template><button v-if="!stock" class="text-button" data-testid="inventory-uses-open" @click="open(purposes,$event)">用途与价格</button></footer></article>
   </div>
  </template>
  <p v-else class="catalogue-empty" data-testid="inventory-current-empty">当前分类没有条目；翻找行囊可切换分类或查看后续物资图谱。</p>
  <dialog ref="library" class="inventory-library-dialog art11-object-dialog" data-testid="inventory-library-dialog" :aria-labelledby="instance+'-library'"><header><h3 :id="instance+'-library'" tabindex="-1" data-dialog-initial>翻找行囊 · 选择只查看</h3><button data-testid="inventory-library-close" @click="close">合上行囊 · 返回选物</button></header><div class="inventory-directory"><slot name="directory" :close="close"/></div></dialog>
  <dialog ref="purposes" class="inventory-uses-dialog art11-object-dialog" data-testid="inventory-uses-dialog" :aria-labelledby="instance+'-uses'"><header><h3 :id="instance+'-uses'" tabindex="-1" data-dialog-initial>{{item?.name??'物资'}} · 用途与价格</h3><button data-testid="inventory-uses-close" @click="close">返回选物</button></header><template v-if="item"><p>{{item.description}}</p><p>实存 {{stock}} 件 · 参考买价每件 {{item.buy}} 灵石</p><div class="inventory-purpose-options">
   <section v-if="item.hp||item.mp"><h4>服用调息</h4><p>{{item.hp?'恢复气血':'恢复灵力'}} · 每丹6秒；实际恢复依当前体魄与正式预估。</p><small>{{reason}}</small><small>{{consumption({type:'USE',item:itemId})}}</small><button :data-testid="'inspect-use-'+itemId" :disabled="!available" @click="view('use')">查看服丹安排 · 不立即用药</button></section>
   <section v-if="item.sell!==null"><h4>售出换石</h4><p>每件 {{item.sell}} 灵石 · 15秒 / 件</p><small>{{sellReason}}</small><small>{{consumption({type:'SELL',item:itemId,quantity:1})}}</small><button :data-testid="'inspect-sell-'+itemId" :disabled="!available" @click="view('sell')">查看出售安排 · 不立即卖出</button></section><section v-else class="inventory-kept"><h4>用于突破筹备</h4><p>突破物不可出售；保留本物，正式突破仍须另行确认。</p></section>
  </div><div v-if="shown.total" class="inventory-material-uses"><h4>正式丹方与器物用途</h4><p v-for="row in shown.rows" :key="row.key" :data-testid="'inventory-use-'+row.key">{{row.kind}} · {{row.name}} · 每份需要 {{row.amount}} 件</p><CataloguePager v-if="shown.pages>1" :page="shown.page" :pages="shown.pages" :total="shown.total" label="物资用途" @change="page=$event"/></div><footer><button :data-testid="'track-'+itemId" @click="view('source')">查看{{item.name}}全部来源</button></footer></template></dialog>
 </div>
</template>

<style scoped>
.inventory-quick-use,.inventory-quick-sell{min-width:0}
.inventory-quick-use p{font-size:18px;line-height:1.5;margin:0 0 6px}
.inventory-main-decision>.inventory-main-uses,.inventory-main-decision>small{grid-column:1/-1}
.inventory-main-decision [data-testid=inventory-main-uses]{grid-column:1/-1;min-height:44px}
</style>
