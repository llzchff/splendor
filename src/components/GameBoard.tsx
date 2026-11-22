import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Crown,
  Home,
  Music,
  ScrollText,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ART_BG, ART_DECK_BACK } from '../art/assets';
import { soundEngine } from '../audio/sound';
import { computePayment, emptyGemCounts, getPlayerBonuses, getTotalTokens } from '../engine/payment';
import { getPlayerPoints } from '../engine/rules';
import {
  Card,
  GEM_COLORS,
  GEM_LABELS_ZH,
  GameAction,
  GameState,
  GemColor,
  GemCounts,
  PlayerState,
  TOKEN_COLORS,
  Tier,
} from '../engine/types';
import { AnimationLayer, BannerToastEffect } from './AnimationLayer';
import { CardView } from './CardView';
import { chipBox, collectRects, dealCard, flipMove, Flight, FxLayer, FxRect, pulse } from './FxLayer';
import { NobleCityStrip } from './NobleCityStrip';
import { PendingActionModal } from './PendingActionModal';
import { ActivePlayerDock, ActivePlayerPortrait, OpponentPortrait } from './PlayerPanel';
import { TokenBank } from './TokenBank';
import { TradingPostDrawer } from './TradingPostDrawer';

interface GameBoardProps {
  state: GameState;
  localPlayerId?: string;
  aiThinking: boolean;
  roomCode?: string;
  onAction: (action: GameAction) => void;
  onExit: () => void;
  onOpenRules: () => void;
}

const TIER_ROMAN: Record<Tier, string> = { 3: 'III', 2: 'II', 1: 'I' };

