import React from 'react';
import { ART_GEM_CHIP } from '../art/assets';
import { computePayment, getPlayerBonuses, getTotalTokens } from '../engine/payment';
import { getPlayerPoints } from '../engine/rules';
import { Card, GEM_COLORS, PlayerState } from '../engine/types';
import { CardView } from './CardView';
import { PLAYER_COLORS, StrongholdIcon } from './GemIcon';

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
        {player.nobles.length > 0 && <span className="gold-text">贵族 {player.nobles.length}</span>}
        {player.claimedCity && <span className="gold-text">城: {player.claimedCity.name}</span>}
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
      {/* Left: Gilded Crest & Prestige Shield */}
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
            <span>矿卡 {player.cards.length}</span>
            {player.nobles.length > 0 && <span className="gold-text">贵族 {player.nobles.length}</span>}
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
              <button type="button" className="dock-tp-btn" onClick={onOpenTradingPosts}>
                徽章 {player.tradingPosts.length}/5
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Center: Physical Stacked Mini Gem-Card Columns + Poker-Chip Token Stacks */}
      <div className="player-dock__resources">
        {GEM_COLORS.map((c) => {
          const cardCount = bonuses[c];
          const tokCount = player.tokens[c];
          const stackLayers = Math.min(cardCount, 4);

          return (
            <div key={c} className={`tableau-col tableau-col--${c}`}>
              {/* Fanned Mini Card Stack */}
              <div className="tableau-cards" title={`永久 ${c} 宝石卡加成: +${cardCount}`}>
                {cardCount > 0 ? (
                  <div className="mini-card-stack">
                    {Array.from({ length: stackLayers }).map((_, idx) => (
                      <div
                        key={idx}
                        className={`mini-card-leaf mini-card-leaf--${c}`}
                        style={{ transform: `translate(${idx * 2}px, ${-idx * 2.5}px)` }}
                      />
                    ))}
                    <span className="mini-card-stack__val">{cardCount}</span>
                  </div>
                ) : (
                  <div className="mini-card-empty">0</div>
                )}
              </div>

              {/* Mini Poker Chip Token */}
              <div
                className={`tableau-chip ${tokCount === 0 ? 'tableau-chip--empty' : ''}`}
                title={`持有筹码: ${tokCount}`}
              >
                <img src={ART_GEM_CHIP[c]} alt="" className="tableau-chip__img" draggable={false} />
                <span className="tableau-chip__val">{tokCount}</span>
              </div>
            </div>
          );
        })}

        {/* Gold Joker Column */}
        <div className="tableau-col tableau-col--gold">
          <div className="tableau-cards">
            <div className="mini-card-gold-label">百搭</div>
          </div>
          <div className={`tableau-chip ${player.tokens.gold === 0 ? 'tableau-chip--empty' : ''}`}>
            <img src={ART_GEM_CHIP.gold} alt="" className="tableau-chip__img" draggable={false} />
            <span className="tableau-chip__val">{player.tokens.gold}</span>
          </div>
        </div>
      </div>

      {/* Right: Reserved Cards Hand (up to 3) */}
      <div className="player-dock__reserved">
        <div className="player-dock__reserved-label">预定手牌 ({player.reserved.length}/3)</div>
        <div className="player-dock__reserved-cards">
          {player.reserved.length === 0 ? (
            <div className="reserved-empty">点击牌桌或牌堆预定</div>
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
