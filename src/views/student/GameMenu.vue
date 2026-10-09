<script setup lang="ts">
// Placeholder until phase 2 brings the game registry and the games themselves.
import AppIcon from '@/components/AppIcon.vue';
import StaffDoor from '@/components/StaffDoor.vue';

defineProps<{ themeId: string }>();
</script>

<template>
  <main class="page">
    <header class="bar">
      <RouterLink class="btn" :to="{ name: 'themes' }"><AppIcon name="back" />{{ $t('app.back') }}</RouterLink>
    </header>
    <div class="empty">
      <p class="hint">{{ $t('student.gamesSoon') }}</p>
    </div>
    <StaffDoor />
  </main>
</template>
