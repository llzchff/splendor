import { Card, GEM_COLORS, GemCounts, PlayerState, TokenCounts } from './types';

export function emptyGemCounts(): GemCounts {
  return { white: 0, blue: 0, green: 0, red: 0, black: 0 };
}

export function emptyTokenCounts(): TokenCounts {
  return { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 };
}

export function getPlayerBonuses(player: PlayerState): GemCounts {
  const bonuses = emptyGemCounts();
  for (const owned of player.cards) {
    const color = owned.card.bonus ?? owned.attachedColor;
    if (color) {
      bonuses[color] += owned.card.bonusCount;
    }
  }
  return bonuses;
}

export function getTotalBonuses(player: PlayerState): number {
  const b = getPlayerBonuses(player);
  return b.white + b.blue + b.green + b.red + b.black;
}

export function getTotalTokens(tokens: TokenCounts): number {
  return tokens.white + tokens.blue + tokens.green + tokens.red + tokens.black + tokens.gold;
}

export interface PaymentPlan {
  canAfford: boolean;
  /** Tokens spent from player's pool (returned to bank) */
  tokensSpent: TokenCounts;
  /** Number of Orient double-gold satchel cards consumed (discarded) */
  goldSatchelsUsed: number;
  /** Total gold value deficit if unaffordable */
  missingGems: number;
}

/**
 * Computes the optimal payment for a card, considering:
 * 1. Permanent gem bonuses (including double_bonus and attached wild_satchel)
 * 2. Colored tokens on hand
 * 3. Orient double_gold satchel cards (each provides 2 wild gems, can split across colors)
 * 4. Gold tokens (worth 1 each, or 2 of the SAME color if Trading Post 'double_gold_value' is unlocked!)
 *
 * Also validates special Orient card prerequisites:
 * - wild_satchel / wild_satchel_free_t1 require at least 1 existing colored bonus card
 * - discard_bonuses requires at least 2 bonuses of card.sacrificeColor
 */
export function computePayment(
  player: PlayerState,
  card: Card,
  preferGoldSatchels?: number
): PaymentPlan {
  const bonuses = getPlayerBonuses(player);

  // Special Orient prerequisites
  if (card.ability === 'wild_satchel' || card.ability === 'wild_satchel_free_t1') {
    if (getTotalBonuses(player) === 0) {
      return {
        canAfford: false,
        tokensSpent: emptyTokenCounts(),
        goldSatchelsUsed: 0,
        missingGems: 99,
      };
    }
  }

  if (card.ability === 'discard_bonuses' && card.sacrificeColor) {
    if (bonuses[card.sacrificeColor] < 2) {
      return {
        canAfford: false,
        tokensSpent: emptyTokenCounts(),
        goldSatchelsUsed: 0,
        missingGems: 2 - bonuses[card.sacrificeColor],
      };
    }
    return {
      canAfford: true,
      tokensSpent: emptyTokenCounts(),
      goldSatchelsUsed: 0,
      missingGems: 0,
    };
  }

  const tokensSpent = emptyTokenCounts();
  const deficits: number[] = [];

  for (const color of GEM_COLORS) {
    const netCost = Math.max(0, card.cost[color] - bonuses[color]);
    const payColored = Math.min(netCost, player.tokens[color]);
    tokensSpent[color] = payColored;
    const rem = netCost - payColored;
    if (rem > 0) {
      deficits.push(rem);
    }
  }

  const totalDeficit = deficits.reduce((a, b) => a + b, 0);
  if (totalDeficit === 0) {
    return {
      canAfford: true,
      tokensSpent,
      goldSatchelsUsed: 0,
      missingGems: 0,
    };
  }

  const hasDoubleGoldTP = player.tradingPosts.includes('double_gold_value');
  const maxSatchels = player.goldSatchels.length;
  const maxGold = player.tokens.gold;

  // Evaluate how many gold tokens are needed for a given remaining deficit vector
  // When double_gold_value is active, each gold token covers up to 2 of a SINGLE color (ceil(d/2)).
  // Orient double-gold satchel covers 2 wild gems across ANY colors!
  const minGoldNeededForDeficits = (remDeficits: number[]): number => {
    if (!hasDoubleGoldTP) {
      return remDeficits.reduce((a, b) => a + b, 0);
    }
    return remDeficits.reduce((sum, d) => sum + Math.ceil(d / 2), 0);
  };

  // Helper: optimally apply `k` wild gems from double-gold satchels to reduce gold tokens needed
  const reduceDeficitsByWild = (orig: number[], wildGems: number): number[] => {
    const arr = [...orig];
    let left = wildGems;
    if (hasDoubleGoldTP) {
      // First clear odd remainders (each 1 wild saves an entire gold token!)
      for (let i = 0; i < arr.length && left > 0; i++) {
        if (arr[i] % 2 === 1) {
          arr[i] -= 1;
          left -= 1;
        }
      }
    }
    for (let i = 0; i < arr.length && left > 0; i++) {
      const take = Math.min(arr[i], left);
      arr[i] -= take;
      left -= take;
    }
    return arr;
  };

  // Try satchel counts: if caller specified preferGoldSatchels, honor it if valid;
  // otherwise minimize gold tokens spent (prefer spending regular gold first or satchel when needed).
  let bestSatchels = -1;
  let bestGold = Infinity;

  const startS =
    preferGoldSatchels !== undefined ? Math.min(maxSatchels, Math.max(0, preferGoldSatchels)) : 0;
  const endS = preferGoldSatchels !== undefined ? startS : maxSatchels;

  for (let s = startS; s <= endS; s++) {
    const afterSatchel = reduceDeficitsByWild(deficits, s * 2);
    const goldNeeded = minGoldNeededForDeficits(afterSatchel);
    if (goldNeeded <= maxGold) {
      // Prefer using minimum total wild cost (prefer regular gold if equal unless satchel needed)
      if (goldNeeded < bestGold || (goldNeeded === bestGold && s < bestSatchels)) {
        bestGold = goldNeeded;
        bestSatchels = s;
      }
    }
  }

  // If preferred count couldn't afford, fall back to full search so we know true affordability
  if (bestSatchels === -1 && preferGoldSatchels !== undefined) {
    for (let s = 0; s <= maxSatchels; s++) {
      const afterSatchel = reduceDeficitsByWild(deficits, s * 2);
      const goldNeeded = minGoldNeededForDeficits(afterSatchel);
      if (goldNeeded <= maxGold) {
        bestGold = goldNeeded;
        bestSatchels = s;
        break;
      }
    }
  }

  if (bestSatchels !== -1) {
    tokensSpent.gold = bestGold;
    return {
      canAfford: true,
      tokensSpent,
      goldSatchelsUsed: bestSatchels,
      missingGems: 0,
    };
  }

  const maxWildPower = maxSatchels * 2 + maxGold * (hasDoubleGoldTP ? 2 : 1);
  return {
    canAfford: false,
    tokensSpent: emptyTokenCounts(),
    goldSatchelsUsed: 0,
    missingGems: Math.max(1, totalDeficit - maxWildPower),
  };
}
