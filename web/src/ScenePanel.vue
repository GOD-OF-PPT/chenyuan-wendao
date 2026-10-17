<script setup lang="ts">
import { computed } from 'vue';
import type { Game } from '../../src/full/types.ts';
import { scenePresentation } from './scene-presentation';
const props = defineProps<{ game: Game; eyebrow: string; title: string; description: string }>();
const scene = computed(() => scenePresentation(props.game));
</script>
<template>
  <section class="scene" :class="[scene.key, scene.location, {compact:scene.compact}]" data-testid="scene" :data-scene="scene.key" :data-location="scene.location" :data-gate="scene.gate" aria-label="当前行旅">
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
      <g v-if="scene.key==='terrace'" class="scene-gate" :class="scene.gate">
        <path class="gate-frame" d="M724 412V190h36v222 M964 412V190h36v222 M700 190h322l-42-27-118-50-118 50Z M692 417h338 M667 440h390 M640 466h444"/>
        <path v-if="scene.gate!=='opened'" class="gate-doors" d="M775 205h78v195h-78Z M871 205h78v195h-78Z"/>
        <path v-else class="gate-light" d="M778 400V207q83-66 166 0v193Z"/>
        <path v-if="scene.gate==='storm'" class="gate-lightning" d="m920 20-56 85 48-8-60 87 M1034 42l-32 72 36-11-49 89"/>
      </g>
      <path v-if="scene.key==='wilderness'" class="scene-pine" d="M1050 450V160m0 28-66 92h132Zm0 48-98 111h182Zm0 65-130 104h245Z"/>
    </svg>
    <div class="scene-vignette" aria-hidden="true"></div>
    <div class="scene-copy"><span class="eyebrow">{{eyebrow}}</span><h2>{{title}}</h2><p>{{description}}</p></div>
    <span class="scene-seal" aria-hidden="true">问<br>道</span>
  </section>
</template>
<style scoped>
.scene{position:relative;height:340px;isolation:isolate;overflow:hidden;border:1px solid #777e6c;background:#b0c0b7;color:#fff7e5}
.scene.wilderness{background:#728c89}.scene.secret{background:#859497}.scene.terrace{background:#a1b3b2}.scene.compact{height:206px}
.scene-landscape{position:absolute;inset:0;width:100%;height:100%;fill:none}.scene-moon{fill:#f4dfac;opacity:.7}.mountain.far{fill:#667f79;opacity:.5}.mountain.middle{fill:#466762;opacity:.6}.scene-mist{fill:#d8e0ce;opacity:.6}.mountain.near{fill:#2f5350;opacity:.65}
.settlement-roofs,.scene-ruins,.scene-pine{fill:#3a5550;stroke:#d6c79d;stroke-width:3;opacity:.85}.scene-pine{stroke-width:2}.scene-ruins{fill:#536761}.scene-gate{stroke:#c5b58e;stroke-width:7;fill:#47605b}.gate-doors{fill:#334f4d;stroke-width:3}.gate-light{fill:#f7e3ae;stroke:#f9edc9;opacity:.95}.gate-lightning{fill:none;stroke:#fff5d2;stroke-width:5}
.scene-vignette{position:absolute;inset:0;background:linear-gradient(90deg,#102d32e6,#1a3c3f66 68%,#28434420),linear-gradient(0deg,#18353999,transparent 70%)}
.scene-copy{position:absolute;left:32px;right:80px;bottom:30px}.scene-copy .eyebrow{color:#f2deb2;font-size:14px}.scene-copy h2{font-size:36px;line-height:1.4;margin:10px 0;letter-spacing:.12em;color:inherit}.scene-copy p{font-size:16px;color:#fff1d7;line-height:1.7}.scene-seal{position:absolute;right:24px;top:24px;color:#f5dfb1;border:1px solid #e5d4aa;padding:7px;font-size:16px;line-height:1.4}
@media(max-width:760px){.scene{height:232px}.scene.compact{height:154px}.scene-copy{left:22px;right:56px;bottom:20px}.scene-copy h2{font-size:27px;margin:6px 0}.scene-copy p{font-size:14px}.scene-copy .eyebrow{font-size:13px}.scene-seal{right:16px;top:16px;font-size:13px;padding:5px}}
</style>
