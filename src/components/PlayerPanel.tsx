import React from 'react';
import { ART_GEM_CHIP } from '../art/assets';
import { computePayment, getPlayerBonuses, getTotalTokens } from '../engine/payment';
import { getPlayerPoints } from '../engine/rules';
import { Card, GEM_COLORS, PlayerState } from '../engine/types';
import { CardView } from './CardView';
import { PLAYER_COLORS, StrongholdIcon } from './GemIcon';

const PLAYER_PORTRAITS = [
  './art/noble_4.jpg', // Seat 0: Player (Monarch)
  './art/noble_1.jpg', // Seat 1: Opponent 1
  './art/noble_2.jpg', // Seat 2: Opponent 2
  './art/noble_3.jpg', // Seat 3: Opponent 3
] as const;

interface OpponentPortraitProps {
  player: PlayerState;
  seatIndex: number;
  isCurrentTurn: boolean;
  strongholdsEnabled: boolean;
  tradingPostsEnabled: boolean;
  onInspect: () => void;
}

/**
 * Steam-exact gilded portrait medallion on the left marble column for each opponent.
 */
export const OpponentPortrait: React.FC<OpponentPortraitProps> = ({
  player,
  seatIndex,
  isCurrentTurn,
  strongholdsEnabled,
  tradingPostsEnabled,
  onInspect,
}) => {
  const bonuses = getPlayerBonuses(player);
  const pts = getPlayerPoints(player);
  const totalTokens = getTotalTokens(player.tokens);
  const seatColor = PLAYER_COLORS[seatIndex % PLAYER_COLORS.length];
  const portrait = PLAYER_PORTRAITS[seatIndex % PLAYER_PORTRAITS.length];

  return (
    <button
      type="button"
      onClick={onInspect}
      className={`steam-portrait-card ${isCurrentTurn ? 'steam-portrait-card--active' : ''}`}
      style={{ '--seat-color': seatColor } as React.CSSProperties}
      title={`点击查看 ${player.name} 的完整牌面`}
    >
      <div className="steam-portrait-frame">
        <img src={portrait} alt="" className="steam-portrait-frame__img" draggable={false} />
        <div className="steam-portrait-frame__rim" />
        {/* Prestige Gold Coin Top-Right */}
        <div className="steam-prestige-coin">{pts}</div>
        {/* Token Count Badge Bottom-Right */}
        <div className="steam-token-badge" title="持有筹码数">
          {totalTokens}
        </div>
        {/* Reserved Mini Card Badge Top-Left */}
        {player.reserved.length > 0 && (
          <div className="steam-reserved-pip" title={`预定 ${player.reserved.length} 张`}>
            {player.reserved.length}
          </div>
        )}
      </div>

      {/* Compact Name + Colored Card/Token Micro-Strip */}
      <div className="steam-portrait-meta">
        <span className="steam-portrait-name">
          {player.name}
          {player.isAI ? '' : ''}
        </span>
        <div className="steam-micro-gems">
          {GEM_COLORS.map((c) => (
            <span
              key={c}
              className={`micro-gem micro-gem--${c} ${bonuses[c] === 0 && player.tokens[c] === 0 ? 'micro-gem--zero' : ''}`}
            >
              {bonuses[c] + player.tokens[c]}
            </span>
          ))}
        </div>
        {(strongholdsEnabled || (tradingPostsEnabled && player.tradingPosts.length > 0)) && (
          <div className="steam-portrait-extras">
            {strongholdsEnabled && (
              <span className="opp-card__sh">
                <StrongholdIcon color={seatColor} size={10} />
                {player.strongholdsRemaining}
              </span>
            )}
            {tradingPostsEnabled && player.tradingPosts.length > 0 && (
              <span>徽{player.tradingPosts.length}</span>
            )}
          </div>
        )}
      </div>
    </button>
  );
};

interface ActivePlayerPortraitProps {
  player: PlayerState;
  seatIndex: number;
  isMyTurn: boolean;
  strongholdsEnabled: boolean;
  tradingPostsEnabled: boolean;
  onOpenTradingPosts?: () => void;
}

/**
 * Steam-exact grand gilded player portrait anchored at bottom-left of the marble column.
 */
