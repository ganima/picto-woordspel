import { notExcluded } from '../shared/rounds';
import type { GameModule } from '../types';

export default {
  key: 'same',
  kind: 'theme',
  title: { nl: 'Zoek dezelfde', en: 'Find the same' },
  preview: ['picto', 'picto'],
  // Two tiles, as in the prototype: young children pick a tile more easily than a difficulty.
  variants: [
    { id: 'open', subtitle: { nl: 'kaarten open', en: 'cards open' }, preview: ['picto', 'picto'] },
    { id: 'closed', subtitle: { nl: 'kaarten dicht', en: 'cards closed' }, preview: ['back', 'picto'] },
  ],
  requires: { minItems: 3 },
  eligible: (items) => notExcluded(items, 'same'),
  component: () => import('./SameGame.vue').then((m) => m.default),
} satisfies GameModule;
