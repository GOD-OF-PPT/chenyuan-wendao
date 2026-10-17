<script setup lang="ts">
import {computed,onMounted,onUnmounted,ref,watch} from 'vue';
import type { Game } from '../../src/full/types.ts';
import { scenePresentation } from './scene-presentation';
import AssetImage from './AssetImage.vue';
import {SCENE_ASSETS,SCENE_CROPS,TERRACE_ART,terraceViewport} from './assets';
const props = defineProps<{ game: Game; eyebrow: string; title: string; description: string }>();
const scene = computed(() => scenePresentation(props.game));
const root=ref<HTMLElement>(),artReady=ref(false),size=ref({width:0,height:0});let observer:ResizeObserver|undefined;
function resized(){if(root.value){size.value={width:root.value.clientWidth,height:root.value.clientHeight};}}
onMounted(()=>{resized();observer=new ResizeObserver(resized);if(root.value)observer.observe(root.value);});onUnmounted(()=>observer?.disconnect());
watch(()=>scene.value.key,()=>{artReady.value=false;},{flush:'sync'});
function artState(value:{state:string;path:string}){if(value.path===SCENE_ASSETS[scene.value.key])artReady.value=value.state==='ready';}
const photoBox=computed(()=>{const box=terraceViewport(size.value.width,size.value.height);return`${box.x} ${box.y} ${box.width} ${box.height}`;});
</script>
<template>
  <section ref="root" class="scene" :class="[scene.key, scene.location, {compact:scene.compact}]" data-testid="scene" :data-scene="scene.key" :data-location="scene.location" :data-gate="scene.gate" aria-label="当前行旅">
    <AssetImage class="scene-image" :path="SCENE_ASSETS[scene.key]" :asset-id="`scene-${scene.key}`" :position="SCENE_CROPS[scene.location]" eager @state="artState">
    <svg class="scene-landscape" viewBox="0 0 1200 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <circle class="scene-moon" cx="865" cy="96" r="43"/>
      <path class="mountain far" d="M0 330 95 224 150 273 275 87 370 240 438 193 562 310 698 153 760 241 878 72 968 203 1054 156 1200 300V500H0Z"/>
      <path class="mountain middle" d="m0 382 174-114 109 63 136-136 160 163 152-105 116 108 177-146 176 103v182H0Z"/>
      <path class="scene-mist" d="M0 359Q215 295 428 355T840 328T1200 344V500H0Z"/>
      <path class="mountain near" d="m0 459 134-50 144 49 145-71 172 68 140-50 172 45 166-73 127 46v77H0Z"/>
      <g v-if="scene.key==='settlement'" class="settlement-roofs">
        <path d="M650 312h235l-45-25-66-50-65 50Z M674 313v79h186v-79 M720 313v79 M813 313v79"/>
        <path v-if="scene.location==='sect'" d="M914 244h166l-83-73Z M940 245v115h114V245 M925 362h146"/>
        <path v-if="scene.location==='market'" d="M900 381h192l-28-55H928Z M918 382v48 M1074 382v48 M955 339v35 M1017 339v35"/>
        <path v-if="scene.location==='cave'" d="M806 432q70-150 158 0 M842 428q32-79 70 0"/>
      </g>
      <g v-if="scene.key==='secret'" class="scene-ruins"><path d="M764 398V214l15-23h55l17 23v184Z M788 235v116 M880 390V278h25v112 M710 420h232 M741 437h228"/></g>
      <path v-if="scene.key==='wilderness'" class="scene-pine" d="M1050 450V160m0 28-66 92h132Zm0 48-98 111h182Zm0 65-130 104h245Z"/>
    </svg>
    </AssetImage>
    <svg v-if="scene.key==='terrace' && !artReady" class="scene-landscape scene-state-layer" viewBox="0 0 1200 500" preserveAspectRatio="xMaxYMid meet" aria-hidden="true" focusable="false">
      <defs><linearGradient id="gate-stone" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d9c49c"/><stop offset=".4" stop-color="#8b8e79"/><stop offset="1" stop-color="#344d4a"/></linearGradient><linearGradient id="gate-door" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#203d3e"/><stop offset=".5" stop-color="#53665a"/><stop offset="1" stop-color="#1d3638"/></linearGradient></defs>
      <g class="scene-gate" :class="scene.gate"><rect class="gate-bounds" x="640" y="128" width="444" height="338" fill="transparent" stroke="none"/>
        <path class="gate-frame" d="M724 412V190h36v222 M964 412V190h36v222 M695 190Q744 185 766 164l29 6q67-17 134 0l29-6q24 21 69 26l-14 12H709Z M745 163q35-7 54-28h126q20 22 54 28l-14 12H759Z M718 205h289v17H718Z M692 417h338 M667 440h390 M640 466h444"/>
        <path v-if="scene.gate!=='opened'" class="gate-doors" d="M775 205h78v195h-78Z M871 205h78v195h-78Z"/>
        <path v-else class="gate-light" d="M778 400V207q83-66 166 0v193Z"/>
        <path v-if="scene.gate==='storm'" class="gate-lightning" d="m920 20-56 85 48-8-60 87 M1034 42l-32 72 36-11-49 89"/>
      </g>

    </svg>
    <svg v-if="scene.key==='terrace' && artReady" class="scene-landscape scene-state-layer photo-gate-state" :viewBox="photoBox" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs><radialGradient id="gate-portal-light"><stop stop-color="#fffdf0"/><stop offset=".6" stop-color="#ffe5a4"/><stop offset="1" stop-color="#dfaf60"/></radialGradient><filter id="gate-portal-bloom" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="7"/></filter><clipPath id="gate-portal-clip"><path :d="TERRACE_ART.doorPath"/></clipPath></defs>
      <g class="scene-gate" :class="scene.gate">
        <rect class="gate-bounds" :x="TERRACE_ART.bounds.x" :y="TERRACE_ART.bounds.y" :width="TERRACE_ART.bounds.width" :height="TERRACE_ART.bounds.height" fill="transparent" stroke="none"/>
        <path v-if="scene.gate!=='opened'" class="gate-doors photo-door-outline" :d="TERRACE_ART.doorPath"/>
        <g v-else class="gate-light photo-portal"><ellipse cx="1201" cy="448" rx="80" ry="12" fill="#fce1a2" opacity=".35" filter="url(#gate-portal-bloom)"/><path :d="TERRACE_ART.doorPath" fill="#ffe2a0" opacity=".8" filter="url(#gate-portal-bloom)"/><path :d="TERRACE_ART.doorPath" fill="url(#gate-portal-light)" stroke="#ffe9b6" stroke-width="1.5"/><g clip-path="url(#gate-portal-clip)" fill="none" stroke="#fffef3" stroke-width="2" opacity=".55"><path d="M1147 397q26-15 53 0t56-2M1147 407q32-8 63 1t50-3M1170 433V358m25 77V345m25 87V353"/></g></g>
        <path v-if="scene.gate==='storm'" class="photo-lightning" d="m1320 235-18 30 15-4-27 39m-216-36-19 25 13-4-19 25"/>
      </g>
    </svg>
    <div class="scene-vignette" aria-hidden="true"></div>
    <div class="scene-copy"><span class="eyebrow">{{eyebrow}}</span><h2>{{title}}</h2><p>{{description}}</p></div>
    <span class="scene-seal" aria-hidden="true">问<br>道</span>
  </section>
