<script setup lang="ts">
import {computed,ref,watch,onMounted,onScopeDispose} from 'vue';
import type {Action,Game} from '../../src/full/types.ts';
import * as C from '../../src/full/content.ts';
import {planCollection,type CollectionTarget} from '../../src/full/goals.ts';
import {previewAction} from '../../src/full/queries.ts';
import {formatCosts,formatDelta} from './presentation';
import {pageSlice} from './play-flow';
import {actionSeconds} from './action-timing';
import CataloguePager from './CataloguePager.vue';
const props=defineProps<{game:Game;busy:boolean;available:boolean;highlight:string;collection:CollectionTarget|null;purchaseQuantity:number}>(),emit=defineEmits<{act:[Action];travel:[C.LocationId];home:[]}>();
const mode=ref('travel'),page=ref(0),count=ref<number|'target'>(1),quantity=ref(1),inspect=ref<string|null>(null);
const pagerMedia=window.matchMedia('(max-width:1099px)'),compact=ref(pagerMedia.matches),capacity=computed(()=>compact.value?2:4);
function resized(){compact.value=pagerMedia.matches;page.value=0;locate();}onMounted(()=>pagerMedia.addEventListener('change',resized));onScopeDispose(()=>pagerMedia.removeEventListener('change',resized));
const modes=[['travel','地点'],['source','采集 / 委托'],['battle','挑战'],['purchase','坊市']] as const;
const rows=computed(()=>mode.value==='travel'?Object.entries(C.locations):mode.value==='source'?Object.entries(C.sources).filter(([,s])=>s.location===props.game.core.world.location):mode.value==='battle'?Object.entries(C.enemies).filter(([,e])=>!e.trial&&e.location===props.game.core.world.location):Object.entries(C.items).filter(([id,i])=>C.rank(i.min)<=C.rank(props.game.core.player.realm)||props.game.core.inventory[id]>0));
const paged=computed(()=>pageSlice<[string,unknown]>(rows.value,page.value,capacity.value));
const quotes=computed(()=>new Map<string,ReturnType<typeof previewAction>>());
watch(()=>props.game,()=>quotes.value.clear());
function quote(action:Action){const key=JSON.stringify(action);if(!quotes.value.has(key)){if(quotes.value.size>=128)quotes.value.clear();quotes.value.set(key,previewAction(props.game,action));}return quotes.value.get(key)!;}
function can(action:Action|null){return !!action&&props.available&&!props.busy&&quote(action).allowed;}
function reason(action:Action|null){const target=props.collection,have=target?(target.kind==='item'?props.game.core.inventory[target.id]:props.game.core.player.stones):0;return !action?(target&&have>=target.quantity?'筹备目标已备齐，可返回筹备清单。':'此处不产当前目标，可改选固定次数。'):!props.available?'存档未就绪':props.busy?'当前行动进行中':quote(action).failure?.message??'';}
function sourceAction(id:string):Action|null{return count.value==='target'?(props.collection?planCollection(props.game,id,props.collection):null):{type:'SOURCE',sourceId:id,count:count.value};}
function rowAction(id:string):Action|null{return mode.value==='travel'?{type:'TRAVEL',location:id as C.LocationId}:mode.value==='source'?sourceAction(id):mode.value==='battle'?{type:'ENCOUNTER',enemy:id}:{type:'BUY',item:id,quantity:quantity.value};}
function go(id:string){const action=rowAction(id);if(!action)return;if(action.type==='TRAVEL')emit('travel',action.location);else emit('act',action);}
function selectMode(value:string){mode.value=value;page.value=0;inspect.value=null;}
function locate(){const m=/^(source|buy|encounter|travel)-(.+)$/.exec(props.highlight);if(!m)return;mode.value=({source:'source',buy:'purchase',encounter:'battle',travel:'travel'}as Record<string,string>)[m[1]];page.value=Math.max(0,Math.floor(rows.value.findIndex(([id])=>id===m[2])/capacity.value));inspect.value=null;}
watch(()=>props.highlight,locate,{immediate:true});watch(()=>props.purchaseQuantity,value=>quantity.value=value,{immediate:true});
watch(()=>props.collection,value=>{if(value)count.value='target';},{immediate:true});
watch(()=>props.game.core.runId,()=>{mode.value='travel';page.value=0;inspect.value=null;count.value=1;quantity.value=1;});
watch(()=>props.game.core.world.location,()=>{page.value=0;inspect.value=null;locate();});
watch(()=>props.game.core.revision,()=>{page.value=paged.value.page;});
const detailAction=computed(()=>inspect.value?rowAction(inspect.value):null),detailQuote=computed(()=>detailAction.value?quote(detailAction.value):null);
const name=(id:string)=>mode.value==='travel'?C.locations[id as C.LocationId].name:mode.value==='source'?C.sources[id].name:mode.value==='battle'?C.enemies[id].name:C.items[id].name;
function description(id:string){return mode.value==='travel'?C.locations[id as C.LocationId].subtitle:mode.value==='source'?Object.entries(C.sources[id].items).map(([item,n])=>C.items[item].name+' +'+n).concat(C.sources[id].stones?'灵石 +'+C.sources[id].stones:[]).join(' · '):mode.value==='battle'?'气血 '+C.enemies[id].hp+' · 胜利后取得奖励':C.items[id].description;}
</script>
<template>
 <section class="paper play-catalogue explore-catalogue" data-testid="explore-catalogue" tabindex="-1">
  <header><div><small>历练 · 当前地点</small><h2>{{C.locations[game.core.world.location].name}}</h2></div><span>前往地点 → 采集 / 挑战 → 回府筹备</span></header>
  <nav class="catalogue-tabs" aria-label="历练分类"><button v-for="[id,label] in modes" :key="id" :data-testid="'explore-mode-'+id" :aria-pressed="mode===id" @click="selectMode(id)">{{label}}</button></nav>
  <template v-if="inspect"><div class="catalogue-back"><button @click="inspect=null">← 返回目录</button><strong>{{name(inspect)}} · 完整说明</strong></div><article class="catalogue-detail"><p>{{description(inspect)}}</p><p>{{detailQuote?.delta?formatDelta(detailQuote.delta):''}}</p><p>代价：{{formatCosts(detailQuote?.actualCosts??detailQuote?.costs??null)}}</p><p>{{detailAction?reason(detailAction):''}}</p></article></template>
  <template v-else>
   <div class="catalogue-options"><template v-if="game.core.player.realm==='mortal'"><span>引气入体后才可采集和挑战，先回洞府修炼。</span><button data-testid="explore-return-cultivation" @click="game.core.world.location==='cave'?emit('home'):emit('travel','cave')" :disabled="busy||!available||(game.core.world.location!=='cave'&&!can({type:'TRAVEL',location:'cave'}))">返回修炼</button></template><label v-else-if="mode==='source'">连续采集/委托 <select v-model="count" aria-label="取材次数"><option :value="1">1 次</option><option :value="5">5 次</option><option :value="20">20 次</option><option :value="50">50 次</option><option value="target">达到筹备目标</option></select></label><label v-else-if="mode==='purchase'&&game.core.world.location==='market'">采购数量 <input v-model.number="quantity" aria-label="采购数量" type="number" min="1" :max="C.maxQuantity"></label><span v-else>{{mode==='travel'?'选择目的地，不会自动采集或挑战。':mode==='battle'?'挑战有战损；材料也可从委托或坊市取得。':'先前往云岚坊市，才可购买。'}}</span><small v-if="collection&&mode==='source'">目标：{{collection.kind==='item'?C.items[collection.id].name:'灵石'}}达到 {{collection.quantity}}</small></div>
   <p v-if="mode==='purchase'&&game.core.world.location!=='market'" class="catalogue-empty"><button data-testid="explore-go-market" @click="emit('travel','market')" :disabled="!can({type:'TRAVEL',location:'market'})">前往云岚坊市</button><small>{{reason({type:'TRAVEL',location:'market'})}}</small></p>
   <div v-else-if="!rows.length" class="catalogue-empty"><strong>此地没有{{mode==='battle'?'可挑战的敌人':'此类行动'}}</strong><button @click="selectMode('travel')">选择其他地点</button></div>
   <div v-else class="catalogue-grid" :class="'catalogue-'+mode"><article v-for="[id] in paged.rows" :key="id" :data-catalogue-id="id"><button class="catalogue-action" :data-testid="(mode==='travel'?'travel':mode==='source'?'source':mode==='battle'?'encounter':'buy')+'-'+id" :disabled="!can(rowAction(id))" :class="{selected:mode==='travel'&&game.core.world.location===id,highlight:highlight.endsWith('-'+id)}" @click="go(id)"><strong>{{name(id)}}</strong><small>{{mode==='travel'&&game.core.world.location===id?'已在此地':rowAction(id)?formatCosts(quote(rowAction(id)!).actualCosts??quote(rowAction(id)!).costs):''}}</small><small>{{rowAction(id)?'用时 '+actionSeconds(rowAction(id)!)+(mode==='source'?' 秒 / 整批':' 秒'):''}}</small><small>{{reason(rowAction(id))}}</small></button><div class="catalogue-card-foot"><small>{{mode==='source'?description(id):mode==='battle'?'观察意图，按回合选择攻守':mode==='purchase'?'灵石 '+game.core.player.stones:'需 '+C.realms[C.locations[id as C.LocationId].min].name}}</small><button class="text-button" @click="inspect=id" :aria-label="'查看'+name(id)+'完整说明'">详情</button></div></article></div>
   <CataloguePager :page="paged.page" :pages="paged.pages" :total="paged.total" label="历练" @change="page=$event"/>
  </template>
 </section>
</template>
