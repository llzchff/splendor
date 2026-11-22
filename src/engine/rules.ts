import { createBaseDeck, createBaseNobles } from './data/baseCards';
import { CHALLENGES } from './data/challenges';
import { ALL_CITY_TILES } from './data/cities';
import { createOrientDeck } from './data/orientCards';
import { TRADING_POSTS } from './data/tradingPosts';
import {
  computePayment,
  emptyGemCounts,
  emptyTokenCounts,
  getPlayerBonuses,
  getTotalBonuses,
  getTotalTokens,
} from './payment';
import { nextRandom, shuffleWithSeed } from './rng';
import {
  BoardTierRow,
  Card,
  CityTile,
  GEM_COLORS,
  GameAction,
  GameConfig,
  GameState,
  GemColor,
  GemCounts,
  Noble,
  OwnedCard,
  PlayerState,
  TOKEN_COLORS,
  Tier,
  TokenCounts,
  TradingPostId,
} from './types';

export function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

/**
 * Total prestige points for a player including cards, nobles, and Trading Posts bonuses.
 */
export function getPlayerPoints(player: PlayerState): number {
  let pts = 0;
  for (const owned of player.cards) {
    pts += owned.card.points;
  }
  for (const noble of player.nobles) {
    pts += noble.points;
  }
  if (player.tradingPosts.includes('five_points_noble')) {
    pts += 5;
  }
  if (player.tradingPosts.includes('one_point_per_crest')) {
    pts += player.tradingPosts.length;
  }
  return pts;
}

export function meetsNoble(player: PlayerState, noble: Noble): boolean {
  const bonuses = getPlayerBonuses(player);
  for (const color of GEM_COLORS) {
    if (bonuses[color] < noble.requirements[color]) return false;
  }
  return true;
}

export function meetsCity(player: PlayerState, city: CityTile): boolean {
  const pts = getPlayerPoints(player);
  if (pts < city.requirement.minPoints) return false;

  const bonuses = getPlayerBonuses(player);
  const fixedColors = new Set<GemColor>();
  for (const color of GEM_COLORS) {
    const req = city.requirement.bonuses[color];
    if (req > 0) {
      if (bonuses[color] < req) return false;
      fixedColors.add(color);
    }
  }

  if (city.requirement.anyColorCount && city.requirement.anyColorCount > 0) {
    const neededDistinct = city.requirement.anyColorDistinct ?? 1;
    let matched = 0;
    for (const color of GEM_COLORS) {
      if (fixedColors.has(color)) continue;
      if (bonuses[color] >= city.requirement.anyColorCount) {
        matched++;
      }
    }
    if (matched < neededDistinct) return false;
  }
  return true;
}

export function meetsTradingPost(
  player: PlayerState,
  postId: TradingPostId,
  citiesMode: boolean
): boolean {
  const def = TRADING_POSTS.find((t) => t.id === postId);
  if (!def) return false;
  const bonuses = getPlayerBonuses(player);
  for (const color of GEM_COLORS) {
    const req = def.bonusReq[color] ?? 0;
    if (bonuses[color] < req) return false;
  }
  if (def.requiresNoble) {
    if (citiesMode) {
      if (getPlayerPoints(player) < 10) return false;
    } else {
      if (player.nobles.length < 1) return false;
    }
  }
  return true;
}

export function findBoardCard(
  state: GameState,
  cardId: string
): { card: Card; tier: Tier; isOrient: boolean; slotIndex: number } | null {
  for (const tier of [1, 2, 3] as Tier[]) {
    const row = state.tiers[tier];
    for (let i = 0; i < row.baseSlots.length; i++) {
      const c = row.baseSlots[i];
      if (c && c.id === cardId) {
        return { card: c, tier, isOrient: false, slotIndex: i };
      }
    }
    for (let i = 0; i < row.orientSlots.length; i++) {
      const c = row.orientSlots[i];
      if (c && c.id === cardId) {
        return { card: c, tier, isOrient: true, slotIndex: i };
      }
    }
  }
  return null;
}

export function getAllBoardCards(state: GameState): Card[] {
  const res: Card[] = [];
  for (const tier of [1, 2, 3] as Tier[]) {
    const row = state.tiers[tier];
    for (const c of row.baseSlots) if (c) res.push(c);
    for (const c of row.orientSlots) if (c) res.push(c);
  }
  return res;
}

function addLog(
  state: GameState,
  playerId: string,
  playerName: string,
  text: string,
  kind: GameState['log'][number]['kind']
): void {
  state.log.push({
    id: state.nextLogId++,
    round: state.round,
    playerId,
    playerName,
    text,
    kind,
  });
  if (state.log.length > 120) {
    state.log.splice(0, state.log.length - 120);
  }
}

function gemSupplyForPlayers(count: number): number {
  if (count <= 2) return 4;
  if (count === 3) return 5;
  return 7;
}

