<script setup lang="ts">
import type {LocationId} from '../../src/full/content';
import type {TrackingTarget} from '../../src/full/goals';
const props=defineProps<{location:LocationId}>();
const emit=defineEmits<{locations:['source'|'purchase'];track:[TrackingTarget]}>();
const labels:Record<LocationId,string>={cave:'查看修行目标',wilderness:'查看山野取材',sect:'查看宗门委托',market:'查看坊市交易',secret:'查看古境取材',terrace:'查看渡劫准备'};
function inspect(){
 if(props.location==='cave'||props.location==='terrace')emit('track',{kind:'breakthrough'});
 else emit('locations',props.location==='market'?'purchase':'source');
}
</script>
<template>
 <footer class="adventure-confirm" data-testid="journey-local-actions">
  <small>查看不执行，原活动与草案保留。</small>
  <button class="primary" data-testid="journey-local-open" @click="inspect">{{labels[location]}}</button>
 </footer>
</template>
