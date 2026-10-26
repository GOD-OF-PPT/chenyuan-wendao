<script setup lang="ts">
import {computed} from 'vue';
import * as C from '../../src/full/content';
import AssetImage from './AssetImage.vue';
import GameIcon from './GameIcon.vue';
const props=defineProps<{itemId:string;owned:boolean}>();
const item=computed(()=>Object.hasOwn(C.items,props.itemId)?C.items[props.itemId]:null);
const path=computed(()=>item.value?'art/v2/items/'+props.itemId+'-v1.webp':'');
</script>
<template>
 <div class="item-artifact" data-testid="item-artifact" :data-item="itemId" :data-owned="owned" :class="{'item-artifact-diagram':!owned}">
  <div v-if="item" class="item-artifact-plate" aria-hidden="true"><i/><i/></div>
  <AssetImage v-if="item" :path="path" :asset-id="'inventory-object-'+itemId" fit="contain" eager><GameIcon kind="item" :id="itemId"/><small>{{item.name}} · 绘图暂缺</small></AssetImage>
 </div>
</template>
<style scoped>
.item-artifact{position:relative;min-width:0;min-height:0;width:100%;height:100%;isolation:isolate;pointer-events:none}
.item-artifact>.asset-image{position:absolute;inset:0;width:100%;height:100%;background:none}
.item-artifact :deep(.asset-fallback){display:grid;grid-template-rows:minmax(0,1fr) auto;align-items:center;justify-items:center;gap:6px;padding:8px;box-sizing:border-box}
.item-artifact :deep(.game-icon){width:100px;height:100%;max-height:120px;color:#b8ccaa}
.item-artifact small{font-size:14px;line-height:1.65;text-align:center}
.item-artifact-plate{position:absolute;inset:20% 14% 12%;z-index:-1;border:1px solid #8fa89240;border-radius:32% 9% 27% 7%;transform:rotate(-5deg);background:repeating-linear-gradient(0deg,#739d7c09 0 2px,transparent 2px 6px),linear-gradient(35deg,#193b38,#365b4999,#153532);box-shadow:0 12px 16px #041f2844}
.item-artifact-plate>i{position:absolute;left:8%;right:8%;bottom:10%;height:1px;background:#93a28626}.item-artifact-plate>i+i{bottom:13%}
.item-artifact-diagram .item-artifact-plate{inset:7% 12%;border:1px solid #b4c5a75c;border-radius:3px;transform:none;background:linear-gradient(110deg,#173b3b,#21443f,#183a3c);box-shadow:inset 5px 0 #8ba28326}
.item-artifact-diagram>.asset-image{filter:saturate(.35);opacity:.76}
</style>