export function createGame(config: GameConfig): GameState {
  const playerCount = config.players.length;
  if (playerCount < 2 || playerCount > 4) {
    throw new Error(`Invalid player count: ${playerCount}`);
  }

  let rng = config.seed || 1234567;
  const baseAll = createBaseDeck();
  const orientAll = config.expansions.orient ? createOrientDeck() : [];

  const tiers = {} as Record<Tier, BoardTierRow>;
  for (const tier of [1, 2, 3] as Tier[]) {
    const shufBase = shuffleWithSeed(
      baseAll.filter((c) => c.tier === tier),
      rng
    );
    rng = shufBase.nextSeed;
    const baseDeck = shufBase.result;
    const baseSlots: (Card | null)[] = [];
    for (let i = 0; i < 4; i++) {
      baseSlots.push(baseDeck.pop() ?? null);
    }

    let orientDeck: Card[] = [];
    const orientSlots: (Card | null)[] = [];
    if (config.expansions.orient) {
      const shufOrient = shuffleWithSeed(
        orientAll.filter((c) => c.tier === tier),
        rng
      );
      rng = shufOrient.nextSeed;
      orientDeck = shufOrient.result;
      for (let i = 0; i < 2; i++) {
        orientSlots.push(orientDeck.pop() ?? null);
      }
    }

    tiers[tier] = {
      tier,
      baseDeck,
      baseSlots,
      orientDeck,
      orientSlots,
    };
  }

  let nobles: Noble[] = [];
  let cities: CityTile[] = [];
  if (config.expansions.cities) {
    const pairIds = [1, 2, 3, 4, 5, 6, 7];
    const shufPairs = shuffleWithSeed(pairIds, rng);
    rng = shufPairs.nextSeed;
    const chosenPairs = shufPairs.result.slice(0, 3);
    for (const pid of chosenPairs) {
      const r = nextRandom(rng);
      rng = r.nextState;
      const side = r.value < 0.5 ? 'A' : 'B';
      const tile = ALL_CITY_TILES.find((c) => c.pairId === pid && c.side === side);
      if (tile) cities.push(tile);
    }
  } else {
    const shufNobles = shuffleWithSeed(createBaseNobles(), rng);
    rng = shufNobles.nextSeed;
    nobles = shufNobles.result.slice(0, playerCount + 1);
  }

  const perColor = gemSupplyForPlayers(playerCount);
  const goldCount = config.challenge?.forbidGold ? 0 : 5;
  const bank: TokenCounts = {
    white: perColor,
    blue: perColor,
    green: perColor,
    red: perColor,
    black: perColor,
    gold: goldCount,
  };

  const players: PlayerState[] = config.players.map((p) => ({
    id: p.id,
    name: p.name,
    isAI: p.isAI,
    aiDifficulty: p.aiDifficulty ?? 'medium',
    avatarIndex: p.avatarIndex,
    tokens: emptyTokenCounts(),
    cards: [],
    goldSatchels: [],
    reserved: [],
    nobles: [],
    reservedNobles: [],
    claimedCity: null,
    tradingPosts: [],
    strongholdsRemaining: config.expansions.strongholds ? 3 : 0,
    turnsTaken: 0,
  }));

  const state: GameState = {
    config: {
      ...config,
      targetPoints: config.challenge?.targetPoints ?? config.targetPoints ?? 15,
    },
    rngState: rng,
    phase: 'playing',
    round: 1,
    currentPlayerIndex: 0,
    finalRoundTriggered: false,
    bank,
    tiers,
    nobles,
    cities,
    players,
    strongholds: {},
    pendingQueue: [],
    pendingRefills: [],
    endOfTurnChecked: false,
    winnerIds: [],
    log: [],
    nextLogId: 1,
  };

  // Apply scripted endgame puzzle preset for Challenge #5
  if (config.challenge?.presetId === 'endgame_comeback') {
    applyEndgameComebackPreset(state);
  }

  addLog(state, 'system', '系统', '对局开始，祝各位宝石商好运！', 'system');
  return state;
}

function applyEndgameComebackPreset(state: GameState): void {
  const human = state.players[0];
  const ai = state.players[1];
  if (!human || !ai) return;

  // Give human an established engine: 8 pts + strong multi-color discounts + tokens
  const pullCard = (tier: Tier, predicate: (c: Card) => boolean): Card | null => {
    const deck = state.tiers[tier].baseDeck;
    const idx = deck.findIndex(predicate);
    if (idx !== -1) return deck.splice(idx, 1)[0];
    return deck.pop() ?? null;
  };

  // Human gets 1 of each color (Tier 1) + two Tier 2 cards (total 8 pts)
  const humanSeedSpecs: Array<[Tier, GemColor, number]> = [
    [1, 'white', 0],
    [1, 'blue', 0],
    [1, 'green', 0],
    [1, 'red', 1],
    [1, 'black', 0],
    [2, 'white', 2],
    [2, 'blue', 2],
    [2, 'green', 3],
  ];
  for (const [tier, color, minPts] of humanSeedSpecs) {
    const c = pullCard(tier, (x) => x.bonus === color && x.points >= minPts) ?? pullCard(tier, (x) => x.bonus === color);
    if (c) human.cards.push({ card: c });
  }
  human.tokens = { white: 1, blue: 1, green: 1, red: 2, black: 2, gold: 1 };

  // AI starts ahead at 12 pts, fewer tokens
  const aiSeedSpecs: Array<[Tier, GemColor, number]> = [
    [1, 'red', 0],
    [1, 'black', 0],
    [2, 'red', 2],
    [2, 'black', 2],
    [3, 'red', 4],
    [3, 'black', 4],
  ];
  for (const [tier, color, minPts] of aiSeedSpecs) {
    const c = pullCard(tier, (x) => x.bonus === color && x.points >= minPts) ?? pullCard(tier, (x) => x.bonus === color);
    if (c) ai.cards.push({ card: c });
  }
  ai.tokens = { white: 1, blue: 1, green: 0, red: 1, black: 0, gold: 0 };

  // Adjust bank counts so total stays sane
  for (const color of GEM_COLORS) {
    state.bank[color] = Math.max(1, state.bank[color] - Math.min(2, human.tokens[color]));
  }
  state.bank.gold = Math.max(1, state.bank.gold - 1);
}

function isBlockedByOpponentStronghold(
  state: GameState,
  cardId: string,
  playerId: string
): boolean {
  if (!state.config.expansions.strongholds) return false;
  const sh = state.strongholds[cardId];
  return Boolean(sh && sh.count > 0 && sh.playerId !== playerId);
}

function flushRefills(state: GameState): void {
  while (state.pendingRefills.length > 0) {
    const refill = state.pendingRefills.shift()!;
    const row = state.tiers[refill.tier];
    if (refill.isOrient) {
      if (row.orientSlots[refill.slotIndex] === null) {
        row.orientSlots[refill.slotIndex] = row.orientDeck.pop() ?? null;
      }
    } else {
      if (row.baseSlots[refill.slotIndex] === null) {
        row.baseSlots[refill.slotIndex] = row.baseDeck.pop() ?? null;
      }
    }
  }
}

/**
 * Optimal sacrifice of >= 2 bonuses of `color` minimizing lost prestige points.
 */
