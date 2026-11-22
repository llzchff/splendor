import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Crown,
  Home,
  ScrollText,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { soundEngine } from '../audio/sound';
import { computePayment, emptyGemCounts } from '../engine/payment';
import {
  Card,
  GEM_COLORS,
  GEM_LABELS_ZH,
  GameAction,
  GameState,
  GemColor,
  GemCounts,
  Tier,
} from '../engine/types';
import { CardView } from './CardView';
import { NobleCityStrip } from './NobleCityStrip';
import { PendingActionModal } from './PendingActionModal';
import { ActivePlayerDock, OpponentMiniCard } from './PlayerPanel';
import { TokenBank } from './TokenBank';
import { TradingPostDrawer } from './TradingPostDrawer';

interface GameBoardProps {
  state: GameState;
  /** In multiplayer, locks controls to the local player's seat; undefined in local/AI mode */
  localPlayerId?: string;
  aiThinking: boolean;
  roomCode?: string;
  onAction: (action: GameAction) => void;
  onExit: () => void;
  onOpenRules: () => void;
}

const TIER_ROMAN: Record<Tier, string> = { 3: 'III', 2: 'II', 1: 'I' };

export const GameBoard: React.FC<GameBoardProps> = ({
  state,
  localPlayerId,
  aiThinking,
  roomCode,
  onAction,
  onExit,
  onOpenRules,
}) => {
  const [selectedGems, setSelectedGems] = useState<GemCounts>(emptyGemCounts());
  const [inspectTarget, setInspectTarget] = useState<
    | { kind: 'board'; card: Card }
    | { kind: 'reserved'; card: Card }
    | { kind: 'deck'; tier: Tier; isOrient: boolean }
    | null
  >(null);
  const [showLog, setShowLog] = useState(false);
  const [showTradingPosts, setShowTradingPosts] = useState(false);
  const [muted, setMuted] = useState(() => soundEngine.isMuted());

  const activePlayer = state.players[state.currentPlayerIndex];

  // Determine which seat is shown in the bottom player dock:
  // - Multiplayer: always localPlayerId
  // - Solo vs AI: always human player (seat 0) unless pass-and-play (multiple humans)
  const humanCount = useMemo(() => state.players.filter((p) => !p.isAI).length, [state.players]);
  const dockSeatIndex = useMemo(() => {
    if (localPlayerId) {
      const idx = state.players.findIndex((p) => p.id === localPlayerId);
      if (idx !== -1) return idx;
    }
    if (humanCount === 1) {
      const idx = state.players.findIndex((p) => !p.isAI);
      if (idx !== -1) return idx;
    }
    return state.currentPlayerIndex;
  }, [state.players, state.currentPlayerIndex, localPlayerId, humanCount]);

  const dockPlayer = state.players[dockSeatIndex];
  const isLocalPlayersTurn =
    state.phase === 'playing' &&
    !activePlayer.isAI &&
    (!localPlayerId || activePlayer.id === localPlayerId);

  const hasPendingStep = state.pendingQueue.length > 0;
  const canInteractMain = isLocalPlayersTurn && !hasPendingStep && !aiThinking;

  const opponents = useMemo(
    () =>
      state.players
        .map((p, idx) => ({ player: p, seatIndex: idx }))
        .filter(({ seatIndex }) => seatIndex !== dockSeatIndex),
    [state.players, dockSeatIndex]
  );

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundEngine.setMuted(next);
  };

  // Token selection logic
  const handleSelectGem = (color: GemColor) => {
    if (!canInteractMain) return;
    setInspectTarget(null);
    setSelectedGems((prev) => {
      const cur = prev[color];
      const total = GEM_COLORS.reduce((s, c) => s + prev[c], 0);
      const distinctPicked = GEM_COLORS.filter((c) => prev[c] > 0);

      // Clicking a gem with count 2 clears it
      if (cur === 2) {
        soundEngine.playGemSelect();
        return { ...prev, [color]: 0 };
      }

      // Clicking a gem with count 1:
      // If it's the ONLY selected color and bank >= 4, promote to 2 same! Otherwise deselect.
      if (cur === 1) {
        soundEngine.playGemSelect();
        if (distinctPicked.length === 1 && state.bank[color] >= 4) {
          return { ...prev, [color]: 2 };
        }
        return { ...prev, [color]: 0 };
      }

      // cur === 0: adding a new color
      if (state.bank[color] <= 0) return prev;
      // Cannot add a second color if a color already has 2 selected
      if (distinctPicked.some((c) => prev[c] === 2)) return prev;
      if (total >= 3) return prev;

      soundEngine.playGemSelect();
      return { ...prev, [color]: 1 };
    });
  };

  const canConfirmTake = useMemo(() => {
    const entries = GEM_COLORS.filter((c) => selectedGems[c] > 0);
    if (entries.length === 0) return false;
    if (entries.length === 1 && selectedGems[entries[0]] === 2) {
      return state.bank[entries[0]] >= 4;
    }
    const availableCount = GEM_COLORS.filter((c) => state.bank[c] > 0).length;
    const required = Math.min(3, availableCount);
    return entries.length === required && entries.every((c) => selectedGems[c] === 1);
  }, [selectedGems, state.bank]);

  const takeHint = useMemo(() => {
    const avail = GEM_COLORS.filter((c) => state.bank[c] > 0).length;
    if (avail === 0) return '库空';
    return '选3异色 或 双击同色(≥4)';
  }, [state.bank]);

  const handleConfirmTake = () => {
    if (!canInteractMain || !canConfirmTake) return;
    soundEngine.playGemTake();
    onAction({ type: 'take_gems', gems: selectedGems });
    setSelectedGems(emptyGemCounts());
  };

  const handleActionWithSound = (action: GameAction) => {
    if (action.type === 'buy_card' || action.type === 'stronghold_conquest_buy') {
      soundEngine.playBuyCard();
    } else if (action.type === 'reserve_card') {
      soundEngine.playReserve();
    } else if (action.type === 'choose_noble' || action.type === 'choose_city') {
      soundEngine.playNobleOrCity();
    } else if (action.type === 'stronghold_place' || action.type === 'stronghold_remove') {
      soundEngine.playStronghold();
    } else {
      soundEngine.playGemTake();
    }
    setInspectTarget(null);
    setSelectedGems(emptyGemCounts());
    onAction(action);
  };

  const forbidTier3 = Boolean(state.config.challenge?.forbidTier3);
  const forbidReserve = Boolean(state.config.challenge?.forbidReserve);

  return (
    <div className="game-screen">
      {/* Top Minimal Renaissance HUD Bar */}
      <header className="top-bar">
        <div className="top-bar__left">
          <button type="button" className="icon-btn" onClick={onExit} title="返回主菜单">
            <Home size={16} />
            <span>大厅</span>
          </button>
          <div className="round-pill">
            第 <strong>{state.round}</strong> 轮
            {state.config.challenge?.maxTurns && (
              <span> / 限 {state.config.challenge.maxTurns}</span>
            )}
          </div>
          {state.finalRoundTriggered && <span className="final-round-pill">终局回合！</span>}
          {roomCode && <span className="room-code-pill">房间 {roomCode}</span>}
        </div>

        <div className="top-bar__center">
          {aiThinking ? (
            <span className="status-banner status-banner--ai">
              <Sparkles size={14} className="spin-slow" />
              {activePlayer.name} 正在思考策略…
            </span>
          ) : isLocalPlayersTurn ? (
            <span className="status-banner status-banner--you">
              轮到 <strong>{activePlayer.name}</strong> 行动：拿宝石 / 购卡 / 预定
            </span>
          ) : (
            <span className="status-banner">等待 {activePlayer.name} 行动…</span>
          )}
        </div>

        <div className="top-bar__right">
          {state.config.expansions.tradingPosts && (
            <button
              type="button"
              className="icon-btn icon-btn--gold"
              onClick={() => setShowTradingPosts(true)}
            >
              <Crown size={15} />
              <span>贸易站</span>
            </button>
          )}
          <button type="button" className="icon-btn" onClick={() => setShowLog((v) => !v)}>
            <ScrollText size={15} />
            <span>战报</span>
          </button>
          <button type="button" className="icon-btn" onClick={onOpenRules}>
            <BookOpen size={15} />
            <span>规则</span>
          </button>
          <button type="button" className="icon-btn" onClick={toggleMute} title="音效开关">
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
      </header>

      {/* Main Steam-Inspired 3-Column Landscape Table */}
      <main className="table-layout">
        {/* LEFT COLUMN: Nobles / Cities + Opponents */}
        <aside className="left-rail">
          <NobleCityStrip
            citiesMode={state.config.expansions.cities}
            nobles={state.nobles}
            cities={state.cities}
            activePlayer={dockPlayer}
          />
          <div className="opponents-list">
            {opponents.map(({ player, seatIndex }) => (
              <OpponentMiniCard
                key={player.id}
                player={player}
                seatIndex={seatIndex}
                isCurrentTurn={seatIndex === state.currentPlayerIndex}
                strongholdsEnabled={state.config.expansions.strongholds}
                tradingPostsEnabled={state.config.expansions.tradingPosts}
              />
            ))}
          </div>
        </aside>

        {/* CENTER TABLE: 3 Tiers (III, II, I) x (Deck + 4 Base Cards [+ 2 Orient Cards]) */}
        <section
          className={`card-matrix ${state.config.expansions.orient ? 'card-matrix--orient' : ''}`}
          aria-label="发展卡牌桌"
        >
          {([3, 2, 1] as Tier[]).map((tier) => {
            const row = state.tiers[tier];
            return (
              <div key={tier} className="tier-row">
                {/* Base Deck Back (click to blind reserve) */}
                <button
                  type="button"
                  disabled={!canInteractMain || forbidReserve || row.baseDeck.length === 0 || activePlayer.reserved.length >= 3}
                  onClick={() => setInspectTarget({ kind: 'deck', tier, isOrient: false })}
                  className={`deck-back deck-back--t${tier}`}
                  title={`盲抽预定 ${tier} 级牌堆（余 ${row.baseDeck.length} 张）`}
                >
                  <span className="deck-back__roman">{TIER_ROMAN[tier]}</span>
                  <span className="deck-back__count">{row.baseDeck.length}</span>
                </button>

                {/* 4 Base Face-up Slots */}
                {row.baseSlots.map((card, idx) =>
                  card ? (
                    <CardView
                      key={card.id}
                      card={card}
                      canAfford={
                        !(forbidTier3 && card.tier === 3) &&
                        computePayment(dockPlayer, card).canAfford
                      }
                      blockedByEnemy={
                        state.config.expansions.strongholds &&
                        Boolean(
                          state.strongholds[card.id] &&
                            state.strongholds[card.id].playerId !== dockPlayer.id
                        )
                      }
                      stronghold={state.strongholds[card.id]}
                      strongholdOwnerIndex={
                        state.strongholds[card.id]
                          ? state.players.findIndex(
                              (p) => p.id === state.strongholds[card.id].playerId
                            )
                          : 0
                      }
                      selected={inspectTarget?.kind === 'board' && inspectTarget.card.id === card.id}
                      onClick={() => {
                        soundEngine.playGemSelect();
                        setInspectTarget({ kind: 'board', card });
                      }}
                    />
                  ) : (
                    <div key={`empty-b-${tier}-${idx}`} className="card-slot-empty" />
                  )
                )}

                {/* Orient Expansion: 2 Face-up Slots + Orient Deck */}
                {state.config.expansions.orient && (
                  <>
                    <div className="tier-divider" />
                    {row.orientSlots.map((card, idx) =>
                      card ? (
                        <CardView
                          key={card.id}
                          card={card}
                          canAfford={
                            !(forbidTier3 && card.tier === 3) &&
                            computePayment(dockPlayer, card).canAfford
                          }
                          blockedByEnemy={
                            state.config.expansions.strongholds &&
                            Boolean(
                              state.strongholds[card.id] &&
                                state.strongholds[card.id].playerId !== dockPlayer.id
                            )
                          }
                          stronghold={state.strongholds[card.id]}
                          strongholdOwnerIndex={
                            state.strongholds[card.id]
                              ? state.players.findIndex(
                                  (p) => p.id === state.strongholds[card.id].playerId
                                )
                              : 0
                          }
                          selected={
                            inspectTarget?.kind === 'board' && inspectTarget.card.id === card.id
                          }
                          onClick={() => {
                            soundEngine.playGemSelect();
                            setInspectTarget({ kind: 'board', card });
                          }}
                        />
                      ) : (
                        <div key={`empty-o-${tier}-${idx}`} className="card-slot-empty card-slot-empty--orient" />
                      )
                    )}
                    <button
                      type="button"
                      disabled={
                        !canInteractMain ||
                        forbidReserve ||
                        row.orientDeck.length === 0 ||
                        activePlayer.reserved.length >= 3
                      }
                      onClick={() => setInspectTarget({ kind: 'deck', tier, isOrient: true })}
                      className="deck-back deck-back--orient"
                      title={`盲抽东方 ${tier} 级牌堆（余 ${row.orientDeck.length} 张）`}
                    >
                      <span className="deck-back__roman">东{TIER_ROMAN[tier]}</span>
                      <span className="deck-back__count">{row.orientDeck.length}</span>
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </section>

        {/* RIGHT COLUMN: Vertical Steam-style Gem Supply Chips */}
        <TokenBank
          bank={state.bank}
          selectedGems={selectedGems}
          disabled={!canInteractMain}
          onSelectGem={handleSelectGem}
          onConfirmTake={handleConfirmTake}
          onClearSelection={() => setSelectedGems(emptyGemCounts())}
          canConfirmTake={canConfirmTake}
          takeHint={takeHint}
        />
      </main>

      {/* BOTTOM DOCK: Active / Local Player Resources & Reserved Hand */}
      <ActivePlayerDock
        player={dockPlayer}
        seatIndex={dockSeatIndex}
        isMyTurn={isLocalPlayersTurn}
        strongholdsEnabled={state.config.expansions.strongholds}
        tradingPostsEnabled={state.config.expansions.tradingPosts}
        forbidTier3={forbidTier3}
        onClickReserved={(card) => {
          soundEngine.playGemSelect();
          setInspectTarget({ kind: 'reserved', card });
        }}
        onOpenTradingPosts={() => setShowTradingPosts(true)}
      />

      {/* Contextual Action Popover for Clicked Card / Deck */}
      {inspectTarget && (
        <div className="modal-backdrop modal-backdrop--subtle" onClick={() => setInspectTarget(null)}>
          <div className="action-sheet" onClick={(e) => e.stopPropagation()}>
            {inspectTarget.kind === 'deck' ? (
              <>
                <h4>
                  盲抽预定 {inspectTarget.isOrient ? '东方 ' : ''}
                  {inspectTarget.tier} 级牌堆顶牌
                </h4>
                <p className="action-sheet__desc">
                  从牌堆顶秘密预定 1 张卡加入手牌
                  {state.bank.gold > 0 && !state.config.challenge?.forbidGold
                    ? '，并获得 1 枚黄金百搭筹码。'
                    : '（当前无黄金可领）。'}
                </p>
                <div className="action-sheet__btns">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setInspectTarget(null)}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="btn btn--gold"
                    disabled={!canInteractMain}
                    onClick={() =>
                      handleActionWithSound({
                        type: 'reserve_card',
                        source: 'deck',
                        tier: inspectTarget.tier,
                        isOrient: inspectTarget.isOrient,
                      })
                    }
                  >
                    确认盲抽预定
                  </button>
                </div>
              </>
            ) : (
              (() => {
                const card = inspectTarget.card;
                const payment = computePayment(dockPlayer, card);
                const blockedByEnemy =
                  inspectTarget.kind === 'board' &&
                  state.config.expansions.strongholds &&
                  Boolean(
                    state.strongholds[card.id] &&
                      state.strongholds[card.id].playerId !== dockPlayer.id
                  );
                const tierForbidden = forbidTier3 && card.tier === 3;
                const canBuy = canInteractMain && !blockedByEnemy && !tierForbidden && payment.canAfford;
                const canReserve =
                  canInteractMain &&
                  inspectTarget.kind === 'board' &&
                  !blockedByEnemy &&
                  !forbidReserve &&
                  dockPlayer.reserved.length < 3;

                return (
                  <div className="action-sheet__card-row">
                    <CardView
                      card={card}
                      canAfford={payment.canAfford && !blockedByEnemy && !tierForbidden}
                      blockedByEnemy={blockedByEnemy}
                    />
                    <div className="action-sheet__details">
                      <h4>
                        {card.tier} 级{card.isOrient ? '东方' : '基础'}发展卡
                        {card.points > 0 ? ` · ${card.points} 威望` : ''}
                      </h4>
                      <p className="action-sheet__desc">
                        {card.ability === 'double_gold' && '购买后存入个人黄金袋，下次购卡时可当作 2 枚任意色百搭使用后弃置。'}
                        {card.ability === 'wild_satchel' && '必须绑定到你已拥有的某色发展卡上，永久 +1 该色宝石加成。'}
                        {card.ability === 'double_bonus' && `永久提供 +2 ${card.bonus ? GEM_LABELS_ZH[card.bonus] : ''} 宝石加成。`}
                        {card.ability === 'wild_satchel_free_t1' && '绑定已有颜色 +1 加成，并立刻免费获得场上 1 张 1 级明牌！'}
                        {card.ability === 'reserve_noble' && '购买后可预定场上一位贵族归自己专属。'}
                        {card.ability === 'free_tier2' && '购买后立刻免费拿取场上任意 1 张 2 级明牌！'}
                        {card.ability === 'discard_bonuses' && `献祭你已有的 2 点 ${card.sacrificeColor ? GEM_LABELS_ZH[card.sacrificeColor] : ''} 宝石加成，直接换取 3 威望！`}
                        {!card.ability &&
                          `永久提供 +1 ${card.bonus ? GEM_LABELS_ZH[card.bonus] : ''} 宝石折扣。`}
                      </p>

                      {blockedByEnemy && (
                        <p className="action-sheet__warn">此卡被对手要塞封锁，需先摧毁敌方要塞。</p>
                      )}
                      {tierForbidden && (
                        <p className="action-sheet__warn">当前挑战模式禁止购买 3 级发展卡。</p>
                      )}
                      {!payment.canAfford && !tierForbidden && (
                        <p className="action-sheet__warn">
                          {card.ability === 'wild_satchel' || card.ability === 'wild_satchel_free_t1'
                            ? '资源不足或尚未拥有任意彩色发展卡可绑定。'
                            : card.ability === 'discard_bonuses'
                              ? `需要至少 2 点 ${card.sacrificeColor ? GEM_LABELS_ZH[card.sacrificeColor] : ''} 永久加成方可献祭。`
                              : `还差约 ${payment.missingGems} 枚宝石筹码方可购买。`}
                        </p>
                      )}
                      {payment.canAfford && (payment.tokensSpent.gold > 0 || payment.goldSatchelsUsed > 0) && (
                        <p className="action-sheet__info">
                          本次将自动使用：
                          {payment.goldSatchelsUsed > 0 ? ` 东方金袋 ×${payment.goldSatchelsUsed}` : ''}
                          {payment.tokensSpent.gold > 0 ? ` 黄金筹码 ×${payment.tokensSpent.gold}` : ''}
                        </p>
                      )}

                      <div className="action-sheet__btns">
                        <button
                          type="button"
                          className="btn btn--gold"
                          disabled={!canBuy}
                          onClick={() =>
                            handleActionWithSound({
                              type: 'buy_card',
                              source: inspectTarget.kind,
                              cardId: card.id,
                            })
                          }
                        >
                          购买此卡
                        </button>
                        {inspectTarget.kind === 'board' && (
                          <button
                            type="button"
                            className="btn btn--outline"
                            disabled={!canReserve}
                            onClick={() =>
                              handleActionWithSound({
                                type: 'reserve_card',
                                source: 'board',
                                cardId: card.id,
                              })
                            }
                          >
                            预定{state.bank.gold > 0 && !state.config.challenge?.forbidGold ? ' (+1金)' : ''}
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => setInspectTarget(null)}
                        >
                          关闭
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* Pending Multi-Step Decision Modal (only shown when local player owns the pending step) */}
      {isLocalPlayersTurn && hasPendingStep && (
        <PendingActionModal state={state} onAction={handleActionWithSound} />
      )}

      {/* Trading Posts Board Drawer */}
      {showTradingPosts && (
        <TradingPostDrawer players={state.players} onClose={() => setShowTradingPosts(false)} />
      )}

      {/* Match Log Side Drawer */}
      {showLog && (
        <div className="modal-backdrop modal-backdrop--subtle" onClick={() => setShowLog(false)}>
          <div className="log-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>对局战报</h3>
              <button type="button" className="btn btn--ghost btn--xs" onClick={() => setShowLog(false)}>
                关闭
              </button>
            </div>
            <div className="log-drawer__list">
              {[...state.log].reverse().map((entry) => (
                <div key={entry.id} className={`log-row log-row--${entry.kind}`}>
                  <span className="log-row__round">R{entry.round}</span>
                  <strong>{entry.playerName}</strong>
                  <span>{entry.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
