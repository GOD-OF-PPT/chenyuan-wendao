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
@layer game{
.item-artifact{position:relative;min-width:0;min-height:0;width:100%;height:100%;isolation:isolate;pointer-events:none}
.item-artifact>.asset-image{position:absolute;inset:0;width:100%;height:100%;background:none}
.item-artifact :deep(.asset-fallback){display:grid;grid-template-rows:minmax(0,1fr) auto;align-items:center;justify-items:center;gap:6px;padding:8px;box-sizing:border-box}
.item-artifact :deep(.game-icon){width:100px;height:100%;max-height:120px;color:var(--palette-muted)}
.item-artifact small{font-size:14px;line-height:1.65;text-align:center}
.item-artifact-plate{position:absolute;inset:20% 14% 12%;z-index:-1;border:1px solid color-mix(in srgb, var(--palette-line) 25.09803922%, transparent);border-radius:32% 9% 27% 7%;transform:rotate(-5deg);background:repeating-linear-gradient(0deg,color-mix(in srgb, var(--palette-line) 3.52941176%, transparent) 0 2px,transparent 2px 6px),linear-gradient(35deg,var(--palette-panel),color-mix(in srgb, var(--palette-raised) 60%, transparent),var(--palette-panel));box-shadow:0 12px 16px color-mix(in srgb, var(--palette-night) 26.66666667%, transparent)}
.item-artifact-plate>i{position:absolute;left:8%;right:8%;bottom:10%;height:1px;background:color-mix(in srgb, var(--palette-line) 14.90196078%, transparent)}.item-artifact-plate>i+i{bottom:13%}
.item-artifact-diagram .item-artifact-plate{inset:7% 12%;border:1px solid color-mix(in srgb, var(--palette-muted) 36.07843137%, transparent);border-radius:3px;transform:none;background:linear-gradient(110deg,var(--palette-panel),var(--palette-raised),var(--palette-panel));box-shadow:inset 5px 0 color-mix(in srgb, var(--palette-line) 14.90196078%, transparent)}
.item-artifact-diagram>.asset-image{filter:saturate(.35);opacity:.76}}
</style>