function sacrificeBonusesForColor(player: PlayerState, color: GemColor): Card[] {
  const candidates = player.cards
    .map((owned, index) => ({ owned, index }))
    .filter(({ owned }) => (owned.card.bonus ?? owned.attachedColor) === color && owned.card.bonusCount > 0);

  // Find subset with bonusCount sum >= 2 and minimum total points (tie-break: fewest cards)
  let bestIndices: number[] | null = null;
  let bestPoints = Infinity;
  let bestLen = Infinity;

  // Check single cards with bonusCount >= 2
  for (const item of candidates) {
    if (item.owned.card.bonusCount >= 2) {
      if (item.owned.card.points < bestPoints || (item.owned.card.points === bestPoints && 1 < bestLen)) {
        bestPoints = item.owned.card.points;
        bestLen = 1;
        bestIndices = [item.index];
      }
    }
  }

  // Check pairs
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const pts = candidates[i].owned.card.points + candidates[j].owned.card.points;
      if (pts < bestPoints || (pts === bestPoints && 2 < bestLen)) {
        bestPoints = pts;
        bestLen = 2;
        bestIndices = [candidates[i].index, candidates[j].index];
      }
    }
  }

  if (!bestIndices) return [];
  const removed: Card[] = [];
  // Remove descending so splice indices remain valid
  for (const idx of [...bestIndices].sort((a, b) => b - a)) {
    const [r] = player.cards.splice(idx, 1);
    if (r) removed.push(r.card);
  }
  return removed;
}

function hasEligibleFreeCard(state: GameState, tier: 1 | 2, player: PlayerState): boolean {
  const row = state.tiers[tier];
  const all = [...row.baseSlots, ...row.orientSlots].filter((c): c is Card => c !== null);
  return all.some((c) => {
    if (isBlockedByOpponentStronghold(state, c.id, player.id)) return false;
    if (
      (c.ability === 'wild_satchel' || c.ability === 'wild_satchel_free_t1') &&
      getTotalBonuses(player) === 0
    ) {
      return false;
    }
    return true;
  });
}

function addCardToPlayerAndQueueAbilities(
  state: GameState,
  player: PlayerState,
  card: Card,
  insertFront = false
): void {
  if (card.ability === 'double_gold') {
    player.goldSatchels.push(card);
    return;
  }

  const owned: OwnedCard = { card };
  player.cards.push(owned);

  const newSteps: GameState['pendingQueue'] = [];
  if (card.ability === 'wild_satchel') {
    newSteps.push({ type: 'orient_pair_satchel', cardId: card.id });
  } else if (card.ability === 'wild_satchel_free_t1') {
    newSteps.push({ type: 'orient_pair_satchel', cardId: card.id });
    if (hasEligibleFreeCard(state, 1, player)) {
      newSteps.push({ type: 'orient_take_free_card', tier: 1 });
    }
  } else if (card.ability === 'reserve_noble') {
    if (!state.config.expansions.cities && state.nobles.length > 0) {
      newSteps.push({ type: 'orient_reserve_noble' });
    }
  } else if (card.ability === 'free_tier2') {
    if (hasEligibleFreeCard(state, 2, player)) {
      newSteps.push({ type: 'orient_take_free_card', tier: 2 });
    }
  }

  if (insertFront) {
    state.pendingQueue.unshift(...newSteps);
  } else {
    state.pendingQueue.push(...newSteps);
  }
}

function executeCardPurchase(
  state: GameState,
  player: PlayerState,
  source: 'board' | 'reserved',
  cardId: string,
  useGoldSatchels?: number,
  isConquestBonus = false
): void {
  let card: Card;
  if (source === 'board') {
    const found = findBoardCard(state, cardId);
    if (!found) throw new Error(`Board card not found: ${cardId}`);
    if (isBlockedByOpponentStronghold(state, cardId, player.id)) {
      throw new Error('Card is occupied by an opponent stronghold');
    }
    card = found.card;
    if (state.config.challenge?.forbidTier3 && card.tier === 3) {
      throw new Error('Tier 3 cards are forbidden in this challenge');
    }

    const payment = computePayment(player, card, useGoldSatchels);
    if (!payment.canAfford) {
      throw new Error(`Cannot afford card ${cardId}`);
    }

    // Pay tokens or sacrifice bonuses
    if (card.ability === 'discard_bonuses' && card.sacrificeColor) {
      sacrificeBonusesForColor(player, card.sacrificeColor);
    } else {
      for (const c of TOKEN_COLORS) {
        player.tokens[c] -= payment.tokensSpent[c];
        state.bank[c] += payment.tokensSpent[c];
      }
      if (payment.goldSatchelsUsed > 0) {
        player.goldSatchels.splice(0, payment.goldSatchelsUsed);
      }
    }

    // Return player's own strongholds on this card
    const sh = state.strongholds[cardId];
    if (sh && sh.playerId === player.id) {
      player.strongholdsRemaining += sh.count;
      delete state.strongholds[cardId];
    }

    // Remove from board slot & schedule refill
    const row = state.tiers[found.tier];
    if (found.isOrient) {
      row.orientSlots[found.slotIndex] = null;
    } else {
      row.baseSlots[found.slotIndex] = null;
    }
    state.pendingRefills.push({
      tier: found.tier,
      isOrient: found.isOrient,
      slotIndex: found.slotIndex,
    });
  } else {
    const idx = player.reserved.findIndex((c) => c.id === cardId);
    if (idx === -1) throw new Error(`Reserved card not found: ${cardId}`);
    card = player.reserved[idx];
    if (state.config.challenge?.forbidTier3 && card.tier === 3) {
      throw new Error('Tier 3 cards are forbidden in this challenge');
    }

    const payment = computePayment(player, card, useGoldSatchels);
    if (!payment.canAfford) {
      throw new Error(`Cannot afford reserved card ${cardId}`);
    }

    if (card.ability === 'discard_bonuses' && card.sacrificeColor) {
      sacrificeBonusesForColor(player, card.sacrificeColor);
    } else {
      for (const c of TOKEN_COLORS) {
        player.tokens[c] -= payment.tokensSpent[c];
        state.bank[c] += payment.tokensSpent[c];
      }
      if (payment.goldSatchelsUsed > 0) {
        player.goldSatchels.splice(0, payment.goldSatchelsUsed);
      }
    }
    player.reserved.splice(idx, 1);
  }

  addLog(
    state,
    player.id,
    player.name,
    `${isConquestBonus ? '要塞突袭购买' : '购买'}了 ${card.tier} 级${card.isOrient ? '东方' : ''}卡${card.points > 0 ? ` (+${card.points}分)` : ''}`,
    'buy'
  );

  // Add card & queue any Orient abilities first
  addCardToPlayerAndQueueAbilities(state, player, card);

  // Queue Trading Post #1 (gem_after_buy) if unlocked and any non-gold gem exists in bank
  if (
    state.config.expansions.tradingPosts &&
    player.tradingPosts.includes('gem_after_buy') &&
    GEM_COLORS.some((c) => state.bank[c] > 0)
  ) {
    state.pendingQueue.push({ type: 'trading_post_bonus_gem' });
  }

  // Queue Strongholds mandatory action before refilling empty slots
  if (state.config.expansions.strongholds) {
    const canPlaceOrRemove = canDoAnyStrongholdAction(state, player);
    if (canPlaceOrRemove) {
      state.pendingQueue.push({ type: 'stronghold_action' });
    }
  }
}

