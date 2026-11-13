<script setup lang="ts">
import { computed, inject, onScopeDispose, ref } from 'vue';
import type { useGame } from './store';
import type { useLocalExperience } from './use-local-experience';
import type { TrackingTarget } from '../../src/full/goals.ts';
import { gameFocusKey } from './focus';
import { useActionView } from './use-action-view';
import GameIcon from './GameIcon.vue';
import LocalExperiencePanel from './LocalExperiencePanel.vue';
const props = defineProps<{
    experience: ReturnType<typeof useLocalExperience>;
    target: TrackingTarget;
    saveLabel: string;
    exportError: string;
    importNotice: string;
}>();
const emit = defineEmits<{
    help: [
    ];
    demos: [
    ];
    life: [
        event: MouseEvent
    ];
    retire: [
    ];
    import: [
        event: Event
    ];
    export: [
    ];
    raw: [
    ];
    restart: [
    ];
    restore: [
    ];
}>();
const store = inject<ReturnType<typeof useGame>>('game-scene')!, focus = inject(gameFocusKey)!;
const game = computed(() => store.game), core = computed(() => game.value?.core), uiLocked = computed(() => store.busy || !store.available), saveDisplayLabel = computed(() => props.saveLabel);
const { can } = useActionView(store);
const settings = ref<HTMLDialogElement>(), importButton = ref<HTMLButtonElement>(), importInput = ref<HTMLInputElement>();
const fontScale = computed({ get: () => props.experience.preferences.value.fontScale, set: (value: 1 | 1.5 | 2) => { void props.experience.setPreferences({ fontScale: value }); } });
const reduceMotion = computed({ get: () => props.experience.preferences.value.reduceMotion, set: (value: boolean) => { void props.experience.setPreferences({ reduceMotion: value }); } });
const showGameplayHelp = () => emit('help'), showDemoMenu = () => emit('demos'), showLife = (event: MouseEvent) => emit('life', event), requestEnd = (_type: 'RETIRE') => emit('retire');
const importFile = (event: Event) => emit('import', event), exportSave = () => emit('export'), exportRaw = () => emit('raw'), reset = () => emit('restart'), restore = () => emit('restore');
onScopeDispose(() => focus.release(settings.value));
defineExpose({ element: settings, importButton });
</script>
<template><dialog ref="settings" class="paper settings game-settings" aria-labelledby="settings-title"><header><h2 id="settings-title" tabindex="-1" data-dialog-initial>行旅设置</h2><button @click="settings?.close()" aria-label="关闭设置"><GameIcon kind="action" id="close"/><span>关闭</span></button></header>
      <div class="settings-grid">
        <section class="settings-display" aria-labelledby="settings-display-title"><h3 id="settings-display-title">观照 · 行道</h3>
          <p>进度仅保存在当前浏览器。导出备份可用于迁移；清理浏览器数据可能丢失进度。</p>
          <label class="setting-row"><span>文字大小</span><select name="text-size" v-model.number="fontScale" :disabled="experience.busy.value||!experience.ready.value"><option :value="1">100%</option><option :value="1.5">150%</option><option :value="2">200%</option></select></label>
          <label class="setting-row"><span>减少演出动效</span><input type="checkbox" v-model="reduceMotion" data-testid="reduce-effects" :disabled="experience.busy.value||!experience.ready.value"></label>
          <div class="settings-actions"><button type="button" data-testid="gameplay-help-entry" @click="showGameplayHelp">玩法帮助与重看</button><button data-testid="demo-menu-open" @click="showDemoMenu" :disabled="store.busy">演示节点</button><button v-if="game" data-testid="settings-life" @click="showLife">查看修仙生平</button><button v-if="game?.status==='active'" data-testid="settings-retire" @click="requestEnd('RETIRE')" :disabled="store.busy || !can({type:'RETIRE'})">主动归隐</button></div>
        </section>
        <section class="settings-saves" aria-labelledby="settings-saves-title"><h3 id="settings-saves-title">留卷 · 续缘</h3>
          <p class="small" role="status" data-testid="settings-save-status">{{saveDisplayLabel}}</p><p v-if="store.error||exportError||importNotice" class="settings-error" role="alert" data-testid="settings-error">{{store.error||exportError||importNotice}}</p>
          <div class="settings-actions"><button ref="importButton" type="button" class="file-button" data-testid="import-open" @click="importInput?.click()" :disabled="uiLocked">导入存档</button><input ref="importInput" hidden aria-label="导入存档" data-testid="import" name="save-import" type="file" accept=".json,application/json" @change="importFile" :disabled="uiLocked">
          <button v-if="game" @click="exportSave">导出当前进度</button><button data-testid="raw-backup" @click="exportRaw" :disabled="store.busy">导出原件备份</button><button v-if="game" class="danger" data-testid="restart" @click="reset" :disabled="uiLocked">重新开始</button></div>
          <button v-if="game" class="settings-checkpoint" data-testid="restore-checkpoint" :aria-describedby="!store.hasCheckpoint?'checkpoint-unavailable':undefined" @click="restore" :disabled="uiLocked || !store.hasCheckpoint"><GameIcon kind="action" id="restore"/> 恢复完整准备检查点</button>
          <p v-if="game&&!store.hasCheckpoint" id="checkpoint-unavailable" class="small">当前没有已验证的完整准备检查点。</p>
        </section>
      </div>
      <LocalExperiencePanel :experience="experience" :run-id="core?.runId??null" :target="target"/>
    </dialog></template>
