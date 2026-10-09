<script setup lang="ts">
import LangSwitch from '@/components/LangSwitch.vue';
import { settings } from '@/lib/settings';

const CHOICES = [2, 3, 4] as const;
</script>

<template>
  <section class="panel">
    <h2>{{ $t('device.title') }}</h2>
    <p class="hint">{{ $t('device.hint') }}</p>
    <div class="set">
      <span class="lab">{{ $t('device.lang') }}</span>
      <LangSwitch />
    </div>
    <div class="set">
      <span id="choices-lab" class="lab">{{ $t('device.choices') }}</span>
      <div class="seg" role="group" aria-labelledby="choices-lab">
        <button
          v-for="n in CHOICES"
          :key="n"
          type="button"
          :aria-pressed="settings.choices === n"
          :data-cy="`choices-${n}`"
          @click="settings.choices = n"
        >
          {{ n }}
        </button>
      </div>
    </div>
    <label class="chk"><input v-model="settings.showWords" type="checkbox" />{{ $t('device.showWords') }}</label>
    <label class="chk"><input v-model="settings.ding" type="checkbox" />{{ $t('device.ding') }}</label>
  </section>
</template>

<style scoped>
.set { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; }
</style>
