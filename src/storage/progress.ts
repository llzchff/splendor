import { GameState } from '../engine/types';

export interface ChallengeRecord {
  stars: 1 | 2 | 3;
  bestTurns: number;
  completedAt: number;
}

const PROGRESS_KEY = 'splendor_challenge_progress_v1';
const AUTOSAVE_KEY = 'splendor_autosave_v1';

export function loadChallengeProgress(): Record<string, ChallengeRecord> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, ChallengeRecord>;
  } catch {
    return {};
  }
}

export function saveChallengeRecord(challengeId: string, stars: 1 | 2 | 3, turns: number): void {
  try {
    const all = loadChallengeProgress();
    const prev = all[challengeId];
    all[challengeId] = {
      stars: prev ? (Math.max(prev.stars, stars) as 1 | 2 | 3) : stars,
      bestTurns: prev ? Math.min(prev.bestTurns, turns) : turns,
      completedAt: Date.now(),
    };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  } catch {
    // ignore storage errors
  }
}

export function saveAutoGame(state: GameState | null): void {
  try {
    if (!state || state.phase === 'finished') {
      localStorage.removeItem(AUTOSAVE_KEY);
    } else {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(state));
    }
  } catch {
    // ignore
  }
}

export function loadAutoGame(): GameState | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}
