<script setup lang="ts">
import { settings, type Lang } from '@/lib/settings';

const langs: Lang[] = ['nl', 'en'];
</script>

<template>
  <div class="seg" role="group" :aria-label="$t('device.lang')">
    <button
      v-for="l in langs"
      :key="l"
      type="button"
      :aria-pressed="settings.lang === l"
      :lang="l"
      :title="$t(`lang.${l}`)"
      :data-cy="`lang-${l}`"
      @click="settings.lang = l"
    >
      {{ l.toUpperCase() }}
    </button>
  </div>
</template>
