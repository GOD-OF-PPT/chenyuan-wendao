<script setup lang="ts">
import {computed,ref,inject,watch,onDeactivated,onScopeDispose} from 'vue';
import type {Game} from '../../src/full/types';
import type {SourcePlan} from '../../src/full/activity';
import * as C from '../../src/full/content';
import {sceneAssetPath} from './assets';
import {scenePresentation} from './scene-presentation';
import {useActivityPresentation} from './use-activity-effect';
import AssetImage from './AssetImage.vue';
import SourceObject from './SourceObject.vue';
import SourceCommission from './SourceCommission.vue';
import SourceSatchel from './SourceSatchel.vue';
import {gameFocusKey} from './focus';
import './art02-source.css';
import './src-stage.css';
const props=defineProps<{game:Game;plan:SourcePlan;rows:[string,C.Source][];catalogue:{page:number;pages:number;total:number};available:boolean}>();
const emit=defineEmits<{select:[string];page:[number];locations:[];home:[];arrange:[]}>();
const {store,activity,runtime,working,progress,phase,effect}=useActivityPresentation(a=>a.version===2&&a.plan.sourceId===props.plan.sourceId,()=>props.game.core.runId+':'+props.game.core.world.location+':'+props.plan.sourceId);
const source=computed(()=>C.sources[props.plan.sourceId]);
const commission=computed(()=>props.game.core.world.location==='sect');
const landscape=computed(()=>sceneAssetPath(scenePresentation(props.game)));
const name=(id:string)=>id==='stones'?'灵石':C.items[id].name;
const gains=(s:C.Source)=>Object.entries(s.items).map(([id,n])=>name(id)+' ×'+n).concat(s.stones?'灵石 +'+s.stones:[]).join(' · ');
const state=computed(()=>!props.available||store?.error?'failed':runtime.value?phase.value==='saving'?'saving':'working':activity.value?.status??'idle');
const status=computed(()=>store?.activityPausing&&state.value!=='failed'?'正在停手，保存后暂停':({failed:'存档待核对 · 已停手',saving:'本轮保存中 · 保存后入囊',paused:'此段已暂停',stopped:'此段已结束',running:'本次已定 · 等待接续',working:commission.value?'委托进行中':'取材进行中',idle:'待安排'})[state.value]);
const focus=inject(gameFocusKey)!,library=ref<HTMLDialogElement>(),libraryTrigger=ref<HTMLButtonElement>();
function openLibrary(){focus.open(library.value,libraryTrigger.value??null);}
function closeLibrary(){library.value?.close();}
function inspectSource(id:string){closeLibrary();focus.target(libraryTrigger.value??null);emit('select',id);}
watch(()=>props.game.core.runId+':'+props.game.core.world.location,closeLibrary);
onDeactivated(closeLibrary);onScopeDispose(()=>focus.release(library.value));
</script>
<template>
 <div class="source-field ta08-field art34-source-field" :class="{'source-working':working}" :data-location="game.core.world.location" :data-kind="commission?'commission':'natural'" :data-state="state" :data-source="plan.sourceId" data-testid="source-field">
  <div class="source-field-scene">
   <AssetImage class="source-field-landscape" :path="landscape" asset-id="source-location" eager/>
   <header class="source-field-location"><span>{{C.locations[game.core.world.location].name}} · {{commission?'承办差事':'取材寻踪'}}</span><div v-if="source" class="source-chosen"><strong>{{source.name}}</strong><span>每轮 {{source.months*30}} 秒 / {{source.months}} 游戏月 · {{gains(source)}} · 需{{C.realms[source.min].name}}<template v-if="source.xp"> · 修为最多 +{{source.xp}}</template></span></div><small v-if="source" class="source-field-hint">所得自动入囊，无需逐轮领取。</small></header>
   <template v-if="source">
    <div class="source-points"><button ref="libraryTrigger" type="button" class="art34-source-book" data-testid="source-library-open" aria-haspopup="dialog" @click="openLibrary"><strong>{{commission?'翻差事牌':'翻资源册'}}</strong><small>本地 {{catalogue.total}} 项 · 选择只查看</small></button>
     <dialog ref="library" class="paper art34-source-library" data-testid="source-library-dialog" aria-labelledby="source-library-title"><header><div><small>{{C.locations[game.core.world.location].name}} · {{commission?'宗门差事':'资源寻踪'}}</small><h3 id="source-library-title" tabindex="-1" data-dialog-initial>{{commission?'翻阅差事牌':'翻阅资源册'}}</h3></div><button type="button" data-testid="source-library-close" @click="closeLibrary">返回资源点</button></header><p>选择只查看来源与下次选择。核对后仍由你另行安排，不会立即取材、承办或离开此地。</p>
     <nav class="source-point-grid" :aria-label="commission?'差事木签':'场景资源点'">
     <button v-for="[id,s] in rows" :key="id" :data-testid="'source-'+id" :aria-pressed="plan.sourceId===id" :aria-label="s.name+'，选择查看，不会立即执行'" @click="inspectSource(id)"><strong>{{s.name}}</strong><small>{{gains(s)}} · 需{{C.realms[s.min].name}}</small></button>
    </nav><nav class="catalogue-pager ta08-source-pager" aria-label="来源翻页"><button data-testid="catalogue-prev" aria-label="上一页" :disabled="catalogue.page<=0" @click="emit('page',catalogue.page-1)">上页</button><span>{{catalogue.page+1}} / {{catalogue.pages}} 页 · {{catalogue.total}} 项</span><button data-testid="catalogue-next" aria-label="下一页" :disabled="catalogue.page+1>=catalogue.pages" @click="emit('page',catalogue.page+1)">下页</button></nav>
     </dialog>
    </div>
    <div class="ta08-object-zone">
     <SourceCommission v-if="commission" :source-id="plan.sourceId" :state="state" :progress="progress" :sequence="effect?.sequence??0" @arrange="emit('arrange')"/>
     <SourceObject v-else :source-id="plan.sourceId" :state="state" :progress="progress" :sequence="effect?.sequence??0" @arrange="emit('arrange')"/>
    </div>
    <aside class="source-focus">
     <div class="source-cycle-state"><strong data-testid="source-work-state">{{status}}</strong><span v-if="runtime" data-testid="source-local-countdown">{{Math.ceil(runtime.remainingMs/1000)}} / {{runtime.totalMs/1000}} 秒</span></div>
     <SourceSatchel :game="game" :source-id="plan.sourceId" :activity="activity" :result="effect?.result??null" :sequence="effect?.sequence??0"/>
    </aside>
   </template>
   <div v-else class="source-field-empty catalogue-empty"><strong>{{game.core.player.realm==='mortal'?'引气入体后可采集与承接委托':'此地暂无采集或委托'}}</strong><p>查看其他地点，明确启程后才会离开此地。</p><button data-testid="source-other-location" @click="emit('locations')">查看可前往的地点</button><button @click="emit('home')">返回主舞台</button></div>
  </div>
  <slot name="arrangement"/>
 </div>
</template>
