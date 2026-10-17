import { computed, ref, watch, type ComputedRef } from 'vue';
import {useSession} from './session';
import { getTrackedGoal, parseTrackingTarget, type TrackingTarget } from '../../src/full/goals.ts';
import type { Game } from '../../src/full/types.ts';

export function useTracking(game: ComputedRef<Game | null>) {
  const key=useSession().trackingKey;
  const target = ref<TrackingTarget>({ kind: 'breakthrough' }), notice = ref('');
  watch(() => game.value?.core.runId, runId => {
    target.value = { kind: 'breakthrough' }; notice.value = '';
    if (!runId) return;
    try {
      const raw = localStorage.getItem(key), value = raw ? JSON.parse(raw) : null;
      if (value?.version === 1 && value.runId === runId) target.value = parseTrackingTarget(value.target);
    } catch { notice.value = '追踪偏好未能读取，已显示当前突破目标。'; }
  }, { immediate: true });
  function select(value: TrackingTarget) {
    try { target.value = parseTrackingTarget(value); }
    catch { notice.value = '目标数量须为有效正整数，追踪目标未改变。'; return; }
    notice.value = '';
    try { localStorage.setItem(key, JSON.stringify({ version: 1, runId: game.value?.core.runId, target: target.value })); }
    catch { notice.value = '追踪选择仅在本页保留；游戏进度仍按存档状态保存。'; }
  }
  const goal = computed(() => game.value ? getTrackedGoal(game.value, target.value) : null);
  return { target, goal, notice, select };
}
