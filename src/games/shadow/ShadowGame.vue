<script setup lang="ts">
import ChoiceGame from '../shared/ChoiceGame.vue';
import type { GameContext } from '../types';

defineProps<{ ctx: GameContext }>();
</script>

<template>
  <ChoiceGame :ctx="ctx" mode="shadow" :ask="{ nl: 'Welke schaduw hoort erbij?', en: 'Which shadow belongs to it?' }" />
</template>