export const ActivePlayerPortrait: React.FC<ActivePlayerPortraitProps> = ({
  player,
  seatIndex,
  isMyTurn,
  strongholdsEnabled,
  tradingPostsEnabled,
  onOpenTradingPosts,
}) => {
  const pts = getPlayerPoints(player);
  const seatColor = PLAYER_COLORS[seatIndex % PLAYER_COLORS.length];
  const portrait = PLAYER_PORTRAITS[seatIndex % PLAYER_PORTRAITS.length];

  return (
    <div
      className={`steam-self-portrait ${isMyTurn ? 'steam-self-portrait--active' : ''}`}
      style={{ '--seat-color': seatColor } as React.CSSProperties}
    >
      <div className="steam-portrait-frame steam-portrait-frame--self">
        <img src={portrait} alt="" className="steam-portrait-frame__img" draggable={false} />
        <div className="steam-portrait-frame__rim" />
        <div className="steam-prestige-coin steam-prestige-coin--self">{pts}</div>
        {player.nobles.length > 0 && (
          <div className="steam-noble-count-pip" title={`已获 ${player.nobles.length} 位贵族`}>
            ♛{player.nobles.length}
          </div>
        )}
      </div>
      <div className="steam-self-caption">
        <span className="steam-portrait-name">{player.name}</span>
        <div className="steam-portrait-extras">
          {player.goldSatchels.length > 0 && (
            <span className="gold-text">金袋×{player.goldSatchels.length}</span>
          )}
          {strongholdsEnabled && (
            <span className="opp-card__sh">
              <StrongholdIcon color={seatColor} size={11} />
              {player.strongholdsRemaining}
            </span>
          )}
          {tradingPostsEnabled && (
            <button type="button" className="dock-tp-btn" onClick={onOpenTradingPosts}>
              徽{player.tradingPosts.length}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface ActivePlayerDockProps {
  player: PlayerState;
  isMyTurn: boolean;
  forbidTier3?: boolean;
  onClickReserved: (card: Card) => void;
}

/**
 * Steam-exact curved dark-marble & forged-gold bottom tray:
 * Circular X/10 token dial + 5 colored jewel-glass slots (bonus count left + mini poker chip right)
 * + Gold wild slot + Reserved cards fan on the right.
 */
export const ActivePlayerDock: React.FC<ActivePlayerDockProps> = ({
  player,
  isMyTurn,
  forbidTier3 = false,
  onClickReserved,
}) => {
  const bonuses = getPlayerBonuses(player);
  const totalTokens = getTotalTokens(player.tokens);

  return (
    <footer className={`steam-bottom-tray ${isMyTurn ? 'steam-bottom-tray--active' : ''}`}>
      {/* Circular 8/10 Token Limit Medallion (Steam Signature!) */}
      <div
        className={`steam-cap-dial ${totalTokens >= 9 ? 'steam-cap-dial--warn' : ''}`}
        title={`筹码上限 ${totalTokens}/10`}
      >
        <span className="steam-cap-dial__cur">{totalTokens}</span>
        <span className="steam-cap-dial__slash">/</span>
        <span className="steam-cap-dial__max">10</span>
      </div>

      {/* 5 Colored Gem-Glass Slots + Gold Slot */}
      <div className="steam-tray-slots">
        {GEM_COLORS.map((c) => {
          const b = bonuses[c];
          const t = player.tokens[c];
          return (
            <div key={c} className={`steam-gem-slot steam-gem-slot--${c}`}>
              <span
                className={`steam-gem-slot__bonus ${b === 0 ? 'steam-gem-slot__zero' : ''}`}
                title="永久宝石卡折扣"
              >
                {b > 0 ? b : ''}
              </span>
              <div
                className={`steam-gem-slot__chip ${t === 0 ? 'steam-gem-slot__chip--empty' : ''}`}
                title={`持有筹码 ${t}`}
              >
                <img src={ART_GEM_CHIP[c]} alt="" draggable={false} />
                <span>{t > 0 ? t : ''}</span>
              </div>
            </div>
          );
        })}

        {/* Gold Wild Slot */}
        <div className="steam-gem-slot steam-gem-slot--gold">
          <div
            className={`steam-gem-slot__chip steam-gem-slot__chip--gold ${player.tokens.gold === 0 ? 'steam-gem-slot__chip--empty' : ''}`}
            title={`黄金百搭 ${player.tokens.gold}`}
          >
            <img src={ART_GEM_CHIP.gold} alt="" draggable={false} />
            <span>{player.tokens.gold > 0 ? player.tokens.gold : ''}</span>
          </div>
        </div>
      </div>

      {/* Reserved Cards Fan */}
      <div className="steam-tray-reserved">
        {player.reserved.length === 0 ? (
          <div className="steam-reserved-empty" title="点击牌桌或牌堆可预定最多3张卡">
            <span>预定</span>
            <small>0/3</small>
          </div>
        ) : (
          player.reserved.map((card) => {
            const affordable =
              !(forbidTier3 && card.tier === 3) && computePayment(player, card).canAfford;
            return (
              <CardView
                key={card.id}
                card={card}
                canAfford={affordable}
                compact
                onClick={() => onClickReserved(card)}
              />
            );
          })
        )}
      </div>
    </footer>
  );
};
