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
  X,
} from 'lucide-react';
import { ART_BG, ART_DECK_BACK, ART_GEM_CHIP } from '../art/assets';
import { soundEngine } from '../audio/sound';
import { computePayment, getPlayerBonuses, getTotalTokens } from '../engine/payment';
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
  TokenColor,
} from '../engine/types';
import { AnimationLayer, BannerToastEffect } from './AnimationLayer';
import { CardView } from './CardView';
import {
  chipBox,
  collectRects,
  dealCard,
  drawerChipSize,
  drawerSlot,
  flipMove,
  Flight,
  FxLayer,
  FxRect,
  liftTarget,
  pulse,
} from './FxLayer';
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

type DrawerItem =
  | { key: string; kind: 'chip'; color: TokenColor; delay: number; onRemove?: () => void }
  | { key: string; kind: 'card'; card: Card; delay: number }
  | { key: string; kind: 'back'; tier: Tier; orient: boolean; delay: number };

interface AiDrawer {
  id: number;
  seat: number;
  items: DrawerItem[];
}

type Staged =
  | { phase: 'lift'; source: 'board' | 'reserved'; card: Card; from: FxRect; to: FxRect }
  | { phase: 'commit'; source: 'board' | 'reserved'; card: Card; action: GameAction; slot: FxRect };

interface Pick {
  id: number;
  color: GemColor;
}

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

