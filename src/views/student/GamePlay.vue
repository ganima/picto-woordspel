<script setup lang="ts">
// The shell around one game: back button, the game itself, then the "well done" screen.
import { computed, ref, shallowRef, toRef, watch, type Component } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from '@/components/AppIcon.vue';
import { games } from '@/lib/offline';
import { cheer, hush, say } from '@/lib/audio';
import { settings } from '@/lib/settings';
import { gameModule, playableItems } from '@/games/registry';
import { useThemeItems } from '@/games/useThemeItems';
import type { GameContext } from '@/games/types';

const props = defineProps<{ themeId: string; gameKey: string; variant?: string }>();
const router = useRouter();

const DEFAULT_ROUNDS = 6;

const mod = gameModule(props.gameKey);
const { items, ready } = useThemeItems(toRef(props, 'themeId'));
const component = shallowRef<Component | null>(null);
const stars = ref<number | null>(null);
const run = ref(0);

const row = computed(() => games.value.find((g) => g.key === props.gameKey));
const usable = computed(() => (mod ? playableItems(mod, items.value) : null));

// Built once per run, so a background refresh does not change the cards under a child's fingers.
const ctx = ref<GameContext | null>(null);
function build(): GameContext | null {
  if (!usable.value) return null;
  return {
    items: usable.value,
    variant: props.variant,
    lang: settings.lang,
    settings: {
      rounds: DEFAULT_ROUNDS,
      ...row.value?.settings,
      // Choices and words are set per device by the juf.
      choices: settings.choices,
      showWords: settings.showWords,
    },
    say,
    cheer,
    finish: ({ stars: n }) => {
      stars.value = n;
    },
  };
}

watch(
  ready,
  async (r) => {
    if (!r) return;
    if (!mod || !row.value || !usable.value) {
      await router.replace({ name: 'theme-games', params: { themeId: props.themeId } });
      return;
    }
    component.value = await mod.component();
    ctx.value = build();
  },
  { immediate: true },
);

function again() {
  stars.value = null;
  ctx.value = build();
  run.value++;
}

function leave() {
  hush();
  void router.push({ name: 'theme-games', params: { themeId: props.themeId } });
}
</script>

<template>
  <main class="page game">
    <template v-if="stars === null">
      <header class="bar">
        <button type="button" class="btn round-btn" :aria-label="$t('app.back')" data-cy="back" @click="leave">
          <AppIcon name="back" />
        </button>
        <!-- Games teleport their star progress in here. -->
        <div id="game-bar" />
      </header>
      <component :is="component" v-if="component && ctx" :key="run" :ctx="ctx" />
      <p v-else class="hint">{{ $t('app.loading') }}</p>
    </template>

    <div v-else class="donebox" data-cy="done">
      <div class="bigstars">
        <AppIcon v-for="i in stars" :key="i" name="star" />
      </div>
      <h1>{{ $t('student.done') }}</h1>
      <div class="rowbtn">
        <button type="button" class="btn pri big" data-cy="again" @click="again">
          <AppIcon name="again" />{{ $t('student.again') }}
        </button>
        <button type="button" class="btn big" data-cy="other" @click="leave">
          <AppIcon name="home" />{{ $t('student.otherGame') }}
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* Wider than the menus, so cards can grow on a smartboard. */
.page.game { max-width: 1400px; }
.donebox { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; text-align: center; }
.donebox h1 { font-family: var(--font-display); font-weight: 800; font-size: clamp(34px, 8vw, 60px); margin: 0; }
.bigstars { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; color: var(--sun); }
.bigstars .i { width: clamp(34px, 8vw, 58px); height: clamp(34px, 8vw, 58px); }
.rowbtn { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
</style>
