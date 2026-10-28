<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from '@/components/AppIcon.vue';
import ItemRow from './parts/ItemRow.vue';
import { loadImage, standardise, toBlob } from '@/picto/canvas';
import { isSimilar, shadowFlag, wordFromFileName } from '@/picto/analyse';
import { loadPreview, previews, seedPreview } from '@/lib/previews';
import { recorder } from '@/lib/recorder';
import { say } from '@/lib/audio';
import {
  addItem, clearRecording, deleteItem, getTheme, listItems, setRecording, updateItem, updateTheme,
} from '@/lib/staff';
import { matchSounds, move, nextSort } from '@/lib/staffLogic';
import type { ThemeItemRow, ThemeRow } from '@/lib/types';

const props = defineProps<{ themeId: string }>();
const { t } = useI18n();

const theme = ref<ThemeRow | null>(null);
const items = ref<ThemeItemRow[]>([]);
const status = ref<'loading' | 'ready' | 'missing'>('loading');
const notes = ref<string[]>([]);
const progress = ref<{ done: number; total: number } | null>(null);
const name = ref('');

async function load() {
  const [th, rows] = await Promise.all([getTheme(props.themeId), listItems(props.themeId)]);
  if (!th) {
    status.value = 'missing';
    return;
  }
  theme.value = th;
  name.value = th.name;
  items.value = rows;
  rows.forEach((r) => loadPreview(r.picto_path));
  status.value = 'ready';
}
onMounted(load);

// ---- theme name and visibility ----
let nameTimer: ReturnType<typeof setTimeout> | undefined;
function nameTyped() {
  clearTimeout(nameTimer);
  nameTimer = setTimeout(saveName, 600);
}
async function saveName() {
  clearTimeout(nameTimer);
  const n = name.value.trim();
  if (theme.value && n && n !== theme.value.name) {
    await updateTheme(theme.value.id, { name: n });
    theme.value.name = n;
  }
}
onBeforeUnmount(() => void saveName());

async function setVisible(visible: boolean) {
  if (!theme.value) return;
  theme.value.visible = visible;
  try {
    await updateTheme(theme.value.id, { visible });
  } catch {
    theme.value.visible = !visible;
  }
}

// ---- warnings next to each picto ----
const flags = computed(() => {
  const out: Record<string, string[]> = {};
  for (const it of items.value) {
    const p = previews[it.picto_path];
    const f: string[] = [];
    if (p && p !== 'error') {
      const flag = shadowFlag(p.area);
      if (flag === 'empty') f.push(t('staff.theme.flagEmpty'));
      if (flag === 'background') f.push(t('staff.theme.flagBackground'));
      const twin = items.value.find((o) => {
        const q = previews[o.picto_path];
        return o.id !== it.id && q && q !== 'error' && isSimilar(p.sig, q.sig);
      });
      if (twin) f.push(t('staff.theme.flagLike', { word: twin.word }));
    }
    out[it.id] = f;
  }
  return out;
});

// ---- adding pictos and sounds ----
async function addPictos(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = [...(input.files ?? [])];
  input.value = '';
  if (!files.length || !theme.value) return;
  notes.value = [];
  progress.value = { done: 0, total: files.length };
  let failed = 0;
  let sort = nextSort(items.value);
  for (const file of files) {
    const url = URL.createObjectURL(file);
    try {
      const png = await toBlob(standardise(await loadImage(url)));
      const row = await addItem(theme.value.id, wordFromFileName(file.name) || file.name, png, sort++);
      seedPreview(row.picto_path, png);
      items.value.push(row);
    } catch (err) {
      console.warn('Could not add', file.name, err);
      failed++;
    } finally {
      URL.revokeObjectURL(url);
      progress.value.done++;
    }
  }
  progress.value = null;
  if (failed) notes.value.push(t('staff.theme.failed', { n: failed }, failed));
}

async function addSounds(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = [...(input.files ?? [])];
  input.value = '';
  if (!files.length) return;
  const { matched, unmatched } = matchSounds(files, items.value);
  let linked = 0;
  for (const { file, item } of matched) {
    try {
      await saveRecording(item, file, false);
      linked++;
    } catch {
      // counted as not linked
    }
  }
  notes.value = [t('staff.theme.matched', { a: linked, b: files.length })];
  if (unmatched.length) notes.value.push(t('staff.theme.unmatched', { names: unmatched.map((f) => f.name).join(', ') }));
}