function canDoAnyStrongholdAction(state: GameState, player: PlayerState): boolean {
  const boardCards = getAllBoardCards(state);
  // Can remove an opponent stronghold
  for (const c of boardCards) {
    const sh = state.strongholds[c.id];
    if (sh && sh.count > 0 && sh.playerId !== player.id) return true;
  }
  // Can place from hand or move an existing own stronghold
  const hasOwnOnBoard = Object.values(state.strongholds).some(
    (sh) => sh.playerId === player.id && sh.count > 0
  );
  if (player.strongholdsRemaining > 0 || hasOwnOnBoard) {
    for (const c of boardCards) {
      const sh = state.strongholds[c.id];
      if (!sh || sh.playerId === player.id) return true;
    }
  }
  return false;
}

function finalizeTurnIfReady(state: GameState): void {
  if (state.phase === 'finished') return;

  // Wait until all immediate queued steps (Orient abilities, Trading Post gems, Strongholds) resolve
  if (state.pendingQueue.length > 0) {
    // Flush board refills once no stronghold or trading_post_bonus_gem step remains
    const holdRefill = state.pendingQueue.some(
      (s) => s.type === 'stronghold_action' || s.type === 'trading_post_bonus_gem'
    );
    if (!holdRefill) {
      flushRefills(state);
    }
    return;
  }

  // Ensure all board refills are flushed before end-of-turn checks
  flushRefills(state);

  const player = state.players[state.currentPlayerIndex];

  // 1. Check 10-token limit
  const totalTok = getTotalTokens(player.tokens);
  if (totalTok > 10) {
    state.pendingQueue.push({ type: 'discard_tokens', count: totalTok - 10 });
    return;
  }

  // 2. Noble / City visit + Trading Post unlocks (once per turn)
  if (!state.endOfTurnChecked) {
    state.endOfTurnChecked = true;

    if (state.config.expansions.cities) {
      if (!player.claimedCity) {
        const eligibleCities = state.cities.filter((city) => meetsCity(player, city));
        if (eligibleCities.length === 1) {
          claimCity(state, player, eligibleCities[0].id);
        } else if (eligibleCities.length > 1) {
          state.pendingQueue.push({
            type: 'choose_city',
            cityIds: eligibleCities.map((c) => c.id),
          });
          return;
        }
      }
    } else {
      const eligibleNobles = [
        ...state.nobles.filter((n) => meetsNoble(player, n)),
        ...player.reservedNobles.filter((n) => meetsNoble(player, n)),
      ];
      if (eligibleNobles.length === 1) {
        claimNoble(state, player, eligibleNobles[0].id);
      } else if (eligibleNobles.length > 1) {
        state.pendingQueue.push({
          type: 'choose_noble',
          nobleIds: eligibleNobles.map((n) => n.id),
        });
        return;
      }
    }
  }

  // 3. Trading Posts automatic unlock check (runs after noble visit!)
  if (state.config.expansions.tradingPosts) {
    for (const tp of TRADING_POSTS) {
      if (!player.tradingPosts.includes(tp.id)) {
        if (meetsTradingPost(player, tp.id, state.config.expansions.cities)) {
          player.tradingPosts.push(tp.id);
          addLog(
            state,
            player.id,
            player.name,
            `解锁贸易站特权【${tp.name}】！`,
            'expansion'
          );
        }
      }
    }
    // Re-check City in case Trading Post points pushed player over a City threshold
    if (state.config.expansions.cities && !player.claimedCity) {
      const eligibleCities = state.cities.filter((city) => meetsCity(player, city));
      if (eligibleCities.length === 1) {
        claimCity(state, player, eligibleCities[0].id);
      } else if (eligibleCities.length > 1) {
        state.pendingQueue.push({
          type: 'choose_city',
          cityIds: eligibleCities.map((c) => c.id),
        });
        return;
      }
    }
  }

  // 4. Trigger final round check
  player.turnsTaken += 1;

  if (!state.config.expansions.cities) {
    if (getPlayerPoints(player) >= state.config.targetPoints) {
      if (!state.finalRoundTriggered) {
        state.finalRoundTriggered = true;
        addLog(
          state,
          player.id,
          player.name,
          `达到 ${getPlayerPoints(player)} 威望分，触发最终回合！`,
          'system'
        );
      }
    }
  }

  // 5. Advance to next player or finish match
  const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  state.endOfTurnChecked = false;

  const challenge = state.config.challenge;
  const maxTurnsExceeded =
    challenge?.maxTurns !== undefined &&
    nextIndex === 0 &&
    state.players[0].turnsTaken >= challenge.maxTurns;

  if (nextIndex === 0 && (state.finalRoundTriggered || maxTurnsExceeded)) {
    concludeGame(state);
    return;
  }

  state.currentPlayerIndex = nextIndex;
  if (nextIndex === 0) {
    state.round += 1;
  }
}

