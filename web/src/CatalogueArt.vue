<script setup lang="ts">
import AssetImage from './AssetImage.vue';
import GameIcon from './GameIcon.vue';
defineProps<{kind:'supplies'|'alchemy'|'study'}>();
const images={supplies:'art/v2/catalogue/supplies-v1.webp',alchemy:'art/v2/catalogue/alchemy-v1.webp',study:'art/v2/catalogue/study-v1.webp'};
</script>
<template><figure class="catalogue-art" data-testid="catalogue-art" :data-kind="kind" aria-hidden="true"><div class="catalogue-art-halo"></div><AssetImage :path="images[kind]" :asset-id="'catalogue-'+kind" fit="contain"><GameIcon kind="nav" :id="kind==='supplies'?'inventory':kind==='alchemy'?'cultivate':'explore'"/></AssetImage><div class="catalogue-art-plinth"></div></figure></template>
