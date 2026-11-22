import React from 'react';
import { Card, GEM_COLORS, GemColor, StrongholdStack } from '../engine/types';
import { CardMotifSvg, GemIcon, PLAYER_COLORS, StrongholdIcon } from './GemIcon';

const BONUS_ACCENT: Record<GemColor, string> = {
  white: '#dbeafe',
  blue: '#3b82f6',
  green: '#10b981',
  red: '#f43f5e',
  black: '#94a3b8',
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
  highlightMode = 'none',
  onClick,
}) => {
  const accent = card.bonus ? BONUS_ACCENT[card.bonus] : '#f59e0b';
  const costs = GEM_COLORS.filter((c) => card.cost[c] > 0);
  const shColor = PLAYER_COLORS[strongholdOwnerIndex % PLAYER_COLORS.length];

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'splendor-card',
        card.isOrient ? 'splendor-card--orient' : '',
        canAfford && !blockedByEnemy ? 'splendor-card--affordable' : '',
        blockedByEnemy ? 'splendor-card--blocked' : '',
        selected ? 'splendor-card--selected' : '',
        compact ? 'splendor-card--compact' : '',
        highlightMode === 'free' ? 'splendor-card--highlight-free' : '',
        highlightMode === 'stronghold' ? 'splendor-card--highlight-sh' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ '--card-accent': accent } as React.CSSProperties}
    >
      <CardMotifSvg motif={card.motif} accent={accent} />

      {/* Top Ribbon: Prestige Points + Gem Bonus */}
      <div className="splendor-card__header">
        <span className="splendor-card__points">{card.points > 0 ? card.points : ''}</span>
        <div className="splendor-card__bonus">
          {card.ability === 'double_gold' ? (
            <span className="splendor-card__special-gem">
              <GemIcon color="gold" size={compact ? 14 : 18} />
              <GemIcon color="gold" size={compact ? 14 : 18} />
            </span>
          ) : card.bonus ? (
            <span className="splendor-card__special-gem">
              <GemIcon color={card.bonus} size={compact ? 15 : 20} />
              {card.bonusCount > 1 && <GemIcon color={card.bonus} size={compact ? 15 : 20} />}
            </span>
          ) : (
            <span className="splendor-card__wild-badge" title="百搭挂钩">
              ★
            </span>
          )}
        </div>
      </div>

      {/* Ability tag for Orient cards */}
      {card.ability && (
        <div className="splendor-card__ability-tag">{ABILITY_BADGE[card.ability] ?? card.ability}</div>
      )}

      {/* Stronghold Towers overlay */}
      {stronghold && stronghold.count > 0 && (
        <div className="splendor-card__strongholds" title={`要塞 ×${stronghold.count}`}>
          {Array.from({ length: stronghold.count }).map((_, idx) => (
            <StrongholdIcon key={idx} color={shColor} size={compact ? 12 : 15} />
          ))}
        </div>
      )}

      {blockedByEnemy && <div className="splendor-card__lock-badge">封锁</div>}

      {/* Bottom Cost Stack */}
      <div className="splendor-card__costs">
        {card.ability === 'discard_bonuses' && card.sacrificeColor ? (
          <div className={`cost-pill cost-pill--${card.sacrificeColor} cost-pill--sacrifice`}>
            <span>-2</span>
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
