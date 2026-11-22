import { nextRandom } from '../engine/rng';
import { applyAction, getLegalActions } from '../engine/rules';
import { AIDifficulty, GameAction, GameState } from '../engine/types';
import { chooseHeuristicAction, evaluateState, scoreActionQuick } from './heuristic';

interface MCTSNode {
  state: GameState;
  action: GameAction | null;
  parent: MCTSNode | null;
  children: MCTSNode[];
  untriedActions: Array<{ action: GameAction; prior: number }>;
  visits: number;
  valueSum: number;
  actorId: string;
}

function createNode(
  state: GameState,
  action: GameAction | null,
  parent: MCTSNode | null
): MCTSNode {
  const legal = getLegalActions(state);
  const scored = legal
    .map((a) => ({ action: a, prior: scoreActionQuick(state, a) }))
    .sort((a, b) => b.prior - a.prior)
    // Prune weak moves at high branching nodes so search goes deep
    .slice(0, 14);

  return {
    state,
    action,
    parent,
    children: [],
    untriedActions: scored,
    visits: 0,
    valueSum: 0,
    actorId: state.players[state.currentPlayerIndex]?.id ?? '',
  };
}

function ucbScore(parentVisits: number, child: MCTSNode, priorRankBonus: number): number {
  if (child.visits === 0) return Infinity;
  const mean = child.valueSum / child.visits;
  const explore = 1.25 * Math.sqrt(Math.log(parentVisits + 1) / child.visits);
  return mean + explore + priorRankBonus / (child.visits + 1);
}

/**
 * Maps raw heuristic evaluation into [0, 1] win-probability proxy via sigmoid.
 */
function evalToUnit(evalScore: number): number {
  return 1 / (1 + Math.exp(-evalScore / 120));
}

/**
 * Time-budgeted MCTS with heuristic-guided short playouts for Hard difficulty.
 * Runs inside a Web Worker so mobile UI stays locked at 60fps.
 */
export function chooseMCTSAction(
  rootState: GameState,
  timeBudgetMs = 450,
  maxIterations = 320
): GameAction {
  const legal = getLegalActions(rootState);
  if (legal.length <= 1) return legal[0];

  const rootPlayerId = rootState.players[rootState.currentPlayerIndex].id;
  const root = createNode(rootState, null, null);
  const start = Date.now();
  let rng = rootState.rngState ^ 0x9e3779b9;

  for (let iter = 0; iter < maxIterations; iter++) {
    if (iter > 16 && Date.now() - start >= timeBudgetMs) break;

    // 1. Selection
    let node = root;
    while (node.state.phase === 'playing' && node.untriedActions.length === 0 && node.children.length > 0) {
      let bestChild = node.children[0];
      let bestScore = -Infinity;
      for (let i = 0; i < node.children.length; i++) {
        const ch = node.children[i];
        const s = ucbScore(node.visits, ch, 0.25 / (i + 1));
        if (s > bestScore) {
          bestScore = s;
          bestChild = ch;
        }
      }
      node = bestChild;
    }

    // 2. Expansion
    if (node.state.phase === 'playing' && node.untriedActions.length > 0) {
      const nextCand = node.untriedActions.shift()!;
      const nextState = applyAction(node.state, nextCand.action);
      const child = createNode(nextState, nextCand.action, node);
      node.children.push(child);
      node = child;
    }

    // 3. Heuristic-guided short rollout (depth 6 plies)
    let sim = node.state;
    for (let depth = 0; depth < 6 && sim.phase === 'playing'; depth++) {
      const moves = getLegalActions(sim);
      if (moves.length === 0) break;
      // Pick among top 3 heuristic moves with softmax-like noise
      const ranked = moves
        .map((m) => ({ m, s: scoreActionQuick(sim, m) }))
        .sort((a, b) => b.s - a.s);
      const r = nextRandom(rng);
      rng = r.nextState;
      const pickIdx = r.value < 0.7 ? 0 : Math.min(ranked.length - 1, r.value < 0.9 ? 1 : 2);
      sim = applyAction(sim, ranked[pickIdx].m);
    }

    const rootReward = evalToUnit(evaluateState(sim, rootPlayerId));

    // 4. Backpropagation
    let curr: MCTSNode | null = node;
    while (curr !== null) {
      curr.visits += 1;
      // Perspective of the player who CHOSE the action leading into `curr`
      const moverIsRoot = curr.parent ? curr.parent.actorId === rootPlayerId : true;
      curr.valueSum += moverIsRoot ? rootReward : 1 - rootReward;
      curr = curr.parent;
    }
  }

  // Choose child with best robust visit/value blend
  let bestChild = root.children[0];
  let bestScore = -Infinity;
  for (const child of root.children) {
    const score = child.visits * 0.65 + (child.valueSum / Math.max(1, child.visits)) * 100;
    if (score > bestScore) {
      bestScore = score;
      bestChild = child;
    }
  }

  return bestChild?.action ?? chooseHeuristicAction(rootState, 'medium');
}

export function chooseAIAction(
  state: GameState,
  difficulty: AIDifficulty,
  timeBudgetMs = 450
): GameAction {
  if (difficulty === 'hard') {
    return chooseMCTSAction(state, timeBudgetMs);
  }
  return chooseHeuristicAction(state, difficulty, state.rngState + state.round * 31);
}
