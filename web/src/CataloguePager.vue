<script setup lang="ts">
defineProps<{page:number;pages:number;total:number;label?:string}>();
defineEmits<{change:[number]}>();
</script>
<template><nav class="catalogue-pager" :aria-label="(label??'目录')+'翻页'"><button type="button" :disabled="page===0" @click="$emit('change',page-1)" data-testid="catalogue-prev">上一页</button><span>{{page+1}} / {{pages}} 页 <small>共 {{total}} 项</small></span><button type="button" :disabled="page+1>=pages" @click="$emit('change',page+1)" data-testid="catalogue-next">下一页</button></nav></template>
