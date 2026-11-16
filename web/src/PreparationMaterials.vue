<script lang="ts">
import { nextTick } from 'vue';
import { visibleFocusTarget, revealFocus } from './focus';
const materialOrigins = new WeakMap<
  HTMLElement,
  { id: string; route: string | undefined }
>();
function rememberMaterialOrigin(event: Event, id: string | null) {
  const opener = event.currentTarget;
  if (!(opener instanceof HTMLElement)) return;
  const root = opener.closest<HTMLElement>(
    '[data-testid=preparation-catalogue]',
  );
  if (root)
    materialOrigins.set(root, {
      id: id ?? 'stones',
      route: root.dataset.route,
    });
}
export async function restoreMaterialFocus(event: Event, id: string | null) {
  const opener = event.currentTarget;
  if (!(opener instanceof HTMLElement)) return;
  const root = opener.closest<HTMLElement>(
      '[data-testid=preparation-catalogue]',
    ),
    route = root?.dataset.route,
    origin = root ? materialOrigins.get(root) : undefined,
    prior = document.activeElement;
  await nextTick();
  if (
    !root ||
    !visibleFocusTarget(root) ||
    root.dataset.route !== route ||
    root.querySelector('[data-testid=prepare-back]') ||
    document.querySelector('dialog[open]')
  )
    return;
  const active = document.activeElement;
  if (
    active !== document.body &&
    active !== prior &&
    visibleFocusTarget(active)
  )
    return;
  const suffix = CSS.escape(
      origin && origin.route === route ? origin.id : (id ?? 'stones'),
    ),
    button = root.querySelector<HTMLElement>(
      '[data-testid="prepare-source-' + suffix + '"]',
    ),
    row = root.querySelector<HTMLElement>(
      '[data-testid="prepare-need-' + suffix + '"]',
    );
  const target = visibleFocusTarget(button)
    ? button
    : visibleFocusTarget(row)
      ? row
      : root;
  target.focus({ preventScroll: true });
  revealFocus(target);
  materialOrigins.delete(root);
}
</script>
<script setup lang="ts">
import ItemArtifact from './ItemArtifact.vue';
defineProps<{
  needs: { id: string | null; label: string; required: number; have: number }[];
}>();
const emit = defineEmits<{ inspect: [string | null, number] }>();
function inspect(e: Event, id: string | null, q: number) {
  rememberMaterialOrigin(e, id);
  emit('inspect', id, q);
}
</script>
<template>
  <div
    class="catalogue-grid preparation-needs preparation-materials"
    :style="{ '--preparation-materials': needs.length || 1 }"
    data-testid="preparation-material-tray"
    aria-label="本次投入与缺口"
  >
    <article
      v-for="need in needs"
      :key="need.id ?? 'stones'"
      tabindex="-1"
      :data-testid="'prepare-need-' + (need.id ?? 'stones')"
      :data-ready="need.have >= need.required"
    >
      <component
        :is="need.have < need.required ? 'button' : 'div'"
        class="preparation-material"
        :type="need.have < need.required ? 'button' : undefined"
        :data-testid="
          need.have < need.required
            ? 'prepare-source-' + (need.id ?? 'stones')
            : undefined
        "
        :aria-label="
          need.have < need.required ? '查看' + need.label + '来源' : undefined
        "
        @click="
          need.have < need.required && inspect($event, need.id, need.required)
        "
      >
        <span class="preparation-material-art"
          ><ItemArtifact
            v-if="need.id"
            :item-id="need.id"
            :owned="need.have > 0" /><svg
            v-else
            class="preparation-stones"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <path
              d="m49 13 19 26-9 44H35L24 39Z M49 13v70 M24 39h44 M49 13 35 39l14 44 10-44Z"
            /></svg
        ></span>
        <strong>{{ need.label }}</strong
        ><span>{{ need.have }} / {{ need.required }}</span>
        <small>{{
          need.have >= need.required
            ? '已经备齐'
            : '尚缺 ' + (need.required - need.have)
        }}</small>
        <span
          v-if="need.have < need.required"
          class="preparation-material-inspect"
          >查看来源 ›</span
        >
      </component>
    </article>
  </div>
</template>
