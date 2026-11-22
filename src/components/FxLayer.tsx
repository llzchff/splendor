import React, { useLayoutEffect, useRef } from 'react';
import { ART_DECK_BACK, ART_GEM_CHIP, getNobleArt } from '../art/assets';
import { Card, Noble, Tier, TokenColor } from '../engine/types';
import { CardView } from './CardView';

export interface FxRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface FlightBase {
  id: number;
  from: FxRect;
  to: FxRect;
  delay: number;
  /** Override total duration (ms) */
  duration?: number;
  /** Stay fully visible at the destination instead of fading out */
  keep?: boolean;
}

export type Flight =
  | (FlightBase & { kind: 'card'; card: Card })
  | (FlightBase & { kind: 'cardback'; tier: Tier; orient: boolean })
  | (FlightBase & { kind: 'chip'; color: TokenColor; mode?: 'arc' | 'select' })
  | (FlightBase & { kind: 'noble'; noble: Noble })
  | (FlightBase & { kind: 'nobleShow'; noble: Noble });

const FlightItem: React.FC<{ flight: Flight; onDone: (id: number) => void }> = ({ flight, onDone }) => {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { from, to } = flight;
    const dx = to.x + to.w / 2 - (from.x + from.w / 2);
    const dy = to.y + to.h / 2 - (from.y + from.h / 2);
    const dist = Math.hypot(dx, dy);
    const lift = Math.min(130, 36 + dist * 0.2);
    const s = Math.max(0.16, Math.min(to.w / from.w, to.h / from.h, 1.2));

    let frames: Keyframe[];
    let duration: number;
    let easing = 'cubic-bezier(.45,.05,.35,1)';

    if (flight.kind === 'chip' && flight.mode === 'select') {
      // Steam: picked chip glides face-up, dipping toward the bottom-centre, into the drawer
      duration = flight.duration ?? 780;
      const dip = Math.min(110, 30 + dist * 0.18);
      easing = 'cubic-bezier(.42,0,.38,1)';
      frames = [
        { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 + dip}px) scale(1.18)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 1 },
      ];
    } else if (flight.kind === 'chip') {
      duration = flight.duration ?? 640;
      frames = [
        { transform: 'translate(0px, 0px) rotateX(0deg) scale(0.9)', opacity: 0 },
        { transform: `translate(${dx * 0.1}px, ${dy * 0.1 - lift * 0.4}px) rotateX(70deg) scale(1.1)`, opacity: 1, offset: 0.14 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - lift}px) rotateX(200deg) scale(1.25)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) rotateX(360deg) scale(${flight.keep ? s : 0.9})`, opacity: 1, offset: flight.keep ? 1 : 0.9 },
        ...(flight.keep ? [] : [{ transform: `translate(${dx}px, ${dy - 3}px) rotateX(360deg) scale(0.82)`, opacity: 0 }]),
      ];
    } else if (flight.kind === 'nobleShow') {
      // Steam noble ceremony: lift to centre, hold enlarged under the dim, then fly to the portrait
      duration = flight.duration ?? 2700;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight * 0.5;
      const big = Math.min(3, (window.innerHeight * 0.42) / from.h);
      const mdx = cx - (from.x + from.w / 2);
      const mdy = cy - (from.y + from.h / 2);
      easing = 'ease-in-out';
      frames = [
        { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
        { transform: `translate(${mdx}px, ${mdy}px) scale(${big})`, opacity: 1, offset: 0.15 },
        { transform: `translate(${mdx}px, ${mdy}px) scale(${big})`, opacity: 1, offset: 0.78 },
        { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0.95, offset: 0.95 },
        { transform: `translate(${dx}px, ${dy}px) scale(${s * 0.8})`, opacity: 0 },
      ];
    } else if (flight.keep) {
      duration = flight.duration ?? 620;
      easing = 'cubic-bezier(.4,0,.3,1)';
      frames = [
        { transform: 'translate(0px, 0px) scale(1) rotate(0deg)' },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - lift * 0.5}px) scale(${((1 + s) / 2) * 1.06}) rotate(3deg)`, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(0deg)` },
      ];
    } else {
      duration = flight.duration ?? (flight.kind === 'noble' ? 950 : 780);
      frames = [
        { transform: 'translate(0px, 0px) scale(1) rotate(0deg)', opacity: 1 },
        { transform: 'translate(0px, -16px) scale(1.12) rotate(-3deg)', opacity: 1, offset: 0.18 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - lift}px) scale(${((1 + s) / 2) * 1.05}) rotate(5deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(0deg)`, opacity: 1, offset: 0.88 },
        { transform: `translate(${dx}px, ${dy}px) scale(${s * 0.8}) rotate(0deg)`, opacity: 0 },
      ];
    }

    const anim = el.animate(frames, { duration, delay: flight.delay, easing, fill: 'both' });
    anim.onfinish = () => onDone(flight.id);
    return () => anim.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style: React.CSSProperties = {
    left: flight.from.x,
    top: flight.from.y,
    width: flight.from.w,
    height: flight.from.h,
  };

  return (
    <div ref={ref} className={`fx-flight fx-flight--${flight.kind}`} style={style}>
      {flight.kind === 'card' && <CardView card={flight.card} canAfford={false} />}
      {flight.kind === 'cardback' && (
        <img src={ART_DECK_BACK[flight.orient ? 'orient' : flight.tier]} alt="" className="fx-flight__back" />
      )}
      {flight.kind === 'chip' && <img src={ART_GEM_CHIP[flight.color]} alt="" className="fx-flight__chip" />}
      {(flight.kind === 'noble' || flight.kind === 'nobleShow') && (
        <div className={`fx-flight__noble ${flight.kind === 'nobleShow' ? 'fx-flight__noble--show' : ''}`}>
          <img src={getNobleArt(flight.noble)} alt="" />
          <span>{flight.noble.points}</span>
        </div>
      )}
    </div>
  );
};

