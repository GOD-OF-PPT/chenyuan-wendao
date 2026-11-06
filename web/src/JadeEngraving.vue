<script setup lang="ts">
import {computed,onDeactivated,ref,useId,watch} from 'vue';
import {useJadePaint} from './jade-paint';
import * as C from '../../src/full/content';
import {JADE_FORMS,MANUAL_FORM,projectStudyForm} from './equipment-choreography';
import './ta09-equipment.css';
const props=defineProps<{skillId:string;manual:boolean;state:string;progress:number;mastered:boolean;equipped:boolean;sequence:number}>();
const opened=ref(props.mastered),instance=useId(),paint=(part:string)=>`ta09-jade-${instance}-${part}`;
const form=computed(()=>props.manual?MANUAL_FORM:JADE_FORMS[props.skillId]?.form);
const artwork=useJadePaint(form);
const variant=computed(()=>props.manual?'manual':JADE_FORMS[props.skillId]?.variant);
const visual=computed(()=>projectStudyForm(props.state,props.progress,props.mastered));
const spread=computed(()=>visual.value.phase==='sealing'?0:visual.value.working?visual.value.spread:opened.value?1:0);
const locked=computed(()=>visual.value.working||visual.value.phase==='sealing');
const label=computed(()=>visual.value.phase==='sealing'?'封卷中':visual.value.working?'本轮研读中':opened.value?'合简':'展简');
const name=computed(()=>props.manual?C.swordManual.name:C.skills[props.skillId]?.name??'经卷');
const school=computed(()=>props.manual?'sword':C.skills[props.skillId]?.school);
const materials=computed(()=>Object.fromEntries(['face','edge','cord'].map(part=>['--jade-'+part,`url(#${paint(part)})`])));
watch([()=>props.skillId,()=>props.manual],()=>opened.value=props.mastered);
watch(()=>props.mastered,v=>{if(v)opened.value=true;});
onDeactivated(()=>opened.value=props.mastered);
</script>
<template>
 <div class="ta09-jade" data-testid="jade-engraving" :data-painted="artwork.ready.value" :data-skill="manual?'jinghong':skillId" :data-form="form" :data-variant="variant" :data-state="state" :data-phase="visual.phase" :data-working="visual.working" :data-mastered="mastered" :data-equipped="equipped" :data-progress="visual.progress" :data-sequence="sequence" :data-open="opened" :data-school="school" :style="{...materials,'--jade-spread':spread,'--jade-draw':visual.draw,'--jade-turn':Math.sin(visual.progress*Math.PI*4)*6+'deg'}">
  <button type="button" class="ta09-jade-inspect" data-testid="jade-object-inspect" :aria-pressed="locked?undefined:opened" :disabled="locked" :aria-label="name+' · '+label+'，只查看，不开始研习或更换配装'" @click="!locked&&(opened=!opened)">
   <svg v-if="form" class="ta09-jade-drawing" viewBox="0 0 280 250" aria-hidden="true" stroke-linejoin="round" stroke-linecap="round" fill="none" stroke="currentColor" stroke-width="2">
    <defs>
     <linearGradient :id="paint('face')" x2="1" y2=".7"><stop :stop-color="school==='talisman'?'#c4d9be':'#c8d8a8'"/><stop offset=".28" stop-color="#89aa86"/><stop offset=".7" stop-color="#497b68"/><stop offset="1" stop-color="#1d4c43"/></linearGradient>
     <linearGradient :id="paint('edge')" x2="1" y2="1"><stop stop-color="#8fae83"/><stop offset=".6" stop-color="#245447"/><stop offset="1" stop-color="#133b34"/></linearGradient>
     <linearGradient :id="paint('cord')" x2="1"><stop stop-color="#676348"/><stop offset=".5" stop-color="#d4c28e"/><stop offset="1" stop-color="#746b48"/></linearGradient>
    </defs>
    <path class="ta09-jade-rest" d="M41 208L127 182L242 207L145 236Z"/>
    <g class="ta09-jade-case" :data-form="form">
     <image :key="artwork.cover.value" class="jade-painted-cover" data-jade-part="cover" :href="artwork.cover.value" x="50" y="18" width="180" height="188" @load="artwork.set($event,true)" @error="artwork.set($event,false)"/>
     <path v-if="form==='heart'" class="ta09-jade-face" d="M83 67L142 35L201 67L194 159L141 188L88 158Z"/>
     <path v-else-if="form==='blade'" class="ta09-jade-face" d="M126 29L151 29L171 75L156 167L141 193L123 166L107 75Z"/>
     <path v-else-if="form==='scroll'" class="ta09-jade-face" d="M68 54Q115 38 183 49L205 160Q155 181 94 173Z"/>
     <path v-else-if="form==='knot'" class="ta09-jade-face" d="M86 49L172 43L202 71L195 166L111 184L78 154Z"/>
     <path v-else-if="form==='seal'" class="ta09-jade-face" d="M109 34L171 39L182 169L148 190L116 174L97 59Z"/>
     <path v-else-if="form==='fan'" class="ta09-jade-face" d="M137 184L65 71Q136 23 214 68L165 183Z"/>
     <path v-else-if="form==='manual'" class="ta09-jade-face" d="M97 38L160 29L190 60L178 166L128 190L91 162Z"/>
     <path class="ta09-jade-cord" d="M79 84L192 66M88 151L195 133"/>
     <path v-if="variant==='advanced'" class="ta09-jade-inlay" d="M97 72L112 61M109 79L128 66M167 143L184 132M155 151L173 140"/>
    </g>
    <g class="ta09-jade-pages" :data-engraved="mastered">
     <g v-for="n in 5" :key="n" class="ta09-jade-page" :style="{'--page-index':n-3}">
      <image class="jade-painted-leaf" data-jade-part="page" :href="artwork.page" x="125" y="47" width="34" height="128" @load="artwork.set($event,true)" @error="artwork.set($event,false)"/>
      <path class="ta09-jade-face" d="M126 55L148 52L156 165L134 171Z"/>
      <path class="ta09-jade-edge" d="M148 52L153 55L161 169L156 165Z"/>
      <path class="ta09-jade-line" d="M131 78L145 75M133 89L146 86M134 100L147 97M136 113L148 110M138 124L149 121"/>
     </g>
    </g>
    <g class="ta09-jade-motif" :class="{'ta09-actual-engraving':mastered,'ta09-provisional-engraving':visual.working}" :data-complete="mastered">
     <path v-if="form==='heart'" d="M118 99L135 80L155 88L164 111L144 140L124 125L118 99M135 80L142 112L164 111M142 112L144 140"/>
     <path v-else-if="form==='blade'" d="M132 143L151 89L148 69L133 85L132 143M121 125L155 136M134 141L128 157"/>
     <path v-else-if="form==='scroll'" d="M111 96Q140 72 170 91L153 122L125 132M120 91L132 111L153 122M132 111L143 87"/>
     <path v-else-if="form==='knot'" d="M123 80L158 91L165 121L133 138L116 111L123 80M123 80L148 109L133 138M158 91L148 109L116 111"/>
     <path v-else-if="form==='seal'" d="M132 75L156 79L158 96L139 103L160 115L153 136L131 127M137 88L153 91M140 103L133 116"/>
     <path v-else-if="form==='fan'" d="M112 88L135 105L137 143M138 78L143 102L137 143M166 86L150 110L137 143M120 119L157 116"/>
     <path v-else d="M126 148L148 75L158 63L157 88L136 153M119 133L153 143M128 150L123 165"/>
    </g>
    <g v-if="visual.working" class="ta09-jade-stylus" data-testid="jade-engraving-tool"><path d="M188 66L215 48L220 55L190 78Z" class="ta09-jade-cord"/><path d="M188 66L177 86L190 78Z" class="ta09-jade-tool-tip"/></g>
    <path v-if="visual.phase==='sealing'" class="ta09-jade-sealing" d="M105 75L186 64M115 154L191 141M140 67L155 163"/>
    <g v-if="equipped" class="ta09-jade-attuned" data-testid="jade-equipped-clasp"><path d="M173 155L190 149L196 163L179 172Z"/><path d="M179 159L190 162L182 167Z"/></g>
   </svg>
   <span class="ta09-jade-result"><slot name="result"/></span>
   <span class="ta09-jade-inspect-label">{{label}}<small v-if="manual">只查看卷面</small></span>
  </button>
 </div>
</template>
