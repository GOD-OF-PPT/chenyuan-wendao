<script setup lang="ts">
import {computed} from 'vue';
import {projectRelicForm,RELIC_FORMS} from './equipment-choreography';
import AssetImage from './AssetImage.vue';
import GameIcon from './GameIcon.vue';
const props=defineProps<{relicId:string;state:string;progress:number;owned:boolean;bound:boolean;sequence:number;saved:boolean}>();
const emit=defineEmits<{inspect:[]}>();
const names={frost_sword:'青霜剑',jade_seal:'玄玉印',soul_lamp:'照魂灯',cloud_mirror:'流云镜'};
const id=computed(()=>Object.hasOwn(names,props.relicId)?props.relicId as keyof typeof names:'frost_sword');
const form=computed(()=>projectRelicForm(props.state,['preparing','engraving','forming'].includes(props.state),props.progress,props.owned,props.bound));
const shape=computed(()=>RELIC_FORMS[id.value]);
const sealed=computed(()=>form.value.phase==='sealing');
const finished=computed(()=>props.owned&&!form.value.working&&!sealed.value);
const tools={sword:'translate(123 126) rotate(35)',seal:'translate(83 156) rotate(-18)',lamp:'translate(126 172) rotate(20)',mirror:'translate(152 83) rotate(35)'};
</script>
<template>
 <div class="relic-inscription-object" data-testid="relic-inscription-object" :data-relic="relicId" :data-state="state" :data-phase="form.phase" :data-working="form.working" :data-owned="owned" :data-bound="bound" :data-sequence="saved?sequence:undefined" :style="{'--relic-approach':form.approach+'px','--relic-draw':form.draw,'--relic-fold':form.fold}">
  <button class="relic-object-inspect" data-testid="relic-object-inspect" :aria-label="'查看'+names[id]+'的铸器安排，不开始铸造'" @click="emit('inspect')">
   <div class="relic-form-surface" :data-form="shape">
    <div v-if="finished" class="relic-finished-art" :class="{'relic-art-reveal':saved}"><slot name="artifact"/></div>
    <AssetImage v-else class="relic-cold-blank" :path="'art/v2/equipment/'+id+'-blank-v1.webp'" :asset-id="'relic-blank-'+id" fit="contain" eager><GameIcon kind="relic" :id="id"/><small>{{names[id]}} · 冷胚示意</small></AssetImage>
    <svg v-if="form.working||sealed" class="relic-workpiece" :data-form="shape" viewBox="0 0 240 240" aria-hidden="true">
     <path v-if="shape==='sword'" class="relic-engraved-path" pathLength="1" d="m78 174 17-9 4-16 17-9 5-17 18-8 7-17"/>
     <path v-else-if="shape==='seal'" class="relic-engraved-path" pathLength="1" d="m67 144 16 8v18l14-6v24l18 10v-28m21-18 16-7v18l20-10v17l-13 7v18"/>
     <path v-else-if="shape==='lamp'" class="relic-engraved-path" pathLength="1" d="m85 164 13 8 13-8 14 8 13-8 14 8m-44 29 14 7 14-7"/>
     <path v-else class="relic-engraved-path" pathLength="1" d="m72 101 7-22 15-9 15 6 19-6 18 7 14 22-4 19-16 13-19-2-17 7-18-12-12-9"/>
     <g :transform="tools[shape]"><g class="relic-tool" :data-tool="shape"><path d="M-4-48H4L5-9 0 0-5-9Z" fill="#ac9764"/><path d="M-5-9H5L0 0Z" fill="#b1c6bd"/><path d="M-3-38H3M-3-33H3M-3-28H3" fill="none" stroke="#d9ca97"/></g></g>
     <g class="relic-sealing" :data-sealing="sealed"><path d="M44 111H65v22H44m131-22h21v22h-21M96 215v-13h49v13"/><path d="m110 209 10-7 12 7-12 8Z"/></g>
    </svg>
   </div>
   <span class="relic-object-verb">查看铸器安排 <span aria-hidden="true">›</span></span>
  </button>
  <span v-if="bound" class="relic-bound-clasp" aria-hidden="true"><i/>本命扣位</span>
 </div>
</template>
<style scoped>
.relic-inscription-object{position:relative;display:flex;flex:1;flex-direction:column;min-height:0;width:100%;height:100%;isolation:isolate}
.relic-object-inspect{position:relative;display:flex!important;flex:1;flex-direction:column;justify-content:center;align-items:center;min-width:44px;min-height:44px;width:100%;padding:8px 12px 50px!important;border:0!important;border-radius:0;background:transparent!important;box-shadow:none!important;transform:none!important;color:#d3dec9}
.relic-object-inspect:focus-visible{outline:2px solid #9fd8c4;outline-offset:-3px}.relic-object-inspect:hover .relic-object-verb{color:#e5f1d4;border-color:#b9d9b1}
.relic-form-surface{position:relative;width:100%;height:100%;min-height:0;max-height:300px;aspect-ratio:1}
.relic-cold-blank,.relic-finished-art{width:100%;height:100%;min-height:0;display:grid;place-items:center}.relic-cold-blank :deep(.asset-fallback){display:grid;place-items:center;align-content:center;gap:8px}.relic-cold-blank :deep(.game-icon){width:128px;height:144px;margin:0}.relic-cold-blank small{font-size:14px}
.relic-finished-art :deep([data-art-path]){width:100%!important;height:100%!important;min-height:0}
.relic-workpiece{position:absolute;inset:0;display:block;width:100%;height:100%;overflow:visible;stroke-linejoin:round;filter:drop-shadow(2px 3px 2px #00171999)}
.relic-engraved-path{fill:none;stroke:#dfd0a0;stroke-width:2;stroke-dasharray:1;stroke-dashoffset:calc(1 - var(--relic-draw));opacity:.85}
.relic-tool{transform-box:fill-box;transform-origin:center bottom;transition:transform .15s linear;transform:translateY(calc(0px - var(--relic-approach)))}
.relic-sealing{opacity:var(--relic-fold);fill:#506e62;stroke:#a0b992;stroke-width:1;transform:translateY(calc((1 - var(--relic-fold))*10px))}.relic-sealing>path:last-child{fill:#173e36}
[data-phase=sealing] .relic-tool{opacity:0}[data-phase=sealing] .relic-engraved-path{stroke-dashoffset:0;opacity:.45}.relic-sealing[data-sealing=true]{opacity:1;transform:none}
.relic-art-reveal{animation:relic-unseal .65s ease-out}.relic-object-verb{position:absolute;left:8px;right:8px;bottom:8px;min-height:32px;display:flex;gap:8px;align-items:center;justify-content:center;border-bottom:1px solid #8ca58b70;font-size:14px;line-height:1.6}
.relic-bound-clasp{position:absolute;top:5px;right:5px;display:flex;align-items:center;gap:4px;color:#c5ddba;font-size:14px;pointer-events:none}.relic-bound-clasp i{display:block;width:10px;height:14px;border:2px solid #b8c18c;border-radius:2px}
@keyframes relic-unseal{from{filter:brightness(.8);transform:translateY(4px)}to{filter:none;transform:none}}
:global(.hub-reduced .relic-inscription-object *){animation:none!important;transition:none!important}:global(.hub-reduced .relic-tool),:global(.hub-reduced .relic-sealing){transform:none!important}
@media(prefers-reduced-motion:reduce){.relic-inscription-object *{animation:none!important;transition:none!important}.relic-tool,.relic-sealing{transform:none!important}}
</style>
