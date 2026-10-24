<script setup lang="ts">
import {computed} from 'vue';
import * as C from '../../src/full/content';
import AssetImage from './AssetImage.vue';
import {SOURCE_ART,SOURCE_TOOLS,projectSourceWork} from './source-choreography';
import './ta08-source.css';
const props=defineProps<{sourceId:string;state:string;progress:number;sequence:number}>();
const emit=defineEmits<{arrange:[]}>();
const visual=computed(()=>projectSourceWork(props.state,props.progress));
const source=computed(()=>C.sources[props.sourceId]);
const arrival=computed(()=>props.sequence>0&&!['failed','inactive','paused','pausing'].includes(props.state));
</script>
<template>
 <section class="ta08-resource-object" data-testid="source-physical-object" :data-source="sourceId" :data-state="state" :data-phase="visual.phase" :data-working="visual.working" :data-progress="visual.progress" :data-sequence="sequence" :style="{'--source-approach':visual.approach+'px','--source-turn':visual.turn+'deg','--source-draw':visual.draw,'--source-fold':visual.fold}">
  <button class="ta08-natural-view" type="button" data-testid="source-object-arrange" :aria-label="(source?.name??'资源')+'，查看并调整本段安排，不立即执行'" @click="emit('arrange')">
   <span class="ta08-resource-ground" aria-hidden="true"/>
   <AssetImage class="ta08-natural-art" :path="SOURCE_ART[sourceId]" :asset-id="'source-'+sourceId+'-cold'" fit="contain" eager>
    <span class="ta08-resource-fallback"><svg viewBox="0 0 320 240" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
     <g v-if="sourceId==='herbs'"><path d="M159 208Q167 110 146 49M158 174Q97 183 76 136Q126 126 158 174ZM159 138Q207 153 238 102Q181 94 159 138ZM153 104Q111 101 106 65Q143 62 153 104ZM153 88Q187 83 191 45Q154 46 153 88Z"/><path d="M69 210Q165 191 249 210"/></g>
     <g v-else-if="sourceId==='dew'"><path d="M55 155Q106 55 260 63Q244 165 55 155ZM64 153Q146 109 246 76M85 139L115 145M120 118L159 133"/><path d="M191 153C166 179 163 197 191 204C220 198 216 177 191 153Z"/></g>
     <g v-else-if="sourceId==='jade'"><path d="M58 192L83 90L139 58L216 75L263 158L232 205ZM83 90L148 125L139 58M148 125L216 75M148 125L183 195M216 75L221 138L263 158"/><path d="M104 160L130 121L153 171L183 112L204 169"/></g>
     <g v-else-if="sourceId==='lotus'"><path d="M73 186Q151 151 251 188Q186 231 73 186ZM164 183L167 107M167 108Q101 105 111 66Q149 63 167 108ZM167 108Q224 113 224 66Q183 64 167 108ZM167 109Q140 68 167 34Q197 68 167 109Z"/><path d="M77 204H249"/></g>
     <g v-else-if="sourceId==='soul'"><path d="M76 192L88 105L122 66L145 133L175 41L213 109L224 188ZM88 105L113 133L122 66M113 133L106 194M145 133L175 87L213 109M175 87L177 195M213 109L201 188"/></g>
     <g v-else><path d="M61 164Q157 104 260 161L238 195Q160 226 80 194ZM61 164Q163 200 260 161M83 168L140 149L174 161L224 146M109 186L153 174L204 186"/><path d="M140 139L145 125L151 138M193 143L201 122L209 141"/></g>
    </svg><strong>{{source?.name}}</strong><small>资源绘画暂未载入 · 仍可定程</small></span>
   </AssetImage>
   <svg class="ta08-resource-tool" viewBox="0 0 320 240" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <g v-if="sourceId==='herbs'" class="ta08-tool-contact"><path d="M224 87L188 158L177 156L212 86Z" class="ta08-tool-wood"/><path d="M213 86Q153 75 132 130Q176 105 213 104Z" class="ta08-tool-metal"/><path d="M110 175Q130 164 150 177M114 182Q132 170 147 183" stroke-width="2"/></g>
    <g v-else-if="sourceId==='dew'" class="ta08-tool-contact"><path d="M247 83L195 155L183 149L235 77Z" class="ta08-tool-wood"/><path d="M174 170Q194 180 214 170L207 189H182Z" class="ta08-tool-metal"/><path d="M194 157V164" stroke-width="2"/></g>
    <g v-else-if="sourceId==='jade'" class="ta08-tool-contact"><path d="M235 88L182 149L175 143L227 80Z" class="ta08-tool-metal"/><path d="M237 73L250 83L235 103L222 93Z" class="ta08-tool-wood"/><path d="M158 154L173 145M166 165L178 153" stroke-width="1.5"/></g>
    <g v-else-if="sourceId==='lotus'" class="ta08-tool-contact"><path d="M269 66L184 151L178 145L263 60Z" class="ta08-tool-wood"/><path d="M178 145Q150 137 140 165Q163 171 184 151Z" class="ta08-tool-metal"/><path d="M95 188Q126 196 149 188" stroke-width="1.5"/></g>
    <g v-else-if="sourceId==='soul'" class="ta08-tool-contact"><path d="M247 78L188 130L181 123L240 71Z" class="ta08-tool-wood"/><path d="M184 128Q157 128 148 169M184 128Q165 143 166 178M184 128Q176 150 185 174" class="ta08-tool-fiber"/></g>
    <g v-else class="ta08-tool-contact"><path d="M252 80L193 139L184 131L245 73Z" class="ta08-tool-wood"/><path d="M185 132Q160 136 150 164Q179 162 194 140Z" class="ta08-tool-fiber"/><path d="M110 183Q142 173 172 181" stroke-width="1.5"/></g>
   </svg>
   <span class="ta08-contact-trace" :data-phase="visual.phase" data-testid="source-work-layer" aria-hidden="true"><i/><i/><i/></span>
   <span v-if="arrival" :key="sequence" class="ta08-resource-saved-mark" aria-hidden="true"/>
   <span class="ta08-object-affordance">定程 <small>查看本段安排</small></span>
  </button>
  <p class="ta08-object-caption"><strong>{{SOURCE_TOOLS[sourceId]}}</strong><span>{{visual.phase==='sealing'?'本轮封存中，尚未入囊':state==='failed'?'已停手，先核对存档':visual.working?'依本段安排逐轮取材':'择此资源，核对投入后再安排'}}</span></p>
 </section>
</template>
