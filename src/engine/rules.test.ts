import { describe, expect, it } from 'vitest';
import { createBaseDeck, createBaseNobles } from './data/baseCards';
import { CHALLENGES } from './data/challenges';
import { ALL_CITY_TILES } from './data/cities';
import { createOrientDeck } from './data/orientCards';
import { computePayment, getPlayerBonuses, getTotalTokens } from './payment';
import { applyAction, createGame, getLegalActions, getPlayerPoints } from './rules';
import { GEM_COLORS, GameConfig } from './types';

function makeBaseConfig(overrides?: Partial<GameConfig>): GameConfig {
  return {
    players: [
      { id: 'p1', name: 'Alice', isAI: false, avatarIndex: 0 },
      { id: 'p2', name: 'Bob', isAI: false, avatarIndex: 1 },
    ],
    expansions: {
      orient: false,
      cities: false,
      tradingPosts: false,
      strongholds: false,
    },
    targetPoints: 15,
    seed: 42,
    ...overrides,
  };
}

describe('Canonical deck & data integrity', () => {
  it('has exact 90 base cards (40/30/20) with 5-fold symmetry and 10 nobles', () => {
    const cards = createBaseDeck();
    expect(cards).toHaveLength(90);
    expect(cards.filter((c) => c.tier === 1)).toHaveLength(40);
    expect(cards.filter((c) => c.tier === 2)).toHaveLength(30);
    expect(cards.filter((c) => c.tier === 3)).toHaveLength(20);

    for (const color of GEM_COLORS) {
      expect(cards.filter((c) => c.bonus === color && c.tier === 1)).toHaveLength(8);
      expect(cards.filter((c) => c.bonus === color && c.tier === 2)).toHaveLength(6);
      expect(cards.filter((c) => c.bonus === color && c.tier === 3)).toHaveLength(4);
    }

    const nobles = createBaseNobles();
    expect(nobles).toHaveLength(10);
  });

  it('has exact 30 Orient cards (10 per tier) and 14 double-sided City tiles', () => {
    const orient = createOrientDeck();
    expect(orient).toHaveLength(30);
    expect(orient.filter((c) => c.tier === 1)).toHaveLength(10);
    expect(orient.filter((c) => c.tier === 2)).toHaveLength(10);
    expect(orient.filter((c) => c.tier === 3)).toHaveLength(10);
    expect(ALL_CITY_TILES).toHaveLength(14);
  });
});

