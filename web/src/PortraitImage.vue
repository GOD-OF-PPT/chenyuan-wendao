<script setup lang="ts">
import AssetImage from './AssetImage.vue';
import {PORTRAIT_ASSETS} from './assets';
defineProps<{id:string;fallback:string}>();
</script>
<template><AssetImage :path="PORTRAIT_ASSETS[id]" :asset-id="`portrait-${id}`" fit="contain" class="portrait-image"><span class="portrait-fallback" aria-hidden="true">{{fallback}}</span></AssetImage></template>
<style scoped>.portrait-image{background:radial-gradient(ellipse,#c3cdb499,transparent 75%)}.portrait-fallback{display:grid;place-items:center;width:100%;height:100%;font-size:32px;color:#36594f;background:#e9eadc;border:1px solid #aaad8e}</style>
