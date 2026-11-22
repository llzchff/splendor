import { TRADING_POSTS } from '../engine/data/tradingPosts';
import {
  computePayment,
  getPlayerBonuses,
  getTotalBonuses,
  getTotalTokens,
} from '../engine/payment';
import {
  applyAction,
  findBoardCard,
  getAllBoardCards,
  getLegalActions,
  getPlayerPoints,
} from '../engine/rules';
import {
  AIDifficulty,
  Card,
  GEM_COLORS,
  GameAction,
  GameState,
  GemColor,
  PlayerState,
} from '../engine/types';

/**
 * Computes color weights representing how urgently `player` needs each gem color
 * for affordable/near-affordable high-value cards, nobles, cities, and trading posts.
 */
function computeColorDemand(state: GameState, player: PlayerState): Record<GemColor, number> {
  const demand: Record<GemColor, number> = {
    white: 1,
    blue: 1,
    green: 1,
    red: 1,
    black: 1,
  };
  const bonuses = getPlayerBonuses(player);

  // Demand from Nobles
  for (const noble of [...state.nobles, ...player.reservedNobles]) {
    let missing = 0;
    for (const c of GEM_COLORS) missing += Math.max(0, noble.requirements[c] - bonuses[c]);
    const weight = missing <= 2 ? 4.5 : missing <= 4 ? 2.2 : 0.8;
    for (const c of GEM_COLORS) {
      if (noble.requirements[c] > bonuses[c]) {
        demand[c] += weight;
      }
    }
  }

  // Demand from Cities
  for (const city of state.cities) {
    for (const c of GEM_COLORS) {
      if (city.requirement.bonuses[c] > bonuses[c]) {
        demand[c] += 2.5;
      }
    }
  }

  // Demand from Trading Posts
  if (state.config.expansions.tradingPosts) {
    for (const tp of TRADING_POSTS) {
      if (player.tradingPosts.includes(tp.id)) continue;
      for (const c of GEM_COLORS) {
        const req = tp.bonusReq[c] ?? 0;
        if (req > bonuses[c]) {
          demand[c] += 1.6;
        }
      }
    }
  }

  // Demand from reserved + board cards close to affordability
  const targets: Card[] = [...player.reserved, ...getAllBoardCards(state)];
  for (const card of targets) {
    const pay = computePayment(player, card);
    const isReserved = player.reserved.some((r) => r.id === card.id);
    if (pay.missingGems > 0 && pay.missingGems <= 4) {
      const cardWeight = ((card.points + 1.2) * (isReserved ? 2.4 : 1.0)) / (pay.missingGems + 0.5);
      for (const c of GEM_COLORS) {
        const net = Math.max(0, card.cost[c] - bonuses[c] - player.tokens[c]);
        if (net > 0) {
          demand[c] += cardWeight * Math.min(2, net);
        }
      }
    }
  }

  return demand;
}

/**
 * Evaluates a GameState from `playerId`'s perspective (higher = better).
 */
