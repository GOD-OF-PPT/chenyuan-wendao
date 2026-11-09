<script setup lang="ts">
const props=defineProps<{prefix:string}>();
const id=(name:string)=>props.prefix+'-'+name;
const surfaces=[
 {name:'wood',colors:['#a28c62','#645938','#354536','#182e2b']},
 {name:'paper',colors:['#d6d6b4','#a8b18e','#818f72','#4a6352']},
 {name:'bronze',colors:['#b0a479','#e1cca0','#637666','#233e37']},
 {name:'jade',colors:['#accdb3','#72a58c','#356d5e','#133d38']},
 {name:'stone',colors:['#8d9c8b','#5d7b6c','#3c5c50','#1b3834']},
 {name:'fiber',colors:['#cbc49b','#a79e72','#7b8354','#384f38']},
];
</script>
<template>
 <defs data-testid="source-material-defs" :data-material-prefix="prefix">
  <linearGradient v-for="surface in surfaces" :id="id(surface.name+'-shade')" :key="surface.name" x1=".1" y1="0" x2=".8" y2="1">
   <stop offset="0" :stop-color="surface.colors[0]"/><stop offset=".21" :stop-color="surface.colors[1]"/><stop offset=".64" :stop-color="surface.colors[2]"/><stop offset="1" :stop-color="surface.colors[3]"/>
  </linearGradient>
  <pattern v-for="surface in surfaces" :id="id(surface.name)" :key="surface.name" patternUnits="userSpaceOnUse" width="320" height="240">
   <rect width="320" height="240" :fill="'url(#'+id(surface.name+'-shade')+')'"/>
   <g v-if="surface.name==='wood'||surface.name==='fiber'" fill="none" :stroke="surface.name==='wood'?'#203c2b':'#f0dfac'" :stroke-opacity="surface.name==='wood'?.3:.23" stroke-width=".8">
    <line v-for="n in surface.name==='wood'?16:32" :key="n" :x1="n*10-3" y1="0" :x2="n*10+(n%3)*3" y2="240"/>
   </g>
   <g v-else-if="surface.name==='bronze'" fill="#2c6453" fill-opacity=".28">
    <ellipse v-for="n in 22" :key="n" :cx="(n*71)%320" :cy="(n*47)%240" :rx="n%4+1" :ry="n%3+.6"/>
    <line x1="42" y1="8" x2="215" y2="231" stroke="#e7d9a7" stroke-opacity=".32" stroke-width="1"/>
   </g>
   <g v-else-if="surface.name==='jade'" fill="none" stroke="#b3d7b4" stroke-opacity=".2" stroke-width=".8">
    <ellipse v-for="n in 9" :key="n" :cx="n*39" :cy="n*17" :rx="n*9" ry="105" transform="rotate(-28 160 120)"/>
   </g>
   <g v-else :fill="surface.name==='paper'?'#354b35':'#d0cfad'" :fill-opacity="surface.name==='paper'?.18:.16">
    <circle v-for="n in 75" :key="n" :cx="(n*71)%320" :cy="(n*43)%240" :r="n%3===0?1.1:.5"/>
   </g>
  </pattern>
  <filter :id="id('surface')" x="-5%" y="-5%" width="110%" height="112%" color-interpolation-filters="sRGB">
   <feTurbulence type="fractalNoise" baseFrequency=".16 .48" numOctaves="2" seed="17" stitchTiles="stitch" result="grain"/>
   <feColorMatrix in="grain" type="saturate" values="0" result="gray"/>
   <feComponentTransfer in="gray" result="texture"><feFuncA type="linear" slope=".28"/></feComponentTransfer>
   <feComposite in="texture" in2="SourceAlpha" operator="in" result="cut"/>
   <feBlend in="SourceGraphic" in2="cut" mode="soft-light" result="body"/>
   <feDropShadow in="body" dx="1" dy="2" stdDeviation="1" flood-color="#031815" flood-opacity=".55"/>
  </filter>
 </defs>
</template>
<style>
#app .source-field.ta08-field .ta08-resource-tool{stroke-width:1.3;color:#9fae8a}
#app .source-field.ta08-field .ta08-task-drawing{stroke-width:1.15;stroke:#91a48b;filter:drop-shadow(0 4px 3px #061d2580)}
#app .source-field.ta08-field .ta08-tool-wood{stroke:#8c906c}
#app .source-field.ta08-field .ta08-tool-metal{stroke:#a4b79a}
#app .source-field.ta08-field .ta08-tool-fiber{stroke:#a6ae7d}
#app .source-field.ta08-field .ta08-task-wood{stroke:#8b9b76}
#app .source-field.ta08-field .ta08-task-bronze{stroke:#b9ab7c}
#app .source-field.ta08-field .ta08-task-paper{stroke:#b0c2a0}
#app .source-field.ta08-field .ta08-task-stone{stroke:#7d9a88}
#app .source-field.ta08-field .ta08-task-jade{stroke:#9cc5a4}
#app .source-field.ta08-field .ta08-task-grain{stroke:#435e4899;stroke-width:1}
#app .source-field.ta08-field .ta08-task-ink{stroke:#314e3bd9;stroke-width:1.5}
#app .source-field.ta08-field .ta08-task-inlay{stroke:#a8ac78;stroke-width:1.2}
</style>
