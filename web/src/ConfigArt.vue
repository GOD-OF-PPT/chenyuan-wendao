<script setup lang="ts">
import {computed} from 'vue';
import * as C from '../../src/full/content';
import {JADE_FORMS} from './equipment-choreography';
import AssetImage from './AssetImage.vue';
import GameIcon from './GameIcon.vue';
const props=defineProps<{ids:string[];relic:boolean}>();
const objects=computed(()=>props.ids.map(id=>{
 const book=props.relic?C.relics:C.skills,known=Object.hasOwn(book,id),form=JADE_FORMS[id]?.form;
 return{id,name:known?book[id].name:'物件',path:known?(props.relic?'art/v2/equipment/'+id+'-v1.webp':form?'art/v2/study/'+form+'-v1.webp':''):''};
}));
</script>
<template>
 <div class="config-art" :class="{'config-art-group':ids.length>1}" data-testid="config-art" data-preview="true" :data-domain="relic?'relic':'skill'">
  <figure v-for="object in objects" :key="object.id" :data-object="object.id">
   <AssetImage :path="object.path" :asset-id="'config-proposed-'+object.id" fit="contain" eager aria-hidden="true"><GameIcon :kind="relic?'relic':'skill'" :id="object.id"/><small>{{object.name}} · 绘图暂缺</small></AssetImage>
   <figcaption><small>{{ids.length>1?object.name:'拟配'}}</small></figcaption>
  </figure>
  <small v-if="ids.length>1" class="config-art-proposal" data-testid="config-preview-label">拟配</small>
 </div>
</template>
<style scoped>
@layer game{
:global(#app .configuration-dialog [data-testid=config-focus]>.changed){background:transparent!important}
.config-art{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);align-items:center;flex:0 0 180px;width:180px;min-width:0;gap:6px;isolation:isolate}
.config-art-group{flex-basis:300px;width:300px;grid-template-columns:repeat(3,minmax(0,1fr))}
.config-art-group figure{grid-row:1}.config-art-proposal{grid-column:1/-1;grid-row:2;text-align:center}
.config-art figure{position:relative;margin:0;min-width:0;text-align:center}
.config-art figure:before{content:'';position:absolute;left:8%;right:8%;height:12px;bottom:28px;border-radius:50%;background:#071c2580;filter:blur(4px);z-index:-1}
.config-art .asset-image{height:180px;overflow:visible;filter:drop-shadow(0 5px 3px #071c2566)}
.config-art-group .asset-image{height:144px}
.config-art :deep(.asset-fallback){display:grid;grid-template-rows:minmax(0,1fr) auto;place-items:center;gap:4px}
#app .config-art :deep(.game-icon){width:72px;height:72px;flex:none;color:var(--jade,#b4d8bd)}
.config-art small{display:block;font-size:14px;line-height:1.5;color:var(--jade,#b4d8bd);overflow-wrap:anywhere}
.config-art figcaption{padding-top:4px}}
</style>
