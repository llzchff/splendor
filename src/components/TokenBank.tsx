import React from 'react';
import { ART_GEM_CHIP } from '../art/assets';
import {
  GEM_COLORS,
  GEM_LABELS_ZH,
  GemColor,
  GemCounts,
  TokenColor,
  TokenCounts,
} from '../engine/types';

interface TokenBankProps {
  bank: TokenCounts;
  selectedGems: GemCounts;
  disabled: boolean;
  onSelectGem: (color: GemColor) => void;
  onConfirmTake: () => void;
  onClearSelection: () => void;
  canConfirmTake: boolean;
  takeHint: string;
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
        <div
          key={i}
          className={`chip3d chip3d--${color}`}
          style={{ '--i': i } as React.CSSProperties}
        >
          <div className="chip3d__edge" />
          <img className="chip3d__face" src={ART_GEM_CHIP[color]} alt="" draggable={false} />
        </div>
      ))}
    </div>
  );
};

export const TokenBank: React.FC<TokenBankProps> = ({
  bank,
  selectedGems,
  disabled,
  onSelectGem,
  onConfirmTake,
  onClearSelection,
  canConfirmTake,
}) => {
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
        const count = bank[color];
        const picked = selectedGems[color];
        const canClick =
          !disabled &&
          (picked > 0 ||
            (count > 0 &&
              (totalSelected === 0 ||
                (totalSelected === 1 &&
                  ((picked === 1 && count >= 4) ||
                    (picked === 0 && GEM_COLORS.every((k) => selectedGems[k] <= 1)))) ||
                (totalSelected === 2 &&
                  picked === 0 &&
                  GEM_COLORS.every((k) => selectedGems[k] <= 1)))));

        return (
          <button
            key={color}
            type="button"
            data-fx={`bank:${color}`}
            disabled={!canClick && picked === 0}
            onClick={() => onSelectGem(color)}
            className={[
              'poker-stack',
              `poker-stack--${color}`,
              picked > 0 ? 'poker-stack--picked' : '',
              count === 0 ? 'poker-stack--empty' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            title={`${GEM_LABELS_ZH[color]}（剩余 ${count}）`}
          >
            <ChipStack color={color} count={count} />
            <span className="poker-stack__count">{count}</span>
            {picked > 0 && <span className="poker-stack__picked-badge">+{picked}</span>}
          </button>
        );
      })}

      {totalSelected > 0 && (
        <div className="steam-bank__floating-confirm">
          <button
            type="button"
            className="steam-pill-btn steam-pill-btn--gold"
            disabled={disabled || !canConfirmTake}
            onClick={onConfirmTake}
          >
            拿取 ({totalSelected})
          </button>
          <button
            type="button"
            className="steam-pill-btn steam-pill-btn--dark"
            onClick={onClearSelection}
          >
            取消
          </button>
        </div>
      )}
    </aside>
  );
};
