<script setup lang="ts">
import StaffDoor from '@/components/StaffDoor.vue';
import { offline, refresh, themes } from '@/lib/offline';

const TILE_COLOURS = ['var(--t1)', 'var(--t2)', 'var(--t3)', 'var(--t4)'];
</script>

<template>
  <main class="page">
    <header class="bar">
      <h1>{{ $t('student.chooseTheme') }}</h1>
    </header>

    <template v-if="!offline.snapshot">
      <p v-if="offline.loading" class="hint" data-cy="loading">
        {{ offline.progress.total ? $t('student.loadingN', offline.progress) : $t('app.loading') }}
      </p>
      <div v-else class="empty" data-cy="offline">
        <h2>{{ $t('app.offline') }}</h2>
        <button type="button" class="btn pri" @click="refresh">{{ $t('app.retry') }}</button>
      </div>
    </template>

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
        <div class="pc"><img :src="offline.urls[t.items[0]!.picto_path]" alt="" /></div>
        <span class="tn">{{ t.theme.name }}</span>
        <span class="ts">{{ $t('student.words', { n: t.items.length }, t.items.length) }}</span>
      </RouterLink>
    </nav>

    <StaffDoor />
  </main>
</template>
