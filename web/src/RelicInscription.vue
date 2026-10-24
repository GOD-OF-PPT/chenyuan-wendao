<script setup lang="ts">
import {computed,useId} from 'vue';
import {projectRelicForm,RELIC_FORMS} from './equipment-choreography';
const props=defineProps<{relicId:string;state:string;progress:number;owned:boolean;bound:boolean;sequence:number;saved:boolean}>();
const emit=defineEmits<{inspect:[]}>();
const instance=useId();
const names={frost_sword:'青霜剑',jade_seal:'玄玉印',soul_lamp:'照魂灯',cloud_mirror:'流云镜'};
const id=computed(()=>Object.hasOwn(names,props.relicId)?props.relicId as keyof typeof names:'frost_sword');
const form=computed(()=>projectRelicForm(props.state,['preparing','engraving','forming'].includes(props.state),props.progress,props.owned,props.bound));
const shape=computed(()=>RELIC_FORMS[id.value]);
const sealed=computed(()=>form.value.phase==='sealing');
const displayArt=computed(()=>!form.value.working&&!sealed.value);
const ink=computed(()=>'relic-'+instance+'-'+id.value+'-');
const paint=(kind:string)=>'url(#'+ink.value+kind+')';
const tools={sword:'translate(150 62) rotate(32)',seal:'translate(182 85) rotate(22)',lamp:'translate(174 88) rotate(22)',mirror:'translate(190 53) rotate(8)'};
</script>
<template>
 <div class="relic-inscription-object" data-testid="relic-inscription-object" :data-relic="relicId" :data-state="state" :data-phase="form.phase" :data-working="form.working" :data-owned="owned" :data-bound="bound" :data-sequence="saved?sequence:undefined" :style="{'--relic-approach':form.approach+'px','--relic-draw':form.draw,'--relic-fold':form.fold}">
  <button class="relic-object-inspect" data-testid="relic-object-inspect" :aria-label="'查看'+names[id]+'的铸器安排，不开始铸造'" @click="emit('inspect')">
   <div v-if="displayArt" class="relic-finished-art" :class="{'relic-art-reveal':saved,'relic-blueprint':!owned}"><slot name="artifact"/></div>
   <svg v-else class="relic-workpiece" :data-form="shape" viewBox="0 0 240 260" aria-hidden="true">
    <defs>
     <linearGradient :id="ink+'jade'" x2="1" y2=".5"><stop stop-color="#203b36"/><stop offset=".4" stop-color="#8aa99a"/><stop offset=".65" stop-color="#416b61"/><stop offset="1" stop-color="#173c39"/></linearGradient>
     <linearGradient :id="ink+'bronze'" x2=".8" y2="1"><stop stop-color="#c2ae77"/><stop offset=".4" stop-color="#756443"/><stop offset=".7" stop-color="#b39b64"/><stop offset="1" stop-color="#3d4033"/></linearGradient>
     <linearGradient :id="ink+'steel'" x2="1" y2=".2"><stop stop-color="#3b5961"/><stop offset=".48" stop-color="#b0c4bb"/><stop offset=".55" stop-color="#64868a"/><stop offset="1" stop-color="#253e47"/></linearGradient>
    </defs>
    <path class="relic-work-rest" d="M37 224 119 240 207 221 126 207Z M37 224v8l82 17 88-20v-8"/>
    <g v-if="shape==='sword'" class="relic-blank relic-sword-blank">
     <path d="M96 51h48v145H96Z" class="relic-guide"/>
     <path d="m120 27 14 35-7 118h-17l-4-118Z" :fill="paint('steel')"/>
     <path d="m96 179 45 3 7 12-30 5-29-9Z M113 197h12l-3 36h-11Z" :fill="paint('bronze')"/>
     <path class="relic-engraved-path" pathLength="1" d="m118 66 7 13-12 16 11 17-12 17 10 17-7 19"/>
    </g>
    <g v-else-if="shape==='seal'" class="relic-blank relic-seal-blank">
     <path d="m63 102 61-29 59 28-60 30Z" :fill="paint('jade')"/><path d="M63 102v71l60 31v-73Z" fill="#25483f"/><path d="M123 131v73l60-33v-70Z" :fill="paint('jade')"/>
     <path d="m94 96 30-14 28 14-30 15Z M62 173l61 31 61-33v9l-61 32-61-31Z" :fill="paint('bronze')"/>
     <path class="relic-engraved-path" pathLength="1" d="m77 128 18 10v15l-9-4v22l24 13v-28l-8-4v-17m32 15 13-7v13l21-12v17l-12 7v15l-21 11"/>
    </g>
    <g v-else-if="shape==='lamp'" class="relic-blank relic-lamp-blank">
     <path d="M80 212q40-19 80 0v12q-40 18-80 0Z M106 172h28v38h-28Z" :fill="paint('bronze')"/>
     <path d="M76 170q44-20 88 0l-10 15q-34 15-68 0Z" :fill="paint('jade')"/>
     <g class="relic-lamp-hood"><path d="M83 84q37-55 74 0l9 80H74Z" fill="#183a38"/><path d="M83 84q37-55 74 0 M83 84l-9 80m24-91-7 87m29-95v94m23-86 7 87m7-76 9 80M80 85h80" :fill="'none'" :stroke="paint('bronze')" stroke-width="6"/><path d="M109 54v-9q11-16 22 0v9" fill="none" :stroke="paint('bronze')" stroke-width="5"/></g>
     <path class="relic-engraved-path" pathLength="1" d="m90 173 12 6 12-6 12 6 12-6 12 5m-42 29 12 5 12-5"/>
    </g>
    <g v-else class="relic-blank relic-mirror-blank">
     <path d="M101 214h38l8 13H93Z" :fill="paint('bronze')"/>
     <ellipse cx="120" cy="124" rx="63" ry="79" :fill="paint('jade')"/><ellipse cx="120" cy="124" rx="52" ry="66" :fill="paint('steel')"/>
     <g class="relic-mirror-frame" fill="none" :stroke="paint('bronze')" stroke-width="10"><path d="M70 80q19-39 50-39m8 0q33 4 48 40m9 16q14 52-13 91m-19 19q-35 25-64 0m-19-19q-25-40-14-84"/></g>
     <path class="relic-engraved-path" pathLength="1" d="m80 87 15-18 10 7 14-18 17 17 10-5 15 21m13 21-7 15 9 15-11 16 3 17m-25 15-16-7-15 6-16-10"/>
    </g>
    <g :transform="tools[shape]"><g class="relic-tool" :data-tool="shape"><path d="M0 0 14 6 10 68 4 80-2 68Z" :fill="paint('bronze')"/><path d="M-2 68h12L4 80Z" :fill="paint('steel')"/></g></g>
    <g class="relic-sealing" :data-sealing="sealed"><path d="M46 114h23v19H46m126-19h23v19h-23M97 222v-14h47v14"/><path d="m109 216 11-7 11 7-11 7Z"/></g>
   </svg>
   <span class="relic-object-verb">查看铸器安排 <span aria-hidden="true">›</span></span>
  </button>
  <span v-if="bound" class="relic-bound-clasp" aria-hidden="true"><i/>本命扣位</span>
 </div>
