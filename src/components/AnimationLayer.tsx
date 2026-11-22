import React from 'react';
import { ART_GEM_CHIP } from '../art/assets';
import { TokenColor } from '../engine/types';

export interface FlyingTokenEffect {
  id: number;
  color: TokenColor;
  fromX: number; // % of viewport width
  fromY: number; // % of viewport height
  toX: number;
  toY: number;
  delayMs: number;
}

export interface BannerToastEffect {
  id: number;
  title: string;
  subtitle?: string;
  kind: 'noble' | 'buy' | 'expansion' | 'final';
}

interface AnimationLayerProps {
  flyingTokens: FlyingTokenEffect[];
  banner: BannerToastEffect | null;
}

export const AnimationLayer: React.FC<AnimationLayerProps> = ({ flyingTokens, banner }) => {
  return (
    <div className="fx-layer" aria-hidden="true">
      {flyingTokens.map((fx) => (
        <div
          key={fx.id}
          className="fx-flying-chip"
          style={
            {
              '--from-x': `${fx.fromX}vw`,
              '--from-y': `${fx.fromY}vh`,
              '--to-x': `${fx.toX}vw`,
              '--to-y': `${fx.toY}vh`,
              animationDelay: `${fx.delayMs}ms`,
            } as React.CSSProperties
          }
        >
          <img src={ART_GEM_CHIP[fx.color]} alt="" className="fx-flying-chip__img" />
        </div>
      ))}

      {banner && (
        <div key={banner.id} className={`fx-banner fx-banner--${banner.kind}`}>
          <div className="fx-banner__ornament" />
          <div className="fx-banner__text">
            <strong>{banner.title}</strong>
            {banner.subtitle && <span>{banner.subtitle}</span>}
          </div>
          <div className="fx-banner__ornament" />
        </div>
      )}
    </div>
  );
};
