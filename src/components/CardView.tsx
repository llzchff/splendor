import React from 'react';
import { ART_DECK_BACK, getCardArt } from '../art/assets';
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
  wild_satchel: '百搭',
  double_bonus: '×2',
  wild_satchel_free_t1: '百搭+1级',
  reserve_noble: '定贵族',
  free_tier2: '免2级',
  discard_bonuses: '献祭2',
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
  /** Register this card with the motion director (board + own hand only) */
  trackFx?: boolean;
  /** Card is currently lifted out of this slot — keep the slot's footprint but hide it */
  ghost?: boolean;
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
  trackFx = false,
  ghost = false,
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
      data-fx={trackFx ? `card:${card.id}` : undefined}
      className={[
        'splendor-card',
        `splendor-card--t${card.tier}`,
        card.isOrient ? 'splendor-card--orient' : '',
        canAfford && !blockedByEnemy ? 'splendor-card--affordable' : '',
        blockedByEnemy ? 'splendor-card--blocked' : '',
        selected ? 'splendor-card--selected' : '',
        compact ? 'splendor-card--compact' : '',
        zoomed ? 'splendor-card--zoomed' : '',
        ghost ? 'splendor-card--ghost' : '',
        highlightMode === 'free' ? 'splendor-card--highlight-free' : '',
        highlightMode === 'stronghold' ? 'splendor-card--highlight-sh' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ '--card-accent': accent } as React.CSSProperties}
    >
      {/* Full-bleed Renaissance Oil Painting */}
      <img src={artSrc} alt="" className="splendor-card__art" loading="eager" draggable={false} />
      <div className="splendor-card__vignette" />

      {/* Steam-Exact Soft Frosted Top Band (lets painting breathe right underneath) */}
      <div className="splendor-card__header">
        <span className="splendor-card__points">{card.points > 0 ? card.points : ''}</span>
        <div className="splendor-card__bonus">
          {card.ability === 'double_gold' ? (
            <span className="splendor-card__special-gem">
              <GemIcon color="gold" size={zoomed ? 26 : compact ? 13 : 18} />
              <GemIcon color="gold" size={zoomed ? 26 : compact ? 13 : 18} />
            </span>
          ) : card.bonus ? (
            <span className="splendor-card__special-gem">
              <GemIcon color={card.bonus} size={zoomed ? 28 : compact ? 14 : 20} />
              {card.bonusCount > 1 && (
                <GemIcon color={card.bonus} size={zoomed ? 28 : compact ? 14 : 20} />
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
            <StrongholdIcon key={idx} color={shColor} size={compact ? 11 : 14} />
          ))}
        </div>
      )}

      {blockedByEnemy && <div className="splendor-card__lock-badge">封锁</div>}

      {/* Steam-Style Large Legible Glossy Cost Coins Clustered Bottom-Left */}
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

      {/* Card back, revealed only while the card is being dealt face-down */}
      <img
        src={ART_DECK_BACK[card.isOrient ? 'orient' : card.tier]}
        alt=""
        className="splendor-card__back"
        draggable={false}
      />
    </button>
  );
};
