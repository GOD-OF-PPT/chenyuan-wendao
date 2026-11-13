<script setup lang="ts">
import {ref,computed,nextTick,watch} from 'vue';
import {observationLabels,LOCAL_BYTE_LIMIT,LOCAL_RECORD_LIMIT} from './local-events';
import type {useLocalExperience} from './use-local-experience';
import type {TrackingTarget} from '../../src/full/goals.ts';
import {formatCosts} from './presentation';
import CataloguePager from './CataloguePager.vue';
import GameConfirmDialog from './GameConfirmDialog.vue';
import {useGameConfirmation} from './use-game-confirmation';
const props=defineProps<{experience:ReturnType<typeof useLocalExperience>;runId:string|null;target:TrackingTarget}>();
const confirmation=useGameConfirmation({appearance:()=>({fontScale:props.experience.preferences.value.fontScale,reduceMotion:props.experience.preferences.value.reduceMotion})});
const preview=ref<HTMLElement>(),exportOpener=ref<HTMLButtonElement>(),exportError=ref('');
const view=ref<'overview'|'records'|'export'>('overview'),page=ref(0),loading=ref(false);
let viewRequest=0;
watch(()=>props.experience.prepared.value,(value,old)=>{if(value||!old)return;const returnFocus=preview.value?.contains(document.activeElement);if(view.value==='export'){viewRequest++;view.value='overview';loading.value=false;}if(returnFocus)void nextTick(()=>exportOpener.value?.focus());});
watch(()=>props.experience.listing.value.length,length=>{page.value=Math.min(page.value,Math.max(0,length-1));});
const pages=computed(()=>Math.max(1,props.experience.listing.value.length));
const entries=computed(()=>props.experience.listing.value.slice(page.value,page.value+1));
const total=computed(()=>props.experience.count.value===null?'旧本地数量未能读取':`本地 ${props.experience.count.value} 条`);
const operationLabels:Record<string,string>={CREATE:'新建人生',IMPORT:'导入人生',RESTORE:'完整恢复',CHOOSE:'开场选择',TRAVEL:'旅行',CULTIVATE:'修炼',SOURCE:'取材',BUY:'采购',SELL:'售出',CRAFT:'炼丹',USE:'服用',REST:'休息',BREAKTHROUGH:'突破',SCHOOL:'选择修法',STUDY:'研读剑简',LEARN:'研习功法',EQUIP:'装备功法',FORGE:'炼制法宝',EQUIP_RELIC:'装备法宝',ENCOUNTER:'发起挑战',BATTLE:'斗法',EVENT:'触发仙缘',DECIDE:'作出选择',START_TRIAL:'进入渡劫',ANSWER_TRIAL:'回答问心',END:'选择结尾',RETIRE:'主动归隐',END_LIFE:'寿尽收卷'};
function overview(){viewRequest++;loading.value=false;view.value='overview';}
function openRecords(event:Event){overview();if((event.target as HTMLDetailsElement).open)void props.experience.showRecords();}
async function recent(){const request=++viewRequest;loading.value=true;try{await props.experience.showRecords();if(request!==viewRequest)return;page.value=Math.min(page.value,pages.value-1);view.value='records';}finally{if(request===viewRequest)loading.value=false;}}
async function prepare(){const request=++viewRequest;loading.value=false;exportError.value='';try{await props.experience.prepareExport({runId:props.runId,target:props.target});if(request!==viewRequest)return;view.value='export';await nextTick();if(request===viewRequest&&props.experience.prepared.value)preview.value?.focus();}catch{if(request===viewRequest)exportError.value='记录快照暂无法生成，未下载或改变存档。';}}
function cancelExport(){props.experience.prepared.value=null;overview();void nextTick(()=>exportOpener.value?.focus());}
async function download(){try{const data=await props.experience.validatedDownload();if(!data)return;const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='尘缘问道-本地试玩记录与偏好.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{exportError.value='记录范围可能已改变，请重新预览；未下载或改变存档。';}}
function confirmationSource(memoryOnly=false){
 const e=props.experience,run=props.runId,view=viewRequest,key=()=>JSON.stringify([props.runId,e.preferences.value.recording,e.memory.value.map(row=>row.id),e.memoryDropped.value,memoryOnly?null:e.confirmationScope()]),original=key();
 return{current:()=>key()===original,mayReturn:()=>props.runId===run&&viewRequest===view};
}
function recordingBlock(){return props.experience.busy.value?'本地记录正在保存，请等保存落定。':props.experience.pending.value?'仍有试玩记录待保存，请等当前队列处理完毕后核对。':!props.experience.available.value?'本地记录库不可写，旧记录保留。':'';}
const refocus=(s:{mayReturn:()=>boolean})=>void nextTick(()=>s.mayReturn()&&exportOpener.value?.focus());
async function clear(){const source=confirmationSource();if(await confirmation.ask({kind:'clear-local',title:'清空本地试玩记录',message:'仅清空本机试玩记录和本页临时记录，保留显示设置和游戏存档。此操作不重开人生。',action:'确认清空记录',cancel:'保留记录',current:source.current,blocked:recordingBlock,mayReturn:source.mayReturn})&&source.current()&&!recordingBlock()){await props.experience.clear();refocus(source);}}
async function clearMemory(){const source=confirmationSource(true);if(await confirmation.ask({kind:'clear-memory',title:'清除临时手记',message:'仅清除本页临时试玩记录；旧本地数据和游戏存档不变。',action:'清除临时记录',cancel:'保留临时记录',current:source.current,mayReturn:source.mayReturn})&&source.current()){props.experience.clearMemory();refocus(source);}}
function resetPreferences(){void props.experience.setPreferences({fontScale:1,reduceMotion:false});}
</script>
<template>
 <p class="small local-status" role="status" data-testid="local-data-status">{{experience.status.value}}<span v-if="experience.pending.value"> · {{experience.pending.value}} 条待处理</span></p>
 <details class="local-panel" :data-view="view" data-testid="local-records-panel" @toggle="openRecords"><summary>本地试玩记录与显示偏好</summary>
  <div class="local-content">
  <nav class="local-view-tabs" aria-label="本地记录查看分类"><button type="button" data-testid="local-view-overview" :aria-pressed="view==='overview'" @click="overview">返回本地概览</button><button type="button" data-testid="local-refresh" :aria-pressed="view==='records'" :disabled="loading" @click="recent">{{loading?'正在读取最近记录…':'查看最近记录'}}</button><button ref="exportOpener" type="button" data-testid="local-export-preview" :aria-pressed="view==='export'" @click="prepare">预览记录与偏好导出</button></nav>
  <section v-if="view==='overview'" class="local-overview" aria-label="本地记录概览">
  <div class="local-overview-copy">
  <p>记录仅在当前浏览器，不会自动上传。只记录必要行动和数值摘要，不含道号、完整存档、错误原文或设备指纹。查看和真实停留时间都不改变修为、寿元或奖励。</p>
  <p class="small" data-testid="local-record-count">{{total}}；本页未保存 {{experience.memory.value.length}} 条；已移除 {{experience.dropped.value}} 条较早本地记录。</p>
  <p class="small">保留最近最多 {{LOCAL_RECORD_LIMIT}} 条、约 {{LOCAL_BYTE_LIMIT/1_000_000}} MB。超出时移除较早记录并保留计数；浏览器清理或配额可能丢失数据，请自行导出。关闭页面不会记作失败。</p>
  <p v-if="experience.missed.value||experience.memoryDropped.value" class="small" role="status">本会话未能记录 {{experience.missed.value}} 次观察；已移除 {{experience.memoryDropped.value}} 条较早临时记录，导出不会声称完整。</p>
  <p v-if="!experience.available.value" class="small">旧本地数据未能安全读取或写入，不会自动覆盖；只能清除本页临时记录。游戏进度请使用存档导出。</p>
  </div><div class="local-overview-controls"><label class="setting-row"><span>本地记录采集</span><input type="checkbox" data-testid="local-recording" :checked="experience.preferences.value.recording" :disabled="experience.busy.value" @change="experience.setPreferences({recording:($event.target as HTMLInputElement).checked})"></label><div class="local-actions"><button type="button" data-testid="local-clear" :disabled="experience.busy.value||!experience.available.value" @click="clear">清空本地试玩记录</button><button type="button" :disabled="experience.busy.value" @click="resetPreferences">恢复默认显示设置</button><button type="button" data-testid="local-reconnect" :disabled="experience.busy.value" @click="experience.reconnect()">重读本地设置与记录</button><button v-if="experience.memory.value.length" type="button" data-testid="local-clear-memory" @click="clearMemory">清除本页临时记录</button></div></div>
  </section>
  <section v-else-if="view==='records'" class="local-records-view" aria-label="最近记录详情"><h3>最近本地记录</h3><p class="small">已加载最近 {{experience.listing.value.length}} 条；{{total}}。这里只翻阅已加载记录，不改变采集或游戏进度。</p>
   <ol class="local-list" :start="page+1" tabindex="0" aria-label="最近本地记录"><li v-for="entry in entries" :key="entry.sequence"><strong>{{observationLabels[entry.record.observation.kind]}}</strong><span>会话内 {{(entry.record.elapsedMs/1000).toFixed(1)}} 秒 · {{operationLabels[entry.record.observation.operation??'']??'仅观察'}}</span><template v-if="entry.record.observation.result"><span>请求 {{entry.record.observation.result.requestedSteps}} / 实际 {{entry.record.observation.result.executedSteps}} 步 · 修为 {{entry.record.observation.result.delta.xp>=0?'+':''}}{{entry.record.observation.result.delta.xp}} · 游戏月 +{{entry.record.observation.result.delta.months}}</span><span>{{formatCosts(entry.record.observation.result.costs)}}</span></template><span v-if="entry.record.observation.replayed">观察旧回执，不是再次结算。</span><span v-if="entry.record.observation.errorCode">原因码 {{entry.record.observation.errorCode}}</span></li></ol><p v-if="!experience.listing.value.length">{{experience.available.value?'暂无已加载记录。':'旧本地记录未能读取，未将旧数据视为零条。'}}</p>
   <CataloguePager :page="page" :pages="pages" :total="experience.listing.value.length" label="最近记录" @change="page=Math.max(0,Math.min($event,pages-1))"/>
  </section>
  <section v-else-if="experience.prepared.value" ref="preview" class="local-export" tabindex="-1" aria-labelledby="local-export-title" data-testid="local-export-ready"><h3 id="local-export-title">导出预览</h3><p>包含预览时可读取的 {{experience.prepared.value.persistent.entries.length}} 条本地记录、{{experience.prepared.value.memoryOnly.length}} 条本页临时记录，以及字号、降低动效和当前追踪快照。{{experience.prepared.value.persistent.available?'':'旧本地记录不可读，没有将它们报告为零条。'}}</p><p>文件不是游戏存档，不能恢复进度；包含的相对会话时间只用于分析。不会自动发送，下载后由你决定是否分享。预览之后的新记录不在本次文件中。</p><div class="local-actions"><button type="button" data-testid="local-download" @click="download">下载记录文件（JSON）</button><button type="button" data-testid="local-export-cancel" @click="cancelExport">取消导出</button></div></section>
  <p v-if="exportError" role="alert">{{exportError}}</p>
  </div>
 </details>
 <GameConfirmDialog v-if="confirmation.request.value" :key="confirmation.request.value.id" :request="confirmation.request.value" @answer="confirmation.answer($event)"/>
</template>
<style scoped>
@layer game{.local-panel{border-top:1px solid var(--palette-gold);padding-top:12px;margin-top:16px;min-width:0}.local-panel summary{font-weight:700;cursor:pointer;min-height:44px;display:list-item;align-content:center}.local-panel p{overflow-wrap:anywhere}.local-actions{display:flex;gap:10px;flex-wrap:wrap}.local-actions button{max-width:100%;white-space:normal}.local-list{list-style-position:inside;padding:0 4px}.local-list:focus-visible{outline:3px solid var(--palette-line);outline-offset:3px}.local-list li{margin-bottom:14px;overflow-wrap:anywhere}.local-list span{display:block;font-size:var(--ui14);line-height:1.7}.local-export{padding:14px;border:1px solid var(--palette-gold);margin-top:16px}.local-export:focus-visible{outline:3px solid var(--palette-line);outline-offset:3px}.local-status{overflow-wrap:anywhere}}
</style>
