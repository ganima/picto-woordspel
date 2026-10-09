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
} as const;
</script>

<template>
  <svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path :d="paths[name]" /></svg>
</template>
