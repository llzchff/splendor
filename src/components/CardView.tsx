import React from 'react';
import { getCardArt } from '../art/assets';
import { Card, GEM_COLORS, GemColor, StrongholdStack } from '../engine/types';
import { GemIcon, PLAYER_COLORS, StrongholdIcon } from './GemIcon';

const BONUS_ACCENT: Record<GemColor, string> = {
  white: '#e2e8f0',
  blue: '#3b82f6',
  green: '#10b981',
  red: '#e11d48',
  black: '#475569',
};

const ABILITY_BADGE: Record<string, string> = {
  double_gold: '2×金袋',
  wild_satchel: '百搭挂钩',
  double_bonus: '双宝石',
  wild_satchel_free_t1: '百搭+1级',
  reserve_noble: '定贵族',
  free_tier2: '免费2级',
  discard_bonuses: '献祭2卡',
};

interface CardViewProps {
  card: Card;
  canAfford: boolean;
  blockedByEnemy?: boolean;
  stronghold?: StrongholdStack;
  strongholdOwnerIndex?: number;
  selected?: boolean;
  compact?: boolean;
  zoomed?: boolean;
  highlightMode?: 'none' | 'free' | 'stronghold';
  onClick?: () => void;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  canAfford,
  blockedByEnemy = false,
  stronghold,
  strongholdOwnerIndex = 0,
  selected = false,
  compact = false,
  zoomed = false,
  highlightMode = 'none',
  onClick,
}) => {
  const accent = card.bonus ? BONUS_ACCENT[card.bonus] : '#f59e0b';
  const costs = GEM_COLORS.filter((c) => card.cost[c] > 0);
  const shColor = PLAYER_COLORS[strongholdOwnerIndex % PLAYER_COLORS.length];
  const artSrc = getCardArt(card);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'splendor-card',
        `splendor-card--t${card.tier}`,
        card.isOrient ? 'splendor-card--orient' : '',
        canAfford && !blockedByEnemy ? 'splendor-card--affordable' : '',
        blockedByEnemy ? 'splendor-card--blocked' : '',
        selected ? 'splendor-card--selected' : '',
        compact ? 'splendor-card--compact' : '',
        zoomed ? 'splendor-card--zoomed' : '',
        highlightMode === 'free' ? 'splendor-card--highlight-free' : '',
        highlightMode === 'stronghold' ? 'splendor-card--highlight-sh' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ '--card-accent': accent } as React.CSSProperties}
    >
      {/* Full-bleed Renaissance Oil Painting Artwork */}
      <img src={artSrc} alt="" className="splendor-card__art" loading="eager" draggable={false} />
      <div className="splendor-card__vignette" />
      <div className="splendor-card__inner-frame" />

      {/* Top Classic Splendor Frosted Ivory / Crimson Header Band */}
      <div className="splendor-card__header">
        <span className="splendor-card__points">{card.points > 0 ? card.points : ''}</span>
        <div className="splendor-card__bonus">
          {card.ability === 'double_gold' ? (
            <span className="splendor-card__special-gem">
              <GemIcon color="gold" size={zoomed ? 24 : compact ? 13 : 17} />
              <GemIcon color="gold" size={zoomed ? 24 : compact ? 13 : 17} />
            </span>
          ) : card.bonus ? (
            <span className="splendor-card__special-gem">
              <GemIcon color={card.bonus} size={zoomed ? 26 : compact ? 14 : 19} />
              {card.bonusCount > 1 && (
                <GemIcon color={card.bonus} size={zoomed ? 26 : compact ? 14 : 19} />
              )}
            </span>
          ) : (
            <span className="splendor-card__wild-badge" title="百搭挂钩">
              ★
            </span>
          )}
        </div>
      </div>

      {/* Ability Ribbon for Orient Expansion Cards */}
      {card.ability && !compact && (
        <div className="splendor-card__ability-tag">{ABILITY_BADGE[card.ability] ?? card.ability}</div>
      )}

      {/* Stronghold Towers Badge */}
      {stronghold && stronghold.count > 0 && (
        <div className="splendor-card__strongholds" title={`要塞 ×${stronghold.count}`}>
          {Array.from({ length: stronghold.count }).map((_, idx) => (
            <StrongholdIcon key={idx} color={shColor} size={compact ? 11 : 15} />
          ))}
        </div>
      )}

      {blockedByEnemy && <div className="splendor-card__lock-badge">要塞封锁</div>}

      {/* Bottom-Left Classic Circular Embossed Cost Coins */}
      <div className="splendor-card__costs">
        {card.ability === 'discard_bonuses' && card.sacrificeColor ? (
          <div className={`cost-pill cost-pill--${card.sacrificeColor} cost-pill--sacrifice`}>
            <span>弃2</span>
          </div>
        ) : (
          costs.map((c) => (
            <div key={c} className={`cost-pill cost-pill--${c}`}>
              {card.cost[c]}
            </div>
          ))
        )}
      </div>
    </button>
  );
};
