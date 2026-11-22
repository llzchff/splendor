import React from 'react';
import { ART_GEM_CHIP } from '../art/assets';
import { GEM_COLORS, GEM_LABELS_ZH, GemColor, GemCounts, TokenColor, TokenCounts } from '../engine/types';

interface TokenBankProps {
  bank: TokenCounts;
  /** Chips currently staged in the player's drawer (shown as already removed from the bank) */
  selectedGems: GemCounts;
  disabled: boolean;
  onSelectGem: (color: GemColor) => void;
}

const STEAM_GEM_ORDER: readonly GemColor[] = ['black', 'red', 'green', 'blue', 'white'] as const;

/**
 * Real 3D cylinder chip stack: every chip has an elliptical top face plus a notched
 * side rim, and chips are physically stacked so their edges form a visible column.
 */
export const ChipStack: React.FC<{ color: TokenColor; count: number; maxLayers?: number }> = ({
  color,
  count,
  maxLayers = 5,
}) => {
  const layers = Math.max(1, Math.min(count, maxLayers));
  return (
    <div className="chip-pile" style={{ '--layers': layers } as React.CSSProperties}>
      {Array.from({ length: layers }).map((_, i) => (
        <div key={i} className={`chip3d chip3d--${color}`} style={{ '--i': i } as React.CSSProperties}>
          <div className="chip3d__edge" />
          <img className="chip3d__face" src={ART_GEM_CHIP[color]} alt="" draggable={false} />
        </div>
      ))}
    </div>
  );
};

export const TokenBank: React.FC<TokenBankProps> = ({ bank, selectedGems, disabled, onSelectGem }) => {
  const totalSelected = GEM_COLORS.reduce((s, c) => s + selectedGems[c], 0);

  return (
    <aside className="steam-bank" aria-label="宝石筹码供应堆">
      <div
        data-fx="bank:gold"
        className={`poker-stack poker-stack--gold poker-stack--readonly ${bank.gold === 0 ? 'poker-stack--empty' : ''}`}
        title={`黄金百搭（剩余 ${bank.gold}，预定发展卡时获得）`}
      >
        <ChipStack color="gold" count={bank.gold} />
        <span className="poker-stack__count">{bank.gold}</span>
      </div>

      {STEAM_GEM_ORDER.map((color) => {
        const picked = selectedGems[color];
        const shown = bank[color] - picked;
        const canClick =
          !disabled &&
          shown > 0 &&
          (totalSelected === 0 ||
            (totalSelected === 1 && picked === 1 && bank[color] >= 4) ||
            (picked === 0 && totalSelected < 3 && GEM_COLORS.every((k) => selectedGems[k] <= 1)));

        return (
          <button
            key={color}
            type="button"
            data-fx={`bank:${color}`}
            disabled={!canClick}
            onClick={() => onSelectGem(color)}
            className={['poker-stack', `poker-stack--${color}`, shown === 0 ? 'poker-stack--empty' : '']
              .filter(Boolean)
              .join(' ')}
            title={`${GEM_LABELS_ZH[color]}（剩余 ${shown}）`}
          >
            <ChipStack color={color} count={shown} />
            <span className="poker-stack__count">{shown}</span>
          </button>
        );
      })}
    </aside>
  );
};
