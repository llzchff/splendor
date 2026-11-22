import React from 'react';
import { computePayment, getPlayerBonuses, getTotalTokens } from '../engine/payment';
import { getPlayerPoints } from '../engine/rules';
import { Card, GEM_COLORS, PlayerState } from '../engine/types';
import { CardView } from './CardView';
import { GemIcon, PLAYER_COLORS, StrongholdIcon } from './GemIcon';

interface OpponentCardProps {
  player: PlayerState;
  seatIndex: number;
  isCurrentTurn: boolean;
  strongholdsEnabled: boolean;
  tradingPostsEnabled: boolean;
}

export const OpponentMiniCard: React.FC<OpponentCardProps> = ({
  player,
  seatIndex,
  isCurrentTurn,
  strongholdsEnabled,
  tradingPostsEnabled,
}) => {
  const bonuses = getPlayerBonuses(player);
  const pts = getPlayerPoints(player);
  const totalTokens = getTotalTokens(player.tokens);
  const color = PLAYER_COLORS[seatIndex % PLAYER_COLORS.length];

  return (
    <div
      className={`opp-card ${isCurrentTurn ? 'opp-card--active' : ''}`}
      style={{ '--seat-color': color } as React.CSSProperties}
    >
      <div className="opp-card__top">
        <div className="opp-card__identity">
          <span className="opp-card__dot" style={{ background: color }} />
          <span className="opp-card__name">{player.name}</span>
          {player.isAI && <span className="opp-card__ai-tag">AI</span>}
        </div>
        <div className="opp-card__score">
          <span className="opp-card__pts">{pts}</span>
          <span className="opp-card__pts-unit">分</span>
        </div>
      </div>

      <div className="opp-card__gems">
        {GEM_COLORS.map((c) => (
          <div key={c} className="opp-gem-col">
            <span className={`opp-gem-bonus opp-gem-bonus--${c}`}>{bonuses[c]}</span>
            <span className="opp-gem-tok">{player.tokens[c]}</span>
          </div>
        ))}
        <div className="opp-gem-col">
          <span className="opp-gem-bonus opp-gem-bonus--gold">★</span>
          <span className="opp-gem-tok">{player.tokens.gold}</span>
        </div>
      </div>

      <div className="opp-card__meta">
        <span>筹码 {totalTokens}/10</span>
        <span>预定 {player.reserved.length}/3</span>
        {player.nobles.length > 0 && <span>贵族 {player.nobles.length}</span>}
        {player.claimedCity && <span>城: {player.claimedCity.name}</span>}
        {strongholdsEnabled && (
          <span className="opp-card__sh">
            <StrongholdIcon color={color} size={11} /> {player.strongholdsRemaining}
          </span>
        )}
        {tradingPostsEnabled && player.tradingPosts.length > 0 && (
          <span>徽章 {player.tradingPosts.length}</span>
        )}
      </div>
    </div>
  );
};

interface ActivePlayerDockProps {
  player: PlayerState;
  seatIndex: number;
  isMyTurn: boolean;
  strongholdsEnabled: boolean;
  tradingPostsEnabled: boolean;
  forbidTier3?: boolean;
  onClickReserved: (card: Card) => void;
  onOpenTradingPosts?: () => void;
}

export const ActivePlayerDock: React.FC<ActivePlayerDockProps> = ({
  player,
  seatIndex,
  isMyTurn,
  strongholdsEnabled,
  tradingPostsEnabled,
  forbidTier3 = false,
  onClickReserved,
  onOpenTradingPosts,
}) => {
  const bonuses = getPlayerBonuses(player);
  const pts = getPlayerPoints(player);
  const totalTokens = getTotalTokens(player.tokens);
  const seatColor = PLAYER_COLORS[seatIndex % PLAYER_COLORS.length];

  return (
    <footer
      className={`player-dock ${isMyTurn ? 'player-dock--active' : ''}`}
      style={{ '--seat-color': seatColor } as React.CSSProperties}
    >
      {/* Left: Player Crest & Prestige */}
      <div className="player-dock__profile">
        <div className="player-dock__prestige">
          <span className="player-dock__prestige-val">{pts}</span>
          <span className="player-dock__prestige-lbl">威望</span>
        </div>
        <div className="player-dock__info">
          <div className="player-dock__name-row">
            <span className="opp-card__dot" style={{ background: seatColor }} />
            <strong>{player.name}</strong>
            {isMyTurn && <span className="turn-pill">你的回合</span>}
          </div>
          <div className="player-dock__stats">
            <span>筹码 {totalTokens}/10</span>
            <span>发展卡 {player.cards.length}</span>
            {player.nobles.length > 0 && <span>贵族 {player.nobles.length}</span>}
            {player.reservedNobles.length > 0 && (
              <span className="gold-text">定贵族 {player.reservedNobles.length}</span>
            )}
            {player.goldSatchels.length > 0 && (
              <span className="gold-text">金袋 ×{player.goldSatchels.length}</span>
            )}
            {strongholdsEnabled && (
              <span className="opp-card__sh">
                <StrongholdIcon color={seatColor} size={13} /> 余 {player.strongholdsRemaining}
              </span>
            )}
            {tradingPostsEnabled && (
              <button
                type="button"
                className="dock-tp-btn"
                onClick={onOpenTradingPosts}
              >
                徽章 {player.tradingPosts.length}/5
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Center: 5 Gem Columns (Bonus card discount + Tokens held) + Gold */}
      <div className="player-dock__resources">
        {GEM_COLORS.map((c) => (
          <div key={c} className={`dock-gem dock-gem--${c}`}>
            <GemIcon color={c} size={18} />
            <div className="dock-gem__nums">
              <span className="dock-gem__bonus" title="永久宝石卡加成">
                +{bonuses[c]}
              </span>
              <span className="dock-gem__tok" title="当前持有筹码">
                {player.tokens[c]}
              </span>
            </div>
          </div>
        ))}
        <div className="dock-gem dock-gem--gold">
          <GemIcon color="gold" size={18} />
          <div className="dock-gem__nums">
            <span className="dock-gem__bonus">百搭</span>
            <span className="dock-gem__tok">{player.tokens.gold}</span>
          </div>
        </div>
      </div>

      {/* Right: Reserved Cards Hand (up to 3) */}
      <div className="player-dock__reserved">
        <div className="player-dock__reserved-label">预定区 ({player.reserved.length}/3)</div>
        <div className="player-dock__reserved-cards">
          {player.reserved.length === 0 ? (
            <div className="reserved-empty">点击牌桌卡或卡堆可预定</div>
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
      </div>
    </footer>
  );
};
