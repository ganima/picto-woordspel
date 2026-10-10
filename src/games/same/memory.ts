import { shuffle, type Rng } from '../shared/rounds';

export interface Card<T> {
  item: T;
  /** Index of the card in the deal; two cards of a pair share `item`. */
  index: number;
}

/** Number of pairs per "number of choices" setting. */
export function pairsFor(choices: number): number {
  return choices <= 2 ? 3 : choices === 3 ? 4 : 6;
}

/** Two cards for each of `pairs` random items, shuffled. */
export function deal<T>(items: readonly T[], pairs: number, rng: Rng = Math.random): Card<T>[] {
  const pick = shuffle(items, rng).slice(0, Math.min(pairs, items.length));
  return shuffle(
    pick.flatMap((item) => [item, item]),
    rng,
  ).map((item, index) => ({ item, index }));
}

/** Columns for n cards so they fit without scrolling. */
export function columnsFor(n: number, landscape: boolean): number {
  if (n <= 4) return 2;
  if (n <= 6) return landscape ? 3 : 2;
  if (n <= 8) return landscape ? 4 : 2;
  return landscape ? 4 : 3;
}