// ---- per item ----
async function saveRecording(item: ThemeItemRow, blob: Blob, playBack = true) {
  item.audio_path = await setRecording(item, blob);
  if (playBack) void say(item);
}

async function setWord(item: ThemeItemRow, word: string) {
  await updateItem(item.id, { word });
  item.word = word;
}

async function setOptions(item: ThemeItemRow, options: ThemeItemRow['options']) {
  const old = item.options;
  item.options = options;
  try {
    await updateItem(item.id, { options });
  } catch {
    item.options = old;
  }
}

async function shift(i: number, by: number) {
  const r = move(items.value, i, i + by);
  if (!r.changed.length) return;
  items.value = r.list;
  await Promise.all(r.changed.map((c) => updateItem(c.id, { sort: c.sort })));
}

async function remove(item: ThemeItemRow) {
  await deleteItem(item);
  items.value = items.value.filter((i) => i.id !== item.id);
}

async function unrecord(item: ThemeItemRow) {
  await clearRecording(item);
  item.audio_path = null;
}

const recorded = computed(() => items.value.filter((i) => i.audio_path).length);
</script>

<template>
  <p v-if="status === 'loading'" class="hint">{{ $t('app.loading') }}</p>

  <div v-else-if="status === 'missing'" class="empty">
    <p class="hint">{{ $t('staff.theme.notFound') }}</p>
    <RouterLink class="btn" :to="{ name: 'staff-themes' }">{{ $t('staff.theme.all') }}</RouterLink>
  </div>

  <template v-else-if="theme">
    <section class="panel">
      <RouterLink class="btn quiet back" :to="{ name: 'staff-themes' }"><AppIcon name="back" />{{ $t('staff.theme.all') }}</RouterLink>
      <div class="head">
        <div class="field">
          <label for="theme-name">{{ $t('staff.theme.name') }}</label>
          <input id="theme-name" v-model="name" type="text" autocomplete="off" data-cy="theme-name" @input="nameTyped" @blur="saveName" />
        </div>
        <label class="chk">
          <input type="checkbox" :checked="theme.visible" data-cy="theme-visible" @change="setVisible(($event.target as HTMLInputElement).checked)" />
          {{ $t('staff.themes.visible') }}
        </label>
      </div>
      <div class="adds">
        <label class="btn pri" :class="{ busy: progress }">
          {{ progress ? $t('staff.theme.adding', progress) : $t('staff.theme.addPictos') }}
          <input class="vh" type="file" accept="image/*" multiple :disabled="!!progress" data-cy="add-pictos" @change="addPictos" />
        </label>
        <label class="btn">
          {{ $t('staff.theme.addSounds') }}
          <input class="vh" type="file" accept="audio/*" multiple data-cy="add-sounds" @change="addSounds" />
        </label>
      </div>
      <p class="hint">{{ $t('staff.theme.addHint') }} {{ $t('staff.theme.soundsHint') }}</p>
      <p v-if="recorder.blocked" class="note">{{ $t('staff.theme.micBlocked') }}</p>
      <p v-for="n in notes" :key="n" class="note" data-cy="note">{{ n }}</p>
    </section>

    <section class="panel">
      <p class="lab">
        {{ $t('staff.themes.count', { n: items.length }, items.length) }} ·
        {{ $t('staff.theme.recCount', { a: recorded, b: items.length }) }}
      </p>
      <p v-if="!items.length" class="hint">{{ $t('staff.theme.empty') }}</p>
      <ul v-else class="rows" data-cy="items">
        <ItemRow
          v-for="(it, i) in items"
          :key="it.id"
          :item="it"
          :flags="flags[it.id] ?? []"
          :first="i === 0"
          :last="i === items.length - 1"
          @word="setWord(it, $event)"
          @options="setOptions(it, $event)"
          @recording="saveRecording(it, $event)"
          @clear-recording="unrecord(it)"
          @move="shift(i, $event)"
          @remove="remove(it)"
        />
      </ul>
    </section>
  </template>
</template>

<style scoped>
.back { align-self: flex-start; }
.head { display: flex; gap: 12px 24px; align-items: flex-end; flex-wrap: wrap; }
.head .field { flex: 1 1 260px; }
.adds { display: flex; gap: 10px; flex-wrap: wrap; }
.busy { opacity: 0.8; }
.rows { list-style: none; margin: 0; padding: 0; }
</style>
