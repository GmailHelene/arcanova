// Score validation. These constants mirror the client runtime's score
// formula: score = coins * COIN_VALUE + max(0, MAX_TIME_BONUS - frames).
// If the runtime formula changes, update these to match.

export const COIN_TILE = 3;
export const COIN_VALUE = 1000;
export const MAX_TIME_BONUS = 12000;

// The highest score actually achievable for a level: every coin collected
// plus the largest possible time bonus. A submission above this is rejected.
export function maxPossibleScore(definition: unknown): number {
  const def = definition as { tiles?: unknown } | null | undefined;
  const tiles = Array.isArray(def?.tiles) ? def.tiles : [];
  let coins = 0;
  for (const t of tiles) {
    if (t === COIN_TILE) coins++;
  }
  return coins * COIN_VALUE + MAX_TIME_BONUS;
}
