<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue';

defineProps<{ total: number; done: number }>();
</script>

<template>
  <div class="dots" role="progressbar" :aria-valuemin="0" :aria-valuemax="total" :aria-valuenow="done" data-cy="stars">
    <AppIcon v-for="i in total" :key="i" name="star" :class="{ on: i <= done }" />
  </div>
</template>