function claimNoble(state: GameState, player: PlayerState, nobleId: string): void {
  let idx = state.nobles.findIndex((n) => n.id === nobleId);
  let noble: Noble | undefined;
  if (idx !== -1) {
    [noble] = state.nobles.splice(idx, 1);
  } else {
    idx = player.reservedNobles.findIndex((n) => n.id === nobleId);
    if (idx !== -1) {
      [noble] = player.reservedNobles.splice(idx, 1);
    }
  }
  if (!noble) throw new Error(`Noble not found: ${nobleId}`);
  player.nobles.push(noble);
  addLog(state, player.id, player.name, `获得贵族【${noble.name}】造访 (+${noble.points}分)`, 'noble');
}

function claimCity(state: GameState, player: PlayerState, cityId: string): void {
  const idx = state.cities.findIndex((c) => c.id === cityId);
  if (idx === -1) throw new Error(`City not found: ${cityId}`);
  const [city] = state.cities.splice(idx, 1);
  player.claimedCity = city;
  state.finalRoundTriggered = true;
  addLog(state, player.id, player.name, `占领名城【${city.name}】，触发最终回合！`, 'noble');
}

function concludeGame(state: GameState): void {
  state.phase = 'finished';

  let candidates = [...state.players];
  if (state.config.expansions.cities) {
    const cityHolders = candidates.filter((p) => p.claimedCity !== null);
    if (cityHolders.length > 0) {
      candidates = cityHolders;
    }
  }

  candidates.sort((a, b) => {
    const ptsDiff = getPlayerPoints(b) - getPlayerPoints(a);
    if (ptsDiff !== 0) return ptsDiff;
    return a.cards.length - b.cards.length;
  });

  const topPts = getPlayerPoints(candidates[0]);
  const topCards = candidates[0].cards.length;
  state.winnerIds = candidates
    .filter((p) => getPlayerPoints(p) === topPts && p.cards.length === topCards)
    .map((p) => p.id);

  // Evaluate single-player challenge result if applicable
  if (state.config.challenge) {
    const ch = state.config.challenge;
    const chDef = CHALLENGES.find((c) => c.id === ch.id);
    const human = state.players[0];
    const humanWonMatch = state.winnerIds.includes(human.id);
    const humanPts = getPlayerPoints(human);

    let won = humanWonMatch;
    let reason = humanWonMatch ? '挑战成功！' : '未能在对局中胜出';

    if (won && ch.maxTurns !== undefined && human.turnsTaken > ch.maxTurns) {
      won = false;
      reason = `超出回合限制（${human.turnsTaken}/${ch.maxTurns} 回合）`;
    }
    if (won && ch.targetPoints !== undefined && !state.config.expansions.cities && humanPts < ch.targetPoints) {
      won = false;
      reason = `未达到 ${ch.targetPoints} 威望分`;
    }
    if (won && ch.requiredNobles !== undefined && human.nobles.length < ch.requiredNobles) {
      won = false;
      reason = `贵族数量不足（${human.nobles.length}/${ch.requiredNobles}）`;
    }
    if (won && ch.requireCity && !human.claimedCity) {
      won = false;
      reason = '未能成功占领一座名城';
    }

    let stars: 0 | 1 | 2 | 3 = 0;
    if (won && chDef) {
      if (human.turnsTaken <= chDef.starThresholds.threeStarsMaxTurns) {
        stars = 3;
      } else if (human.turnsTaken <= chDef.starThresholds.twoStarsMaxTurns) {
        stars = 2;
      } else {
        stars = 1;
      }
      if (ch.id === 'ch_noble_feast' && human.nobles.length >= 3) {
        stars = 3;
      }
      reason = `在 ${human.turnsTaken} 回合内完成挑战（${humanPts} 分）`;
    }

    state.challengeResult = {
      challengeId: ch.id,
      won,
      stars,
      reason,
    };
  }

  const winnerNames = state.players
    .filter((p) => state.winnerIds.includes(p.id))
    .map((p) => p.name)
    .join('、');
  addLog(state, 'system', '系统', `对局结束！获胜者：${winnerNames}`, 'system');
}

/**
 * Pure state transition function: validates and executes one GameAction, returning a new GameState.
 */
