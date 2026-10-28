<script setup lang="ts">
// One picto in the juf's list: picto and shadow side by side with warnings, the word, its recording, and in
// which games it appears.
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import ConfirmButton from '@/components/ConfirmButton.vue';
import { say, hush } from '@/lib/audio';
import { previews } from '@/lib/previews';
import { record, recorder, stop } from '@/lib/recorder';
import { settings } from '@/lib/settings';
import { setExcluded } from '@/lib/staffLogic';
import { GAMES } from '@/games/registry';
import type { ThemeItemRow } from '@/lib/types';

const props = defineProps<{ item: ThemeItemRow; flags: string[]; first: boolean; last: boolean }>();
const emit = defineEmits<{
  word: [word: string];
  options: [options: ThemeItemRow['options']];
  recording: [blob: Blob];
  clearRecording: [];
  move: [by: number];
  remove: [];
}>();

const themeGames = GAMES.filter((g) => g.kind === 'theme');
const preview = computed(() => previews[props.item.picto_path]);
const recording = computed(() => recorder.active === props.item.id);

// The word is saved shortly after typing stops, and at once when the field loses focus.
const word = ref(props.item.word);
watch(
  () => props.item.word,
  (w) => {
    if (document.activeElement?.id !== `w-${props.item.id}`) word.value = w;
  },
);
let timer: ReturnType<typeof setTimeout> | undefined;
function typed() {
  clearTimeout(timer);
  timer = setTimeout(flush, 600);
}
function flush() {
  clearTimeout(timer);
  const w = word.value.trim();
  if (w && w !== props.item.word) emit('word', w);
}
onBeforeUnmount(flush);

const inGame = (key: string) => !props.item.options?.exclude?.includes(key);
function toggleGame(key: string, on: boolean) {
  emit('options', setExcluded(props.item.options ?? {}, key, !on));
}

async function rec() {
  if (recording.value) {
    stop();
    return;
  }
  hush();
  const blob = await record(props.item.id);
  if (blob) emit('recording', blob);
}

function pickFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file) emit('recording', file);
}
</script>

<template>
  <li class="row" :data-cy="`item-${item.word}`">
    <div class="thumbs">
      <template v-if="preview && preview !== 'error'">
        <span class="pc th"><img :src="preview.pictoUrl" :alt="item.word" /></span>
        <span class="pc th"><img :src="preview.shadowUrl" :alt="$t('staff.theme.shadow')" data-cy="shadow" /></span>
      </template>
      <span v-else class="pc th ph" />
    </div>

    <div class="mid">
      <label class="vh" :for="`w-${item.id}`">{{ $t('staff.theme.word') }}</label>
      <input :id="`w-${item.id}`" v-model="word" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" data-cy="word" @input="typed" @blur="flush" @keydown.enter="flush" />
      <div class="st">
        <span v-if="item.audio_path" class="own">{{ $t('staff.theme.own') }}</span>
        <span v-else>{{ $t('staff.theme.tts') }}</span>
        <span v-for="f in flags" :key="f" class="flag" data-cy="flag">{{ f }}</span>
      </div>
      <div class="games">
        <label v-for="g in themeGames" :key="g.key" class="chk">
          <input type="checkbox" :checked="inGame(g.key)" :data-cy="`in-${g.key}`" @change="toggleGame(g.key, ($event.target as HTMLInputElement).checked)" />
          {{ $t('staff.theme.inGame', { game: g.title[settings.lang] }) }}
        </label>
      </div>
    </div>

    <div class="acts">
      <button v-if="!recorder.blocked" type="button" class="btn" :class="recording ? 'on' : 'pri'" data-cy="rec" @click="rec">
        {{ recording ? $t('staff.theme.stop') : $t('staff.theme.rec') }}
      </button>
      <label class="btn" :class="recorder.blocked ? 'pri' : 'quiet'">
        {{ $t('staff.theme.file') }}
        <input class="vh" type="file" accept="audio/*" data-cy="audio-file" @change="pickFile" />
      </label>
      <button type="button" class="btn quiet" data-cy="play" @click="say(item)">{{ $t('staff.theme.play') }}</button>
      <button v-if="item.audio_path" type="button" class="btn quiet" data-cy="clear-audio" @click="emit('clearRecording')">
        {{ $t('staff.theme.delAudio') }}
      </button>
      <button type="button" class="btn quiet sq" :disabled="first" :aria-label="$t('staff.theme.up')" @click="emit('move', -1)">↑</button>
      <button type="button" class="btn quiet sq" :disabled="last" :aria-label="$t('staff.theme.down')" @click="emit('move', 1)">↓</button>
      <ConfirmButton :label="$t('staff.theme.delete')" cy="delete-item" @confirm="emit('remove')" />
    </div>
  </li>
</template>

<style scoped>
.row { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px 14px; align-items: start; padding-block: 14px; border-top: 1px solid var(--line); }
.row:first-child { border-top: 0; }
.thumbs { display: flex; gap: 6px; }
.th { width: 76px; border-width: 2px; border-radius: 10px; padding: 4px; }
.ph { aspect-ratio: 1; background: var(--surface); }
.mid { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.st { font-size: 14px; color: var(--muted); display: flex; gap: 6px 12px; flex-wrap: wrap; }
.own { color: var(--good); font-weight: 700; }
.flag { color: var(--hot); font-weight: 700; }
.games { display: flex; gap: 4px 16px; flex-wrap: wrap; }
.acts { grid-column: 1 / -1; display: flex; gap: 8px; flex-wrap: wrap; }
.btn.on { background: var(--hot); border-color: var(--hot); color: var(--accent-fg); }
.btn.sq { width: 46px; padding: 0; }
@media (min-width: 900px) {
  .row { grid-template-columns: auto minmax(0, 1fr) auto; }
  .acts { grid-column: auto; justify-content: flex-end; max-width: 420px; }
}
</style>
