import { Card, GEM_COLORS, GemColor, GemCounts, Noble } from '../types';

function emptyCost(): GemCounts {
  return { white: 0, blue: 0, green: 0, red: 0, black: 0 };
}

function makeCost(entries: Partial<GemCounts>): GemCounts {
  return { ...emptyCost(), ...entries };
}

const MOTIFS_T1 = ['mine', 'cart', 'lantern', 'pickaxe', 'crystal', 'vault', 'quill', 'scales'];
const MOTIFS_T2 = ['caravel', 'workshop', 'guild', 'compass', 'foundry', 'arch'];
const MOTIFS_T3 = ['palace', 'cathedral', 'crown', 'citadel'];

/**
 * Generates the exact 90-card canonical base deck with full 5-fold rotational symmetry:
 * - Tier 1: 8 cards x 5 colors = 40 cards (7x 0pt, 1x 1pt)
 * - Tier 2: 6 cards x 5 colors = 30 cards (2x 1pt, 3x 2pt, 1x 3pt)
 * - Tier 3: 4 cards x 5 colors = 20 cards (1x 3pt, 2x 4pt, 1x 5pt)
 */
export function createBaseDeck(): Card[] {
  const cards: Card[] = [];

  for (let i = 0; i < GEM_COLORS.length; i++) {
    const c = (offset: number): GemColor => GEM_COLORS[(i + offset) % 5];
    const bonus = c(0);

    // Tier 1 (8 cards per color)
    const t1Specs: Array<{ points: number; cost: GemCounts }> = [
      { points: 0, cost: makeCost({ [c(1)]: 3 }) },
      { points: 0, cost: makeCost({ [c(2)]: 2, [c(3)]: 1 }) },
      { points: 0, cost: makeCost({ [c(1)]: 2, [c(4)]: 2 }) },
      { points: 0, cost: makeCost({ [c(1)]: 1, [c(2)]: 1, [c(3)]: 1, [c(4)]: 1 }) },
      { points: 0, cost: makeCost({ [c(1)]: 1, [c(2)]: 2, [c(3)]: 1, [c(4)]: 1 }) },
      { points: 0, cost: makeCost({ [c(0)]: 3, [c(1)]: 1, [c(4)]: 1 }) },
      { points: 0, cost: makeCost({ [c(1)]: 2, [c(2)]: 2, [c(3)]: 1 }) },
      { points: 1, cost: makeCost({ [c(2)]: 4 }) },
    ];
    t1Specs.forEach((spec, idx) => {
      cards.push({
        id: `base_t1_${bonus}_${idx + 1}`,
        tier: 1,
        isOrient: false,
        bonus,
        bonusCount: 1,
        points: spec.points,
        cost: spec.cost,
        motif: MOTIFS_T1[idx % MOTIFS_T1.length],
      });
    });

    // Tier 2 (6 cards per color)
    const t2Specs: Array<{ points: number; cost: GemCounts }> = [
      { points: 1, cost: makeCost({ [c(1)]: 3, [c(2)]: 2, [c(3)]: 2 }) },
      { points: 1, cost: makeCost({ [c(0)]: 2, [c(2)]: 3, [c(3)]: 3 }) },
      { points: 2, cost: makeCost({ [c(3)]: 5 }) },
      { points: 2, cost: makeCost({ [c(1)]: 5, [c(4)]: 3 }) },
      { points: 2, cost: makeCost({ [c(2)]: 4, [c(3)]: 2, [c(4)]: 1 }) },
      { points: 3, cost: makeCost({ [c(0)]: 6 }) },
    ];
    t2Specs.forEach((spec, idx) => {
      cards.push({
        id: `base_t2_${bonus}_${idx + 1}`,
        tier: 2,
        isOrient: false,
        bonus,
        bonusCount: 1,
        points: spec.points,
        cost: spec.cost,
        motif: MOTIFS_T2[idx % MOTIFS_T2.length],
      });
    });

    // Tier 3 (4 cards per color)
    const t3Specs: Array<{ points: number; cost: GemCounts }> = [
      { points: 3, cost: makeCost({ [c(1)]: 3, [c(2)]: 5, [c(3)]: 3, [c(4)]: 3 }) },
      { points: 4, cost: makeCost({ [c(4)]: 7 }) },
      { points: 4, cost: makeCost({ [c(0)]: 3, [c(3)]: 3, [c(4)]: 6 }) },
      { points: 5, cost: makeCost({ [c(0)]: 3, [c(4)]: 7 }) },
    ];
    t3Specs.forEach((spec, idx) => {
      cards.push({
        id: `base_t3_${bonus}_${idx + 1}`,
        tier: 3,
        isOrient: false,
        bonus,
        bonusCount: 1,
        points: spec.points,
        cost: spec.cost,
        motif: MOTIFS_T3[idx % MOTIFS_T3.length],
      });
    });
  }

  return cards;
}

/**
 * All 10 canonical Renaissance Noble tiles (5x 4-4 pairs + 5x 3-3-3 triplets, all worth 3 prestige points).
 */
export function createBaseNobles(): Noble[] {
  return [
    {
      id: 'noble_1',
      name: '伊莎贝拉一世',
      title: '卡斯蒂利亚女王',
      points: 3,
      requirements: makeCost({ white: 4, blue: 4 }),
    },
    {
      id: 'noble_2',
      name: '洛伦佐·美第奇',
      title: '佛罗伦萨大公',
      points: 3,
      requirements: makeCost({ blue: 4, green: 4 }),
    },
    {
      id: 'noble_3',
      name: '玛丽·斯图亚特',
      title: '苏格兰女王',
      points: 3,
      requirements: makeCost({ green: 4, red: 4 }),
    },
    {
      id: 'noble_4',
      name: '查理五世',
      title: '神圣罗马皇帝',
      points: 3,
      requirements: makeCost({ red: 4, black: 4 }),
    },
    {
      id: 'noble_5',
      name: '安妮·布列塔尼',
      title: '法兰西王后',
      points: 3,
      requirements: makeCost({ black: 4, white: 4 }),
    },
    {
      id: 'noble_6',
      name: '弗朗索瓦一世',
      title: '文艺复兴之王',
      points: 3,
      requirements: makeCost({ white: 3, blue: 3, green: 3 }),
    },
    {
      id: 'noble_7',
      name: '亨利八世',
      title: '都铎王朝君主',
      points: 3,
      requirements: makeCost({ blue: 3, green: 3, red: 3 }),
    },
    {
      id: 'noble_8',
      name: '凯瑟琳·美第奇',
      title: '瓦卢瓦摄政王后',
      points: 3,
      requirements: makeCost({ green: 3, red: 3, black: 3 }),
    },
    {
      id: 'noble_9',
      name: '苏莱曼大帝',
      title: '奥斯曼苏丹',
      points: 3,
      requirements: makeCost({ red: 3, black: 3, white: 3 }),
    },
    {
      id: 'noble_10',
      name: '伊丽莎白一世',
      title: '黄金时代女王',
      points: 3,
      requirements: makeCost({ black: 3, white: 3, blue: 3 }),
    },
  ];
}