export function evaluateState(state: GameState, playerId: string): number {
  const me = state.players.find((p) => p.id === playerId);
  if (!me) return 0;

  if (state.phase === 'finished') {
    if (state.winnerIds.includes(playerId)) {
      return 10000 + getPlayerPoints(me) * 10 - me.cards.length;
    }
    return -10000 + getPlayerPoints(me) * 10;
  }

  const scorePlayer = (p: PlayerState): number => {
    const pts = getPlayerPoints(p);
    const bonuses = getPlayerBonuses(p);
    const totalBonus = getTotalBonuses(p);
    const totalTokens = getTotalTokens(p.tokens);

    let s = 0;
    // Prestige points grow nonlinearly near victory
    s += pts * 18 + (pts >= 12 ? (pts - 11) * 14 : 0);
    if (p.claimedCity) s += 450;

    // Engine value (bonuses are strongest early-mid game)
    const engineWeight = pts < 8 ? 11 : pts < 13 ? 7 : 3.5;
    s += totalBonus * engineWeight;

    // Tokens & gold flexibility
    s += totalTokens * 2.1 + p.tokens.gold * 3.8 + p.goldSatchels.length * 6.5;

    // Trading posts unlocked
    s += p.tradingPosts.length * 14;

    // Progress towards closest noble / city
    if (state.config.expansions.cities) {
      let bestCityProg = 0;
      for (const city of state.cities) {
        let reqTotal = 0;
        let met = 0;
        for (const c of GEM_COLORS) {
          reqTotal += city.requirement.bonuses[c];
          met += Math.min(bonuses[c], city.requirement.bonuses[c]);
        }
        const prog = reqTotal > 0 ? met / reqTotal : pts / Math.max(1, city.requirement.minPoints);
        if (prog > bestCityProg) bestCityProg = prog;
      }
      s += bestCityProg * 28;
    } else {
      let nobleScore = 0;
      for (const noble of [...state.nobles, ...p.reservedNobles]) {
        let missing = 0;
        for (const c of GEM_COLORS) missing += Math.max(0, noble.requirements[c] - bonuses[c]);
        if (missing <= 3) nobleScore += (4 - missing) * 6;
      }
      s += Math.min(nobleScore, 38) + p.reservedNobles.length * 6;
    }

    // Reserved cards close to purchase
    for (const card of p.reserved) {
      const pay = computePayment(p, card);
      if (pay.canAfford) {
        s += card.points * 5 + 4;
      } else if (pay.missingGems <= 2) {
        s += card.points * 2.5 + 2;
      }
    }

    // Strongholds blocking useful board cards
    if (state.config.expansions.strongholds) {
      for (const [cardId, sh] of Object.entries(state.strongholds)) {
        if (sh.playerId === p.id) {
          const found = findBoardCard(state, cardId);
          s += sh.count * (found ? 2 + found.card.points * 1.2 : 1.5);
        }
      }
    }

    return s;
  };

  const myScore = scorePlayer(me);
  let bestOppScore = -Infinity;
  for (const p of state.players) {
    if (p.id === playerId) continue;
    const os = scorePlayer(p);
    if (os > bestOppScore) bestOppScore = os;
  }

  return myScore - bestOppScore * 0.85;
}

/**
 * Fast prior scoring for an action (used for Easy/Medium AI and MCTS move ordering).
 */
