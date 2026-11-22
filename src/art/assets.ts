import { Card, CityTile, Noble, Tier, TokenColor } from '../engine/types';

/**
 * Maps every game entity to its optimized Renaissance oil-painting asset in public/art/.
 */
export const ART_BG = {
  table: './art/bg_table.jpg',
  menu: './art/bg_menu.jpg',
} as const;

export const ART_DECK_BACK: Record<Tier | 'orient', string> = {
  1: './art/deck_t1.jpg',
  2: './art/deck_t2.jpg',
  3: './art/deck_t3.jpg',
  orient: './art/deck_orient.jpg',
};

export const ART_GEM_CHIP: Record<TokenColor, string> = {
  white: './art/gem_white.png',
  blue: './art/gem_blue.png',
  green: './art/gem_green.png',
  red: './art/gem_red.png',
  black: './art/gem_black.png',
  gold: './art/gem_gold.png',
};

const T1_POOL = [
  './art/card_t1_quarry.jpg', // white
  './art/card_t1_mine.jpg', // blue
  './art/card_t1_river.jpg', // green
  './art/card_t1_volcano.jpg', // red
  './art/card_t1_vault.jpg', // black
] as const;

const T2_POOL = [
  './art/card_t2_workshop.jpg',
  './art/card_t2_ship.jpg',
  './art/card_t2_caravan.jpg',
  './art/card_t2_guild.jpg',
  './art/card_t2_foundry.jpg',
] as const;

const T3_POOL = [
  './art/card_t3_jewelhouse.jpg',
  './art/card_t3_palace.jpg',
  './art/card_t3_cathedral.jpg',
  './art/card_t3_treasury.jpg',
  './art/card_t3_citadel.jpg',
] as const;

const COLOR_IDX: Record<string, number> = {
  white: 0,
  blue: 1,
  green: 2,
  red: 3,
  black: 4,
};

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getCardArt(card: Card): string {
  if (card.isOrient) {
    if (card.motif === 'orient_caravan' || card.motif === 'orient_satchel') {
      return './art/card_orient_caravan.jpg';
    }
    if (card.motif === 'orient_junk') return './art/card_orient_junk.jpg';
    if (card.motif === 'orient_pagoda' || card.motif === 'orient_envoy') {
      return './art/card_orient_pagoda.jpg';
    }
    if (card.motif === 'orient_palace') return './art/card_orient_pagoda.jpg';
    return './art/card_orient_dragon.jpg';
  }

  const cIdx = card.bonus ? COLOR_IDX[card.bonus] ?? 0 : 0;
  const seqNum = parseInt(card.id.split('_').pop() ?? '1', 10) || 1;
  const h = hashId(card.id);

  if (card.tier === 1) {
    // Match gem color mood for Tier 1 mines
    return T1_POOL[cIdx % T1_POOL.length];
  }
  if (card.tier === 2) {
    return T2_POOL[(cIdx * 2 + seqNum - 1) % T2_POOL.length];
  }
  return T3_POOL[(cIdx * 3 + seqNum - 1 + (h % 2)) % T3_POOL.length];
}

const NOBLE_PORTRAIT_BY_ID: Record<string, string> = {
  noble_1: './art/noble_1.jpg', // 伊莎贝拉一世（女王）
  noble_2: './art/noble_2.jpg', // 洛伦佐·美第奇（大公）
  noble_3: './art/noble_3.jpg', // 玛丽·斯图亚特（女王）
  noble_4: './art/noble_4.jpg', // 查理五世（皇帝）
  noble_5: './art/noble_6.jpg', // 安妮·布列塔尼（王后）
  noble_6: './art/noble_2.jpg', // 弗朗索瓦一世（国王）
  noble_7: './art/noble_4.jpg', // 亨利八世（君主）
  noble_8: './art/noble_1.jpg', // 凯瑟琳·美第奇（王后）
  noble_9: './art/noble_5.jpg', // 苏莱曼大帝（苏丹）
  noble_10: './art/noble_6.jpg', // 伊丽莎白一世（女王）
};

export function getNobleArt(noble: Noble): string {
  return NOBLE_PORTRAIT_BY_ID[noble.id] ?? './art/noble_1.jpg';
}

const CITY_SCAPES = [
  './art/city_venice.jpg',
  './art/city_florence.jpg',
  './art/city_bruges.jpg',
] as const;

export function getCityArt(city: CityTile): string {
  return CITY_SCAPES[(city.pairId - 1) % CITY_SCAPES.length];
}
