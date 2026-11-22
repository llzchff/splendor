import React from 'react';
import { GEM_COLORS, GEM_LABELS_ZH, GemColor, GemCounts, TokenCounts } from '../engine/types';
import { GemIcon } from './GemIcon';

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

export const TokenBank: React.FC<TokenBankProps> = ({
  bank,
  selectedGems,
  disabled,
  onSelectGem,
  onConfirmTake,
  onClearSelection,
  canConfirmTake,
  takeHint,
}) => {
  const totalSelected = GEM_COLORS.reduce((s, c) => s + selectedGems[c], 0);

  return (
    <aside className="token-bank" aria-label="宝石筹码供应堆">
      <div className="token-bank__title">宝石库</div>

      <div className="token-bank__list">
        {GEM_COLORS.map((color) => {
          const count = bank[color];
          const picked = selectedGems[color];
          const canClick =
            !disabled &&
            (picked > 0 ||
              (count > 0 &&
                ((totalSelected === 0) ||
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
                'gem-chip',
                `gem-chip--${color}`,
                picked > 0 ? 'gem-chip--picked' : '',
                count === 0 ? 'gem-chip--empty' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              title={`${GEM_LABELS_ZH[color]}（剩余 ${count}）`}
            >
              <div className="gem-chip__inner">
                <GemIcon color={color} size={26} />
              </div>
              <span className="gem-chip__count">{count}</span>
              {picked > 0 && <span className="gem-chip__picked-badge">+{picked}</span>}
            </button>
          );
        })}

        {/* Gold Joker Stack (obtained via reserving cards) */}
        <div
          className={`gem-chip gem-chip--gold gem-chip--readonly ${bank.gold === 0 ? 'gem-chip--empty' : ''}`}
          title={`黄金百搭（剩余 ${bank.gold}，预定发展卡时获得）`}
        >
          <div className="gem-chip__inner">
            <GemIcon color="gold" size={26} />
          </div>
          <span className="gem-chip__count">{bank.gold}</span>
        </div>
      </div>

      {/* Confirm / Clear Bar */}
      <div className="token-bank__actions">
        {totalSelected > 0 ? (
          <>
            <button
              type="button"
              className="btn btn--gold btn--sm token-bank__confirm"
              disabled={disabled || !canConfirmTake}
              onClick={onConfirmTake}
            >
              拿取 ({totalSelected})
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--xs"
              onClick={onClearSelection}
            >
              重置
            </button>
          </>
        ) : (
          <div className="token-bank__hint">{takeHint}</div>
        )}
      </div>
    </aside>
  );
};
