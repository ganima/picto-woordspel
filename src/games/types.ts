// The contract every game module fulfils (HANDOVER.md section 5), adapted to Vue: a module hands the shell a
// component, and the shell passes it a GameContext as its `ctx` prop.

import type { Component } from 'vue';
import type { Lang } from '@/lib/settings';
import type { GameKind, GameSetRow, ThemeItemRow } from '@/lib/types';

export type Text = { nl: string; en: string };

/** What a menu tile shows: two small cards. */
export type PreviewCard = 'picto' | 'shadow' | 'back' | 'speaker';

export interface GameVariant {
  id: string;
  subtitle: Text;
  preview: [PreviewCard, PreviewCard];
}

/** A theme item ready to play: its picto on this device, and its shadow analysis. */
export interface PlayItem extends ThemeItemRow {
  pictoUrl: string;
  shadowUrl: string;
  sig: string;
  area: number;
}

export interface GameSettings {
  choices: 2 | 3 | 4;
  showWords: boolean;
  rounds: number;
  [k: string]: unknown;
}

export interface GameContext {
  items: PlayItem[];
  set?: GameSetRow;
  settings: GameSettings;
  variant?: string;
  lang: Lang;
  say(item: PlayItem): Promise<void>;
  cheer(item?: PlayItem): Promise<void>;
  finish(result: { stars: number }): void;
}

export interface GameModule {
  /** Matches games.key and the folder name. */
  key: string;
  kind: GameKind;
  title: Text;
  /** Each variant gets its own tile in the menu; without variants there is one tile. */
  variants?: GameVariant[];
  preview: [PreviewCard, PreviewCard];
  requires?: { minItems?: number; needsAudio?: boolean };
  /** The theme items this game can use, after the per-item exclusions. Defaults to all of them. */
  eligible?(items: PlayItem[]): PlayItem[];
  component: () => Promise<Component>;
}
