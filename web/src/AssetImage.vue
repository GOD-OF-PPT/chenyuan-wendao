<script setup lang="ts">
import {computed,ref,watch} from 'vue';
const emit=defineEmits<{state:[{state:'missing'|'loading'|'ready'|'failed';path:string}]}>();
const props=withDefaults(defineProps<{path?:string;assetId:string;position?:string;fit?:'cover'|'contain';eager?:boolean}>(),{path:'',position:'50% 50%',fit:'cover',eager:false});
const source=computed(()=>props.path?new URL(`${import.meta.env.BASE_URL}${props.path}`,document.baseURI).href:'');
const state=ref<'missing'|'loading'|'ready'|'failed'>('missing'),image=ref<HTMLImageElement>();
watch(source,value=>{state.value=value?'loading':'missing';},{immediate:true});
watch([state,source],()=>emit('state',{state:state.value,path:props.path}),{immediate:true});
function current(node:HTMLImageElement){return node===image.value && node.getAttribute('src')===source.value;}
async function loaded(event:Event){const node=event.currentTarget as HTMLImageElement;if(!current(node))return;try{await node.decode();if(current(node))state.value=node.naturalWidth>0?'ready':'failed';}catch{if(current(node))state.value='failed';}}
function failed(event:Event){if(current(event.currentTarget as HTMLImageElement))state.value='failed';}
</script>
<template><div class="asset-image" :data-asset-id="assetId" :data-art-state="state" :data-art-path="path"><div v-if="state!=='ready'" class="asset-fallback"><slot/></div><img v-if="source" :key="source" ref="image" :src="source" alt="" aria-hidden="true" :loading="eager?'eager':'lazy'" decoding="async" :style="{visibility:state==='ready'?'visible':'hidden',objectFit:fit,objectPosition:position}" @load="loaded" @error="failed"></div></template>
<style scoped>.asset-image{position:relative;width:100%;height:100%;overflow:hidden}.asset-image>img{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.asset-fallback{width:100%;height:100%}</style>
