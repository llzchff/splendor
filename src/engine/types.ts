export type GemColor = 'white' | 'blue' | 'green' | 'red' | 'black';
export type TokenColor = GemColor | 'gold';
export type Tier = 1 | 2 | 3;

export const GEM_COLORS: readonly GemColor[] = ['white', 'blue', 'green', 'red', 'black'] as const;
export const TOKEN_COLORS: readonly TokenColor[] = [
  'white',
  'blue',
  'green',
  'red',
  'black',
  'gold',
] as const;

export const GEM_LABELS_ZH: Record<TokenColor, string> = {
  white: '钻石',
  blue: '蓝宝石',
  green: '祖母绿',
  red: '红宝石',
  black: '黑玛瑙',
  gold: '黄金',
};

export type GemCounts = Record<GemColor, number>;
export type TokenCounts = Record<TokenColor, number>;

export type OrientAbility =
  | 'double_gold' // T1: worth 2 wild gold tokens for one future purchase, then discarded
  | 'wild_satchel' // T1: attach to an owned color for +1 permanent bonus
  | 'double_bonus' // T2: grants +2 bonuses of its color
  | 'wild_satchel_free_t1' // T2: attach to owned color + take 1 free face-up Tier 1 card
  | 'reserve_noble' // T2: reserve 1 noble tile exclusively
  | 'free_tier2' // T3: take 1 free face-up Tier 2 card
  | 'discard_bonuses'; // T3: cost is discarding 2 bonuses of sacrificeColor

export interface Card {
  id: string;
  tier: Tier;
  isOrient: boolean;
  /** Primary bonus color; null for Orient double_gold or unattached wild_satchel */
  bonus: GemColor | null;
  /** Number of gem bonuses granted (1 for normal, 2 for double_bonus, 0 for double_gold) */
  bonusCount: number;
  points: number;
  cost: GemCounts;
  ability?: OrientAbility;
  /** For Orient T3 discard_bonuses cards: must sacrifice 2 bonuses of this color */
  sacrificeColor?: GemColor;
  /** Visual illustration motif tag */
  motif: string;
}

export interface Noble {
  id: string;
  name: string;
  title: string;
  points: number;
  requirements: GemCounts;
}

export interface CityRequirement {
  /** Minimum prestige points */
  minPoints: number;
  /** Specific color bonus requirements */
  bonuses: GemCounts;
  /** Require at least N bonuses of ANY single color (not already counted or any color) */
  anyColorCount?: number;
  /** How many distinct colors must reach anyColorCount (default 1) */
  anyColorDistinct?: number;
}

export interface CityTile {
  id: string;
  pairId: number;
  side: 'A' | 'B';
  name: string;
  subtitle: string;
  requirement: CityRequirement;
}

export type TradingPostId =
  | 'gem_after_buy' // 3 red + 1 white -> take 1 non-gold gem after buying a card
  | 'extra_gem_on_two_same' // 2 white -> when taking 2 same color, take 1 additional different color
  | 'double_gold_value' // 3 blue + 1 black -> each gold token counts as 2 of the same color
  | 'five_points_noble' // 5 green + 1 noble (or 10pts in Cities) -> +5 prestige points
  | 'one_point_per_crest'; // 3 black -> +1 prestige point per unlocked Trading Post crest

export interface TradingPostDef {
  id: TradingPostId;
  name: string;
  description: string;
  requirementText: string;
  bonusReq: Partial<GemCounts>;
  requiresNoble?: boolean;
}

export interface ExpansionConfig {
  orient: boolean;
  cities: boolean;
  tradingPosts: boolean;
  strongholds: boolean;
}

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface PlayerSetup {
  id: string;
  name: string;
  isAI: boolean;
  aiDifficulty?: AIDifficulty;
  avatarIndex: number;
}

export interface ChallengeRules {
  id: string;
  maxTurns?: number;
  targetPoints?: number;
  requiredNobles?: number;
  forbidReserve?: boolean;
  forbidGold?: boolean;
  forbidTier3?: boolean;
  requireCity?: boolean;
  /** Optional preset starting state tweaks */
  presetId?: 'endgame_comeback';
}

export interface GameConfig {
  players: PlayerSetup[];
  expansions: ExpansionConfig;
  targetPoints: number;
  seed: number;
  challenge?: ChallengeRules;
}

export interface OwnedCard {
  card: Card;
  /** For wild_satchel / wild_satchel_free_t1: the chosen color once attached */
  attachedColor?: GemColor;
}