export const FxLayer: React.FC<{ flights: Flight[]; onDone: (id: number) => void }> = ({ flights, onDone }) => (
  <div className="fx-layer fx-layer--flights" aria-hidden="true">
    {flights.map((f) => (
      <FlightItem key={f.id} flight={f} onDone={onDone} />
    ))}
  </div>
);

/* ---------------- Geometry helpers ---------------- */

export function collectRects(root: HTMLElement): Map<string, FxRect> {
  const m = new Map<string, FxRect>();
  root.querySelectorAll<HTMLElement>('[data-fx]').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && el.dataset.fx) {
      m.set(el.dataset.fx, { x: r.left, y: r.top, w: r.width, h: r.height });
    }
  });
  return m;
}

export function chipBox(r: FxRect, size = 40): FxRect {
  return { x: r.x + r.w / 2 - size / 2, y: r.y + r.h / 2 - size / 2, w: size, h: size };
}

/** Chip size inside a portrait drawer, derived from the portrait frame height */
export function drawerChipSize(frame: FxRect): number {
  return Math.max(26, Math.min(40, frame.h * 0.5));
}

/** Slot i inside the drawer that slides out to the right of a portrait frame */
export function drawerSlot(frame: FxRect, i: number, kind: 'chip' | 'card' = 'chip'): FxRect {
  const s = drawerChipSize(frame);
  const x = frame.x + frame.w + 6 + i * (s + 6);
  if (kind === 'card') {
    const h = s * 1.35;
    return { x, y: frame.y + frame.h / 2 - h / 2, w: h * 0.74, h };
  }
  return { x, y: frame.y + frame.h / 2 - s / 2, w: s, h: s };
}

/** Where a tapped card is lifted to: enlarged ~1.6x and pulled toward the centre */
export function liftTarget(from: FxRect): FxRect {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const h = Math.min(vh * 0.6, from.h * 1.6);
  const w = h * (from.w / from.h);
  let cx = from.x + from.w / 2;
  cx += (vw * 0.46 - cx) * 0.45;
  const cy = from.y + from.h / 2;
  const y = Math.max(8, Math.min(cy - h / 2, vh - h - 118));
  const x = Math.max(8, Math.min(cx - w / 2, vw - w - 8));
  return { x, y, w, h };
}

/* ---------------- DOM animation helpers ---------------- */

/** Steam deal: card leaves its deck face-up, tilted, sweeps to its slot with a small overshoot. */
export function dealCard(root: HTMLElement, cardId: string, deck: FxRect | undefined, target: FxRect, delay: number): void {
  if (!deck) return;
  const el = root.querySelector<HTMLElement>(`[data-fx="card:${cardId}"]`);
  if (!el) return;
  const dx = deck.x + deck.w / 2 - (target.x + target.w / 2);
  const dy = deck.y + deck.h / 2 - (target.y + target.h / 2);
  const s = Math.max(0.45, Math.min(1, deck.h / target.h));
  el.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(-26deg)`, opacity: 0.85 },
      { transform: `translate(${dx * 0.42}px, ${dy * 0.42 - 22}px) scale(1.06) rotate(-9deg)`, opacity: 1, offset: 0.55 },
      { transform: 'translate(0px, -5px) scale(1.03) rotate(2deg)', opacity: 1, offset: 0.84 },
      { transform: 'translate(0px, 0px) scale(1) rotate(0deg)', opacity: 1 },
    ],
    { duration: 560, delay, easing: 'cubic-bezier(.25,.7,.3,1)', fill: 'backwards' }
  );
}

/** FLIP: element already sits in its new place; animate it from where it used to be. */
export function flipMove(el: HTMLElement, from: FxRect, to: FxRect, duration = 520): void {
  const dx = from.x + from.w / 2 - (to.x + to.w / 2);
  const dy = from.y + from.h / 2 - (to.y + to.h / 2);
  const sx = from.w / to.w;
  const sy = from.h / to.h;
  el.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, zIndex: 30 },
      { transform: 'translate(0px, 0px) scale(1, 1)', zIndex: 30 },
    ],
    { duration, easing: 'cubic-bezier(.3,.7,.2,1)' }
  );
}

/** Small "landing" bounce + glint on the element that received something. */
export function pulse(root: HTMLElement, key: string, delay: number): void {
  const el = root.querySelector<HTMLElement>(`[data-fx="${key}"]`);
  if (!el) return;
  el.animate(
    [
      { transform: 'scale(1)', filter: 'brightness(1)' },
      { transform: 'scale(1.14)', filter: 'brightness(1.55)', offset: 0.35 },
      { transform: 'scale(0.97)', filter: 'brightness(1.1)', offset: 0.7 },
      { transform: 'scale(1)', filter: 'brightness(1)' },
    ],
    { duration: 420, delay, easing: 'ease-out' }
  );
}
