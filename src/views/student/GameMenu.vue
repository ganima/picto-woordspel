<script setup lang="ts">
import { computed, toRef } from 'vue';
import AppIcon from '@/components/AppIcon.vue';
import MiniCard from '@/components/MiniCard.vue';
import StaffDoor from '@/components/StaffDoor.vue';
import { games } from '@/lib/offline';
import { say } from '@/lib/audio';
import { settings } from '@/lib/settings';
import { GAMES, playableItems } from '@/games/registry';
import { useThemeItems } from '@/games/useThemeItems';
import type { PreviewCard } from '@/games/types';

const props = defineProps<{ themeId: string }>();
const { theme, items, ready } = useThemeItems(toRef(props, 'themeId'));

const TILE_COLOURS = ['var(--t1)', 'var(--t2)', 'var(--t3)', 'var(--t4)'];

interface Tile {
  id: string;
  key: string;
  variant?: string;
  title: string;
  subtitle?: string;
  preview: [PreviewCard, PreviewCard];
  picto?: string;
  shadow?: string;
}

// Theme games the class may play (games table) and this theme can feed (registry), in the table's order.
const tiles = computed<Tile[]>(() => {
  const out: Tile[] = [];
  for (const row of games.value) {
    const mod = GAMES.find((g) => g.key === row.key && g.kind === 'theme');
    const usable = mod && playableItems(mod, items.value);
    if (!mod || !usable) continue;
    for (const v of mod.variants ?? [undefined]) {
      // Spread the preview pictos over the theme so the tiles don't all show the same one.
      const item = usable[out.length % usable.length]!;
      out.push({
        id: v ? `${mod.key}-${v.id}` : mod.key,
        key: mod.key,
        variant: v?.id,
        title: mod.title[settings.lang],
        subtitle: v?.subtitle[settings.lang],
        preview: v?.preview ?? mod.preview,
        picto: item.pictoUrl,
        shadow: item.shadowUrl,
      });
    }
  }
  return out;
});
</script>

<template>
  <main class="page">
    <header class="bar">
      <RouterLink class="btn round-btn" :to="{ name: 'themes' }" :aria-label="$t('app.back')" data-cy="back">
        <AppIcon name="back" />
      </RouterLink>
      <h1>{{ theme?.name }}</h1>
    </header>

    <p v-if="!ready" class="hint">{{ $t('app.loading') }}</p>

    <template v-else-if="theme">
      <nav v-if="tiles.length" class="tiles" data-cy="game-tiles">
        <RouterLink
          v-for="(t, i) in tiles"
          :key="t.id"
          class="tile"
          :style="{ '--tc': TILE_COLOURS[i % TILE_COLOURS.length] }"
          :to="{ name: 'play', params: { themeId, gameKey: t.key, variant: t.variant } }"
          :data-cy="`game-${t.id}`"
        >
          <span class="prev">
            <MiniCard v-for="(k, j) in t.preview" :key="j" :kind="k" :picto="t.picto" :shadow="t.shadow" />
          </span>
          <span class="tn">{{ t.title }}</span>
          <span v-if="t.subtitle" class="ts">{{ t.subtitle }}</span>
        </RouterLink>
      </nav>
      <div v-else class="empty" data-cy="no-games">
        <h2>{{ $t('student.noGames') }}</h2>
        <p class="hint">{{ $t('student.noGamesHint') }}</p>
      </div>

      <h2>{{ $t('student.ourWords') }}</h2>
      <p class="hint">{{ $t('student.tapHear') }}</p>
      <div class="strip">
        <button v-for="it in items" :key="it.id" type="button" class="pc" @click="say(it)">
          <img :src="it.pictoUrl" alt="" />
          <span class="w">{{ it.word }}</span>
        </button>
      </div>
    </template>

    <div v-else class="empty" data-cy="no-theme">
      <h2>{{ $t('student.noThemes') }}</h2>
    </div>

    <StaffDoor />
  </main>
</template>

<style scoped>
.prev { display: flex; gap: 8px; justify-content: center; width: 100%; }
.strip { display: grid; grid-template-columns: repeat(auto-fill, minmax(108px, 1fr)); gap: 10px; }
.strip .pc { border-width: 3px; border-radius: 14px; padding: 6px; }
.strip .w { font-size: 14px; }
</style>
