import { AIDifficulty, GameAction, GameState } from '../engine/types';
import type { AIWorkerRequest, AIWorkerResponse } from './ai.worker';
import { chooseAIAction } from './mcts';

let workerInstance: Worker | null = null;
let nextRequestId = 1;
const pending = new Map<
  number,
  { resolve: (action: GameAction) => void; reject: (err: Error) => void }
>();

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (!workerInstance) {
    try {
      workerInstance = new Worker(new URL('./ai.worker.ts', import.meta.url), {
        type: 'module',
      });
      workerInstance.onmessage = (ev: MessageEvent<AIWorkerResponse>) => {
        const { requestId, action, error } = ev.data;
        const entry = pending.get(requestId);
        if (!entry) return;
        pending.delete(requestId);
        if (error || !action) {
          entry.reject(new Error(error ?? 'AI worker failed'));
        } else {
          entry.resolve(action);
        }
      };
      workerInstance.onerror = (ev) => {
        for (const [, entry] of pending) {
          entry.reject(new Error(ev.message || 'AI worker crashed'));
        }
        pending.clear();
        workerInstance = null;
      };
    } catch {
      return null;
    }
  }
  return workerInstance;
}

export async function requestAIAction(
  state: GameState,
  difficulty: AIDifficulty,
  timeBudgetMs = 450
): Promise<GameAction> {
  const worker = getWorker();
  if (!worker) {
    return chooseAIAction(state, difficulty, timeBudgetMs);
  }

  return new Promise<GameAction>((resolve, reject) => {
    const requestId = nextRequestId++;
    pending.set(requestId, { resolve, reject });
    const req: AIWorkerRequest = { requestId, state, difficulty, timeBudgetMs };
    worker.postMessage(req);
  });
}
