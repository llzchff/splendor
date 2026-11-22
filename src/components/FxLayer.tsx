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

export type Flight =
  | { id: number; kind: 'card'; card: Card; from: FxRect; to: FxRect; delay: number }
  | { id: number; kind: 'cardback'; tier: Tier; orient: boolean; from: FxRect; to: FxRect; delay: number }
  | { id: number; kind: 'chip'; color: TokenColor; from: FxRect; to: FxRect; delay: number }
  | { id: number; kind: 'noble'; noble: Noble; from: FxRect; to: FxRect; delay: number };

const FlightItem: React.FC<{ flight: Flight; onDone: (id: number) => void }> = ({ flight, onDone }) => {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { from, to } = flight;
    const dx = to.x + to.w / 2 - (from.x + from.w / 2);
    const dy = to.y + to.h / 2 - (from.y + from.h / 2);
    const lift = Math.min(130, 36 + Math.hypot(dx, dy) * 0.2);

    let frames: Keyframe[];
    let duration: number;

    if (flight.kind === 'chip') {
      duration = 640;
      frames = [
        { transform: 'translate(0px, 0px) rotateX(0deg) scale(0.9)', opacity: 0 },
        { transform: `translate(${dx * 0.1}px, ${dy * 0.1 - lift * 0.4}px) rotateX(70deg) scale(1.1)`, opacity: 1, offset: 0.14 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - lift}px) rotateX(200deg) scale(1.25)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) rotateX(360deg) scale(0.9)`, opacity: 1, offset: 0.9 },
        { transform: `translate(${dx}px, ${dy - 3}px) rotateX(360deg) scale(0.82)`, opacity: 0 },
      ];
    } else {
      const s = Math.max(0.16, Math.min(to.w / from.w, to.h / from.h, 1));
      duration = flight.kind === 'noble' ? 950 : 780;
      frames = [
        { transform: 'translate(0px, 0px) scale(1) rotate(0deg)', opacity: 1 },
        { transform: 'translate(0px, -16px) scale(1.12) rotate(-3deg)', opacity: 1, offset: 0.18 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - lift}px) scale(${((1 + s) / 2) * 1.05}) rotate(5deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(0deg)`, opacity: 1, offset: 0.88 },
        { transform: `translate(${dx}px, ${dy}px) scale(${s * 0.8}) rotate(0deg)`, opacity: 0 },
      ];
    }

    const anim = el.animate(frames, {
      duration,
      delay: flight.delay,
      easing: 'cubic-bezier(.45,.05,.35,1)',
      fill: 'both',
    });
    anim.onfinish = () => onDone(flight.id);
    return () => anim.cancel();
    // Each flight animates exactly once on mount
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
      {flight.kind === 'noble' && (
        <div className="fx-flight__noble">
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

/* ---------------- DOM animation helpers (FLIP / deal / pulse) ---------------- */

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

/** Card is dealt face-down from its deck, slides into its slot and flips face-up. */
export function dealCard(root: HTMLElement, cardId: string, deck: FxRect | undefined, target: FxRect, delay: number): void {
  if (!deck) return;
  const el = root.querySelector<HTMLElement>(`[data-fx="card:${cardId}"]`);
  if (!el) return;
  const dx = deck.x + deck.w / 2 - (target.x + target.w / 2);
  const dy = deck.y + deck.h / 2 - (target.y + target.h / 2);
  const s = Math.max(0.3, Math.min(1, deck.h / target.h));
  const timing: KeyframeAnimationOptions = {
    duration: 640,
    delay,
    easing: 'cubic-bezier(.2,.75,.25,1)',
    fill: 'backwards',
  };
  el.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotateY(180deg)` },
      { transform: `translate(${dx * 0.42}px, ${dy * 0.42 - 20}px) scale(${((1 + s) / 2) * 1.08}) rotateY(90deg)`, offset: 0.5 },
      { transform: 'translate(0px, -6px) scale(1.04) rotateY(0deg)', offset: 0.82 },
      { transform: 'translate(0px, 0px) scale(1) rotateY(0deg)' },
    ],
    timing
  );
  el.querySelector<HTMLElement>('.splendor-card__back')?.animate(
    [{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0, offset: 0.501 }, { opacity: 0 }],
    timing
  );
}

/** FLIP: element already sits in its new place; animate it from where it used to be. */
export function flipMove(el: HTMLElement, from: FxRect, to: FxRect): void {
  const dx = from.x + from.w / 2 - (to.x + to.w / 2);
  const dy = from.y + from.h / 2 - (to.y + to.h / 2);
  const sx = from.w / to.w;
  const sy = from.h / to.h;
  el.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, zIndex: 30 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 30}px) scale(${(sx + 1) / 2 * 1.08}, ${(sy + 1) / 2 * 1.08})`, offset: 0.5, zIndex: 30 },
      { transform: 'translate(0px, 0px) scale(1, 1)', zIndex: 30 },
    ],
    { duration: 620, easing: 'cubic-bezier(.3,.7,.2,1)' }
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
