<script setup lang="ts">
import { onMounted, ref } from 'vue';
import StaffDoor from '@/components/StaffDoor.vue';
import { fetchVisibleThemes, type ThemeSummary } from '@/lib/content';
import { mediaUrl } from '@/lib/supabase';

const TILE_COLOURS = ['var(--t1)', 'var(--t2)', 'var(--t3)', 'var(--t4)'];

const themes = ref<ThemeSummary[]>([]);
const status = ref<'loading' | 'ready' | 'error'>('loading');

async function load() {
  status.value = 'loading';
  try {
    themes.value = await fetchVisibleThemes();
    status.value = 'ready';
  } catch (e) {
    console.warn(e);
    status.value = 'error';
  }
}

onMounted(load);
</script>

<template>
  <main class="page">
    <header class="bar">
      <h1>{{ $t('student.chooseTheme') }}</h1>
    </header>

    <p v-if="status === 'loading'" class="hint">{{ $t('app.loading') }}</p>

    <div v-else-if="status === 'error'" class="empty">
      <h2>{{ $t('app.offline') }}</h2>
      <button type="button" class="btn pri" @click="load">{{ $t('app.retry') }}</button>
    </div>

    <div v-else-if="!themes.length" class="empty" data-cy="no-themes">
      <h2>{{ $t('student.noThemes') }}</h2>
      <p class="hint">{{ $t('student.noThemesHint') }}</p>
    </div>

    <nav v-else class="tiles" data-cy="theme-tiles">
      <RouterLink
        v-for="(t, i) in themes"
        :key="t.theme.id"
        class="tile"
        :style="{ '--tc': TILE_COLOURS[i % TILE_COLOURS.length] }"
        :to="{ name: 'theme-games', params: { themeId: t.theme.id } }"
      >
        <div v-if="t.coverPath" class="pc"><img :src="mediaUrl(t.coverPath)" alt="" /></div>
        <span class="tn">{{ t.theme.name }}</span>
        <span class="ts">{{ $t('student.words', { n: t.count }, t.count) }}</span>
      </RouterLink>
    </nav>

    <StaffDoor />
  </main>
</template>
