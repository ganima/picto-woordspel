import { notExcluded } from '../shared/rounds';
import type { GameModule } from '../types';

export default {
  key: 'listen',
  kind: 'theme',
  title: { nl: 'Luister en kies', en: 'Listen and choose' },
  preview: ['speaker', 'picto'],
  requires: { minItems: 3 },
  eligible: (items) => notExcluded(items, 'listen'),
  component: () => import('./ListenGame.vue').then((m) => m.default),
} satisfies GameModule;
