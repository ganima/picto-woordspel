// Every game in the code. A new game is a folder under src/games plus one line here; the games table decides
// which of them a class sees.
import type { GameModule } from './types';
import shadow from './shadow';
import same from './same';
import listen from './listen';

export const GAMES: readonly GameModule[] = [shadow, same, listen];

export function gameModule(key: string): GameModule | undefined {
  return GAMES.find((g) => g.key === key);
}

/** The items a game would use, or null when the theme does not meet what it needs. */
export function playableItems<T extends { audio_path: string | null }>(
  mod: Pick<GameModule, 'requires'> & { eligible?: (items: T[]) => T[] },
  items: T[],
): T[] | null {
  const usable = mod.eligible ? mod.eligible(items) : items;
  if (usable.length < (mod.requires?.minItems ?? 1)) return null;
  if (mod.requires?.needsAudio && !usable.every((i) => i.audio_path)) return null;
  return usable;
}
