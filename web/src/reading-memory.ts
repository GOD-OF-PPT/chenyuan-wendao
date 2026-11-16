import { computed, ref, watch } from 'vue';
/** Reading cursors; never commands or authority. */
export function useReadingMemory(context: () => string, keys: () => string[]) {
  const cursors = ref<Record<string, { index: number; anchor?: string }>>({}),
    relocated = ref(false);
  const clamp = (n: number, list: string[]) =>
    Math.max(0, Math.min(n, Math.max(0, list.length - 1)));
  const page = computed({
    get: () => cursors.value[context()]?.index ?? 0,
    set: (n: number) => {
      const list = keys(),
        index = clamp(n, list);
      cursors.value[context()] = { index, anchor: list[index] };
      relocated.value = false;
    },
  });
  function reconcile() {
    const list = keys(),
      old = cursors.value[context()],
      found = old?.anchor === undefined ? -1 : list.indexOf(old.anchor),
      index = found >= 0 ? found : clamp(old?.index ?? 0, list);
    relocated.value = old?.anchor !== undefined && found < 0;
    cursors.value[context()] = { index, anchor: list[index] };
  }
  watch(() => [context(), keys()] as const, reconcile, {
    immediate: true,
    flush: 'post',
  });
  return {
    page,
    relocated,
    reset: () => {
      cursors.value = {};
      reconcile();
    },
  };
}