/** Card lifted out of its slot: flies up from the table, enlarges, carries its buttons. */
const LiftOverlay: React.FC<{ from: FxRect; to: FxRect; children: React.ReactNode }> = ({ from, to, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const dx = from.x + from.w / 2 - (to.x + to.w / 2);
    const dy = from.y + from.h / 2 - (to.y + to.h / 2);
    const a = el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${from.h / to.h})` },
        { transform: 'translate(0px, 0px) scale(1)' },
      ],
      { duration: 430, easing: 'cubic-bezier(.2,.8,.25,1)' }
    );
    return () => a.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div ref={ref} className="lifted-card" style={{ left: to.x, top: to.y, width: to.w, height: to.h }}>
      {children}
    </div>
  );
};

/** Gold-framed capsule that slides out to the right of a portrait (Steam's action drawer). */
const PortraitDrawer: React.FC<{ frame: FxRect; items: DrawerItem[] }> = ({ frame, items }) => {
  const s = drawerChipSize(frame);
  const hasCard = items.some((i) => i.kind !== 'chip');
  const h = (hasCard ? s * 1.35 : s) + 12;
  return (
    <div
      className="portrait-drawer"
      style={
        {
          left: frame.x + frame.w - 12,
          top: frame.y + frame.h / 2 - h / 2,
          height: h,
          '--s': `${s}px`,
        } as React.CSSProperties
      }
    >
      {items.map((it) => (
        <div
          key={it.key}
          className={`drawer-item drawer-item--${it.kind}`}
          style={{ '--d': `${it.delay}ms` } as React.CSSProperties}
        >
          {it.kind === 'chip' && (
            <button
              type="button"
              className="drawer-chip"
              disabled={!it.onRemove}
              onClick={it.onRemove}
              title={it.onRemove ? '放回宝石库' : undefined}
            >
              <img src={ART_GEM_CHIP[it.color]} alt="" draggable={false} />
              {it.onRemove && <span className="drawer-chip__x">×</span>}
            </button>
          )}
          {it.kind === 'card' && (
            <div className="drawer-card">
              <CardView card={it.card} canAfford={false} compact />
            </div>
          )}
          {it.kind === 'back' && (
            <img className="drawer-back" src={ART_DECK_BACK[it.orient ? 'orient' : it.tier]} alt="" />
          )}
        </div>
      ))}
    </div>
  );
};

/** Steam's banner-shaped navy & gold button */
const OrnateButton: React.FC<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
  small?: boolean;
}> = ({ label, onClick, disabled, small }) => (
  <button
    type="button"
    className={`ornate-btn ${small ? 'ornate-btn--sm' : ''}`}
    disabled={disabled}
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
  >
    <span className="ornate-btn__face">{label}</span>
  </button>
);

export const GameBoard: React.FC<GameBoardProps> = ({
  state,
  localPlayerId,
  aiThinking,
  roomCode,
  onAction,
  onExit,
  onOpenRules,
}) => {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [staged, setStaged] = useState<Staged | null>(null);
  const [inspectTarget, setInspectTarget] = useState<
    { kind: 'deck'; tier: Tier; isOrient: boolean } | { kind: 'opponent'; player: PlayerState } | null
  >(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showTradingPosts, setShowTradingPosts] = useState(false);
  const [muted, setMuted] = useState(() => soundEngine.isMuted());
  const [bgmOn, setBgmOn] = useState(() => soundEngine.isBgmEnabled());

  const [flights, setFlights] = useState<Flight[]>([]);
  const [banner, setBanner] = useState<BannerToastEffect | null>(null);
  const [aiDrawer, setAiDrawer] = useState<AiDrawer | null>(null);
  const [ceremony, setCeremony] = useState<{ id: number; title: string; sub: string } | null>(null);
  const [introNotice, setIntroNotice] = useState<string | null>(null);

  const prevStateRef = useRef<GameState | null>(null);
  const rectCacheRef = useRef<Map<string, FxRect>>(new Map());
  const fxIdRef = useRef(1);
  const screenRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);
  const stagedChipSourcesRef = useRef<Array<{ color: GemColor; rect: FxRect }>>([]);
  const stagedCardSourceRef = useRef<{ id: string; rect: FxRect } | null>(null);
  const pendingReturnRef = useRef<{ id: string; from: FxRect } | null>(null);
  // Re-render once after mount so drawers/overlays can use measured rects
  const [, setMeasured] = useState(0);

  const later = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timersRef.current.forEach((t) => clearTimeout(t)), []);

  const removeFlight = useCallback((id: number) => {
    setFlights((cur) => cur.filter((f) => f.id !== id));
  }, []);
  const addFlights = useCallback((list: Flight[]) => {
    if (list.length) setFlights((cur) => [...cur.slice(-30), ...list]);
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

  const selectedGems: GemCounts = useMemo(() => {
    const g: GemCounts = { white: 0, blue: 0, green: 0, red: 0, black: 0 };
    for (const p of picks) g[p.color] += 1;
    return g;
  }, [picks]);

  // Any real state change (commit, AI move, network update) cancels local staging
  useEffect(() => {
    setStaged(null);
    setPicks([]);
  }, [state]);

  // Opening notice: "You are not the first player / you are in position #N"
  useEffect(() => {
    setMeasured((n) => n + 1);
    const fresh = state.round === 1 && state.players.every((p) => p.turnsTaken === 0) && state.log.length <= 1;
    if (!fresh) return;
    setIntroNotice(
      dockSeatIndex === 0 ? '你是先手玩家，由你率先行动。' : `你不是先手玩家，你在第 ${dockSeatIndex + 1} 位行动。`
    );
    later(() => setIntroNotice(null), 3400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Motion director — choreography reverse-engineered frame-by-frame from a full recorded
   * match of the official digital edition (timings measured at 15fps).
   */
  useLayoutEffect(() => {
    const root = screenRef.current;
    if (!root) return;
    const cur = collectRects(root);
    const prevRects = rectCacheRef.current;
    rectCacheRef.current = cur;

    // Cancelled lift / undo: the card glides back into its slot
    const ret = pendingReturnRef.current;
    if (ret) {
      pendingReturnRef.current = null;
      const el = root.querySelector<HTMLElement>(`[data-fx="card:${ret.id}"]`);
      const to = cur.get(`card:${ret.id}`);
      if (el && to) flipMove(el, ret.from, to, 380);
    }

    const prev = prevStateRef.current;
    if (prev === state) return;
    prevStateRef.current = state;
    const stagedChips = stagedChipSourcesRef.current;
    stagedChipSourcesRef.current = [];
    const stagedCard = stagedCardSourceRef.current;
    stagedCardSourceRef.current = null;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    // ---- Opening: chip stacks drop in colour by colour, nobles slide in, then cards are dealt ----
    if (!prev) {
      (['white', 'blue', 'green', 'red', 'black', 'gold'] as TokenColor[]).forEach((c, i) => {
        root.querySelector<HTMLElement>(`[data-fx="bank:${c}"]`)?.animate(
          [
            { transform: 'translateY(-70vh)', opacity: 0 },
            { transform: 'translateY(6px)', opacity: 1, offset: 0.8 },
            { transform: 'translateY(0px)', opacity: 1 },
          ],
          { duration: 520, delay: 250 + i * 170, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'backwards' }
        );
      });
      root.querySelectorAll<HTMLElement>('[data-fx^="noble:"]').forEach((el, i) => {
        el.animate(
          [
            { transform: 'translateX(45vw)', opacity: 0 },
            { transform: 'translateX(0px)', opacity: 1 },
          ],
          { duration: 560, delay: 300 + i * 170, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' }
        );
      });
      let i = 0;
      for (const tier of [1, 2, 3] as Tier[]) {
        const row = state.tiers[tier];
        for (const c of [...row.baseSlots, ...row.orientSlots]) {
          if (!c) continue;
          const rect = cur.get(`card:${c.id}`);
          if (rect) dealCard(root, c.id, cur.get(`deck:${tier}:${c.isOrient ? 'o' : 'b'}`), rect, 1450 + i * 110);
          i++;
        }
      }
      return;
    }

    const spawned: Flight[] = [];
    const actorIdx = prev.currentPlayerIndex;
    const actorFrame = actorIdx !== dockSeatIndex ? cur.get(`frame:${actorIdx}`) : undefined;
    const aiItems: DrawerItem[] = [];
    const nextAiSlot = (kind: 'chip' | 'card') => (actorFrame ? drawerSlot(actorFrame, aiItems.length, kind) : null);

    const trayTarget = (color: string | null | undefined): [string, FxRect] | null => {
      for (const k of [`tray:${color ?? 'gold'}`, `seat:${dockSeatIndex}`]) {
        const r = cur.get(k);
        if (r) return [k, r];
      }
      return null;
    };

    // ---- Chips ----
    let chipDelay = 0;
    state.players.forEach((p, idx) => {
      const oldP = prev.players[idx];
      if (!oldP) return;
      for (const color of TOKEN_COLORS) {
        const diff = p.tokens[color] - oldP.tokens[color];
        if (diff === 0) continue;
        const bank = cur.get(`bank:${color}`);
        if (!bank) continue;
        const n = Math.min(Math.abs(diff), 4);
        for (let k = 0; k < n; k++) {
          if (diff > 0 && idx === dockSeatIndex) {
            // My chips: from my drawer (if I staged them) or the bank, into the tray slot
            const tgt = trayTarget(color);
            if (!tgt) continue;
            const si = stagedChips.findIndex((sc) => sc.color === color);
            const src = si >= 0 ? stagedChips.splice(si, 1)[0].rect : bank;
            spawned.push({ id: fxIdRef.current++, kind: 'chip', color, from: chipBox(src), to: chipBox(tgt[1]), delay: chipDelay, duration: si >= 0 ? 420 : 640 });
            pulse(root, tgt[0], chipDelay + 520);
          } else if (diff > 0 && idx === actorIdx && actorFrame) {
            // Opponent: chips arc into the drawer sliding out of their portrait
            const slot = nextAiSlot('chip');
            if (!slot) continue;
            aiItems.push({ key: `c${fxIdRef.current}`, kind: 'chip', color, delay: chipDelay + 600 });
            spawned.push({ id: fxIdRef.current++, kind: 'chip', color, from: chipBox(bank), to: slot, delay: chipDelay, keep: true });
          } else if (diff > 0) {
            const seat = cur.get(`frame:${idx}`) ?? cur.get(`seat:${idx}`);
            if (!seat) continue;
            spawned.push({ id: fxIdRef.current++, kind: 'chip', color, from: chipBox(bank), to: chipBox(seat), delay: chipDelay });
          } else {
            // Payment: chips stream back to the bank, colour by colour
            const src = cur.get(idx === dockSeatIndex ? `tray:${color}` : `frame:${idx}`) ?? cur.get(`seat:${idx}`);
            if (!src) continue;
            spawned.push({ id: fxIdRef.current++, kind: 'chip', color, from: chipBox(src), to: chipBox(bank), delay: chipDelay + 150 });
            pulse(root, `bank:${color}`, chipDelay + 750);
          }
          chipDelay += 90;
        }
      }
    });

    // ---- Cards that left the table / hand ----
    for (const [key, rect] of prevRects) {
      if (!key.startsWith('card:') || cur.has(key)) continue;
      const id = key.slice(5);
      const card = findCardInState(prev, id);
      if (!card) continue;
      const src = stagedCard && stagedCard.id === id ? stagedCard.rect : rect;
      state.players.forEach((p, idx) => {
        const oldP = prev.players[idx];
        if (!oldP) return;
        const owned = p.cards.find((o) => o.card.id === id);
        const bought =
          (owned && !oldP.cards.some((o) => o.card.id === id)) ||
          (p.goldSatchels.some((c) => c.id === id) && !oldP.goldSatchels.some((c) => c.id === id));
        const reservedNow = p.reserved.some((c) => c.id === id) && !oldP.reserved.some((c) => c.id === id);
        if (!bought && !reservedNow) return;
        if (idx === dockSeatIndex) {
          const tgt = trayTarget(card.bonus ?? owned?.attachedColor ?? null);
          if (!tgt) return;
          spawned.push({ id: fxIdRef.current++, kind: 'card', card, from: src, to: tgt[1], delay: 60, duration: stagedCard ? 520 : 780 });
          pulse(root, tgt[0], stagedCard ? 560 : 820);
        } else if (idx === actorIdx && actorFrame) {
          const slot = nextAiSlot('card');
          if (!slot) return;
          aiItems.push({ key: `k${id}`, kind: 'card', card, delay: 700 });
          spawned.push({ id: fxIdRef.current++, kind: 'card', card, from: src, to: slot, delay: 80, keep: true, duration: 700 });
        } else {
          const seat = cur.get(`frame:${idx}`);
          if (seat) spawned.push({ id: fxIdRef.current++, kind: 'card', card, from: src, to: seat, delay: 80 });
        }
      });
    }

    // ---- Opponent blind reserve: a face-down card leaves the deck for their drawer ----
    if (actorFrame) {
      const p = state.players[actorIdx];
      const oldP = prev.players[actorIdx];
      for (const c of p.reserved) {
        if (oldP.reserved.some((o) => o.id === c.id) || prevRects.has(`card:${c.id}`)) continue;
        const deck = cur.get(`deck:${c.tier}:${c.isOrient ? 'o' : 'b'}`);
        const slot = nextAiSlot('card');
        if (!deck || !slot) continue;
        aiItems.push({ key: `b${c.id}`, kind: 'back', tier: c.tier, orient: c.isOrient, delay: 700 });
        spawned.push({ id: fxIdRef.current++, kind: 'cardback', tier: c.tier, orient: c.isOrient, from: deck, to: slot, delay: 80, keep: true, duration: 700 });
      }
    }

    // ---- Moved cards glide (board -> my hand); new cards are dealt from their deck ----
    for (const [key, rect] of cur) {
      if (!key.startsWith('card:')) continue;
      const el = root.querySelector<HTMLElement>(`[data-fx="${key}"]`);
      if (!el) continue;
      const id = key.slice(5);
      const old = stagedCard && stagedCard.id === id ? stagedCard.rect : prevRects.get(key);
      if (old) {
        if (Math.abs(old.x - rect.x) + Math.abs(old.y - rect.y) > 6) flipMove(el, old, rect);
      } else {
        const card = findCardInState(state, id);
        if (card) dealCard(root, card.id, cur.get(`deck:${card.tier}:${card.isOrient ? 'o' : 'b'}`), rect, 650);
      }
    }

    // ---- Noble ceremony: dim, "Congratulations!", tile held centre stage, then onto the portrait ----
    let ceremonyAt = 900;
    state.players.forEach((p, idx) => {
      const oldP = prev.players[idx];
      if (!oldP) return;
      for (const n of p.nobles) {
        if (oldP.nobles.some((o) => o.id === n.id)) continue;
        const from = prevRects.get(`noble:${n.id}`);
        const to = cur.get(`frame:${idx}`) ?? cur.get(`seat:${idx}`);
        if (from && to) {
          spawned.push({ id: fxIdRef.current++, kind: 'nobleShow', noble: n, from, to, delay: ceremonyAt });
          pulse(root, `seat:${idx}`, ceremonyAt + 2650);
        }
        const at = ceremonyAt;
        later(() => {
          soundEngine.playNobleOrCity();
          setCeremony({ id: fxIdRef.current++, title: '恭喜！', sub: `${n.name} 前来拜访 ${p.name}（+${n.points} 威望）` });
        }, at);
        later(() => setCeremony(null), at + 2700);
        ceremonyAt += 2800;
      }
      if (p.claimedCity && !oldP.claimedCity) {
        soundEngine.playNobleOrCity();
        setBanner({ id: fxIdRef.current++, title: `${p.name} 占领名城【${p.claimedCity.name}】！`, subtitle: '最终回合已触发', kind: 'noble' });
      }
    });

    if (aiItems.length) {
      const id = fxIdRef.current++;
      setAiDrawer({ id, seat: actorIdx, items: aiItems });
      const hold = Math.max(...aiItems.map((i) => i.delay)) + 1150;
      later(() => setAiDrawer((d) => (d && d.id === id ? null : d)), hold);
      later(() => pulse(root, `seat:${actorIdx}`, 0), hold);
    }

    addFlights(spawned);
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
      baseA += (a - baseA) * 0.02;
      baseB += (b - baseB) * 0.02;
      tx = clamp((a - baseA) / 6, -3, 3);
      ty = clamp((b - baseB) / 8, -2, 2);
      schedule();
    };
    const finePointer = window.matchMedia?.('(pointer: fine)').matches;
    const onPointer = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 4;
      ty = -(e.clientY / window.innerHeight - 0.5) * 3;
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
    state.phase === 'playing' && !activePlayer.isAI && (!localPlayerId || activePlayer.id === localPlayerId);
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

  /* ---------------- Gem picking: chips fly into my drawer ---------------- */
  const flyPick = (color: GemColor, slotIdx: number, toBank: boolean) => {
    const bank = rectCacheRef.current.get(`bank:${color}`);
    const frame = rectCacheRef.current.get(`frame:${dockSeatIndex}`);
    if (!bank || !frame) return;
    const slot = drawerSlot(frame, slotIdx, 'chip');
    const bankBox = chipBox(bank, slot.w);
    addFlights([
      {
        id: fxIdRef.current++,
        kind: 'chip',
        color,
        mode: 'select',
        from: toBank ? slot : bankBox,
        to: toBank ? bankBox : slot,
        delay: 0,
        duration: toBank ? 480 : 780,
      },
    ]);
  };

  const removePick = (pickId: number) => {
    const idx = picks.findIndex((p) => p.id === pickId);
    if (idx < 0) return;
    soundEngine.playGemSelect();
    flyPick(picks[idx].color, idx, true);
    setPicks(picks.filter((p) => p.id !== pickId));
  };

  const handleSelectGem = (color: GemColor) => {
    if (!canInteractMain || staged) return;
    setInspectTarget(null);
    const countThis = picks.filter((p) => p.color === color).length;
    const distinct = new Set(picks.map((p) => p.color));
    const hasDouble = GEM_COLORS.some((c) => picks.filter((p) => p.color === c).length >= 2);

    if (countThis >= 2) {
      // Tapping a doubled colour returns both
      picks.forEach((p, i) => p.color === color && flyPick(color, i, true));
      setPicks(picks.filter((p) => p.color !== color));
      soundEngine.playGemSelect();
      return;
    }
    if (countThis === 1) {
      if (distinct.size === 1 && picks.length === 1 && state.bank[color] >= 4) {
        flyPick(color, 1, false);
        setPicks([...picks, { id: fxIdRef.current++, color }]);
      } else {
        const idx = picks.findIndex((p) => p.color === color);
        flyPick(color, idx, true);
        setPicks(picks.filter((_, i) => i !== idx));
      }
      soundEngine.playGemSelect();
      return;
    }
    if (state.bank[color] <= 0 || hasDouble || picks.length >= 3) return;
    flyPick(color, picks.length, false);
    setPicks([...picks, { id: fxIdRef.current++, color }]);
    soundEngine.playGemSelect();
  };

  const canConfirmTake = useMemo(() => {
    const entries = GEM_COLORS.filter((c) => selectedGems[c] > 0);
    if (entries.length === 0) return false;
    if (entries.length === 1 && selectedGems[entries[0]] === 2) return state.bank[entries[0]] >= 4;
    const availableCount = GEM_COLORS.filter((c) => state.bank[c] > 0).length;
    return entries.length === Math.min(3, availableCount) && entries.every((c) => selectedGems[c] === 1);
  }, [selectedGems, state.bank]);

  const confirmTake = () => {
    if (!canInteractMain || !canConfirmTake) return;
    const frame = rectCacheRef.current.get(`frame:${dockSeatIndex}`);
    stagedChipSourcesRef.current = frame ? picks.map((p, i) => ({ color: p.color, rect: drawerSlot(frame, i, 'chip') })) : [];
    soundEngine.playGemTake();
    onAction({ type: 'take_gems', gems: selectedGems });
    setPicks([]);
  };

  /* ---------------- Card lift → Purchase / Reserve → End turn ---------------- */
  const liftCard = (source: 'board' | 'reserved', card: Card) => {
    if (staged?.phase === 'commit') return;
    if (staged?.phase === 'lift' && staged.card.id === card.id) return cancelLift();
    const from = rectCacheRef.current.get(`card:${card.id}`);
    if (!from) return;
    if (picks.length) {
      picks.forEach((p, i) => flyPick(p.color, i, true));
      setPicks([]);
    }
    setInspectTarget(null);
    soundEngine.playGemSelect();
    setStaged({ phase: 'lift', source, card, from, to: liftTarget(from) });
  };

  const cancelLift = () => {
    if (staged?.phase === 'lift') pendingReturnRef.current = { id: staged.card.id, from: staged.to };
    setStaged(null);
  };

  const stageCommit = (action: GameAction) => {
    if (!staged || staged.phase !== 'lift') return;
    const frame = rectCacheRef.current.get(`frame:${dockSeatIndex}`);
    if (!frame) {
      setStaged(null);
      handleActionWithSound(action);
      return;
    }
    const slot = drawerSlot(frame, 0, 'card');
    addFlights([{ id: fxIdRef.current++, kind: 'card', card: staged.card, from: staged.to, to: slot, delay: 0, keep: true, duration: 300 }]);
    soundEngine.playReserve();
    setStaged({ phase: 'commit', source: staged.source, card: staged.card, action, slot });
  };

  const commitStaged = () => {
    if (!staged || staged.phase !== 'commit') return;
    stagedCardSourceRef.current = { id: staged.card.id, rect: staged.slot };
    const a = staged.action;
    setStaged(null);
    handleActionWithSound(a);
  };

  const undoStaged = () => {
    if (staged?.phase === 'commit') pendingReturnRef.current = { id: staged.card.id, from: staged.slot };
    setStaged(null);
    soundEngine.playGemSelect();
  };

  const handleActionWithSound = (action: GameAction) => {
    if (action.type === 'buy_card' || action.type === 'stronghold_conquest_buy') soundEngine.playBuyCard();
    else if (action.type === 'reserve_card') soundEngine.playReserve();
    else if (action.type === 'choose_noble' || action.type === 'choose_city') soundEngine.playNobleOrCity();
    else if (action.type === 'stronghold_place' || action.type === 'stronghold_remove') soundEngine.playStronghold();
    else soundEngine.playGemTake();
    setInspectTarget(null);
    onAction(action);
  };

  const forbidTier3 = Boolean(state.config.challenge?.forbidTier3);
  const forbidReserve = Boolean(state.config.challenge?.forbidReserve);
  const hiddenCardId = staged?.card.id;

  /* ---------------- Drawers ---------------- */
  const dockFrame = rectCacheRef.current.get(`frame:${dockSeatIndex}`);
  const dockItems: DrawerItem[] = [
    ...picks.map<DrawerItem>((p) => ({
      key: `p${p.id}`,
      kind: 'chip',
      color: p.color,
      delay: 740,
      onRemove: () => removePick(p.id),
    })),
    ...(staged?.phase === 'commit'
      ? [{ key: `s${staged.card.id}`, kind: 'card' as const, card: staged.card, delay: 280 }]
      : []),
  ];
  const aiFrame = aiDrawer ? rectCacheRef.current.get(`frame:${aiDrawer.seat}`) : undefined;

  const renderBoardCard = (card: Card) => (
    <CardView
      key={card.id}
      trackFx
      ghost={hiddenCardId === card.id}
      card={card}
      canAfford={!(forbidTier3 && card.tier === 3) && computePayment(dockPlayer, card).canAfford}
      blockedByEnemy={
        state.config.expansions.strongholds &&
        Boolean(state.strongholds[card.id] && state.strongholds[card.id].playerId !== dockPlayer.id)
      }
      stronghold={state.strongholds[card.id]}
      strongholdOwnerIndex={
        state.strongholds[card.id] ? state.players.findIndex((p) => p.id === state.strongholds[card.id].playerId) : 0
      }
      onClick={() => liftCard('board', card)}
    />
  );

  const winner = state.phase === 'finished' && state.winnerIds.includes(dockPlayer.id);

  return (
    <div
      ref={screenRef}
      className="steam-table-screen"
      style={{
        backgroundImage: `radial-gradient(ellipse at 52% 45%, rgba(78, 52, 74, 0.42) 0%, rgba(28, 20, 32, 0.72) 68%, rgba(12, 9, 14, 0.88) 100%), url(${ART_BG.table})`,
      }}
    >
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

      <main className={`steam-playfield ${state.config.expansions.orient ? 'steam-playfield--orient' : ''}`}>
        <div className="steam-whisper-bar">
          <span className="steam-whisper-pill">
            R{state.round}
            {state.config.challenge?.maxTurns ? `/${state.config.challenge.maxTurns}` : ''}
          </span>
          {roomCode && <span className="steam-whisper-pill steam-whisper-pill--gold">房 {roomCode}</span>}
          {aiThinking && (
            <span className="steam-whisper-pill steam-whisper-pill--ai">
              <Sparkles size={11} className="spin-slow" />
              {activePlayer.name} 思考中…
            </span>
          )}
        </div>

        <section className="steam-cards-stage" aria-label="发展卡牌桌">
          {([3, 2, 1] as Tier[]).map((tier) => {
            const row = state.tiers[tier];
            return (
              <div key={tier} className="steam-tier-row">
                <button
                  type="button"
                  disabled={!canInteractMain || forbidReserve || row.baseDeck.length === 0 || activePlayer.reserved.length >= 3}
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

                {row.baseSlots.map((card, idx) =>
                  card ? renderBoardCard(card) : <div key={`empty-b-${tier}-${idx}`} className="card-slot-empty" />
                )}

                {state.config.expansions.orient && (
                  <>
                    <div className="tier-divider" />
                    {row.orientSlots.map((card, idx) =>
                      card ? renderBoardCard(card) : <div key={`empty-o-${tier}-${idx}`} className="card-slot-empty" />
                    )}
                    <button
                      type="button"
                      disabled={!canInteractMain || forbidReserve || row.orientDeck.length === 0 || activePlayer.reserved.length >= 3}
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

        <TokenBank
          bank={state.bank}
          selectedGems={selectedGems}
          disabled={!canInteractMain || Boolean(staged)}
          onSelectGem={handleSelectGem}
        />

        <NobleCityStrip
          citiesMode={state.config.expansions.cities}
          nobles={state.nobles}
          cities={state.cities}
          activePlayer={dockPlayer}
        />

        <ActivePlayerDock
          player={dockPlayer}
          isMyTurn={isLocalPlayersTurn}
          forbidTier3={forbidTier3}
          onClickReserved={(card) => liftCard('reserved', card)}
        />
      </main>

      {/* Portrait drawers (mine: staged picks / staged card; opponent: what they just took) */}
      {dockFrame && dockItems.length > 0 && <PortraitDrawer frame={dockFrame} items={dockItems} />}
      {aiDrawer && aiFrame && <PortraitDrawer key={aiDrawer.id} frame={aiFrame} items={aiDrawer.items} />}

      {/* Take button (centre-bottom) while chips are staged */}
      {picks.length > 0 && !staged && (
        <div className="action-bar">
          <OrnateButton label="拿取" disabled={!canConfirmTake || !canInteractMain} onClick={confirmTake} />
        </div>
      )}

      {/* Lifted card with Purchase / Reserve */}
      {staged?.phase === 'lift' &&
        (() => {
          const card = staged.card;
          const payment = computePayment(dockPlayer, card);
          const blocked =
            staged.source === 'board' &&
            state.config.expansions.strongholds &&
            Boolean(state.strongholds[card.id] && state.strongholds[card.id].playerId !== dockPlayer.id);
          const tierForbidden = forbidTier3 && card.tier === 3;
          const canBuy = canInteractMain && !blocked && !tierForbidden && payment.canAfford;
          const canReserve =
            canInteractMain && staged.source === 'board' && !blocked && !forbidReserve && dockPlayer.reserved.length < 3;
          const note = blocked
            ? '被对手要塞封锁'
            : tierForbidden
              ? '本挑战禁止购买 3 级卡'
              : !payment.canAfford
                ? card.ability === 'discard_bonuses'
                  ? `需 2 点${card.sacrificeColor ? GEM_LABELS_ZH[card.sacrificeColor] : ''}加成`
                  : `还差 ${payment.missingGems} 枚宝石`
                : payment.tokensSpent.gold > 0 || payment.goldSatchelsUsed > 0
                  ? `将使用 ${payment.tokensSpent.gold > 0 ? `黄金×${payment.tokensSpent.gold}` : ''}${payment.goldSatchelsUsed > 0 ? ` 金袋×${payment.goldSatchelsUsed}` : ''}`
                  : null;
          return (
            <>
              <div className="lift-catcher" onClick={cancelLift} />
              <LiftOverlay key={card.id} from={staged.from} to={staged.to}>
                <CardView card={card} canAfford={payment.canAfford && !blocked && !tierForbidden} blockedByEnemy={blocked} onClick={cancelLift} />
                <div className="lifted-card__actions">
                  {note && <div className="lifted-card__note">{note}</div>}
                  <OrnateButton
                    label="购买"
                    disabled={!canBuy}
                    onClick={() => stageCommit({ type: 'buy_card', source: staged.source, cardId: card.id })}
                  />
                </div>
              </LiftOverlay>
              {staged.source === 'board' && (
                <div className="lift-reserve">
                  <OrnateButton
                    small
                    label={`预定${state.bank.gold > 0 && !state.config.challenge?.forbidGold ? ' +金' : ''}`}
                    disabled={!canReserve}
                    onClick={() => stageCommit({ type: 'reserve_card', source: 'board', cardId: card.id })}
                  />
                </div>
              )}
            </>
          );
        })()}

      {/* End turn + undo while a purchase/reservation sits in my drawer */}
      {staged?.phase === 'commit' && (
        <div className="action-bar">
          <OrnateButton label="结束回合" onClick={commitStaged} />
          <button type="button" className="undo-btn" onClick={undoStaged} title="撤销">
            <X size={18} strokeWidth={3} />
          </button>
        </div>
      )}

      {/* Persistent final-round notice, as in the original */}
      {state.finalRoundTriggered && state.phase === 'playing' && !state.config.expansions.cities && (
        <div className="parchment-notice">
          有玩家已达到 <em>{state.config.targetPoints} 威望分</em>，本轮结束后游戏终止。
        </div>
      )}
      {introNotice && <div className="parchment-notice parchment-notice--timed">{introNotice}</div>}

      {/* Noble ceremony dim + title (the tile itself is a nobleShow flight above it) */}
      {ceremony && (
        <div key={ceremony.id} className="ceremony">
          <div className="ceremony__title">{ceremony.title}</div>
          <div className="ceremony__sub">{ceremony.sub}</div>
        </div>
      )}

      {/* Victory splash before the results panel */}
      {state.phase === 'finished' && (
        <div className="victory-splash">
          <div className="victory-splash__plate">
            <span className="victory-splash__brand">璀璨宝石</span>
            <span className="victory-splash__title">{winner ? '胜 利' : '对局结束'}</span>
          </div>
        </div>
      )}

      {/* Top-right corner tab & slide-out menu */}
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
            <button type="button" className="steam-drawer-btn" onClick={() => { setDrawerOpen(false); onExit(); }}>
              <Home size={14} /> 返回大厅
            </button>
            {state.config.expansions.tradingPosts && (
              <button type="button" className="steam-drawer-btn steam-drawer-btn--gold" onClick={() => { setDrawerOpen(false); setShowTradingPosts(true); }}>
                <Crown size={14} /> 贸易站面板
              </button>
            )}
            <button type="button" className="steam-drawer-btn" onClick={() => { setDrawerOpen(false); setShowLog(true); }}>
              <ScrollText size={14} /> 对局战报
            </button>
            <button type="button" className="steam-drawer-btn" onClick={() => { setDrawerOpen(false); onOpenRules(); }}>
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

      <FxLayer flights={flights} onDone={removeFlight} />
      <AnimationLayer flyingTokens={[]} banner={banner} />

      {/* Deck reserve / opponent inspector */}
      {inspectTarget && (
        <div className="modal-backdrop modal-backdrop--subtle" onClick={() => setInspectTarget(null)}>
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
                      持有筹码 {getTotalTokens(opp.tokens)}/10 · 已购发展卡 {opp.cards.length} 张 · 预定卡 {opp.reserved.length}/3 · 贵族 {opp.nobles.length} 位
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
                      <button type="button" className="btn btn--gold" onClick={() => setInspectTarget(null)}>
                        关闭
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <>
                <h4>
                  盲抽预定 {inspectTarget.isOrient ? '东方 ' : ''}
                  {inspectTarget.tier} 级牌堆顶牌
                </h4>
                <p className="action-sheet__desc">
                  从牌堆顶秘密预定 1 张卡加入手牌
                  {state.bank.gold > 0 && !state.config.challenge?.forbidGold ? '，并立刻获得 1 枚黄金百搭筹码。' : '（当前无黄金可领）。'}
                </p>
                <div className="action-sheet__btns">
                  <button type="button" className="btn btn--ghost" onClick={() => setInspectTarget(null)}>
                    取消
                  </button>
                  <button
                    type="button"
                    className="btn btn--gold"
                    disabled={!canInteractMain}
                    onClick={() =>
                      handleActionWithSound({ type: 'reserve_card', source: 'deck', tier: inspectTarget.tier, isOrient: inspectTarget.isOrient })
                    }
                  >
                    确认盲抽预定
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isLocalPlayersTurn && hasPendingStep && <PendingActionModal state={state} onAction={handleActionWithSound} />}

      {showTradingPosts && <TradingPostDrawer players={state.players} onClose={() => setShowTradingPosts(false)} />}

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