</template>
<style scoped>
.scene{position:relative;height:340px;isolation:isolate;overflow:hidden;border:1px solid #777e6c;background:#b0c0b7;color:#fff7e5}
.scene.wilderness{background:#728c89}.scene.secret{background:#859497}.scene.terrace{background:#a1b3b2}.scene.compact{height:206px}
.scene-image{position:absolute;inset:0}.scene-state-layer{z-index:1;pointer-events:none;filter:drop-shadow(0 5px 5px #182b2b77)}.scene-landscape{position:absolute;inset:0;width:100%;height:100%;fill:none}.scene-moon{fill:#f4dfac;opacity:.7}.mountain.far{fill:#667f79;opacity:.5}.mountain.middle{fill:#466762;opacity:.6}.scene-mist{fill:#d8e0ce;opacity:.6}.mountain.near{fill:#2f5350;opacity:.65}
.settlement-roofs,.scene-ruins,.scene-pine{fill:#3a5550;stroke:#d6c79d;stroke-width:3;opacity:.85}.scene-pine{stroke-width:2}.scene-ruins{fill:#536761}.scene-gate{stroke:#b2a179;stroke-width:4;fill:url(#gate-stone)}.gate-doors{fill:url(#gate-door);stroke-width:3}.gate-light{fill:#f7e3ae;stroke:#f9edc9;opacity:.95}.gate-lightning{fill:none;stroke:#fff5d2;stroke-width:5}
.scene-vignette{position:absolute;inset:0;background:linear-gradient(90deg,#102d32e6,#1a3c3f66 68%,#28434420),linear-gradient(0deg,#18353999,transparent 70%)}
.scene-copy{z-index:2;position:absolute;left:32px;right:80px;bottom:30px}.scene-copy .eyebrow{color:#f2deb2;font-size:14px}.scene-copy h2{font-size:36px;line-height:1.4;margin:10px 0;letter-spacing:.12em;color:inherit}.scene-copy p{font-size:16px;color:#fff1d7;line-height:1.7}.scene-seal{z-index:2;position:absolute;right:24px;top:24px;color:#f5dfb1;border:1px solid #e5d4aa;padding:7px;font-size:16px;line-height:1.4}
@media(max-width:760px){.scene{height:232px}.scene.compact{height:154px}.scene-copy{left:22px;right:56px;bottom:20px}.scene-copy h2{font-size:27px;margin:6px 0}.scene-copy p{font-size:14px}.scene-copy .eyebrow{font-size:13px}.scene-seal{right:16px;top:16px;font-size:13px;padding:5px}}
.photo-gate-state .scene-gate{fill:none;stroke:none}.photo-door-outline{fill:none!important;stroke:#b5985e!important;stroke-width:1;opacity:.15}.photo-gate-state .gate-light{opacity:1}.photo-lightning{fill:none;stroke:#fff4d4;stroke-width:2;filter:drop-shadow(0 0 3px #fff0c2)}
</style>