function findCardInState(s: GameState, id: string): Card | null {
  for (const tier of [1, 2, 3] as Tier[]) {
    const row = s.tiers[tier];
    for (const c of [...row.baseSlots, ...row.orientSlots]) if (c && c.id === id) return c;
  }
  for (const p of s.players) {
    const r = p.reserved.find((c) => c.id === id);
    if (r) return r;
    const o = p.cards.find((c) => c.card.id === id);
    if (o) return o.card;
    const g = p.goldSatchels.find((c) => c.id === id);
    if (g) return g;
  }
  return null;
}

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
    | { kind: 'opponent'; player: PlayerState }
    | null
  >(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showTradingPosts, setShowTradingPosts] = useState(false);
  const [muted, setMuted] = useState(() => soundEngine.isMuted());
  const [bgmOn, setBgmOn] = useState(() => soundEngine.isBgmEnabled());

  const [flights, setFlights] = useState<Flight[]>([]);
  const [banner, setBanner] = useState<BannerToastEffect | null>(null);
  const prevStateRef = useRef<GameState | null>(null);
  const rectCacheRef = useRef<Map<string, FxRect>>(new Map());
  const fxIdRef = useRef(1);
  const screenRef = useRef<HTMLDivElement>(null);
  const removeFlight = useCallback((id: number) => {
    setFlights((cur) => cur.filter((f) => f.id !== id));
  }, []);

  const activePlayer = state.players[state.currentPlayerIndex];
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

  /**
   * Steam-style motion director. Runs after every commit, measures where every tracked
   * element ([data-fx]) sits now vs. last commit, and when the game state changed it
   * choreographs: opening deal, card flights to buyers, flip-in refills, chip arcs,
   * noble visits and landing pulses.
   */
  useLayoutEffect(() => {
    const root = screenRef.current;
    if (!root) return;
    const cur = collectRects(root);
    const prevRects = rectCacheRef.current;
    rectCacheRef.current = cur;

    const prev = prevStateRef.current;
    if (prev === state) return;
    prevStateRef.current = state;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    // ---- Opening deal: every face-up card flies out of its deck and flips ----
    if (!prev) {
      let i = 0;
      for (const tier of [3, 2, 1] as Tier[]) {
        const row = state.tiers[tier];
        for (const c of [...row.baseSlots, ...row.orientSlots]) {
          if (!c) continue;
          const rect = cur.get(`card:${c.id}`);
          if (rect) dealCard(root, c.id, cur.get(`deck:${tier}:${c.isOrient ? 'o' : 'b'}`), rect, 150 + i * 75);
          i++;
        }
      }
      return;
    }

    const spawned: Flight[] = [];
    const resolveTarget = (idx: number, color?: string | null): [string, FxRect] | null => {
      const keys = idx === dockSeatIndex ? [`tray:${color ?? 'gold'}`, `seat:${idx}`] : [`seat:${idx}`];
      for (const k of keys) {
        const r = cur.get(k);
        if (r) return [k, r];
      }
      return null;
    };

    // ---- Chips arc between the bank and players, flipping in the air ----
    let chipDelay = 0;
    state.players.forEach((p, idx) => {
      const oldP = prev.players[idx];
      if (!oldP) return;
      for (const color of TOKEN_COLORS) {
        const diff = p.tokens[color] - oldP.tokens[color];
        if (diff === 0) continue;
        const bank = cur.get(`bank:${color}`);
        const tgt = resolveTarget(idx, color);
        if (!bank || !tgt) continue;
        const n = Math.min(Math.abs(diff), 4);
        for (let k = 0; k < n; k++) {
          spawned.push({
            id: fxIdRef.current++,
            kind: 'chip',
            color,
            from: chipBox(diff > 0 ? bank : tgt[1]),
            to: chipBox(diff > 0 ? tgt[1] : bank),
            delay: chipDelay,
          });
          chipDelay += 85;
        }
        pulse(root, diff > 0 ? tgt[0] : `bank:${color}`, chipDelay + 560);
      }
    });

    // ---- Cards that left the table / hand fly to whoever took them ----
    for (const [key, rect] of prevRects) {
      if (!key.startsWith('card:') || cur.has(key)) continue;
      const id = key.slice(5);
      const card = findCardInState(prev, id);
      if (!card) continue;
      state.players.forEach((p, idx) => {
        const oldP = prev.players[idx];
        if (!oldP) return;
        const owned = p.cards.find((o) => o.card.id === id);
        const bought =
          (owned && !oldP.cards.some((o) => o.card.id === id)) ||
          (p.goldSatchels.some((c) => c.id === id) && !oldP.goldSatchels.some((c) => c.id === id));
        const reservedNow = p.reserved.some((c) => c.id === id) && !oldP.reserved.some((c) => c.id === id);
        if (!bought && !reservedNow) return;
        const tgt = bought
          ? resolveTarget(idx, card.bonus ?? owned?.attachedColor ?? null)
          : resolveTarget(idx === dockSeatIndex ? -1 : idx);
        const target = tgt ?? (cur.get(`seat:${idx}`) ? ([`seat:${idx}`, cur.get(`seat:${idx}`)!] as [string, FxRect]) : null);
        if (!target) return;
        spawned.push({ id: fxIdRef.current++, kind: 'card', card, from: rect, to: target[1], delay: 100 });
        pulse(root, target[0], 100 + 760);
      });
    }

    // ---- Opponents reserving blind from a deck: a face-down card flies to them ----
    state.players.forEach((p, idx) => {
      if (idx === dockSeatIndex) return;
      const oldP = prev.players[idx];
      if (!oldP) return;
      for (const c of p.reserved) {
        if (oldP.reserved.some((o) => o.id === c.id) || prevRects.has(`card:${c.id}`)) continue;
        const deck = cur.get(`deck:${c.tier}:${c.isOrient ? 'o' : 'b'}`);
        const seat = cur.get(`seat:${idx}`);
        if (!deck || !seat) continue;
        spawned.push({ id: fxIdRef.current++, kind: 'cardback', tier: c.tier, orient: c.isOrient, from: deck, to: seat, delay: 80 });
        pulse(root, `seat:${idx}`, 860);
      }
    });

    // ---- Cards that moved (board -> my hand) glide; brand-new cards are dealt ----
    for (const [key, rect] of cur) {
      if (!key.startsWith('card:')) continue;
      const el = root.querySelector<HTMLElement>(`[data-fx="${key}"]`);
      if (!el) continue;
      const old = prevRects.get(key);
      if (old) {
        if (Math.abs(old.x - rect.x) + Math.abs(old.y - rect.y) > 6) flipMove(el, old, rect);
      } else {
        const card = findCardInState(state, key.slice(5));
        if (card) dealCard(root, card.id, cur.get(`deck:${card.tier}:${card.isOrient ? 'o' : 'b'}`), rect, 620);
      }
    }

    // ---- Nobles visit: the tile flies onto the player's portrait ----
    state.players.forEach((p, idx) => {
      const oldP = prev.players[idx];
      if (!oldP) return;
      for (const n of p.nobles) {
        if (oldP.nobles.some((o) => o.id === n.id)) continue;
        const from = prevRects.get(`noble:${n.id}`);
        const seat = cur.get(`seat:${idx}`);
        if (from && seat) {
          spawned.push({ id: fxIdRef.current++, kind: 'noble', noble: n, from, to: seat, delay: 900 });
          pulse(root, `seat:${idx}`, 900 + 950);
        }
        soundEngine.playNobleOrCity();
        setBanner({
          id: fxIdRef.current++,
          title: `贵族【${n.name}】慕名造访！`,
          subtitle: `${p.name} 获得 +${n.points} 威望分`,
          kind: 'noble',
        });
      }

      if (p.claimedCity && !oldP.claimedCity) {
        soundEngine.playNobleOrCity();
        setBanner({
          id: fxIdRef.current++,
          title: `${p.name} 占领名城【${p.claimedCity.name}】！`,
          subtitle: '最终回合已触发',
          kind: 'noble',
        });
      }
    });

    if (state.finalRoundTriggered && !prev.finalRoundTriggered && !state.config.expansions.cities) {
      setBanner({
        id: fxIdRef.current++,
        title: '达到目标威望 · 最终回合开始！',
        subtitle: '本轮所有玩家完成等量回合后结算胜负',
        kind: 'final',
      });
    }

    if (spawned.length > 0) setFlights((curF) => [...curF.slice(-24), ...spawned]);
  });

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 2600);
    return () => clearTimeout(t);
  }, [banner]);

  // Gyroscope / pointer parallax: gently tilts the 3D tabletop so it feels physical
  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let baseA: number | null = null;
    let baseB: number | null = null;
    const apply = () => {
      raf = 0;
      el.style.setProperty('--tilt-x', `${tx.toFixed(2)}deg`);
      el.style.setProperty('--tilt-y', `${ty.toFixed(2)}deg`);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      const landscape = window.innerWidth > window.innerHeight;
      const a = landscape ? e.beta : e.gamma;
      const b = landscape ? e.gamma : e.beta;
      if (baseA === null || baseB === null) {
        baseA = a;
        baseB = b;
      }
      // Slowly re-center so the board always settles back to neutral
      baseA += (a - baseA) * 0.02;
      baseB += (b - baseB) * 0.02;
      tx = clamp((a - baseA) / 6, -3, 3);
      ty = clamp((b - baseB) / 8, -2, 2);
      schedule();
    };
    const finePointer = window.matchMedia?.('(pointer: fine)').matches;
    const onPointer = (e: PointerEvent) => {
      tx = ((e.clientX / window.innerWidth) - 0.5) * 4;
      ty = -((e.clientY / window.innerHeight) - 0.5) * 3;
      schedule();
    };
    window.addEventListener('deviceorientation', onOrient);
    if (finePointer) window.addEventListener('pointermove', onPointer);
    return () => {
      window.removeEventListener('deviceorientation', onOrient);
      window.removeEventListener('pointermove', onPointer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

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

  const toggleBgm = () => {
    const next = !bgmOn;
    setBgmOn(next);
    soundEngine.setBgmEnabled(next);
  };

  const handleSelectGem = (color: GemColor) => {
    if (!canInteractMain) return;
    setInspectTarget(null);
    setSelectedGems((prev) => {
      const cur = prev[color];
      const total = GEM_COLORS.reduce((s, c) => s + prev[c], 0);
      const distinctPicked = GEM_COLORS.filter((c) => prev[c] > 0);

      if (cur === 2) {
        soundEngine.playGemSelect();
        return { ...prev, [color]: 0 };
      }

      if (cur === 1) {
        soundEngine.playGemSelect();
        if (distinctPicked.length === 1 && state.bank[color] >= 4) {
          return { ...prev, [color]: 2 };
        }
        return { ...prev, [color]: 0 };
      }

      if (state.bank[color] <= 0) return prev;
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
  const dockBonuses = useMemo(() => getPlayerBonuses(dockPlayer), [dockPlayer]);

  return (
    <div
      ref={screenRef}
      className="steam-table-screen"
      style={{
        backgroundImage: `radial-gradient(ellipse at 52% 45%, rgba(78, 52, 74, 0.42) 0%, rgba(28, 20, 32, 0.72) 68%, rgba(12, 9, 14, 0.88) 100%), url(${ART_BG.table})`,
      }}
    >
      {/* Left Sculpted Marble Column: Opponent Portraits (Top) + Self Portrait (Bottom) */}
      <aside className="steam-marble-rail">
        <div className="steam-opponents-stack">
          {opponents.map(({ player, seatIndex }) => (
            <OpponentPortrait
              key={player.id}
              player={player}
              seatIndex={seatIndex}
              isCurrentTurn={seatIndex === state.currentPlayerIndex}
              strongholdsEnabled={state.config.expansions.strongholds}
              tradingPostsEnabled={state.config.expansions.tradingPosts}
              onInspect={() => {
                soundEngine.playGemSelect();
                setInspectTarget({ kind: 'opponent', player });
              }}
            />
          ))}
        </div>

        <ActivePlayerPortrait
          player={dockPlayer}
          seatIndex={dockSeatIndex}
          isMyTurn={isLocalPlayersTurn}
          strongholdsEnabled={state.config.expansions.strongholds}
          tradingPostsEnabled={state.config.expansions.tradingPosts}
          onOpenTradingPosts={() => setShowTradingPosts(true)}
        />
      </aside>

      {/* Main Velvet Tabletop Playfield: 3D Slanted Decks + Portrait Cards + Floating Poker Chips + Vertical Nobles */}
      <main
        className={`steam-playfield ${state.config.expansions.orient ? 'steam-playfield--orient' : ''}`}
      >
        {/* Subtle floating round / AI thinking whisper (zero vertical height consumed!) */}
        <div className="steam-whisper-bar">
          <span className="steam-whisper-pill">
            R{state.round}
            {state.config.challenge?.maxTurns ? `/${state.config.challenge.maxTurns}` : ''}
          </span>
          {roomCode && <span className="steam-whisper-pill steam-whisper-pill--gold">房 {roomCode}</span>}
          {state.finalRoundTriggered && (
            <span className="steam-whisper-pill steam-whisper-pill--final">终局回合</span>
          )}
          {aiThinking && (
            <span className="steam-whisper-pill steam-whisper-pill--ai">
              <Sparkles size={11} className="spin-slow" />
              {activePlayer.name} 思考中…
            </span>
          )}
        </div>

        {/* Center Cards Matrix (3 Rows: III, II, I) */}
        <section className="steam-cards-stage" aria-label="发展卡牌桌">
          {([3, 2, 1] as Tier[]).map((tier) => {
            const row = state.tiers[tier];
            return (
              <div key={tier} className="steam-tier-row">
                {/* Steam-Exact 3D Slanted Deck Pile in Recessed Gold Slot */}
                <button
                  type="button"
                  disabled={
                    !canInteractMain ||
                    forbidReserve ||
                    row.baseDeck.length === 0 ||
                    activePlayer.reserved.length >= 3
                  }
                  onClick={() => setInspectTarget({ kind: 'deck', tier, isOrient: false })}
                  data-fx={`deck:${tier}:b`}
                  className={`steam-deck-slot steam-deck-slot--t${tier}`}
                  title={`盲抽预定 ${tier} 级牌堆（余 ${row.baseDeck.length} 张）`}
                >
                  <div className="steam-deck-3d">
                    <img src={ART_DECK_BACK[tier]} alt="" draggable={false} />
                    <span className="steam-deck-3d__roman">{TIER_ROMAN[tier]}</span>
                    <span className="steam-deck-3d__cnt">{row.baseDeck.length}</span>
                  </div>
                </button>

                {/* 4 Portrait-Proportioned Base Cards */}
                {row.baseSlots.map((card, idx) =>
                  card ? (
                    <CardView
                      key={card.id}
                      trackFx
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

                {/* Orient Expansion: 2 Crimson-Gold Cards + Slanted Orient Deck */}
                {state.config.expansions.orient && (
                  <>
                    <div className="tier-divider" />
                    {row.orientSlots.map((card, idx) =>
                      card ? (
                        <CardView
                          key={card.id}
                          trackFx
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
                        <div key={`empty-o-${tier}-${idx}`} className="card-slot-empty" />
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
                      data-fx={`deck:${tier}:o`}
                      className="steam-deck-slot steam-deck-slot--orient"
                      title={`盲抽东方 ${tier} 级牌堆（余 ${row.orientDeck.length} 张）`}
                    >
                      <div className="steam-deck-3d">
                        <img src={ART_DECK_BACK.orient} alt="" draggable={false} />
                        <span className="steam-deck-3d__roman">东{TIER_ROMAN[tier]}</span>
                        <span className="steam-deck-3d__cnt">{row.orientDeck.length}</span>
                      </div>
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </section>

        {/* Column 4: Floating 3D Stacked Poker-Chip Bank Directly on Velvet */}
        <TokenBank
          bank={state.bank}
          selectedGems={selectedGems}
          disabled={!canInteractMain}
          onSelectGem={handleSelectGem}
          onConfirmTake={handleConfirmTake}
          onClearSelection={() => setSelectedGems(emptyGemCounts())}
          canConfirmTake={canConfirmTake}
          takeHint=""
        />

        {/* Column 5 (Far Right): Steam-Exact Vertical Column of Square Noble Portraits / Cities */}
        <NobleCityStrip
          citiesMode={state.config.expansions.cities}
          nobles={state.nobles}
          cities={state.cities}
          activePlayer={dockPlayer}
        />

        {/* Bottom Sculpted Marble & Gold Player Resource Tray */}
        <ActivePlayerDock
          player={dockPlayer}
          isMyTurn={isLocalPlayersTurn}
          forbidTier3={forbidTier3}
          onClickReserved={(card) => {
            soundEngine.playGemSelect();
            setInspectTarget({ kind: 'reserved', card });
          }}
        />
      </main>

      {/* Steam-Exact Top-Right Navy-Gold Corner Tab & Slide-out Drawer */}
      <div className={`steam-corner-menu ${drawerOpen ? 'steam-corner-menu--open' : ''}`}>
        <button
          type="button"
          className="steam-corner-tab"
          onClick={() => {
            soundEngine.playGemSelect();
            setDrawerOpen((v) => !v);
          }}
          title="菜单与设置"
        >
          {drawerOpen ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>

        {drawerOpen && (
          <div className="steam-corner-drawer">
            <button
              type="button"
              className="steam-drawer-btn"
              onClick={() => {
                setDrawerOpen(false);
                onExit();
              }}
            >
              <Home size={14} /> 返回大厅
            </button>
            {state.config.expansions.tradingPosts && (
              <button
                type="button"
                className="steam-drawer-btn steam-drawer-btn--gold"
                onClick={() => {
                  setDrawerOpen(false);
                  setShowTradingPosts(true);
                }}
              >
                <Crown size={14} /> 贸易站面板
              </button>
            )}
            <button
              type="button"
              className="steam-drawer-btn"
              onClick={() => {
                setDrawerOpen(false);
                setShowLog(true);
              }}
            >
              <ScrollText size={14} /> 对局战报
            </button>
            <button
              type="button"
              className="steam-drawer-btn"
              onClick={() => {
                setDrawerOpen(false);
                onOpenRules();
              }}
            >
              <BookOpen size={14} /> 规则速查
            </button>
            <button type="button" className="steam-drawer-btn" onClick={toggleBgm}>
              <Music size={14} /> 音乐：{bgmOn && !muted ? '开' : '关'}
            </button>
            <button type="button" className="steam-drawer-btn" onClick={toggleMute}>
              {muted ? <VolumeX size={14} /> : <Volume2 size={14} />} 音效：{muted ? '静音' : '开'}
            </button>
          </div>
        )}
      </div>

      {/* Card flights, chip arcs, noble visits + golden event banners */}
      <FxLayer flights={flights} onDone={removeFlight} />
      <AnimationLayer flyingTokens={[]} banner={banner} />

      {/* Luxury Zoomed Card / Deck / Opponent Inspector Modal */}
      {inspectTarget && (
        <div
          className="modal-backdrop modal-backdrop--subtle"
          onClick={() => setInspectTarget(null)}
        >
          <div className="action-sheet action-sheet--luxury" onClick={(e) => e.stopPropagation()}>
            {inspectTarget.kind === 'opponent' ? (
              (() => {
                const opp = inspectTarget.player;
                const ob = getPlayerBonuses(opp);
                return (
                  <div>
                    <h4>
                      {opp.name} · {getPlayerPoints(opp)} 威望分
                    </h4>
                    <p className="action-sheet__desc">
                      持有筹码 {getTotalTokens(opp.tokens)}/10 · 已购发展卡 {opp.cards.length} 张 ·
                      预定卡 {opp.reserved.length}/3 · 贵族 {opp.nobles.length} 位
                    </p>
                    <div className="cost-breakdown">
                      {GEM_COLORS.map((c) => (
                        <span key={c} className="cost-check cost-check--ok">
                          {GEM_LABELS_ZH[c]}：卡+{ob[c]} / 筹{opp.tokens[c]}
                        </span>
                      ))}
                      <span className="cost-check cost-check--ok">黄金：{opp.tokens.gold}</span>
                    </div>
                    <div className="action-sheet__btns">
                      <button
                        type="button"
                        className="btn btn--gold"
                        onClick={() => setInspectTarget(null)}
                      >
                        关闭
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : inspectTarget.kind === 'deck' ? (
              <>
                <h4>
                  盲抽预定 {inspectTarget.isOrient ? '东方 ' : ''}
                  {inspectTarget.tier} 级牌堆顶牌
                </h4>
                <p className="action-sheet__desc">
                  从牌堆顶秘密预定 1 张卡加入手牌
                  {state.bank.gold > 0 && !state.config.challenge?.forbidGold
                    ? '，并立刻获得 1 枚黄金百搭筹码。'
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
                const canBuy =
                  canInteractMain && !blockedByEnemy && !tierForbidden && payment.canAfford;
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
                      zoomed
                    />
                    <div className="action-sheet__details">
                      <h4>
                        {card.tier} 级{card.isOrient ? '东方' : '文艺复兴'}发展卡
                        {card.points > 0 ? ` · ${card.points} 威望` : ''}
                      </h4>
                      <p className="action-sheet__desc">
                        {card.ability === 'double_gold' &&
                          '购买后存入个人黄金袋，下次购卡时可一次性抵 2 枚任意宝石使用后弃置。'}
                        {card.ability === 'wild_satchel' &&
                          '必须绑定到你已拥有的某色发展卡上，永久 +1 该色宝石加成。'}
                        {card.ability === 'double_bonus' &&
                          `永久提供 +2 ${card.bonus ? GEM_LABELS_ZH[card.bonus] : ''} 宝石折扣。`}
                        {card.ability === 'wild_satchel_free_t1' &&
                          '绑定已有颜色 +1 加成，并立刻免费获得场上 1 张 1 级明牌！'}
                        {card.ability === 'reserve_noble' &&
                          '购买后可预定场上一位贵族归自己专属。'}
                        {card.ability === 'free_tier2' &&
                          '购买后立刻免费拿取场上任意 1 张 2 级明牌！'}
                        {card.ability === 'discard_bonuses' &&
                          `献祭你已有的 2 点 ${card.sacrificeColor ? GEM_LABELS_ZH[card.sacrificeColor] : ''} 宝石加成，直接换取 3 威望！`}
                        {!card.ability &&
                          `永久提供 +1 ${card.bonus ? GEM_LABELS_ZH[card.bonus] : ''} 宝石折扣，助力后续购卡与贵族造访。`}
                      </p>

                      {card.ability !== 'discard_bonuses' && (
                        <div className="cost-breakdown">
                          {GEM_COLORS.filter((c) => card.cost[c] > 0).map((c) => {
                            const need = card.cost[c];
                            const have = dockBonuses[c] + dockPlayer.tokens[c];
                            const met = have >= need;
                            return (
                              <span
                                key={c}
                                className={`cost-check ${met ? 'cost-check--ok' : 'cost-check--short'}`}
                              >
                                {GEM_LABELS_ZH[c]} {Math.min(have, need)}/{need}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {blockedByEnemy && (
                        <p className="action-sheet__warn">此卡被对手要塞封锁，需先摧毁敌方要塞。</p>
                      )}
                      {tierForbidden && (
                        <p className="action-sheet__warn">当前挑战模式禁止购买 3 级发展卡。</p>
                      )}
                      {!payment.canAfford && !tierForbidden && (
                        <p className="action-sheet__warn">
                          {card.ability === 'wild_satchel' ||
                          card.ability === 'wild_satchel_free_t1'
                            ? '资源不足或尚未拥有任意彩色发展卡可绑定。'
                            : card.ability === 'discard_bonuses'
                              ? `需要至少 2 点 ${card.sacrificeColor ? GEM_LABELS_ZH[card.sacrificeColor] : ''} 永久加成方可献祭。`
                              : `还差 ${payment.missingGems} 枚宝石方可购买。`}
                        </p>
                      )}
                      {payment.canAfford &&
                        (payment.tokensSpent.gold > 0 || payment.goldSatchelsUsed > 0) && (
                          <p className="action-sheet__info">
                            自动补足：
                            {payment.goldSatchelsUsed > 0
                              ? ` 东方金袋 ×${payment.goldSatchelsUsed}`
                              : ''}
                            {payment.tokensSpent.gold > 0
                              ? ` 黄金筹码 ×${payment.tokensSpent.gold}`
                              : ''}
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
                            预定
                            {state.bank.gold > 0 && !state.config.challenge?.forbidGold
                              ? ' (+1金)'
                              : ''}
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

      {isLocalPlayersTurn && hasPendingStep && (
        <PendingActionModal state={state} onAction={handleActionWithSound} />
      )}

      {showTradingPosts && (
        <TradingPostDrawer players={state.players} onClose={() => setShowTradingPosts(false)} />
      )}

      {showLog && (
        <div className="modal-backdrop modal-backdrop--subtle" onClick={() => setShowLog(false)}>
          <div className="log-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>对局战报</h3>
              <button
                type="button"
                className="btn btn--ghost btn--xs"
                onClick={() => setShowLog(false)}
              >
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