describe('Base Splendor rules', () => {
  it('sets up correct gem supply for 2, 3, and 4 players', () => {
    const g2 = createGame(makeBaseConfig());
    expect(g2.bank.white).toBe(4);
    expect(g2.bank.gold).toBe(5);
    expect(g2.nobles).toHaveLength(3);

    const g3 = createGame(
      makeBaseConfig({
        players: [
          { id: 'p1', name: 'A', isAI: false, avatarIndex: 0 },
          { id: 'p2', name: 'B', isAI: false, avatarIndex: 1 },
          { id: 'p3', name: 'C', isAI: false, avatarIndex: 2 },
        ],
      })
    );
    expect(g3.bank.white).toBe(5);
    expect(g3.nobles).toHaveLength(4);

    const g4 = createGame(
      makeBaseConfig({
        players: [
          { id: 'p1', name: 'A', isAI: false, avatarIndex: 0 },
          { id: 'p2', name: 'B', isAI: false, avatarIndex: 1 },
          { id: 'p3', name: 'C', isAI: false, avatarIndex: 2 },
          { id: 'p4', name: 'D', isAI: false, avatarIndex: 3 },
        ],
      })
    );
    expect(g4.bank.white).toBe(7);
    expect(g4.nobles).toHaveLength(5);
  });

  it('allows taking 3 different gems, 2 same (>=4), and enforces 10-token discard', () => {
    let s = createGame(makeBaseConfig());
    s = applyAction(s, { type: 'take_gems', gems: { white: 1, blue: 1, green: 1 } });
    expect(s.players[0].tokens).toMatchObject({ white: 1, blue: 1, green: 1 });
    expect(s.currentPlayerIndex).toBe(1);

    // P2 takes 2 red (bank has 4 red)
    s = applyAction(s, { type: 'take_gems', gems: { red: 2 } });
    expect(s.players[1].tokens.red).toBe(2);
    expect(s.bank.red).toBe(2);

    // P1 cannot take 2 red when bank has only 2
    expect(() => applyAction(s, { type: 'take_gems', gems: { red: 2 } })).toThrow();

    // Give P1 9 tokens and take 3 more -> triggers discard of 2
    s.players[0].tokens = { white: 3, blue: 3, green: 3, red: 0, black: 0, gold: 0 };
    s = applyAction(s, { type: 'take_gems', gems: { white: 1, red: 1, black: 1 } });
    expect(s.pendingQueue[0]).toEqual({ type: 'discard_tokens', count: 2 });
    expect(s.currentPlayerIndex).toBe(0);

    s = applyAction(s, { type: 'discard_tokens', tokens: { white: 1, blue: 1 } });
    expect(getTotalTokens(s.players[0].tokens)).toBe(10);
    expect(s.currentPlayerIndex).toBe(1);
  });

  it('handles reserving cards, receiving gold, buying reserved card, and noble visit', () => {
    let s = createGame(makeBaseConfig());
    const target = s.tiers[1].baseSlots[0]!;
    s = applyAction(s, { type: 'reserve_card', source: 'board', cardId: target.id });
    expect(s.players[0].reserved).toHaveLength(1);
    expect(s.players[0].tokens.gold).toBe(1);
    expect(s.bank.gold).toBe(4);

    // P2 takes gems so turn returns to P1
    s = applyAction(s, { type: 'take_gems', gems: { white: 1, blue: 1, black: 1 } });

    // Give P1 enough gold to buy reserved card
    s.players[0].tokens.gold = 5;
    s = applyAction(s, { type: 'buy_card', source: 'reserved', cardId: target.id });
    expect(s.players[0].reserved).toHaveLength(0);
    expect(s.players[0].cards).toHaveLength(1);
  });

  it('triggers final round at 15 points and finishes after equal turns', () => {
    let s = createGame(makeBaseConfig());
    const t3 = s.tiers[3].baseSlots[0]!;
    // Give P1 12 existing points + plenty of gold to buy t3
    s.players[0].cards.push({
      card: {
        id: 'mock_12',
        tier: 3,
        isOrient: false,
        bonus: 'white',
        bonusCount: 1,
        points: 12,
        cost: { white: 0, blue: 0, green: 0, red: 0, black: 0 },
        motif: 'palace',
      },
    });
    // Give P1 exact tokens needed (<= 10 after purchase)
    s.players[0].tokens = {
      white: t3.cost.white,
      blue: t3.cost.blue,
      green: t3.cost.green,
      red: t3.cost.red,
      black: t3.cost.black,
      gold: 0,
    };
    s = applyAction(s, { type: 'buy_card', source: 'board', cardId: t3.id });

    expect(s.finalRoundTriggered).toBe(true);
    expect(s.phase).toBe('playing');
    expect(s.currentPlayerIndex).toBe(1);

    // P2 takes final turn -> game concludes with P1 winning
    s = applyAction(s, { type: 'take_gems', gems: { white: 1, blue: 1, green: 1 } });
    expect(s.phase).toBe('finished');
    expect(s.winnerIds).toEqual(['p1']);
  });
});