export interface PlayerState {
  id: string;
  name: string;
  isAI: boolean;
  aiDifficulty: AIDifficulty;
  avatarIndex: number;
  tokens: TokenCounts;
  cards: OwnedCard[];
  /** Orient T1 double-gold cards waiting to be spent */
  goldSatchels: Card[];
  reserved: Card[];
  nobles: Noble[];
  reservedNobles: Noble[];
  claimedCity: CityTile | null;
  /** Unlocked Trading Post IDs (coats of arms placed) */
  tradingPosts: TradingPostId[];
  /** Strongholds remaining in player's hand (starts at 3) */
  strongholdsRemaining: number;
  /** Turns taken by this player */
  turnsTaken: number;
}

export interface StrongholdStack {
  playerId: string;
  count: number;
}

export interface BoardTierRow {
  tier: Tier;
  baseDeck: Card[];
  baseSlots: (Card | null)[];
  orientDeck: Card[];
  orientSlots: (Card | null)[];
}

export type PendingStep =
  | { type: 'discard_tokens'; count: number }
  | { type: 'choose_noble'; nobleIds: string[] }
  | { type: 'choose_city'; cityIds: string[] }
  | { type: 'orient_pair_satchel'; cardId: string }
  | { type: 'orient_take_free_card'; tier: 1 | 2 }
  | { type: 'orient_reserve_noble' }
  | { type: 'trading_post_bonus_gem'; forbiddenColor?: GemColor }
  | { type: 'stronghold_action' }
  | { type: 'stronghold_conquest_buy'; cardId: string };

export interface PendingRefill {
  tier: Tier;
  isOrient: boolean;
  slotIndex: number;
}

export interface GameLogEntry {
  id: number;
  round: number;
  playerId: string;
  playerName: string;
  text: string;
  kind: 'gem' | 'buy' | 'reserve' | 'noble' | 'expansion' | 'system';
}

export interface ChallengeResult {
  challengeId: string;
  won: boolean;
  stars: 0 | 1 | 2 | 3;
  reason: string;
}

export interface GameState {
  config: GameConfig;
  rngState: number;
  phase: 'playing' | 'finished';
  round: number;
  currentPlayerIndex: number;
  finalRoundTriggered: boolean;
  bank: TokenCounts;
  tiers: Record<Tier, BoardTierRow>;
  nobles: Noble[];
  cities: CityTile[];
  players: PlayerState[];
  /** Map from cardId (face-up on board) -> StrongholdStack */
  strongholds: Record<string, StrongholdStack>;
  /** Pending multi-step interactive decisions for the current player */
  pendingQueue: PendingStep[];
  /** Empty board slots awaiting refill after immediate post-buy actions */
  pendingRefills: PendingRefill[];
  /** Guard so end-of-turn checks execute cleanly once after main action */
  endOfTurnChecked: boolean;
  winnerIds: string[];
  challengeResult?: ChallengeResult;
  log: GameLogEntry[];
  nextLogId: number;
}

export type GameAction =
  | { type: 'take_gems'; gems: Partial<GemCounts> }
  | {
      type: 'reserve_card';
      source: 'board' | 'deck';
      cardId?: string;
      tier?: Tier;
      isOrient?: boolean;
    }
  | {
      type: 'buy_card';
      source: 'board' | 'reserved';
      cardId: string;
      /** Optional explicit number of Orient double-gold satchel cards to consume */
      useGoldSatchels?: number;
    }
  | { type: 'discard_tokens'; tokens: Partial<TokenCounts> }
  | { type: 'choose_noble'; nobleId: string }
  | { type: 'choose_city'; cityId: string }
  | { type: 'orient_pair_satchel'; color: GemColor }
  | { type: 'orient_take_free_card'; cardId: string }
  | { type: 'orient_skip_free_card' }
  | { type: 'orient_reserve_noble'; nobleId: string }
  | { type: 'trading_post_bonus_gem'; color: GemColor }
  | { type: 'trading_post_skip_gem' }
  | {
      type: 'stronghold_place';
      targetCardId: string;
      /** If moving an existing stronghold instead of placing from reserve */
      fromCardId?: string;
    }
  | { type: 'stronghold_remove'; targetCardId: string }
  | { type: 'stronghold_skip' }
  | { type: 'stronghold_conquest_buy'; accept: boolean; useGoldSatchels?: number };
