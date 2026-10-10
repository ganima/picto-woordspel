// Round planning shared by the choice games. All randomness goes through `rng` so tests can fix it.

export type Rng = () => number;

export function shuffle<T>(a: readonly T[], rng: Rng = Math.random): T[] {
  const out = a.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Up to `rounds` different targets, in random order. */
export function pickTargets<T>(pool: readonly T[], rounds: number, rng: Rng = Math.random): T[] {
  return shuffle(pool, rng).slice(0, Math.min(rounds, pool.length));
}

/**
 * The target plus n-1 others, shuffled. Others that `tooAlike` the target are avoided as long as there are
 * enough other options; otherwise they are allowed rather than offering fewer choices.
 */
export function choicesFor<T extends { id: string }>(
  target: T,
  pool: readonly T[],
  n: number,
  rng: Rng = Math.random,
  tooAlike?: (a: T, b: T) => boolean,
): T[] {
  let others = pool.filter((p) => p.id !== target.id);
  const want = Math.min(n, pool.length) - 1;
  if (tooAlike) {
    const distinct = others.filter((o) => !tooAlike(o, target));
    if (distinct.length >= want) others = distinct;
  }
  return shuffle([target, ...shuffle(others, rng).slice(0, want)], rng);
}

/** Items the juf has not excluded from this game. */
export function notExcluded<T extends { options: { exclude?: string[] } }>(items: readonly T[], key: string): T[] {
  return items.filter((i) => !i.options?.exclude?.includes(key));
}
