<script setup lang="ts">
// Line icons from the prototype, drawn on a 24×24 grid with the current text colour.
defineProps<{ name: keyof typeof paths }>();
</script>

<script lang="ts">
const paths = {
  back: 'M15 5l-7 7 7 7',
  gear: 'M12 8.8a3.2 3.2 0 100 6.4 3.2 3.2 0 000-6.4zM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
  home: 'M4 11l8-7 8 7v8.5H4z',
  out: 'M14 5h5v14h-5M10 8l-4 4 4 4M6 12h10',
  speaker: 'M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4zM15.5 9a4.2 4.2 0 010 6M18 6.5a7.8 7.8 0 010 11',
  again: 'M19 12a7 7 0 11-2.3-5.2M19 4.5v4.2h-4.2',
  star: 'M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z',
} as const;
const filled = new Set(['star']);
</script>

<template>
  <svg class="i" :class="{ f: filled.has(name) }" viewBox="0 0 24 24" aria-hidden="true"><path :d="paths[name]" /></svg>
</template>
