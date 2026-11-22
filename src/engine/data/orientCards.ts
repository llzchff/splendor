import { Card, GEM_COLORS, GemColor, GemCounts } from '../types';

function makeCost(entries: Partial<GemCounts>): GemCounts {
  return { white: 0, blue: 0, green: 0, red: 0, black: 0, ...entries };
}

/**
 * The Orient Expansion: 30 cards (10 per tier) introducing:
 * - Tier 1: 5x double_gold (2 virtual gold tokens for a single purchase) + 5x wild_satchel (pair to any owned color)
 * - Tier 2: 5x double_bonus (+2 gem bonuses of one color) + 3x wild_satchel_free_t1 + 2x reserve_noble
 * - Tier 3: 5x free_tier2 (take any face-up Tier 2 card for free) + 5x discard_bonuses (sacrifice 2 bonuses of a color for 3 pts)
 */
export function createOrientDeck(): Card[] {
  const cards: Card[] = [];

  for (let i = 0; i < GEM_COLORS.length; i++) {
    const c = (offset: number): GemColor => GEM_COLORS[(i + offset) % 5];

    // --- TIER 1 (10 cards: 5 double_gold + 5 wild_satchel) ---
    cards.push({
      id: `orient_t1_gold_${i + 1}`,
      tier: 1,
      isOrient: true,
      bonus: null,
      bonusCount: 0,
      points: 0,
      cost: makeCost({ [c(0)]: 3 }),
      ability: 'double_gold',
      motif: 'orient_caravan',
    });

    cards.push({
      id: `orient_t1_satchel_${i + 1}`,
      tier: 1,
      isOrient: true,
      bonus: null,
      bonusCount: 1,
      points: 0,
      cost: makeCost({ [c(1)]: 2, [c(2)]: 2, [c(3)]: 1 }),
      ability: 'wild_satchel',
      motif: 'orient_satchel',
    });

    // --- TIER 2 (10 cards: 5 double_bonus + 3 wild_satchel_free_t1 + 2 reserve_noble) ---
    cards.push({
      id: `orient_t2_double_${c(0)}`,
      tier: 2,
      isOrient: true,
      bonus: c(0),
      bonusCount: 2,
      points: 0,
      cost: makeCost({ [c(1)]: 4, [c(2)]: 3 }),
      ability: 'double_bonus',
      motif: 'orient_pagoda',
    });

    if (i < 3) {
      cards.push({
        id: `orient_t2_satchel_free1_${i + 1}`,
        tier: 2,
        isOrient: true,
        bonus: null,
        bonusCount: 1,
        points: 0,
        cost: makeCost({ [c(0)]: 4, [c(1)]: 2, [c(4)]: 1 }),
        ability: 'wild_satchel_free_t1',
        motif: 'orient_junk',
      });
    } else {
      cards.push({
        id: `orient_t2_noble_${i + 1}`,
        tier: 2,
        isOrient: true,
        bonus: c(0),
        bonusCount: 1,
        points: 1,
        cost: makeCost({ [c(1)]: 2, [c(2)]: 2, [c(3)]: 2, [c(4)]: 2 }),
        ability: 'reserve_noble',
        motif: 'orient_envoy',
      });
    }

    // --- TIER 3 (10 cards: 5 free_tier2 + 5 discard_bonuses) ---
    cards.push({
      id: `orient_t3_free2_${c(0)}`,
      tier: 3,
      isOrient: true,
      bonus: c(0),
      bonusCount: 1,
      points: 0,
      cost: makeCost({ [c(1)]: 6, [c(2)]: 3, [c(3)]: 1 }),
      ability: 'free_tier2',
      motif: 'orient_palace',
    });

    cards.push({
      id: `orient_t3_sacrifice_${c(0)}`,
      tier: 3,
      isOrient: true,
      bonus: c(0),
      bonusCount: 1,
      points: 3,
      cost: makeCost({}),
      ability: 'discard_bonuses',
      sacrificeColor: c(4),
      motif: 'orient_dragon',
    });
  }

  return cards;
}