export function applyAction(prevState: GameState, action: GameAction): GameState {
  if (prevState.phase !== 'playing') {
    throw new Error('Game is already finished');
  }

  const state = cloneState(prevState);
  const player = state.players[state.currentPlayerIndex];
  const pending = state.pendingQueue[0] ?? null;

  if (pending) {
    switch (pending.type) {
      case 'discard_tokens': {
        if (action.type !== 'discard_tokens') {
          throw new Error('Expected discard_tokens action');
        }
        let totalDiscarded = 0;
        for (const c of TOKEN_COLORS) {
          const amt = action.tokens[c] ?? 0;
          if (amt < 0 || amt > player.tokens[c]) {
            throw new Error(`Invalid discard amount for ${c}`);
          }
          totalDiscarded += amt;
        }
        if (totalDiscarded !== pending.count) {
          throw new Error(`Must discard exactly ${pending.count} tokens, got ${totalDiscarded}`);
        }
        for (const c of TOKEN_COLORS) {
          const amt = action.tokens[c] ?? 0;
          if (amt > 0) {
            player.tokens[c] -= amt;
            state.bank[c] += amt;
          }
        }
        state.pendingQueue.shift();
        addLog(state, player.id, player.name, `弃置了 ${totalDiscarded} 枚超出上限的筹码`, 'gem');
        break;
      }

      case 'choose_noble': {
        if (action.type !== 'choose_noble' || !pending.nobleIds.includes(action.nobleId)) {
          throw new Error('Invalid noble selection');
        }
        claimNoble(state, player, action.nobleId);
        state.pendingQueue.shift();
        break;
      }

      case 'choose_city': {
        if (action.type !== 'choose_city' || !pending.cityIds.includes(action.cityId)) {
          throw new Error('Invalid city selection');
        }
        claimCity(state, player, action.cityId);
        state.pendingQueue.shift();
        break;
      }

      case 'orient_pair_satchel': {
        if (action.type !== 'orient_pair_satchel') {
          throw new Error('Expected orient_pair_satchel');
        }
        const bonuses = getPlayerBonuses(player);
        if (bonuses[action.color] <= 0) {
          throw new Error(`Cannot attach satchel to ${action.color} without existing bonus`);
        }
        const owned = player.cards.find(
          (o) => o.card.id === pending.cardId && !o.attachedColor
        );
        if (!owned) throw new Error('Satchel card not found');
        owned.attachedColor = action.color;
        state.pendingQueue.shift();
        addLog(state, player.id, player.name, `将东方百搭卡绑定为【${action.color}】加成`, 'expansion');
        break;
      }

      case 'orient_take_free_card': {
        if (action.type === 'orient_skip_free_card') {
          state.pendingQueue.shift();
          break;
        }
        if (action.type !== 'orient_take_free_card') {
          throw new Error('Expected orient_take_free_card');
        }
        const found = findBoardCard(state, action.cardId);
        if (!found || found.tier !== pending.tier) {
          throw new Error(`Card ${action.cardId} is not a face-up Tier ${pending.tier} card`);
        }
        if (isBlockedByOpponentStronghold(state, action.cardId, player.id)) {
          throw new Error('Card blocked by opponent stronghold');
        }
        if (
          (found.card.ability === 'wild_satchel' || found.card.ability === 'wild_satchel_free_t1') &&
          getTotalBonuses(player) === 0
        ) {
          throw new Error('Cannot take wild_satchel without an existing bonus');
        }

        // Return own strongholds if present
        const sh = state.strongholds[found.card.id];
        if (sh && sh.playerId === player.id) {
          player.strongholdsRemaining += sh.count;
          delete state.strongholds[found.card.id];
        }

        const row = state.tiers[found.tier];
        if (found.isOrient) {
          row.orientSlots[found.slotIndex] = null;
          row.orientSlots[found.slotIndex] = row.orientDeck.pop() ?? null;
        } else {
          row.baseSlots[found.slotIndex] = null;
          row.baseSlots[found.slotIndex] = row.baseDeck.pop() ?? null;
        }

        state.pendingQueue.shift();
        addLog(
          state,
          player.id,
          player.name,
          `通过东方能力免费获得 ${found.tier} 级发展卡${found.card.points > 0 ? ` (+${found.card.points}分)` : ''}`,
          'expansion'
        );
        // Insert any chained Orient abilities right at the front of pendingQueue
        addCardToPlayerAndQueueAbilities(state, player, found.card, true);
        break;
      }

      case 'orient_reserve_noble': {
        if (action.type !== 'orient_reserve_noble') {
          throw new Error('Expected orient_reserve_noble');
        }
        const idx = state.nobles.findIndex((n) => n.id === action.nobleId);
        if (idx === -1) throw new Error(`Noble not found: ${action.nobleId}`);
        const [noble] = state.nobles.splice(idx, 1);
        player.reservedNobles.push(noble);
        state.pendingQueue.shift();
        addLog(state, player.id, player.name, `通过东方使节预定了贵族【${noble.name}】`, 'expansion');
        break;
      }

      case 'trading_post_bonus_gem': {
        if (action.type === 'trading_post_skip_gem') {
          state.pendingQueue.shift();
          break;
        }
        if (action.type !== 'trading_post_bonus_gem') {
          throw new Error('Expected trading_post_bonus_gem');
        }
        if (pending.forbiddenColor && action.color === pending.forbiddenColor) {
          throw new Error('Must take a different gem color');
        }
        if (state.bank[action.color] <= 0) {
          throw new Error(`No ${action.color} gems in bank`);
        }
        state.bank[action.color] -= 1;
        player.tokens[action.color] += 1;
        state.pendingQueue.shift();
        addLog(state, player.id, player.name, `贸易站特权：额外拿取 1 枚宝石`, 'expansion');
        break;
      }

      case 'stronghold_action': {
        if (action.type === 'stronghold_skip') {
          state.pendingQueue.shift();
          break;
        }
        if (action.type === 'stronghold_remove') {
          const sh = state.strongholds[action.targetCardId];
          if (!sh || sh.count <= 0 || sh.playerId === player.id) {
            throw new Error('No opponent stronghold on target card');
          }
          const opp = state.players.find((p) => p.id === sh.playerId);
          if (opp) opp.strongholdsRemaining += 1;
          sh.count -= 1;
          if (sh.count === 0) delete state.strongholds[action.targetCardId];
          state.pendingQueue.shift();
          addLog(state, player.id, player.name, `摧毁了对手的 1 座要塞`, 'expansion');
          break;
        }
        if (action.type === 'stronghold_place') {
          const target = findBoardCard(state, action.targetCardId);
          if (!target) throw new Error('Target card not on board');
          const existing = state.strongholds[action.targetCardId];
          if (existing && existing.playerId !== player.id) {
            throw new Error('Cannot place stronghold on card with opponent stronghold');
          }

          if (action.fromCardId) {
            if (action.fromCardId === action.targetCardId) {
              throw new Error('Cannot move stronghold to the same card');
            }
            const src = state.strongholds[action.fromCardId];
            if (!src || src.playerId !== player.id || src.count <= 0) {
              throw new Error('No own stronghold to move');
            }
            src.count -= 1;
            if (src.count === 0) delete state.strongholds[action.fromCardId];
          } else {
            if (player.strongholdsRemaining <= 0) {
              throw new Error('No strongholds left in hand; must move or remove');
            }
            player.strongholdsRemaining -= 1;
          }

          const newCount = (existing?.count ?? 0) + 1;
          state.strongholds[action.targetCardId] = {
            playerId: player.id,
            count: newCount,
          };
          state.pendingQueue.shift();
          addLog(
            state,
            player.id,
            player.name,
            `在 ${target.tier} 级卡上建造了要塞（当前 ${newCount}/3 座）`,
            'expansion'
          );

          // Conquest rule: 3 own strongholds on a card grants immediate optional purchase!
          if (
            newCount === 3 &&
            !(state.config.challenge?.forbidTier3 && target.tier === 3) &&
            computePayment(player, target.card).canAfford
          ) {
            state.pendingQueue.unshift({
              type: 'stronghold_conquest_buy',
              cardId: action.targetCardId,
            });
          }
          break;
        }
        throw new Error('Expected stronghold action');
      }

      case 'stronghold_conquest_buy': {
        if (action.type !== 'stronghold_conquest_buy') {
          throw new Error('Expected stronghold_conquest_buy');
        }
        state.pendingQueue.shift();
        if (action.accept) {
          executeCardPurchase(state, player, 'board', pending.cardId, action.useGoldSatchels, true);
        }
        break;
      }
    }

    finalizeTurnIfReady(state);
    return state;
  }

  // --- MAIN TURN ACTIONS ---
  switch (action.type) {
    case 'take_gems': {
      const entries = GEM_COLORS.map((c) => [c, action.gems[c] ?? 0] as const).filter(
        ([, v]) => v > 0
      );
      const total = entries.reduce((sum, [, v]) => sum + v, 0);

      if (total === 0) {
        // Only allowed as pass if truly no other gems/actions exist
        addLog(state, player.id, player.name, '跳过本回合（无可用操作）', 'system');
        break;
      }

      if (entries.length === 1 && entries[0][1] === 2) {
        // Take 2 of the same color (bank must have >= 4)
        const [color] = entries[0];
        if (state.bank[color] < 4) {
          throw new Error(`Need at least 4 ${color} gems in bank to take 2`);
        }
        state.bank[color] -= 2;
        player.tokens[color] += 2;
        addLog(state, player.id, player.name, `拿取了 2 枚同色宝石`, 'gem');

        // Trading Post #2: extra_gem_on_two_same
        if (
          state.config.expansions.tradingPosts &&
          player.tradingPosts.includes('extra_gem_on_two_same') &&
          GEM_COLORS.some((c) => c !== color && state.bank[c] > 0)
        ) {
          state.pendingQueue.push({
            type: 'trading_post_bonus_gem',
            forbiddenColor: color,
          });
        }
      } else {
        // Take 1..3 different colors (1 each)
        if (entries.length > 3 || entries.some(([, v]) => v !== 1)) {
          throw new Error('Invalid gem selection');
        }
        for (const [color] of entries) {
          if (state.bank[color] < 1) {
            throw new Error(`Bank has no ${color} gems`);
          }
        }
        for (const [color] of entries) {
          state.bank[color] -= 1;
          player.tokens[color] += 1;
        }
        addLog(state, player.id, player.name, `拿取了 ${entries.length} 枚不同色宝石`, 'gem');
      }
      break;
    }

    case 'reserve_card': {
      if (state.config.challenge?.forbidReserve) {
        throw new Error('Reserving cards is forbidden in this challenge');
      }
      if (player.reserved.length >= 3) {
        throw new Error('Cannot reserve more than 3 cards');
      }

      let reservedCard: Card;
      if (action.source === 'board') {
        if (!action.cardId) throw new Error('cardId required for board reserve');
        const found = findBoardCard(state, action.cardId);
        if (!found) throw new Error(`Board card not found: ${action.cardId}`);
        if (isBlockedByOpponentStronghold(state, action.cardId, player.id)) {
          throw new Error('Card is occupied by an opponent stronghold');
        }

        // Return own strongholds if any
        const sh = state.strongholds[action.cardId];
        if (sh && sh.playerId === player.id) {
          player.strongholdsRemaining += sh.count;
          delete state.strongholds[action.cardId];
        }

        reservedCard = found.card;
        const row = state.tiers[found.tier];
        if (found.isOrient) {
          row.orientSlots[found.slotIndex] = row.orientDeck.pop() ?? null;
        } else {
          row.baseSlots[found.slotIndex] = row.baseDeck.pop() ?? null;
        }
      } else {
        const tier = action.tier;
        if (!tier) throw new Error('tier required for deck reserve');
        const row = state.tiers[tier];
        const deck = action.isOrient ? row.orientDeck : row.baseDeck;
        const drawn = deck.pop();
        if (!drawn) throw new Error('Deck is empty');
        reservedCard = drawn;
      }

      player.reserved.push(reservedCard);
      let gotGold = false;
      if (state.bank.gold > 0 && !state.config.challenge?.forbidGold) {
        state.bank.gold -= 1;
        player.tokens.gold += 1;
        gotGold = true;
      }
      addLog(
        state,
        player.id,
        player.name,
        `预定了 1 张 ${reservedCard.tier} 级${action.source === 'deck' ? '盲抽' : ''}发展卡${gotGold ? '并获得 1 枚黄金' : ''}`,
        'reserve'
      );
      break;
    }

    case 'buy_card': {
      executeCardPurchase(state, player, action.source, action.cardId, action.useGoldSatchels);
      break;
    }

    default:
      throw new Error(`Unexpected action ${action.type} during main turn`);
  }

  finalizeTurnIfReady(state);
  return state;
}

