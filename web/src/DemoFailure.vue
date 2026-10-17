<script setup lang="ts">import {normalLink} from './demo-loader';defineProps<{message:string}>();</script>
<template><main class="paper demo-failure" role="alert"><h1 tabindex="-1">演示节点未打开</h1><p>{{message}}</p><p>正常进度没有被读取或替换。请从正常游戏的“演示节点”菜单重新选择。</p><a :href="normalLink()">返回正常游戏</a></main></template>
