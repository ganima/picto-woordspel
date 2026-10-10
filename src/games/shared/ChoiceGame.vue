<script setup lang="ts">
// One round = one target and 2 to 4 choices. Shadow: match the picto to its shadow. Listen: match the word to its
// picto. A wrong tap dims that choice with a small wobble; a right one gets the ding and the word, then next round.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import AppIcon from '@/components/AppIcon.vue';
import StarDots from './StarDots.vue';
import { choicesFor, pickTargets } from './rounds';
import { isSimilar } from '@/picto/analyse';
import { hush } from '@/lib/audio';
import type { GameContext, PlayItem, Text } from '../types';

const props = defineProps<{ ctx: GameContext; mode: 'shadow' | 'listen'; ask: Text }>();

const T = {
  replay: { nl: 'Nog eens luisteren', en: 'Listen again' },
  shadowN: { nl: 'Schaduw', en: 'Shadow' },
};

const targets = pickTargets(props.ctx.items, props.ctx.settings.rounds);
const round = ref(0);
const done = ref(0);
const solved = ref(false);
const wrong = ref(new Set<string>());
const choices = ref<PlayItem[]>([]);
let alive = true;

const target = computed(() => targets[round.value]!);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const tooAlike = props.mode === 'shadow' ? (a: PlayItem, b: PlayItem) => isSimilar(a.sig, b.sig) : undefined;

function deal() {
  choices.value = choicesFor(target.value, props.ctx.items, props.ctx.settings.choices, Math.random, tooAlike);
  wrong.value = new Set();
  solved.value = false;
}

async function pick(item: PlayItem) {
  if (solved.value || wrong.value.has(item.id)) return;
  if (item.id !== target.value.id) {
    wrong.value = new Set(wrong.value).add(item.id);
    return;
  }
  solved.value = true;
  done.value++;
  await props.ctx.cheer(target.value);
  await wait(700);
  if (!alive) return;
  if (round.value + 1 >= targets.length) {
    props.ctx.finish({ stars: targets.length });
    return;
  }
  round.value++;
  deal();
  if (props.mode === 'listen') {
    await wait(250);
    if (alive) void props.ctx.say(target.value);
  }
}

deal();
onMounted(() => {
  if (props.mode === 'listen') void props.ctx.say(target.value);
});
onBeforeUnmount(() => {
  alive = false;
  hush();
});

const showWord = (item: PlayItem) => props.ctx.settings.showWords && solved.value && item.id === target.value.id;
</script>

<template>
  <Teleport defer to="#game-bar"><StarDots :total="targets.length" :done="done" /></Teleport>
  <div class="stage">
    <p class="ask">{{ ask[ctx.lang] }}</p>

    <div v-if="mode === 'shadow'" class="pc target" data-cy="target">
      <img :src="target.pictoUrl" :alt="target.word" />
      <span v-if="ctx.settings.showWords" class="w">{{ target.word }}</span>
    </div>
    <button v-else type="button" class="speak" :aria-label="T.replay[ctx.lang]" data-cy="replay" @click="ctx.say(target)">
      <AppIcon name="speaker" />
    </button>

    <div class="choices" :style="{ '--n': choices.length }" :data-n="choices.length">
      <button
        v-for="(c, i) in choices"
        :key="`${round}-${c.id}`"
        type="button"
        class="pc"
        :class="{ ok: solved && c.id === target.id, no: wrong.has(c.id), wob: wrong.has(c.id) }"
        :aria-label="mode === 'shadow' ? `${T.shadowN[ctx.lang]} ${i + 1}` : c.word"
        :data-cy="c.id === target.id ? 'choice-right' : 'choice-wrong'"
        @click="pick(c)"
      >
        <img :src="mode === 'shadow' && !(solved && c.id === target.id) ? c.shadowUrl : c.pictoUrl" alt="" />
        <span v-if="showWord(c)" class="w">{{ c.word }}</span>
      </button>
    </div>
  </div>
</template>
