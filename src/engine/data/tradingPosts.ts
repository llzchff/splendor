import { TradingPostDef } from '../types';

/**
 * The Trading Posts Expansion (Route to the Orient): 5 permanent Coat of Arms privileges.
 */
export const TRADING_POSTS: readonly TradingPostDef[] = [
  {
    id: 'gem_after_buy',
    name: '香料商路',
    requirementText: '3 红 + 1 白',
    description: '每购买 1 张发展卡后，免费从供应堆拿取 1 枚非黄金宝石',
    bonusReq: { red: 3, white: 1 },
  },
  {
    id: 'extra_gem_on_two_same',
    name: '宝石工坊',
    requirementText: '2 白',
    description: '拿取 2 枚同色宝石时，可额外拿取 1 枚其他颜色的宝石',
    bonusReq: { white: 2 },
  },
  {
    id: 'double_gold_value',
    name: '皇家金库',
    requirementText: '3 蓝 + 1 黑',
    description: '购买卡牌时，每枚黄金筹码可当作 2 枚同色宝石使用',
    bonusReq: { blue: 3, black: 1 },
  },
  {
    id: 'five_points_noble',
    name: '翡翠商会',
    requirementText: '5 绿 + 1 贵族',
    description: '立即获得 +5 威望分（城市模式下需 5 绿且 ≥10 分）',
    bonusReq: { green: 5 },
    requiresNoble: true,
  },
  {
    id: 'one_point_per_crest',
    name: '黑曜议会',
    requirementText: '3 黑',
    description: '贸易站面板上每拥有 1 枚己方徽章，额外 +1 威望分',
    bonusReq: { black: 3 },
  },
];
