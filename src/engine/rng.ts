/**
 * Deterministic Mulberry32 PRNG for reproducible matches, replays, and MCTS rollouts.
 */
export function nextRandom(state: number): { value: number; nextState: number } {
  let t = (state + 0x6d2b79f5) | 0;
  const nextState = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, nextState };
}

export function shuffleWithSeed<T>(items: readonly T[], seed: number): { result: T[]; nextSeed: number } {
  const arr = [...items];
  let rng = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    const r = nextRandom(rng);
    rng = r.nextState;
    const j = Math.floor(r.value * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return { result: arr, nextSeed: rng };
}
