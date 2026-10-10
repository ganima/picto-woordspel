<script setup lang="ts">
// The small cards on a game tile, hinting at what the game looks like.
import AppIcon from './AppIcon.vue';
import type { PreviewCard } from '@/games/types';

defineProps<{ kind: PreviewCard; picto?: string; shadow?: string }>();
</script>

<template>
  <span class="pc mini" :class="{ 'card-back': kind === 'back' }">
    <img v-if="kind === 'picto' && picto" :src="picto" alt="" />
    <img v-else-if="kind === 'shadow' && shadow" :src="shadow" alt="" />
    <AppIcon v-else-if="kind === 'speaker'" name="speaker" />
  </span>
</template>

<style scoped>
.mini { width: min(46%, 112px); aspect-ratio: 1; padding: 6px; border-width: 3px; border-radius: 14px; justify-content: center; align-items: center; }
.mini .i { width: 60%; height: 60%; }
</style>
