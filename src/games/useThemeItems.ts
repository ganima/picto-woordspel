import { computed, ref, watch, type Ref } from 'vue';
import { offline, themeById } from '@/lib/offline';
import { prepareItems } from './items';
import type { PlayItem } from './types';

/** The play-ready items of a theme, kept in step with the offline cache. */
export function useThemeItems(themeId: Ref<string>) {
  const view = computed(() => themeById(themeId.value));
  const items = ref<PlayItem[]>([]);
  const ready = ref(false);
  let ticket = 0;

  watch(
    () => view.value?.items,
    async (rows) => {
      const mine = ++ticket;
      if (!rows) {
        items.value = [];
        ready.value = !offline.loading;
        return;
      }
      const prepared = await prepareItems(rows);
      if (mine !== ticket) return;
      items.value = prepared;
      ready.value = true;
    },
    { immediate: true },
  );

  return { theme: computed(() => view.value?.theme), items, ready };
}
