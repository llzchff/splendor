import { describe, expect, it } from 'vitest';
import { chooseAIAction } from './mcts';
import { applyAction, createGame } from '../engine/rules';
import { ExpansionConfig } from '../engine/types';

function runSimulatedMatch(expansions: ExpansionConfig, seed: number, hardBudget = 40) {
  let state = createGame({
    players: [
      { id: 'ai1', name: 'MCTS', isAI: true, aiDifficulty: 'hard', avatarIndex: 0 },
      { id: 'ai2', name: 'Medium', isAI: true, aiDifficulty: 'medium', avatarIndex: 1 },
      { id: 'ai3', name: 'Easy', isAI: true, aiDifficulty: 'easy', avatarIndex: 2 },
    ],
    expansions,
    targetPoints: 15,
    seed,
  });

  let steps = 0;
  const maxSteps = 450;
  while (state.phase === 'playing' && steps < maxSteps) {
    const active = state.players[state.currentPlayerIndex];
    const action = chooseAIAction(state, active.aiDifficulty, hardBudget);
    state = applyAction(state, action);
    steps++;
  }
  return { state, steps };
}

describe('AI end-to-end simulation across base & all expansions', () => {
  it('completes a full 3-player Base game cleanly with Hard MCTS vs Medium vs Easy', () => {
    const { state, steps } = runSimulatedMatch(
      { orient: false, cities: false, tradingPosts: false, strongholds: false },
      1001,
      25
    );
    expect(state.phase).toBe('finished');
    expect(state.winnerIds.length).toBeGreaterThanOrEqual(1);
    expect(steps).toBeLessThan(350);
  });

  it('completes a full game with Orient + Trading Posts + Strongholds enabled simultaneously', () => {
    const { state } = runSimulatedMatch(
      { orient: true, cities: false, tradingPosts: true, strongholds: true },
      2026,
      20
    );
    expect(state.phase).toBe('finished');
    expect(state.winnerIds.length).toBeGreaterThanOrEqual(1);
  });

  it('completes a full game with Cities + Orient enabled', () => {
    const { state } = runSimulatedMatch(
      { orient: true, cities: true, tradingPosts: false, strongholds: false },
      3037,
      20
    );
    expect(state.phase).toBe('finished');
    expect(state.winnerIds.length).toBeGreaterThanOrEqual(1);
  });
});
