<script setup lang="ts">
// The way into the staff screens from the class screen. It only opens after a press of about a second,
// so a child tapping around does not land on the login page.
import { onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from './AppIcon.vue';

const HOLD_MS = 1000;
const router = useRouter();
const holding = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

function start(e: PointerEvent) {
  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  holding.value = true;
  timer = setTimeout(() => {
    holding.value = false;
    void router.push('/beheer');
  }, HOLD_MS);
}

function cancel() {
  holding.value = false;
  clearTimeout(timer);
}

// Keyboard users (staff on a laptop) can open it directly.
function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    void router.push('/beheer');
  }
}

onBeforeUnmount(cancel);
</script>

<template>
  <button
    type="button"
    class="door"
    :class="{ holding }"
    :aria-label="$t('student.staffDoor')"
    :title="$t('student.staffDoor')"
    data-cy="staff-door"
    @pointerdown="start"
    @pointerup="cancel"
    @pointercancel="cancel"
    @pointerleave="cancel"
    @keydown="onKey"
    @contextmenu.prevent
  >
    <AppIcon name="gear" />
    <span class="ring" aria-hidden="true" />
  </button>
</template>

<style scoped>
.door {
  position: fixed; right: max(10px, env(safe-area-inset-right)); bottom: max(10px, env(safe-area-inset-bottom));
  width: 40px; height: 40px; border-radius: 50%; border: 0; background: transparent; color: var(--line);
  display: grid; place-items: center; touch-action: none; user-select: none; -webkit-user-select: none;
  -webkit-touch-callout: none;
}
.door .i { width: 22px; height: 22px; grid-area: 1 / 1; }
.ring { grid-area: 1 / 1; width: 100%; height: 100%; border-radius: 50%; border: 3px solid var(--muted); clip-path: inset(0 100% 0 0); }
.holding { color: var(--muted); }
.holding .ring { clip-path: inset(0 0 0 0); transition: clip-path 1s linear; }
</style>
