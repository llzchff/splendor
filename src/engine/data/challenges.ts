import { AIDifficulty, ChallengeRules, ExpansionConfig } from '../types';

export interface ChallengeDefinition {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  description: string;
  difficulty: AIDifficulty;
  opponents: number;
  expansions: ExpansionConfig;
  rules: ChallengeRules;
  starThresholds: {
    threeStarsMaxTurns: number;
    twoStarsMaxTurns: number;
  };
  seed: number;
}

const BASE_ONLY: ExpansionConfig = {
  orient: false,
  cities: false,
  tradingPosts: false,
  strongholds: false,
};

export const CHALLENGES: readonly ChallengeDefinition[] = [
  {
    id: 'ch_speed_12',
    number: 1,
    title: '初试锋芒',
    subtitle: '极速引擎挑战',
    description: '在 14 回合内率先达成 15 威望分，击败见习商徒，锤炼极致买卡效率。',
    difficulty: 'easy',
    opponents: 1,
    expansions: BASE_ONLY,
    rules: {
      id: 'ch_speed_12',
      maxTurns: 14,
      targetPoints: 15,
    },
    starThresholds: { threeStarsMaxTurns: 11, twoStarsMaxTurns: 13 },
    seed: 104729,
  },
  {
    id: 'ch_noble_feast',
    number: 2,
    title: '贵族盛宴',
    subtitle: '三贵临门',
    description: '不仅要以 15 分获胜，还必须成功吸引至少 2 位贵族造访（三星需 3 位或在 24 回合内）。',
    difficulty: 'medium',
    opponents: 2,
    expansions: BASE_ONLY,
    rules: {
      id: 'ch_noble_feast',
      requiredNobles: 2,
      targetPoints: 15,
    },
    starThresholds: { threeStarsMaxTurns: 22, twoStarsMaxTurns: 26 },
    seed: 204811,
  },
  {
    id: 'ch_no_gold',
    number: 3,
    title: '黄金禁令',
    subtitle: '纯粹宝石流',
    description: '禁止预定发展卡，也无法使用黄金百搭筹码！仅靠精准拿取五色宝石赢下三人对局。',
    difficulty: 'medium',
    opponents: 2,
    expansions: BASE_ONLY,
    rules: {
      id: 'ch_no_gold',
      forbidReserve: true,
      forbidGold: true,
      targetPoints: 15,
    },
    starThresholds: { threeStarsMaxTurns: 21, twoStarsMaxTurns: 25 },
    seed: 319993,
  },
  {
    id: 'ch_low_tier',
    number: 4,
    title: '底层逆袭',
    subtitle: '禁购 3 级卡',
    description: '3 级宫殿卡全面封锁！你只能依靠 1 级、2 级发展卡与贵族协作突破 15 分夺冠。',
    difficulty: 'medium',
    opponents: 2,
    expansions: BASE_ONLY,
    rules: {
      id: 'ch_low_tier',
      forbidTier3: true,
      targetPoints: 15,
    },
    starThresholds: { threeStarsMaxTurns: 22, twoStarsMaxTurns: 26 },
    seed: 441217,
  },
  {
    id: 'ch_endgame_comeback',
    number: 5,
    title: '绝境翻盘',
    subtitle: '五回合残局绝杀',
    description: '预设终盘开局：对手已握 12 分高居榜首，你仅有 8 分但基础引擎成型——5 回合内逆转胜出！',
    difficulty: 'hard',
    opponents: 1,
    expansions: BASE_ONLY,
    rules: {
      id: 'ch_endgame_comeback',
      maxTurns: 5,
      targetPoints: 15,
      presetId: 'endgame_comeback',
    },
    starThresholds: { threeStarsMaxTurns: 3, twoStarsMaxTurns: 4 },
    seed: 551987,
  },
  {
    id: 'ch_orient_secret',
    number: 6,
    title: '东方秘宝',
    subtitle: '丝路双倍与百搭',
    description: '启用《东方》扩展：活用商队双黄金、丝绸百搭与免费夺卡连招，在 20 回合内击败两名对手。',
    difficulty: 'medium',
    opponents: 2,
    expansions: { ...BASE_ONLY, orient: true },
    rules: {
      id: 'ch_orient_secret',
      maxTurns: 20,
      targetPoints: 15,
    },
    starThresholds: { threeStarsMaxTurns: 15, twoStarsMaxTurns: 18 },
    seed: 662333,
  },
  {
    id: 'ch_renaissance_city',
    number: 7,
    title: '名城霸主',
    subtitle: '城市扩展试炼',
    description: '启用《城市》扩展：贵族退场，率先满足欧洲名城的严苛分数与宝石组合要求即可夺魁！',
    difficulty: 'hard',
    opponents: 2,
    expansions: { ...BASE_ONLY, cities: true },
    rules: {
      id: 'ch_renaissance_city',
      requireCity: true,
      targetPoints: 15,
    },
    starThresholds: { threeStarsMaxTurns: 20, twoStarsMaxTurns: 24 },
    seed: 773111,
  },
  {
    id: 'ch_silk_road_master',
    number: 8,
    title: '丝路帝国',
    subtitle: '全扩展大师对决',
    description: '同时开启《东方 + 贸易站 + 要塞》三大扩展，迎战两名大师级 MCTS AI，加冕终极宝石宗师！',
    difficulty: 'hard',
    opponents: 2,
    expansions: { orient: true, cities: false, tradingPosts: true, strongholds: true },
    rules: {
      id: 'ch_silk_road_master',
      targetPoints: 15,
    },
    starThresholds: { threeStarsMaxTurns: 19, twoStarsMaxTurns: 23 },
    seed: 889977,
  },
];