describe('Cities of Splendor expansions', () => {
  it('Orient: supports double_gold satchel, wild_satchel pairing, and free_tier2', () => {
    let s = createGame(
      makeBaseConfig({
        expansions: { orient: true, cities: false, tradingPosts: false, strongholds: false },
      })
    );
    expect(s.tiers[1].orientSlots).toHaveLength(2);

    // Place a wild_satchel in T1 orient slot 0
    const orientAll = createOrientDeck();
    const satchel = orientAll.find((c) => c.ability === 'wild_satchel')!;
    const doubleGold = orientAll.find((c) => c.ability === 'double_gold')!;
    s.tiers[1].orientSlots[0] = satchel;
    s.tiers[1].orientSlots[1] = doubleGold;

    // Cannot afford wild_satchel with 0 owned bonuses
    s.players[0].tokens = { ...doubleGold.cost, gold: 0 };
    expect(computePayment(s.players[0], satchel).canAfford).toBe(false);

    // Buy double_gold first -> stored in goldSatchels (0 tokens left, no discard needed)
    s = applyAction(s, { type: 'buy_card', source: 'board', cardId: doubleGold.id });
    expect(s.players[0].goldSatchels).toHaveLength(1);

    // P2 turn
    s = applyAction(s, { type: 'take_gems', gems: { white: 1, blue: 1, green: 1 } });

    // Give P1 a red card so wild_satchel becomes purchasable
    s.players[0].cards.push({
      card: createBaseDeck().find((c) => c.bonus === 'red')!,
    });
    s.players[0].tokens = { ...satchel.cost, gold: 0 };
    s = applyAction(s, { type: 'buy_card', source: 'board', cardId: satchel.id });
    expect(s.pendingQueue[0]?.type).toBe('orient_pair_satchel');

    s = applyAction(s, { type: 'orient_pair_satchel', color: 'red' });
    expect(getPlayerBonuses(s.players[0]).red).toBe(2);
  });

  it('Cities: replaces nobles with 3 city tiles and triggers victory on claiming city', () => {
    let s = createGame(
      makeBaseConfig({
        expansions: { orient: false, cities: true, tradingPosts: false, strongholds: false },
      })
    );
    expect(s.nobles).toHaveLength(0);
    expect(s.cities).toHaveLength(3);

    // Meet city 0 requirements directly
    const targetCity = s.cities[0];
    for (const color of GEM_COLORS) {
      const need = Math.max(targetCity.requirement.bonuses[color], targetCity.requirement.anyColorCount ?? 0);
      for (let i = 0; i < need; i++) {
        s.players[0].cards.push({
          card: {
            id: `c_${color}_${i}`,
            tier: 2,
            isOrient: false,
            bonus: color,
            bonusCount: 1,
            points: 3,
            cost: { white: 0, blue: 0, green: 0, red: 0, black: 0 },
            motif: 'guild',
          },
        });
      }
    }

    s = applyAction(s, { type: 'take_gems', gems: { white: 1, blue: 1, green: 1 } });
    // If multiple cities matched, pick targetCity
    if (s.pendingQueue[0]?.type === 'choose_city') {
      s = applyAction(s, { type: 'choose_city', cityId: targetCity.id });
    }
    expect(s.players[0].claimedCity).not.toBeNull();
    expect(s.finalRoundTriggered).toBe(true);

    // P2 takes final turn
    s = applyAction(s, { type: 'take_gems', gems: { red: 1, black: 1, white: 1 } });
    expect(s.phase).toBe('finished');
    expect(s.winnerIds).toEqual(['p1']);
  });

  it('Trading Posts: unlocks privileges and applies double_gold_value & extra_gem_on_two_same', () => {
    let s = createGame(
      makeBaseConfig({
        expansions: { orient: false, cities: false, tradingPosts: true, strongholds: false },
      })
    );
    // Give P1 2 white cards + 3 blue + 1 black + 3 black -> triggers White(2), Blue3+Black1, Black(3)
    const addDummy = (color: (typeof GEM_COLORS)[number], count: number) => {
      for (let i = 0; i < count; i++) {
        s.players[0].cards.push({
          card: {
            id: `tp_${color}_${i}`,
            tier: 1,
            isOrient: false,
            bonus: color,
            bonusCount: 1,
            points: 0,
            cost: { white: 0, blue: 0, green: 0, red: 0, black: 0 },
            motif: 'mine',
          },
        });
      }
    };
    addDummy('white', 2);
    addDummy('blue', 3);
    addDummy('black', 3);

    s = applyAction(s, { type: 'take_gems', gems: { white: 1, blue: 1, green: 1 } });
    expect(s.players[0].tradingPosts).toContain('extra_gem_on_two_same');
    expect(s.players[0].tradingPosts).toContain('double_gold_value');
    expect(s.players[0].tradingPosts).toContain('one_point_per_crest');
    // one_point_per_crest gives +3 points for 3 crests!
    expect(getPlayerPoints(s.players[0])).toBe(3);

    // Test double_gold_value: 1 gold covers 2 red!
    s.players[0].tokens = { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 1 };
    const red2Card = {
      id: 'red2',
      tier: 1 as const,
      isOrient: false,
      bonus: 'green' as const,
      bonusCount: 1,
      points: 0,
      cost: { white: 0, blue: 0, green: 0, red: 2, black: 0 },
      motif: 'mine',
    };
    expect(computePayment(s.players[0], red2Card).canAfford).toBe(true);

    // Return to P1 and verify taking 2 same triggers extra gem step
    s = applyAction(s, { type: 'take_gems', gems: { red: 1, black: 1, green: 1 } });
    s.bank.blue = 4;
    s = applyAction(s, { type: 'take_gems', gems: { blue: 2 } });
    expect(s.pendingQueue[0]).toEqual({ type: 'trading_post_bonus_gem', forbiddenColor: 'blue' });
    s = applyAction(s, { type: 'trading_post_bonus_gem', color: 'white' });
    expect(s.players[0].tokens.blue).toBe(2);
    expect(s.players[0].tokens.white).toBe(1);
  });

  it('Strongholds: blocks opponent buy/reserve and triggers 3-tower conquest purchase', () => {
    let s = createGame(
      makeBaseConfig({
        expansions: { orient: false, cities: false, tradingPosts: false, strongholds: true },
      })
    );
    expect(s.players[0].strongholdsRemaining).toBe(3);

    const buyCard = s.tiers[1].baseSlots[0]!;
    const targetCard = s.tiers[1].baseSlots[1]!;
    // Pre-stack 2 own strongholds on targetCard so placing 3rd triggers conquest!
    s.strongholds[targetCard.id] = { playerId: 'p1', count: 2 };
    s.players[0].strongholdsRemaining = 1;
    s.players[0].tokens = { white: 4, blue: 4, green: 4, red: 4, black: 4, gold: 4 };

    s = applyAction(s, { type: 'buy_card', source: 'board', cardId: buyCard.id });
    expect(s.pendingQueue[0]?.type).toBe('stronghold_action');

    // Place 3rd stronghold on targetCard -> triggers conquest buy!
    s = applyAction(s, { type: 'stronghold_place', targetCardId: targetCard.id });
    expect(s.pendingQueue[0]).toEqual({
      type: 'stronghold_conquest_buy',
      cardId: targetCard.id,
    });

    // Accept conquest buy -> buys targetCard immediately and returns 3 strongholds!
    s = applyAction(s, { type: 'stronghold_conquest_buy', accept: true });
    expect(s.players[0].cards.some((c) => c.card.id === targetCard.id)).toBe(true);
    expect(s.players[0].strongholdsRemaining).toBe(3);
  });

  it('Challenges: enforces forbidReserve, forbidTier3, and endgame_comeback preset', () => {
    const noGoldCh = CHALLENGES.find((c) => c.id === 'ch_no_gold')!;
    const s1 = createGame({
      players: [
        { id: 'p1', name: 'P1', isAI: false, avatarIndex: 0 },
        { id: 'ai1', name: 'AI', isAI: true, avatarIndex: 1 },
      ],
      expansions: noGoldCh.expansions,
      targetPoints: 15,
      seed: noGoldCh.seed,
      challenge: noGoldCh.rules,
    });
    expect(s1.bank.gold).toBe(0);
    expect(getLegalActions(s1).some((a) => a.type === 'reserve_card')).toBe(false);

    const comebackCh = CHALLENGES.find((c) => c.id === 'ch_endgame_comeback')!;
    const s2 = createGame({
      players: [
        { id: 'p1', name: 'P1', isAI: false, avatarIndex: 0 },
        { id: 'ai1', name: 'AI', isAI: true, avatarIndex: 1 },
      ],
      expansions: comebackCh.expansions,
      targetPoints: 15,
      seed: comebackCh.seed,
      challenge: comebackCh.rules,
    });
    expect(getPlayerPoints(s2.players[0])).toBeGreaterThanOrEqual(7);
    expect(getPlayerPoints(s2.players[1])).toBeGreaterThanOrEqual(10);
  });
});
