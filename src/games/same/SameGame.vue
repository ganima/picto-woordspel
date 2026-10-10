<script setup lang="ts">
// Memory with pairs. "open": all cards face up, tap two that are the same. "closed": classic memory.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import StarDots from '../shared/StarDots.vue';
import { hush } from '@/lib/audio';
import { columnsFor, deal, pairsFor } from './memory';
import type { GameContext, PlayItem } from '../types';

const props = defineProps<{ ctx: GameContext }>();

const T = {
  ask: { nl: 'Zoek twee dezelfde.', en: 'Find two that are the same.' },
  card: { nl: 'Kaart', en: 'Card' },
};

const closed = props.ctx.variant === 'closed';
const cards = deal(props.ctx.items, pairsFor(props.ctx.settings.choices));
const pairs = cards.length / 2;
const open = ref<number[]>([]);
const found = ref(new Set<number>());
const wobbling = ref(new Set<number>());
const locked = ref(false);
const landscape = ref(true);
let alive = true;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pairsFound = computed(() => found.value.size / 2);
const cols = computed(() => columnsFor(cards.length, landscape.value));
const rows = computed(() => Math.ceil(cards.length / cols.value));

const faceDown = (i: number) => closed && !open.value.includes(i) && !found.value.has(i);

async function flip(i: number) {
  if (locked.value || found.value.has(i)) return;
  const at = open.value.indexOf(i);
  if (at >= 0) {
    // With open cards a child may change their mind; a turned card stays turned.
    if (!closed) open.value = open.value.filter((k) => k !== i);
    return;
  }
  wobbling.value = new Set([...wobbling.value].filter((k) => k !== i));
  open.value = [...open.value, i];
  if (open.value.length < 2) return;

  const [a, b] = open.value as [number, number];
  if (cards[a]!.item.id === cards[b]!.item.id) {
    found.value = new Set([...found.value, a, b]);
    open.value = [];
    const last = pairsFound.value === pairs;
    if (last) locked.value = true;
    await props.ctx.cheer(cards[a]!.item as PlayItem);
    if (last) {
      await wait(700);
      if (alive) props.ctx.finish({ stars: pairs });
    }
  } else {
    locked.value = true;
    await wait(closed ? 1400 : 600);
    if (!alive) return;
    wobbling.value = new Set([a, b]);
    open.value = [];
    locked.value = false;
  }
}

function measure() {
  landscape.value = innerWidth >= innerHeight;
}
onMounted(() => {
  measure();
  addEventListener('resize', measure);
});
onBeforeUnmount(() => {
  alive = false;
  removeEventListener('resize', measure);
  hush();
});
</script>

<template>
  <Teleport defer to="#game-bar"><StarDots :total="pairs" :done="pairsFound" /></Teleport>
  <div class="stage">
    <p class="ask">{{ T.ask[ctx.lang] }}</p>
    <div class="mem" :style="{ '--cols': cols, '--rows': rows }">
      <button
        v-for="c in cards"
        :key="c.index"
        type="button"
        class="pc mc"
        :class="{
          sel: open.includes(c.index),
          found: found.has(c.index),
          wob: wobbling.has(c.index),
          down: faceDown(c.index),
        }"
        :aria-label="faceDown(c.index) ? `${T.card[ctx.lang]} ${c.index + 1}` : c.item.word"
        :data-cy="`card-${c.item.id}`"
        @click="flip(c.index)"
      >
        <img :src="c.item.pictoUrl" alt="" />
        <span class="face card-back" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.mem {
  display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: clamp(8px, 1.6vw, 16px);
  width: min(100%, calc((100dvh - 190px) * var(--cols) / var(--rows)), calc(var(--cols) * 260px));
}
.mc .face { position: absolute; inset: 0; border-radius: calc(var(--r) - 5px); opacity: 0; transition: opacity 0.2s; }
.mc.down .face { opacity: 1; }
</style>
