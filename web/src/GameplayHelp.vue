<script setup lang="ts">
import { inject, onScopeDispose, ref } from 'vue';
import { gameFocusKey } from './focus';
import { guideCatalog } from './guidance';
import CataloguePager from './CataloguePager.vue';
withDefaults(defineProps<{ practiceAvailable?: boolean }>(), {
  practiceAvailable: false,
});
const emit = defineEmits<{
    reset: [];
    practice: [];
  }>(),
  guidanceEnabled = defineModel<boolean>('enabled', { required: true });
const gameplayHelp = ref<HTMLDialogElement>(),
  helpPage = ref(0),
  focus = inject(gameFocusKey)!;
const resetSkipped = () => emit('reset');
function selectTopic(id: string) {
  helpPage.value = guideCatalog.findIndex((guide) => guide.id === id);
}
onScopeDispose(() => focus.release(gameplayHelp.value));
defineExpose({ element: gameplayHelp, selectTopic });
</script>
<template>
  <dialog
    ref="gameplayHelp"
    class="paper settings game-help"
    aria-labelledby="gameplay-help-title"
    ><header
      ><h2 id="gameplay-help-title" tabindex="-1" data-dialog-initial
        >玩法帮助</h2
      ><button
        type="button"
        aria-label="关闭玩法帮助"
        @click="gameplayHelp?.close()"
        >关闭</button
      ></header
    ><p
      >提示随当前行动与状态出现，也可逐项重看。约30分钟只用于理解玩法，不限定到达境界或通关时间。</p
    ><p class="small"
      >跳过或关闭引导仅影响本页显示，刷新后可再次出现；不会改变成长、物品、掉落或存档。设置与当前提示均可回到这里。</p
    ><details class="help-storage-details"
      ><summary>存档与行动记录</summary
      ><p
        >行动完成并保存后，收获才会计入行囊。保存失败时请沿原操作重试；若已写入，只会重读结果，不会重复扣费或发奖。新安排允许离开累计最多8小时；返回时核对完整周期，保留未满一轮的余量。预算、保留线、寿元、危险或下一次选择先到先停，暂停后不再积累。旧在线安排须明确继续后才从当下起累计，不补领过去时段。</p
      ><p
        >技术说明：收获明细对应操作回执，本次限额对应授权，下次选择对应草案，准备记录对应完整快照。commandId、runId与revision用于防止重复或过期写入，不是玩家需要填写的参数。</p
      ></details
    ><button
      type="button"
      data-testid="guide-toggle"
      :aria-pressed="guidanceEnabled"
      @click="
        guidanceEnabled = !guidanceEnabled;
        resetSkipped();
      "
      >本页引导：{{ guidanceEnabled ? '开启' : '关闭' }}</button
    ><button
      v-if="practiceAvailable"
      data-testid="help-first-practice"
      @click="emit('practice')"
      >重开入门练手：杂务、辅助与首战</button
    ><section class="help-chapter" :key="guideCatalog[helpPage].id"
      ><span class="help-folio" aria-hidden="true"
        >行道录 · {{ String(helpPage + 1).padStart(2, '0') }}</span
      ><h3>{{ guideCatalog[helpPage].title }}</h3
      ><p>{{ guideCatalog[helpPage].body }}</p></section
    ><CataloguePager
      :page="helpPage"
      :pages="guideCatalog.length"
      :total="guideCatalog.length"
      label="帮助主题"
      @change="helpPage = $event"
  /></dialog>
</template>
