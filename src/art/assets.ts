import { Card, CityTile, Noble, Tier, TokenColor } from '../engine/types';

/**
 * Maps every game entity to its original HD Renaissance oil-painting asset in public/art/.
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

/** Tier 1: two gem-source paintings per gem colour */
const T1_BY_COLOR: Record<string, readonly [string, string]> = {
  white: ['./art/card_t1_quarry.jpg', './art/card_t1_white2.jpg'],
  blue: ['./art/card_t1_mine.jpg', './art/card_t1_blue2.jpg'],
  green: ['./art/card_t1_river.jpg', './art/card_t1_green2.jpg'],
  red: ['./art/card_t1_volcano.jpg', './art/card_t1_red2.jpg'],
  black: ['./art/card_t1_vault.jpg', './art/card_t1_black2.jpg'],
};

const T2_POOL = [
  './art/card_t2_workshop.jpg',
  './art/card_t2_ship.jpg',
  './art/card_t2_caravan.jpg',
  './art/card_t2_guild.jpg',
  './art/card_t2_foundry.jpg',
  './art/card_t2_v6.jpg',
  './art/card_t2_v7.jpg',
  './art/card_t2_v8.jpg',
  './art/card_t2_v9.jpg',
  './art/card_t2_v10.jpg',
] as const;

const T3_POOL = [
  './art/card_t3_jewelhouse.jpg',
  './art/card_t3_palace.jpg',
  './art/card_t3_cathedral.jpg',
  './art/card_t3_treasury.jpg',
  './art/card_t3_citadel.jpg',
  './art/card_t3_v6.jpg',
  './art/card_t3_v7.jpg',
  './art/card_t3_v8.jpg',
  './art/card_t3_v9.jpg',
  './art/card_t3_v10.jpg',
] as const;

const COLOR_IDX: Record<string, number> = { white: 0, blue: 1, green: 2, red: 3, black: 4 };

const ORIENT_BY_MOTIF: Record<string, string> = {
  orient_caravan: './art/card_orient_caravan.jpg',
  orient_satchel: './art/card_orient_v5.jpg',
  orient_junk: './art/card_orient_junk.jpg',
  orient_pagoda: './art/card_orient_pagoda.jpg',
  orient_envoy: './art/card_orient_pagoda.jpg',
  orient_palace: './art/card_orient_v6.jpg',
  orient_dragon: './art/card_orient_dragon.jpg',
};

export function getCardArt(card: Card): string {
  if (card.isOrient) {
    return ORIENT_BY_MOTIF[card.motif] ?? './art/card_orient_dragon.jpg';
  }
  const colorKey = card.bonus ?? 'white';
  const cIdx = COLOR_IDX[colorKey] ?? 0;
  const seqNum = parseInt(card.id.split('_').pop() ?? '1', 10) || 1;

  if (card.tier === 1) {
    return T1_BY_COLOR[colorKey][seqNum % 2];
  }
  // Spread 6 (T2) / 4 (T3) cards per colour across a 10-painting pool so neighbours differ
  if (card.tier === 2) {
    return T2_POOL[(cIdx * 2 + seqNum - 1) % T2_POOL.length];
  }
  return T3_POOL[(cIdx * 2 + seqNum - 1) % T3_POOL.length];
}

/** Every one of the 10 nobles now has their own unique portrait */
const NOBLE_PORTRAIT_BY_ID: Record<string, string> = {
  noble_1: './art/noble_1.jpg', // 伊莎贝拉一世
  noble_2: './art/noble_2.jpg', // 洛伦佐·美第奇
  noble_3: './art/noble_3.jpg', // 玛丽·斯图亚特
  noble_4: './art/noble_4.jpg', // 查理五世
  noble_5: './art/noble_10.jpg', // 安妮·布列塔尼
  noble_6: './art/noble_9.jpg', // 弗朗索瓦一世
  noble_7: './art/noble_7.jpg', // 亨利八世
  noble_8: './art/noble_8.jpg', // 凯瑟琳·美第奇
  noble_9: './art/noble_5.jpg', // 苏莱曼大帝
  noble_10: './art/noble_6.jpg', // 伊丽莎白一世
};

export function getNobleArt(noble: Noble): string {
  return NOBLE_PORTRAIT_BY_ID[noble.id] ?? './art/noble_1.jpg';
}

/** Every one of the 14 city sides now has its own panorama */
const CITY_ART_BY_ID: Record<string, string> = {
  city_1_a: './art/city_venice.jpg',
  city_1_b: './art/city_genoa.jpg',
  city_2_a: './art/city_florence.jpg',
  city_2_b: './art/city_milan.jpg',
  city_3_a: './art/city_bruges.jpg',
  city_3_b: './art/city_antwerp.jpg',
  city_4_a: './art/city_lyon.jpg',
  city_4_b: './art/city_nuremberg.jpg',
  city_5_a: './art/city_lisbon.jpg',
  city_5_b: './art/city_barcelona.jpg',
  city_6_a: './art/city_seville.jpg',
  city_6_b: './art/city_naples.jpg',
  city_7_a: './art/city_pisa.jpg',
  city_7_b: './art/city_vienna.jpg',
};

export function getCityArt(city: CityTile): string {
  return CITY_ART_BY_ID[city.id] ?? './art/city_venice.jpg';
}
