import React, { useMemo, useState } from 'react';
import { getPlayerBonuses } from '../engine/payment';
import { findBoardCard, getAllBoardCards } from '../engine/rules';
import {
  Card,
  GEM_COLORS,
  GEM_LABELS_ZH,
  GameAction,
  GameState,
  GemColor,
  TOKEN_COLORS,
  TokenColor,
  TokenCounts,
} from '../engine/types';
import { CardView } from './CardView';
import { GemIcon, PLAYER_COLORS } from './GemIcon';

interface PendingActionModalProps {
  state: GameState;
  onAction: (action: GameAction) => void;
}

export const PendingActionModal: React.FC<PendingActionModalProps> = ({ state, onAction }) => {
  const step = state.pendingQueue[0];
  const player = state.players[state.currentPlayerIndex];

  // State for discard_tokens
  const [discardMap, setDiscardMap] = useState<Partial<TokenCounts>>({});
  // State for stronghold move source
  const [moveFromCardId, setMoveFromCardId] = useState<string | undefined>(undefined);

  const bonuses = useMemo(() => getPlayerBonuses(player), [player]);

  if (!step) return null;

  const totalDiscarded = TOKEN_COLORS.reduce((s, c) => s + (discardMap[c] ?? 0), 0);

  if (step.type === 'discard_tokens') {
    const toggleDiscard = (color: TokenColor, delta: number) => {
      setDiscardMap((prev) => {
        const cur = prev[color] ?? 0;
        const next = Math.max(0, Math.min(player.tokens[color], cur + delta));
        const otherTotal = totalDiscarded - cur;
        if (otherTotal + next > step.count) return prev;
        return { ...prev, [color]: next };
      });
    };

    return (
      <div className="modal-backdrop">
        <div className="modal-card">
          <div className="modal-header">
            <h3>筹码超过 10 枚上限</h3>
            <span className="modal-sub">
              请弃置 {totalDiscarded} / {step.count} 枚筹码
            </span>
          </div>
          <div className="discard-grid">
            {TOKEN_COLORS.filter((c) => player.tokens[c] > 0).map((color) => {
              const chosen = discardMap[color] ?? 0;
              return (
                <div key={color} className="discard-item">
                  <GemIcon color={color} size={28} />
                  <div className="discard-item__info">
                    <strong>{GEM_LABELS_ZH[color]}</strong>
                    <span>持有 {player.tokens[color]}</span>
                  </div>
                  <div className="discard-item__ctrl">
                    <button
                      type="button"
                      className="btn btn--ghost btn--xs"
                      disabled={chosen <= 0}
                      onClick={() => toggleDiscard(color, -1)}
                    >
                      −
                    </button>
                    <span className="discard-item__num">{chosen}</span>
                    <button
                      type="button"
                      className="btn btn--ghost btn--xs"
                      disabled={chosen >= player.tokens[color] || totalDiscarded >= step.count}
                      onClick={() => toggleDiscard(color, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn--gold"
              disabled={totalDiscarded !== step.count}
              onClick={() => {
                onAction({ type: 'discard_tokens', tokens: discardMap });
                setDiscardMap({});
              }}
            >
              确认弃置 ({totalDiscarded}/{step.count})
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step.type === 'choose_noble') {
    const candidates = [...state.nobles, ...player.reservedNobles].filter((n) =>
      step.nobleIds.includes(n.id)
    );
    return (
      <div className="modal-backdrop">
        <div className="modal-card">
          <div className="modal-header">
            <h3>多位贵族同时慕名而来</h3>
            <span className="modal-sub">每回合限选 1 位贵族造访</span>
          </div>
          <div className="choice-row">
            {candidates.map((n) => (
              <button
                key={n.id}
                type="button"
                className="choice-tile"
                onClick={() => onAction({ type: 'choose_noble', nobleId: n.id })}
              >
                <div className="choice-tile__pts">+{n.points}分</div>
                <strong>{n.name}</strong>
                <small>{n.title}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step.type === 'choose_city') {
    const candidates = state.cities.filter((c) => step.cityIds.includes(c.id));
    return (
      <div className="modal-backdrop">
        <div className="modal-card">
          <div className="modal-header">
            <h3>选择要占领的文艺复兴名城</h3>
            <span className="modal-sub">占领城市将触发终局回合！</span>
          </div>
          <div className="choice-row">
            {candidates.map((city) => (
              <button
                key={city.id}
                type="button"
                className="choice-tile"
                onClick={() => onAction({ type: 'choose_city', cityId: city.id })}
              >
                <div className="choice-tile__pts">{city.requirement.minPoints}分门槛</div>
                <strong>{city.name}</strong>
                <small>{city.subtitle}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step.type === 'orient_pair_satchel') {
    const ownedColors = GEM_COLORS.filter((c) => bonuses[c] > 0);
    return (
      <div className="modal-backdrop">
        <div className="modal-card">
          <div className="modal-header">
            <h3>东方丝绸百搭 · 选择绑定宝石</h3>
            <span className="modal-sub">将此卡永久关联到你已拥有的某色发展卡（+1 永久加成）</span>
          </div>
          <div className="color-pick-row">
            {ownedColors.map((c) => (
              <button
                key={c}
                type="button"
                className="color-pick-btn"
                onClick={() => onAction({ type: 'orient_pair_satchel', color: c })}
              >
                <GemIcon color={c} size={30} />
                <span>{GEM_LABELS_ZH[c]}</span>
                <small>当前 +{bonuses[c]}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step.type === 'orient_take_free_card') {
    const row = state.tiers[step.tier];
    const cards = [...row.baseSlots, ...row.orientSlots].filter((c): c is Card => {
      if (!c) return false;
      const sh = state.strongholds[c.id];
      if (state.config.expansions.strongholds && sh && sh.playerId !== player.id) return false;
      return true;
    });
    return (
      <div className="modal-backdrop">
        <div className="modal-card modal-card--wide">
          <div className="modal-header">
            <h3>东方特权 · 免费拿取 1 张 {step.tier} 级明牌</h3>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => onAction({ type: 'orient_skip_free_card' })}
            >
              跳过
            </button>
          </div>
          <div className="free-card-row">
            {cards.map((card) => (
              <CardView
                key={card.id}
                card={card}
                canAfford
                highlightMode="free"
                onClick={() => onAction({ type: 'orient_take_free_card', cardId: card.id })}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step.type === 'orient_reserve_noble') {
    return (
      <div className="modal-backdrop">
        <div className="modal-card">
          <div className="modal-header">
            <h3>东方使节 · 预定 1 位贵族</h3>
            <span className="modal-sub">预定后仅你可获得该贵族造访</span>
          </div>
          <div className="choice-row">
            {state.nobles.map((n) => (
              <button
                key={n.id}
                type="button"
                className="choice-tile"
                onClick={() => onAction({ type: 'orient_reserve_noble', nobleId: n.id })}
              >
                <div className="choice-tile__pts">+{n.points}分</div>
                <strong>{n.name}</strong>
                <small>{n.title}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step.type === 'trading_post_bonus_gem') {
    const colors: GemColor[] = GEM_COLORS.filter(
      (c) => c !== step.forbiddenColor && state.bank[c] > 0
    );
    return (
      <div className="modal-backdrop">
        <div className="modal-card">
          <div className="modal-header">
            <h3>贸易站特权 · 免费拿取 1 枚宝石</h3>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => onAction({ type: 'trading_post_skip_gem' })}
            >
              跳过
            </button>
          </div>
          <div className="color-pick-row">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                className="color-pick-btn"
                onClick={() => onAction({ type: 'trading_post_bonus_gem', color: c })}
              >
                <GemIcon color={c} size={30} />
                <span>{GEM_LABELS_ZH[c]}</span>
                <small>余 {state.bank[c]}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step.type === 'stronghold_action') {
    const boardCards = getAllBoardCards(state);
    const ownStrongholdCards = boardCards.filter(
      (c) => state.strongholds[c.id]?.playerId === player.id
    );
    const enemyStrongholdCards = boardCards.filter(
      (c) => state.strongholds[c.id] && state.strongholds[c.id].playerId !== player.id
    );
    const placeableCards = boardCards.filter((c) => {
      const sh = state.strongholds[c.id];
      return (!sh || sh.playerId === player.id) && c.id !== moveFromCardId;
    });

    const mustMoveInsteadOfPlace = player.strongholdsRemaining <= 0;

    return (
      <div className="modal-backdrop">
        <div className="modal-card modal-card--wide">
          <div className="modal-header">
            <h3>要塞行动（手中剩余 {player.strongholdsRemaining}/3 座）</h3>
            <span className="modal-sub">
              选择建造/移动己方要塞（满 3 座可触发突袭购卡），或摧毁对手 1 座要塞
            </span>
          </div>

          {enemyStrongholdCards.length > 0 && (
            <div className="sh-section">
              <h4>摧毁对手要塞</h4>
              <div className="free-card-row free-card-row--compact">
                {enemyStrongholdCards.map((card) => {
                  const sh = state.strongholds[card.id];
                  const ownerIdx = state.players.findIndex((p) => p.id === sh.playerId);
                  return (
                    <CardView
                      key={card.id}
                      card={card}
                      canAfford={false}
                      compact
                      stronghold={sh}
                      strongholdOwnerIndex={ownerIdx}
                      highlightMode="stronghold"
                      onClick={() => onAction({ type: 'stronghold_remove', targetCardId: card.id })}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {(player.strongholdsRemaining > 0 || ownStrongholdCards.length > 0) && (
            <div className="sh-section">
              <div className="sh-section__head">
                <h4>
                  {moveFromCardId
                    ? '选择移动目标卡牌'
                    : mustMoveInsteadOfPlace
                      ? '手中无余塔：请先点击 1 张己方要塞卡进行移动'
                      : '点击任意可建卡牌放置 1 座要塞'}
                </h4>
                {ownStrongholdCards.length > 0 && !mustMoveInsteadOfPlace && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--xs"
                    onClick={() => setMoveFromCardId((prev) => (prev ? undefined : ownStrongholdCards[0].id))}
                  >
                    {moveFromCardId ? '改为从手牌新建' : '改为移动已有要塞'}
                  </button>
                )}
              </div>

              {mustMoveInsteadOfPlace && !moveFromCardId ? (
                <div className="free-card-row free-card-row--compact">
                  {ownStrongholdCards.map((card) => {
                    const sh = state.strongholds[card.id];
                    return (
                      <CardView
                        key={card.id}
                        card={card}
                        canAfford={false}
                        compact
                        stronghold={sh}
                        strongholdOwnerIndex={state.currentPlayerIndex}
                        highlightMode="free"
                        onClick={() => setMoveFromCardId(card.id)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="free-card-row free-card-row--compact">
                  {placeableCards.map((card) => {
                    const sh = state.strongholds[card.id];
                    return (
                      <CardView
                        key={card.id}
                        card={card}
                        canAfford={false}
                        compact
                        stronghold={sh}
                        strongholdOwnerIndex={state.currentPlayerIndex}
                        highlightMode="free"
                        onClick={() => {
                          onAction({
                            type: 'stronghold_place',
                            targetCardId: card.id,
                            fromCardId: moveFromCardId,
                          });
                          setMoveFromCardId(undefined);
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {placeableCards.length === 0 && enemyStrongholdCards.length === 0 && (
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn--gold"
                onClick={() => onAction({ type: 'stronghold_skip' })}
              >
                跳过要塞步骤
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step.type === 'stronghold_conquest_buy') {
    const found = findBoardCard(state, step.cardId);
    const seatColor = PLAYER_COLORS[state.currentPlayerIndex % PLAYER_COLORS.length];
    return (
      <div className="modal-backdrop">
        <div className="modal-card">
          <div className="modal-header">
            <h3 style={{ color: seatColor }}>三塔合围 · 要塞突袭！</h3>
            <span className="modal-sub">你已在此卡叠满 3 座要塞，是否立刻额外购买该卡？</span>
          </div>
          {found && (
            <div className="conquest-preview">
              <CardView
                card={found.card}
                canAfford
                stronghold={state.strongholds[found.card.id]}
                strongholdOwnerIndex={state.currentPlayerIndex}
              />
            </div>
          )}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => onAction({ type: 'stronghold_conquest_buy', accept: false })}
            >
              暂不购买
            </button>
            <button
              type="button"
              className="btn btn--gold"
              onClick={() => onAction({ type: 'stronghold_conquest_buy', accept: true })}
            >
              立即突袭购买！
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
