<script setup lang="ts">
import ChoiceGame from '../shared/ChoiceGame.vue';
import type { GameContext } from '../types';

defineProps<{ ctx: GameContext }>();
</script>

<template>
  <ChoiceGame :ctx="ctx" mode="listen" :ask="{ nl: 'Luister. Welke is het?', en: 'Listen. Which one is it?' }" />
</template>
