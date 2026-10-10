import { shadowFlag } from '@/picto/analyse';
import { notExcluded } from '../shared/rounds';
import type { GameModule } from '../types';

export default {
  key: 'shadow',
  kind: 'theme',
  title: { nl: 'Zoek de schaduw', en: 'Find the shadow' },
  preview: ['picto', 'shadow'],
  requires: { minItems: 3 },
  // Leave out pictos whose shadow is almost empty or a full square: there is nothing to recognise.
  eligible: (items) => notExcluded(items, 'shadow').filter((i) => shadowFlag(i.area) === null),
  component: () => import('./ShadowGame.vue').then((m) => m.default),
} satisfies GameModule;