export function scoreActionQuick(state: GameState, action: GameAction): number {
  const player = state.players[state.currentPlayerIndex];
  const demand = computeColorDemand(state, player);

  switch (action.type) {
    case 'buy_card': {
      const card =
        action.source === 'board'
          ? findBoardCard(state, action.cardId)?.card
          : player.reserved.find((c) => c.id === action.cardId);
      if (!card) return 0;
      const bonusVal = card.bonus ? demand[card.bonus] * card.bonusCount : 2.5;
      const abilityBonus =
        card.ability === 'free_tier2'
          ? 24
          : card.ability === 'wild_satchel_free_t1'
            ? 16
            : card.ability === 'double_bonus'
              ? 14
              : card.ability === 'reserve_noble'
                ? 10
                : card.ability === 'double_gold'
                  ? 8
                  : 0;
      const winBonus =
        getPlayerPoints(player) + card.points >= state.config.targetPoints ? 120 : 0;
      return 32 + card.points * 14 + bonusVal * 3.5 + abilityBonus + winBonus - (action.source === 'reserved' ? -3 : 0);
    }

    case 'take_gems': {
      let score = 10;
      const entries = GEM_COLORS.filter((c) => (action.gems[c] ?? 0) > 0);
      const total = entries.reduce((s, c) => s + (action.gems[c] ?? 0), 0);
      for (const c of entries) {
        score += demand[c] * (action.gems[c] ?? 0) * 2.1;
      }
      // Penalty if taking exceeds 10 token cap
      const overflow = Math.max(0, getTotalTokens(player.tokens) + total - 10);
      score -= overflow * 6;
      return score;
    }

    case 'reserve_card': {
      if (action.source === 'deck') {
        return state.bank.gold > 0 ? 6 : -5;
      }
      const card = action.cardId ? findBoardCard(state, action.cardId)?.card : undefined;
      if (!card) return 0;
      const pay = computePayment(player, card);
      // Reserve high-point cards we are close to buying OR blocking opponent
      let score = state.bank.gold > 0 ? 11 : 4;
      if (card.points >= 3 && pay.missingGems <= 4) score += card.points * 3.2;
      if (card.ability === 'free_tier2' || card.ability === 'double_bonus') score += 7;
      // Check if an opponent can already buy this high-point card (defensive hate-reserve)
      for (const opp of state.players) {
        if (opp.id === player.id) continue;
        if (card.points >= 2 && computePayment(opp, card).canAfford) {
          score += card.points * 4;
        }
      }
      return score;
    }

    case 'discard_tokens': {
      // Prefer keeping gold and high-demand colors
      let penalty = 0;
      for (const c of GEM_COLORS) {
        penalty += (action.tokens[c] ?? 0) * demand[c];
      }
      penalty += (action.tokens.gold ?? 0) * 18;
      return 50 - penalty;
    }

    case 'orient_pair_satchel':
      return demand[action.color] * 5;

    case 'orient_take_free_card': {
      const card = findBoardCard(state, action.cardId)?.card;
      if (!card) return 0;
      return 20 + card.points * 15 + (card.bonus ? demand[card.bonus] * card.bonusCount * 4 : 8);
    }

    case 'orient_reserve_noble': {
      const noble = state.nobles.find((n) => n.id === action.nobleId);
      if (!noble) return 0;
      const bonuses = getPlayerBonuses(player);
      let missing = 0;
      for (const c of GEM_COLORS) missing += Math.max(0, noble.requirements[c] - bonuses[c]);
      return 40 - missing * 5;
    }

    case 'trading_post_bonus_gem':
      return demand[action.color] * 5;

    case 'trading_post_skip_gem':
      return -10;

    case 'stronghold_place': {
      const card = findBoardCard(state, action.targetCardId)?.card;
      const cur = state.strongholds[action.targetCardId];
      const newCount = (cur?.count ?? 0) + 1;
      let s = 12 + (card ? card.points * 4 : 0);
      if (newCount === 3 && card && computePayment(player, card).canAfford) s += 45;
      if (action.fromCardId) s -= 4;
      return s;
    }

    case 'stronghold_remove': {
      const sh = state.strongholds[action.targetCardId];
      const card = findBoardCard(state, action.targetCardId)?.card;
      return 14 + (sh ? sh.count * 8 : 0) + (card ? card.points * 3 : 0);
    }

    case 'stronghold_conquest_buy':
      return action.accept ? 80 : 0;

    case 'choose_noble':
    case 'choose_city':
      return 50;

    default:
      return 0;
  }
}

export function chooseHeuristicAction(
  state: GameState,
  difficulty: AIDifficulty,
  rngSeed = Date.now()
): GameAction {
  const legal = getLegalActions(state);
  if (legal.length === 1) return legal[0];

  const playerId = state.players[state.currentPlayerIndex].id;

  if (difficulty === 'easy') {
    // Score quickly and pick with soft randomness among top moves
    const scored = legal
      .map((a) => ({ action: a, score: scoreActionQuick(state, a) }))
      .sort((a, b) => b.score - a.score);
    const poolSize = Math.min(scored.length, 4);
    const idx = Math.abs(rngSeed) % poolSize;
    return scored[idx].action;
  }

  // Medium: 1-ply full state evaluation on top-K candidate actions
  const topCandidates = legal
    .map((a) => ({ action: a, quick: scoreActionQuick(state, a) }))
    .sort((a, b) => b.quick - a.quick)
    .slice(0, 18);

  let bestAction = topCandidates[0].action;
  let bestVal = -Infinity;

  for (const cand of topCandidates) {
    try {
      let next = applyAction(state, cand.action);
      // Auto-resolve immediate sub-steps greedily so evaluation reflects full turn effect
      let guard = 0;
      while (
        next.phase === 'playing' &&
        next.players[next.currentPlayerIndex].id === playerId &&
        next.pendingQueue.length > 0 &&
        guard < 6
      ) {
        const subMoves = getLegalActions(next);
        if (subMoves.length === 0) break;
        subMoves.sort((a, b) => scoreActionQuick(next, b) - scoreActionQuick(next, a));
        next = applyAction(next, subMoves[0]);
        guard++;
      }
      const val = evaluateState(next, playerId) + cand.quick * 0.15;
      if (val > bestVal) {
        bestVal = val;
        bestAction = cand.action;
      }
    } catch {
      // Skip invalid candidate
    }
  }

  return bestAction;
}
