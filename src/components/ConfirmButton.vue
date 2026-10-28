<script setup lang="ts">
// A destructive action that asks once more in place (no browser confirm()): the first tap arms it,
// a second tap within a few seconds confirms.
import { onBeforeUnmount, ref } from 'vue';

defineProps<{ label: string; cy?: string }>();
const emit = defineEmits<{ confirm: [] }>();

const armed = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

function tap() {
  if (armed.value) {
    disarm();
    emit('confirm');
    return;
  }
  armed.value = true;
  timer = setTimeout(disarm, 4000);
}

function disarm() {
  armed.value = false;
  clearTimeout(timer);
}

onBeforeUnmount(disarm);
</script>

<template>
  <span class="confirm">
    <button type="button" class="btn" :class="armed ? 'danger' : 'quiet'" :data-cy="cy" @click="tap">
      {{ armed ? $t('staff.confirm.sure') : label }}
    </button>
    <button v-if="armed" type="button" class="btn quiet" @click="disarm">{{ $t('staff.confirm.cancel') }}</button>
  </span>
</template>

<style scoped>
.confirm { display: inline-flex; gap: 6px; flex-wrap: wrap; }
.danger { background: var(--hot); border-color: var(--hot); color: var(--accent-fg); }
</style>
