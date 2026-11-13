<script setup lang="ts">
import { inject, onScopeDispose, ref } from 'vue';
import { gameFocusKey } from './focus';
import { demoCatalog } from '../../src/demo.ts';
import { demoLink } from './demo-loader';
const demoMenu = ref<HTMLDialogElement>(),
  focus = inject(gameFocusKey)!;
const demoMenuNodes = demoCatalog.map((node) => ({
  ...node,
  href: demoLink(node.id),
}));
onScopeDispose(() => focus.release(demoMenu.value));
defineExpose({ element: demoMenu });
</script>
<template><dialog ref="demoMenu" class="paper demo-menu" aria-labelledby="demo-menu-title"><header><h2 id="demo-menu-title" tabindex="-1" data-dialog-initial>演示节点</h2><button @click="demoMenu?.close()" aria-label="关闭演示节点">关闭</button></header><p>以下是由正式指令回放生成的演示存档。进入不会替换正常进度，演示不计入正常新档通关验证。</p><nav v-once class="demo-list" aria-label="演示节点选择"><a v-for="node in demoMenuNodes" :key="node.id" :href="node.href" :data-testid="'demo-node-'+node.id"><strong>{{node.label}}</strong><span>{{node.description}}</span></a></nav></dialog></template>
