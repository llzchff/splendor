import React from 'react';
import { TokenColor } from '../engine/types';

interface GemIconProps {
  color: TokenColor;
  size?: number;
  className?: string;
}

/**
 * Original faceted Renaissance gem & gold crown SVG icons (zero external bitmap dependencies).
 */
export const GemIcon: React.FC<GemIconProps> = ({ color, size = 24, className }) => {
  switch (color) {
    case 'white':
      // Brilliant-cut Diamond
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
          <defs>
            <linearGradient id="g-white" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="55%" stopColor="#dde8f8" />
              <stop offset="100%" stopColor="#9ab0cf" />
            </linearGradient>
          </defs>
          <polygon points="9,4 23,4 29,12 16,29 3,12" fill="url(#g-white)" stroke="#f8fbff" strokeWidth="1.4" />
          <polygon points="9,4 23,4 21,12 11,12" fill="#ffffff" opacity="0.7" />
          <polygon points="11,12 21,12 16,29" fill="#b8cce8" opacity="0.55" />
          <polyline points="3,12 29,12" stroke="#ffffff" strokeWidth="1" opacity="0.8" fill="none" />
        </svg>
      );

    case 'blue':
      // Cushion-cut Sapphire
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
          <defs>
            <linearGradient id="g-blue" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7cc4ff" />
              <stop offset="45%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#122766" />
            </linearGradient>
          </defs>
          <polygon points="16,2 28,10 25,26 16,30 7,26 4,10" fill="url(#g-blue)" stroke="#93c5fd" strokeWidth="1.4" />
          <polygon points="16,6 23,12 21,22 16,25 11,22 9,12" fill="#60a5fa" opacity="0.35" />
          <polygon points="16,6 23,12 16,15 9,12" fill="#ffffff" opacity="0.35" />
        </svg>
      );

    case 'green':
      // Octagonal Emerald-cut
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
          <defs>
            <linearGradient id="g-green" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="48%" stopColor="#059669" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>
          </defs>
          <polygon points="10,3 22,3 28,9 28,23 22,29 10,29 4,23 4,9" fill="url(#g-green)" stroke="#6ee7b7" strokeWidth="1.4" />
          <rect x="9" y="8" width="14" height="16" rx="2" fill="#34d399" opacity="0.32" stroke="#a7f3d0" strokeWidth="0.9" />
          <polygon points="10,3 22,3 20,8 12,8" fill="#ffffff" opacity="0.32" />
        </svg>
      );

    case 'red':
      // Marquise / Heart-crest Ruby
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
          <defs>
            <linearGradient id="g-red" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fda4af" />
              <stop offset="42%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#6b0722" />
            </linearGradient>
          </defs>
          <polygon points="16,2 27,13 22,29 10,29 5,13" fill="url(#g-red)" stroke="#fda4af" strokeWidth="1.4" />
          <polygon points="16,6 22,14 16,25 10,14" fill="#fb7185" opacity="0.35" />
          <polygon points="16,2 22,14 10,14" fill="#ffffff" opacity="0.3" />
        </svg>
      );

    case 'black':
      // Faceted Obsidian Onyx
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
          <defs>
            <linearGradient id="g-black" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7c8599" />
              <stop offset="45%" stopColor="#262b38" />
              <stop offset="100%" stopColor="#090b10" />
            </linearGradient>
          </defs>
          <polygon points="16,2 28,16 16,30 4,16" fill="url(#g-black)" stroke="#a1abc0" strokeWidth="1.5" />
          <polygon points="16,7 23,16 16,25 9,16" fill="#475166" opacity="0.55" />
          <polygon points="16,2 23,16 16,16" fill="#ffffff" opacity="0.22" />
        </svg>
      );

    case 'gold':
      // Renaissance Gold Crown Bullion
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
          <defs>
            <radialGradient id="g-gold" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fff7cc" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#854d0e" />
            </radialGradient>
          </defs>
          <circle cx="16" cy="16" r="13.5" fill="url(#g-gold)" stroke="#fef08a" strokeWidth="1.6" />
          <circle cx="16" cy="16" r="10.2" fill="none" stroke="#713f12" strokeWidth="1" opacity="0.55" />
          <path d="M9,20 L10.5,12 L14,15.5 L16,10.5 L18,15.5 L21.5,12 L23,20 Z" fill="#fef9c3" stroke="#713f12" strokeWidth="0.9" />
        </svg>
      );
  }
};

export const StrongholdIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M5 21V9h2V5h3v2h4V5h3v4h2v12H5zm5-3h4v-5h-4v5z"
      fill={color}
      stroke="#0c0f17"
      strokeWidth="1.4"
    />
  </svg>
);

export const CardMotifSvg: React.FC<{ motif: string; accent: string }> = ({ motif, accent }) => {
  const isOrient = motif.startsWith('orient_');
  return (
    <svg
      viewBox="0 0 120 90"
      className="card-motif-svg"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`m-${motif}`} cx="55%" cy="45%" r="65%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.45" />
          <stop offset="100%" stopColor="#0b0e16" stopOpacity="0.08" />
        </radialGradient>
      </defs>
      <rect width="120" height="90" fill={`url(#m-${motif})`} />
      {/* Subtle Renaissance arched filigree */}
      <path
        d="M12,86 L12,32 Q60,4 108,32 L108,86"
        fill="none"
        stroke={isOrient ? '#f59e0b' : accent}
        strokeWidth="1.2"
        opacity="0.32"
      />
      {motif === 'palace' || motif === 'cathedral' || motif === 'citadel' || motif === 'crown' ? (
        <g fill={accent} opacity="0.28">
          <path d="M22,84 L22,52 L34,42 L46,52 L46,84 Z" />
          <path d="M44,84 L44,36 L60,22 L76,36 L76,84 Z" />
          <path d="M74,84 L74,52 L86,42 L98,52 L98,84 Z" />
        </g>
      ) : motif === 'caravel' || motif === 'orient_junk' ? (
        <g fill={accent} opacity="0.3">
          <path d="M25,68 Q60,82 95,68 L86,78 L34,78 Z" />
          <path d="M58,24 L58,66 L86,58 Q74,38 58,24 Z" />
          <path d="M54,32 L54,66 L32,60 Q40,42 54,32 Z" />
        </g>
      ) : motif.startsWith('orient_') ? (
        <g fill="#f59e0b" opacity="0.3">
          <path d="M26,44 Q60,24 94,44 L86,48 L34,48 Z" />
          <path d="M34,58 Q60,42 86,58 L80,62 L40,62 Z" />
          <rect x="44" y="62" width="32" height="22" />
        </g>
      ) : (
        <g fill={accent} opacity="0.24">
          <polygon points="60,24 88,52 60,80 32,52" />
          <circle cx="60" cy="52" r="14" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.4" />
        </g>
      )}
    </svg>
  );
};

export const PLAYER_COLORS = ['#f59e0b', '#38bdf8', '#f43f5e', '#34d399'] as const;