</template>
<style scoped>
.relic-inscription-object{position:relative;display:flex;flex:1;flex-direction:column;min-height:0;width:100%;height:100%;isolation:isolate}
.relic-object-inspect{position:relative;display:flex!important;flex:1;flex-direction:column;justify-content:center;align-items:center;min-width:44px;min-height:200px;width:100%;padding:8px 12px 50px!important;border:0!important;border-radius:0;background:transparent!important;box-shadow:none!important;transform:none!important;color:#d3dec9}
.relic-object-inspect:focus-visible{outline:2px solid #9fd8c4;outline-offset:-3px}.relic-object-inspect:hover .relic-object-verb{color:#e5f1d4;border-color:#b9d9b1}
.relic-workpiece{display:block;width:100%;height:100%;max-height:300px;min-height:145px;overflow:visible;stroke:#b5c3a0;stroke-width:1;stroke-linejoin:round;filter:drop-shadow(3px 5px 3px #00171999)}
.relic-work-rest{fill:#163d3a;stroke:#617963}.relic-guide{fill:#162e32;stroke:#647b75;stroke-dasharray:4 6}
.relic-engraved-path{fill:none;stroke:#e3d5a0;stroke-width:2;stroke-dasharray:1;stroke-dashoffset:calc(1 - var(--relic-draw));opacity:.85}
.relic-tool{transform-box:fill-box;transform-origin:center;transition:transform .15s linear;transform:translateY(var(--relic-approach))}.relic-tool[data-tool=sword]{transform:translateY(calc(var(--relic-approach) + (1 - var(--relic-draw))*32px))}.relic-tool[data-tool=seal]{transform:translateY(calc((1 - var(--relic-draw))*20px))}.relic-tool[data-tool=mirror]{transform:rotate(calc((var(--relic-draw) - .5)*28deg)) translateY(var(--relic-approach))}
.relic-lamp-hood{transform:translateY(calc((var(--relic-fold) - 1)*12px))}.relic-mirror-frame{transform-box:fill-box;transform-origin:center;transform:scale(calc(1.04 - var(--relic-fold)*.04))}
[data-phase=sealing] .relic-tool{opacity:0}[data-phase=sealing] .relic-engraved-path{stroke-dashoffset:0;opacity:.45}[data-phase=sealing] .relic-lamp-hood{transform:none}[data-phase=sealing] .relic-mirror-frame{transform:none}
.relic-sealing{opacity:0;fill:#506e62;stroke:#a0b992}.relic-sealing[data-sealing=true]{opacity:1}.relic-sealing>path:last-child{fill:#173e36}
.relic-finished-art{position:relative;width:100%;height:100%;min-height:145px;max-height:300px;display:grid;place-items:center}.relic-finished-art :deep([data-art-path]){width:100%!important;height:100%!important;min-height:145px}.relic-blueprint{opacity:.7;filter:saturate(.45)}
.relic-art-reveal{animation:relic-unseal .65s ease-out}.relic-object-verb{position:absolute;left:8px;right:8px;bottom:8px;min-height:32px;display:flex;gap:8px;align-items:center;justify-content:center;border-bottom:1px solid #8ca58b70;font-size:14px;line-height:1.6}
.relic-bound-clasp{position:absolute;top:5px;right:5px;display:flex;align-items:center;gap:4px;color:#c5ddba;font-size:14px;pointer-events:none}.relic-bound-clasp i{display:block;width:10px;height:14px;border:2px solid #b8c18c;border-radius:2px}
@keyframes relic-unseal{from{filter:brightness(.8);transform:translateY(4px)}to{filter:none;transform:none}}
:global(.hub-reduced .relic-inscription-object *){animation:none!important;transition:none!important}:global(.hub-reduced .relic-tool),:global(.hub-reduced .relic-lamp-hood),:global(.hub-reduced .relic-mirror-frame){transform:none!important}
@media(prefers-reduced-motion:reduce){.relic-inscription-object *{animation:none!important;transition:none!important}.relic-tool,.relic-lamp-hood,.relic-mirror-frame{transform:none!important}}
</style>
