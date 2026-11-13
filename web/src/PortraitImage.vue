<script setup lang="ts">
import AssetImage from './AssetImage.vue';
import {PORTRAIT_ASSETS} from './assets';
defineProps<{id:string;fallback:string}>();
</script>
<template><AssetImage :path="PORTRAIT_ASSETS[id]" :asset-id="`portrait-${id}`" fit="contain" class="portrait-image"><span class="portrait-fallback" aria-hidden="true">{{fallback}}</span></AssetImage></template>
<style scoped>
@layer game{.portrait-image{background:radial-gradient(ellipse,color-mix(in srgb, var(--palette-muted) 60%, transparent),transparent 75%)}.portrait-fallback{display:grid;place-items:center;width:100%;height:100%;font-size:calc(1.7777778rem * var(--font-scale,1));color:var(--palette-raised);background:var(--palette-ink);border:1px solid var(--palette-muted)}}
</style>
