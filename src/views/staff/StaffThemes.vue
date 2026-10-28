<script setup lang="ts">
import { onMounted, ref } from 'vue';
import ConfirmButton from '@/components/ConfirmButton.vue';
import { countItems, createTheme, deleteTheme, listThemes, updateTheme } from '@/lib/staff';
import { move, nextSort } from '@/lib/staffLogic';
import type { ThemeRow } from '@/lib/types';

const themes = ref<ThemeRow[]>([]);
const counts = ref<Record<string, number>>({});
const loaded = ref(false);
const newName = ref('');

async function load() {
  try {
    [themes.value, counts.value] = await Promise.all([listThemes(), countItems()]);
  } finally {
    loaded.value = true;
  }
}

async function add() {
  const name = newName.value.trim();
  if (!name) return;
  const row = await createTheme(name, nextSort(themes.value));
  themes.value.push(row);
  newName.value = '';
}

async function setVisible(t: ThemeRow, visible: boolean) {
  t.visible = visible;
  try {
    await updateTheme(t.id, { visible });
  } catch {
    t.visible = !visible;
  }
}

async function shift(i: number, by: number) {
  const r = move(themes.value, i, i + by);
  if (!r.changed.length) return;
  themes.value = r.list;
  await Promise.all(r.changed.map((c) => updateTheme(c.id, { sort: c.sort })));
}

async function remove(t: ThemeRow) {
  await deleteTheme(t.id);
  themes.value = themes.value.filter((x) => x.id !== t.id);
}

onMounted(load);
</script>

<template>
  <section class="panel">
    <form class="add" @submit.prevent="add">
      <div class="field">
        <label for="new-theme">{{ $t('staff.themes.newName') }}</label>
        <input id="new-theme" v-model="newName" type="text" :placeholder="$t('staff.themes.newPlaceholder')" autocomplete="off" data-cy="new-theme" />
      </div>
      <button type="submit" class="btn pri" :disabled="!newName.trim()" data-cy="add-theme">{{ $t('staff.themes.add') }}</button>
    </form>
  </section>

  <p v-if="!loaded" class="hint">{{ $t('app.loading') }}</p>
  <div v-else-if="!themes.length" class="empty">
    <p class="hint">{{ $t('staff.themes.empty') }}</p>
  </div>
  <ul v-else class="panel rows" data-cy="theme-list">
    <li v-for="(t, i) in themes" :key="t.id" class="row" :data-cy="`theme-${t.name}`">
      <div class="mid">
        <RouterLink class="name" :to="{ name: 'staff-theme', params: { themeId: t.id } }">
          {{ t.name || $t('staff.themes.unnamed') }}
        </RouterLink>
        <span class="hint">{{ $t('staff.themes.count', { n: counts[t.id] ?? 0 }, counts[t.id] ?? 0) }}</span>
        <label class="chk">
          <input type="checkbox" :checked="t.visible" data-cy="theme-visible" @change="setVisible(t, ($event.target as HTMLInputElement).checked)" />
          {{ $t('staff.themes.visible') }}
        </label>
      </div>
      <div class="acts">
        <button type="button" class="btn quiet" :disabled="i === 0" :aria-label="$t('staff.themes.up')" @click="shift(i, -1)">↑</button>
        <button type="button" class="btn quiet" :disabled="i === themes.length - 1" :aria-label="$t('staff.themes.down')" @click="shift(i, 1)">↓</button>
        <RouterLink class="btn" :to="{ name: 'staff-theme', params: { themeId: t.id } }">{{ $t('staff.themes.open') }}</RouterLink>
        <ConfirmButton :label="$t('staff.themes.delete')" cy="delete-theme" @confirm="remove(t)" />
      </div>
    </li>
  </ul>
</template>

<style scoped>
.add { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
.add .field { flex: 1 1 240px; }
.rows { list-style: none; margin: 0; padding-block: 4px; gap: 0; }
.row { display: flex; gap: 12px 16px; align-items: center; justify-content: space-between; flex-wrap: wrap; padding-block: 12px; border-top: 1px solid var(--line); }
.row:first-child { border-top: 0; }
.mid { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.name { font-family: var(--font-display); font-weight: 800; font-size: 22px; text-decoration: none; }
.acts { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
