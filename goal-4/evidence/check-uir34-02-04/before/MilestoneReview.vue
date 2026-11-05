<script setup lang="ts">
import {computed,inject,onMounted,onScopeDispose,ref} from 'vue';
import type {MilestoneReviewModel} from './milestone-view';
import {milestonePresentation,milestoneView} from './milestone-view';
import {gameFocusKey} from './focus';
import ReviewPages from './ReviewPages.vue';
import PortraitImage from './PortraitImage.vue';
import AssetImage from './AssetImage.vue';
import {scenePresentation} from './scene-presentation';
import {sceneAssetPath} from './assets';
const props=defineProps<{review:MilestoneReviewModel;stale:boolean;retry:boolean;busy:boolean;available:boolean;error:string;pendingError?:boolean}>();
const emit=defineEmits<{close:[];confirm:[];retry:[]}>(),dialog=ref<HTMLDialogElement>(),focus=inject(gameFocusKey);
const view=computed(()=>milestonePresentation(props.review.snapshot,props.review.plan.action)),scene=computed(()=>scenePresentation(props.review.snapshot));
const readings=computed(()=>props.review.activity?[...view.value.readings,...milestoneView(props.review.activity).details.map((text,i)=>({key:'saved-'+i,title:props.review.activity!.completedCycles?'已保存的实际成果':'原安排与停止状态',text}))]:view.value.readings);
const focused=computed(()=>!props.review.activity&&['CHOOSE','BREAKTHROUGH','EVENT','DECIDE','ANSWER_TRIAL'].includes(props.review.plan.action.type));
const choiceEffect=computed(()=>props.review.plan.action.type==='EVENT'?`与${view.value.speaker}相见，展开「${view.value.title.replace(/^拜访 · /,'')}」。`:view.value.effect);
const decisionVerb=computed(()=>{const a=props.review.plan.action;return a.type==='CHOOSE'?({help:'赠出回春丹',trade:'以丹换简',leave:'保留丹药'}as const)[a.choice]:a.type==='EVENT'?'拜访'+view.value.speaker:a.type==='ANSWER_TRIAL'?'作答 · '+view.value.title:view.value.title;});
onMounted(()=>focus?.open(dialog.value));onScopeDispose(()=>focus?.release(dialog.value));
</script>
<template>
 <dialog ref="dialog" class="paper milestone-review" data-testid="milestone-review" :data-action="review.plan.action.type" :data-readonly="!!review.activity" :data-focus="focused?'choice':undefined" aria-labelledby="milestone-review-title" @cancel.prevent="!busy&&emit('close')" @close="emit('close')">
  <header><div><small>{{review.activity?'已保存原安排 · 只读回看':'已选内容 · 尚未安排'}} · {{view.speaker}}</small><h2 id="milestone-review-title" tabindex="-1" data-dialog-initial>{{view.title}}</h2></div><button data-testid="milestone-cancel" @click="emit('close')" :disabled="busy">{{review.activity?'返回':'暂不安排'}}</button></header>
  <div class="milestone-scene"><AssetImage class="milestone-scenery" :path="sceneAssetPath(scene)" :asset-id="'milestone-scene-'+scene.artKey"/><PortraitImage class="milestone-person" :id="view.portrait" :fallback="view.speaker.slice(0,1)"/><div v-if="focused" class="milestone-choice"><small>此举之后</small><p class="milestone-effect" data-testid="milestone-effect">{{choiceEffect}}</p></div><ReviewPages v-else :rows="readings" :identity="review.identity"/></div>
  <p v-if="!focused" class="milestone-effect" data-testid="milestone-effect">{{view.effect}}</p>
  <div class="milestone-facts"><p data-testid="milestone-cost">{{review.activity?'原安排成本':'本次成本'}}：{{view.cost}}</p><p data-testid="milestone-period">{{focused?view.seconds+' 秒 · 仅本次':'在线 '+view.seconds+' 秒 · 仅一次 · 初值未平衡'}}</p></div>
  <p class="milestone-boundary" data-testid="milestone-boundary">{{view.next}}</p>
  <details v-if="focused" class="milestone-notes" data-testid="milestone-notes"><summary>来由与执行说明</summary><ReviewPages :rows="readings" :identity="review.identity"/><small>在线 {{view.seconds}} 秒 · 仅一次 · 初值未平衡</small><small>安排保存后开始读秒；实际结算成功后才产生变化。</small></details>
  <p v-if="review.activity" data-testid="milestone-saved-state">{{review.activity.completedCycles?'已完成一次':review.activity.status==='paused'?'已暂停；继续需完整重计本轮':'原活动尚未结算'}}。查看不执行，也不重新授权。</p>
  <template v-else><p v-if="stale" role="status" data-testid="milestone-stale">{{retry?'原安排回复待核对，请重试同一安排。':'进度或活动已变化，请取消后重新选择；不会自动更新授权。'}}</p><p v-if="error" role="alert">{{error}}</p><footer><small v-if="!focused">安排保存后开始读秒；实际结算成功后才产生变化。</small><button v-if="retry" class="primary" data-testid="milestone-retry" @click="emit('retry')" :disabled="busy||!available">重试同一安排</button><button v-else class="primary" data-testid="milestone-confirm" @click="emit('confirm')" :disabled="busy||!available||stale||!view.quote.allowed||pendingError">{{busy?'保存安排中…':focused?decisionVerb:view.verb}}</button></footer></template>
 </dialog>
</template>
<style src="./idle-milestones.css"></style>
