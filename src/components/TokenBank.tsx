import React from 'react';
import { ART_GEM_CHIP } from '../art/assets';
import { GEM_COLORS, GEM_LABELS_ZH, GemColor, GemCounts, TokenCounts } from '../engine/types';

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

/**
 * Steam-style floating 3D stacked poker chips resting directly on the velvet felt
 * (Gold at top, followed by Onyx, Ruby, Emerald, Sapphire, Diamond — exact Steam order).
 */
const STEAM_GEM_ORDER: readonly GemColor[] = ['black', 'red', 'green', 'blue', 'white'] as const;

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
      {/* Gold Joker Stack at top (Steam order!) */}
      <div
        className={`poker-stack poker-stack--gold poker-stack--readonly ${bank.gold === 0 ? 'poker-stack--empty' : ''}`}
        title={`黄金百搭（剩余 ${bank.gold}，预定发展卡时获得）`}
      >
        <div className="poker-stack__pile">
          {Array.from({ length: Math.max(1, Math.min(bank.gold, 5)) }).map((_, layerIdx) => {
            const isTop = layerIdx === Math.max(1, Math.min(bank.gold, 5)) - 1;
            return (
              <img
                key={layerIdx}
                src={ART_GEM_CHIP.gold}
                alt=""
                draggable={false}
                className={`poker-stack__chip ${isTop ? 'poker-stack__chip--top' : 'poker-stack__chip--under'}`}
                style={{ transform: `translate(${layerIdx * 0.7}px, ${-layerIdx * 2.2}px)` }}
              />
            );
          })}
        </div>
        <span className="poker-stack__count">{bank.gold}</span>
      </div>

      {/* 5 Colored Gem Stacks */}
      {STEAM_GEM_ORDER.map((color) => {
        const count = bank[color];
        const picked = selectedGems[color];
        const visibleStack = Math.min(count, 5);
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
            <div className="poker-stack__pile">
              {Array.from({ length: Math.max(1, visibleStack) }).map((_, layerIdx) => {
                const isTop = layerIdx === Math.max(1, visibleStack) - 1;
                return (
                  <img
                    key={layerIdx}
                    src={ART_GEM_CHIP[color]}
                    alt=""
                    draggable={false}
                    className={`poker-stack__chip ${isTop ? 'poker-stack__chip--top' : 'poker-stack__chip--under'}`}
                    style={{ transform: `translate(${layerIdx * 0.7}px, ${-layerIdx * 2.2}px)` }}
                  />
                );
              })}
            </div>
            <span className="poker-stack__count">{count}</span>
            {picked > 0 && <span className="poker-stack__picked-badge">+{picked}</span>}
          </button>
        );
      })}

      {/* Floating Confirm / Clear Action Pill when gems are selected */}
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
