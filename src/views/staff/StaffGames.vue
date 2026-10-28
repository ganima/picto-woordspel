<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { listGames, setGameVisible } from '@/lib/staff';
import { settings } from '@/lib/settings';
import { gameModule } from '@/games/registry';
import type { GameRow } from '@/lib/types';

const games = ref<GameRow[]>([]);
const loaded = ref(false);

onMounted(async () => {
  try {
    games.value = await listGames();
  } finally {
    loaded.value = true;
  }
});

async function toggle(g: GameRow, visible: boolean) {
  g.visible = visible;
  try {
    await setGameVisible(g.key, visible);
  } catch {
    g.visible = !visible;
  }
}
</script>

<template>
  <section class="panel">
    <p class="hint">{{ $t('staff.games.hint') }}</p>
    <p v-if="!loaded" class="hint">{{ $t('app.loading') }}</p>
    <ul v-else class="rows" data-cy="games">
      <li v-for="g in games" :key="g.key" class="row" :class="{ off: !g.available }" :data-cy="`game-${g.key}`">
        <div class="mid">
          <span class="name">{{ gameModule(g.key)?.title[settings.lang] ?? g.key }}</span>
          <span class="hint">
            {{ !gameModule(g.key) ? $t('staff.games.unknown') : g.kind === 'theme' ? $t('staff.games.kindTheme') : $t('staff.games.kindStandalone') }}
          </span>
          <span v-if="!g.available" class="hint">{{ $t('staff.games.notAvailable') }}</span>
        </div>
        <label class="chk">
          <input type="checkbox" :checked="g.visible && g.available" :disabled="!g.available" data-cy="game-visible"
            @change="toggle(g, ($event.target as HTMLInputElement).checked)" />
          {{ $t('staff.games.on') }}
        </label>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.rows { list-style: none; margin: 0; padding: 0; }
.row { display: flex; gap: 12px; justify-content: space-between; align-items: center; flex-wrap: wrap; padding-block: 12px; border-top: 1px solid var(--line); }
.row:first-child { border-top: 0; }
.row.off { opacity: 0.6; }
.mid { display: flex; flex-direction: column; gap: 2px; }
.name { font-family: var(--font-display); font-weight: 800; font-size: 20px; }
</style>
