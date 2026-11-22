import { AIDifficulty, GameAction, GameState } from '../engine/types';
import { chooseAIAction } from './mcts';

export interface AIWorkerRequest {
  requestId: number;
  state: GameState;
  difficulty: AIDifficulty;
  timeBudgetMs?: number;
}

export interface AIWorkerResponse {
  requestId: number;
  action?: GameAction;
  error?: string;
}

self.onmessage = (event: MessageEvent<AIWorkerRequest>) => {
  const { requestId, state, difficulty, timeBudgetMs } = event.data;
  try {
    const action = chooseAIAction(state, difficulty, timeBudgetMs ?? 450);
    const resp: AIWorkerResponse = { requestId, action };
    self.postMessage(resp);
  } catch (err) {
    const resp: AIWorkerResponse = {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(resp);
  }
};
