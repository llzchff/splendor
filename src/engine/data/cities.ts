import { CityTile, GemCounts } from '../types';

function makeBonuses(entries: Partial<GemCounts>): GemCounts {
  return { white: 0, blue: 0, green: 0, red: 0, black: 0, ...entries };
}

/**
 * The Cities Expansion: 7 double-sided European Renaissance City tiles (14 unique sides).
 * 3 distinct pairs are randomly selected at setup, each flipped to a random side (A or B).
 */
export const ALL_CITY_TILES: readonly CityTile[] = [
  // Pair 1
  {
    id: 'city_1_a',
    pairId: 1,
    side: 'A',
    name: '威尼斯',
    subtitle: '亚得里亚海明珠',
    requirement: { minPoints: 13, bonuses: makeBonuses({ red: 4, black: 3 }) },
  },
  {
    id: 'city_1_b',
    pairId: 1,
    side: 'B',
    name: '热那亚',
    subtitle: '航海商邦',
    requirement: { minPoints: 15, bonuses: makeBonuses({}), anyColorCount: 5, anyColorDistinct: 1 },
  },
  // Pair 2
  {
    id: 'city_2_a',
    pairId: 2,
    side: 'A',
    name: '佛罗伦萨',
    subtitle: '美第奇之城',
    requirement: { minPoints: 13, bonuses: makeBonuses({ blue: 4, green: 3 }) },
  },
  {
    id: 'city_2_b',
    pairId: 2,
    side: 'B',
    name: '米兰',
    subtitle: '伦巴第公国',
    requirement: { minPoints: 14, bonuses: makeBonuses({ white: 4, black: 4 }) },
  },
  // Pair 3
  {
    id: 'city_3_a',
    pairId: 3,
    side: 'A',
    name: '布鲁日',
    subtitle: '北方威尼斯',
    requirement: { minPoints: 13, bonuses: makeBonuses({ white: 4, blue: 3 }) },
  },
  {
    id: 'city_3_b',
    pairId: 3,
    side: 'B',
    name: '安特卫普',
    subtitle: '钻石交易中心',
    requirement: { minPoints: 12, bonuses: makeBonuses({ white: 2, blue: 2, green: 2, red: 2, black: 2 }) },
  },
  // Pair 4
  {
    id: 'city_4_a',
    pairId: 4,
    side: 'A',
    name: '里昂',
    subtitle: '丝绸与印刷之都',
    requirement: { minPoints: 13, bonuses: makeBonuses({ green: 4, red: 3 }) },
  },
  {
    id: 'city_4_b',
    pairId: 4,
    side: 'B',
    name: '纽伦堡',
    subtitle: '帝国金匠之城',
    requirement: { minPoints: 14, bonuses: makeBonuses({ green: 4, red: 4 }) },
  },
  // Pair 5
  {
    id: 'city_5_a',
    pairId: 5,
    side: 'A',
    name: '里斯本',
    subtitle: '大航海起点',
    requirement: { minPoints: 13, bonuses: makeBonuses({ black: 4, white: 3 }) },
  },
  {
    id: 'city_5_b',
    pairId: 5,
    side: 'B',
    name: '巴塞罗那',
    subtitle: '地中海明港',
    requirement: { minPoints: 14, bonuses: makeBonuses({ blue: 4, red: 4 }) },
  },
  // Pair 6
  {
    id: 'city_6_a',
    pairId: 6,
    side: 'A',
    name: '塞维利亚',
    subtitle: '黄金港口',
    requirement: { minPoints: 16, bonuses: makeBonuses({}), anyColorCount: 4, anyColorDistinct: 2 },
  },
  {
    id: 'city_6_b',
    pairId: 6,
    side: 'B',
    name: '那不勒斯',
    subtitle: '南方王国',
    requirement: { minPoints: 11, bonuses: makeBonuses({ white: 3, blue: 3, green: 3 }) },
  },
  // Pair 7
  {
    id: 'city_7_a',
    pairId: 7,
    side: 'A',
    name: '比萨',
    subtitle: '海权古邦',
    requirement: { minPoints: 17, bonuses: makeBonuses({}) },
  },
  {
    id: 'city_7_b',
    pairId: 7,
    side: 'B',
    name: '维也纳',
    subtitle: '帝国宫廷',
    requirement: { minPoints: 11, bonuses: makeBonuses({ red: 3, black: 3, white: 3 }) },
  },
];