/**
 * Generates all legal GameActions for the active player (handles both main turn and every pending step).
 */
export function getLegalActions(state: GameState): GameAction[] {
  if (state.phase !== 'playing') return [];

  const player = state.players[state.currentPlayerIndex];
  const pending = state.pendingQueue[0] ?? null;

  if (pending) {
    switch (pending.type) {
      case 'discard_tokens': {
        return generateDiscardActions(player.tokens, pending.count);
      }
      case 'choose_noble':
        return pending.nobleIds.map((nobleId) => ({ type: 'choose_noble', nobleId }));
      case 'choose_city':
        return pending.cityIds.map((cityId) => ({ type: 'choose_city', cityId }));
      case 'orient_pair_satchel': {
        const bonuses = getPlayerBonuses(player);
        return GEM_COLORS.filter((c) => bonuses[c] > 0).map((color) => ({
          type: 'orient_pair_satchel',
          color,
        }));
      }
      case 'orient_take_free_card': {
        const row = state.tiers[pending.tier];
        const cards = [...row.baseSlots, ...row.orientSlots].filter((c): c is Card => c !== null);
        const actions: GameAction[] = cards
          .filter((c) => {
            if (isBlockedByOpponentStronghold(state, c.id, player.id)) return false;
            if (
              (c.ability === 'wild_satchel' || c.ability === 'wild_satchel_free_t1') &&
              getTotalBonuses(player) === 0
            ) {
              return false;
            }
            return true;
          })
          .map((c) => ({ type: 'orient_take_free_card', cardId: c.id }));
        return actions.length > 0 ? actions : [{ type: 'orient_skip_free_card' }];
      }
      case 'orient_reserve_noble':
        return state.nobles.map((n) => ({ type: 'orient_reserve_noble', nobleId: n.id }));
      case 'trading_post_bonus_gem': {
        const colors = GEM_COLORS.filter(
          (c) => c !== pending.forbiddenColor && state.bank[c] > 0
        );
        const actions: GameAction[] = colors.map((color) => ({
          type: 'trading_post_bonus_gem',
          color,
        }));
        actions.push({ type: 'trading_post_skip_gem' });
        return actions;
      }
      case 'stronghold_action': {
        const actions: GameAction[] = [];
        const boardCards = getAllBoardCards(state);
        // 1. Place from hand
        if (player.strongholdsRemaining > 0) {
          for (const c of boardCards) {
            const sh = state.strongholds[c.id];
            if (!sh || sh.playerId === player.id) {
              actions.push({ type: 'stronghold_place', targetCardId: c.id });
            }
          }
        }
        // 2. Move own stronghold
        const ownCardIds = Object.entries(state.strongholds)
          .filter(([, sh]) => sh.playerId === player.id && sh.count > 0)
          .map(([id]) => id);
        for (const fromCardId of ownCardIds) {
          for (const c of boardCards) {
            if (c.id === fromCardId) continue;
            const sh = state.strongholds[c.id];
            if (!sh || sh.playerId === player.id) {
              actions.push({ type: 'stronghold_place', targetCardId: c.id, fromCardId });
            }
          }
        }
        // 3. Remove opponent stronghold
        for (const c of boardCards) {
          const sh = state.strongholds[c.id];
          if (sh && sh.count > 0 && sh.playerId !== player.id) {
            actions.push({ type: 'stronghold_remove', targetCardId: c.id });
          }
        }
        return actions.length > 0 ? actions : [{ type: 'stronghold_skip' }];
      }
      case 'stronghold_conquest_buy':
        return [
          { type: 'stronghold_conquest_buy', accept: true },
          { type: 'stronghold_conquest_buy', accept: false },
        ];
    }
  }

  const actions: GameAction[] = [];

  // 1. Buy board cards
  for (const card of getAllBoardCards(state)) {
    if (state.config.challenge?.forbidTier3 && card.tier === 3) continue;
    if (isBlockedByOpponentStronghold(state, card.id, player.id)) continue;
    if (computePayment(player, card).canAfford) {
      actions.push({ type: 'buy_card', source: 'board', cardId: card.id });
    }
  }

  // 2. Buy reserved cards
  for (const card of player.reserved) {
    if (state.config.challenge?.forbidTier3 && card.tier === 3) continue;
    if (computePayment(player, card).canAfford) {
      actions.push({ type: 'buy_card', source: 'reserved', cardId: card.id });
    }
  }

  // 3. Take 2 of the same color (bank >= 4)
  for (const color of GEM_COLORS) {
    if (state.bank[color] >= 4) {
      actions.push({ type: 'take_gems', gems: { [color]: 2 } });
    }
  }

  // 4. Take up to 3 different colors
  const availableColors = GEM_COLORS.filter((c) => state.bank[c] > 0);
  if (availableColors.length >= 3) {
    for (let i = 0; i < availableColors.length; i++) {
      for (let j = i + 1; j < availableColors.length; j++) {
        for (let k = j + 1; k < availableColors.length; k++) {
          actions.push({
            type: 'take_gems',
            gems: { [availableColors[i]]: 1, [availableColors[j]]: 1, [availableColors[k]]: 1 },
          });
        }
      }
    }
  } else if (availableColors.length === 2) {
    actions.push({
      type: 'take_gems',
      gems: { [availableColors[0]]: 1, [availableColors[1]]: 1 },
    });
  } else if (availableColors.length === 1) {
    actions.push({
      type: 'take_gems',
      gems: { [availableColors[0]]: 1 },
    });
  }

  // 5. Reserve cards (board & blind deck)
  if (!state.config.challenge?.forbidReserve && player.reserved.length < 3) {
    for (const card of getAllBoardCards(state)) {
      if (isBlockedByOpponentStronghold(state, card.id, player.id)) continue;
      actions.push({ type: 'reserve_card', source: 'board', cardId: card.id });
    }
    for (const tier of [1, 2, 3] as Tier[]) {
      if (state.tiers[tier].baseDeck.length > 0) {
        actions.push({ type: 'reserve_card', source: 'deck', tier, isOrient: false });
      }
      if (state.config.expansions.orient && state.tiers[tier].orientDeck.length > 0) {
        actions.push({ type: 'reserve_card', source: 'deck', tier, isOrient: true });
      }
    }
  }

  // Failsafe pass if truly no legal moves remain
  if (actions.length === 0) {
    actions.push({ type: 'take_gems', gems: {} });
  }

  return actions;
}

function generateDiscardActions(tokens: TokenCounts, count: number): GameAction[] {
  const results: GameAction[] = [];
  const current: Partial<TokenCounts> = {};

  function dfs(colorIdx: number, remaining: number): void {
    if (remaining === 0) {
      results.push({ type: 'discard_tokens', tokens: { ...current } });
      return;
    }
    if (colorIdx >= TOKEN_COLORS.length || results.length >= 64) return;

    const color = TOKEN_COLORS[colorIdx];
    const maxTake = Math.min(tokens[color], remaining);
    for (let take = 0; take <= maxTake; take++) {
      if (take > 0) current[color] = take;
      else delete current[color];
      dfs(colorIdx + 1, remaining - take);
    }
    delete current[color];
  }

  dfs(0, count);
  return results;
}

export function getGemShortfall(player: PlayerState, card: Card): GemCounts {
  const bonuses = getPlayerBonuses(player);
  const shortfall = emptyGemCounts();
  for (const color of GEM_COLORS) {
    const net = Math.max(0, card.cost[color] - bonuses[color]);
    shortfall[color] = Math.max(0, net - player.tokens[color]);
  }
  return shortfall;
}
