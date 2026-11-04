<script setup lang="ts">
import {nextTick} from 'vue';
import type {LocationId} from '../../src/full/content';
import type {TrackingTarget} from '../../src/full/goals';
const props=defineProps<{location:LocationId}>();
const emit=defineEmits<{locations:['source'|'purchase'];track:[TrackingTarget]}>();
const labels:Record<LocationId,string>={cave:'查看修行目标',wilderness:'查看山野取材',sect:'查看宗门委托',market:'查看坊市交易',secret:'查看古境取材',terrace:'查看渡劫准备'};
function inspect(event:Event){
 if(props.location==='cave'||props.location==='terrace')emit('track',{kind:'breakthrough'});
 else{
  const origin=event.currentTarget as HTMLElement;
  const catalogue=origin.closest('[data-testid="explore-catalogue"]');
  const mode=props.location==='market'?'purchase':'source';
  emit('locations',mode);
  void nextTick(()=>{
   const tab=catalogue?.querySelector<HTMLButtonElement>('[data-testid="explore-mode-'+mode+'"]');
   if(tab?.isConnected&&tab.checkVisibility()&&tab.getAttribute('aria-pressed')==='true'&&(document.activeElement===origin||document.activeElement===document.body))tab.focus({preventScroll:true});
  });
 }
}
</script>
<template>
 <footer class="adventure-confirm" data-testid="journey-local-actions">
  <small>只查看，不消耗物资。</small>
  <button class="primary" data-testid="journey-local-open" @click="inspect">{{labels[location]}}</button>
 </footer>
</template>
