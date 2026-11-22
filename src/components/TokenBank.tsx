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
          const visibleStack = Math.min(count, 4);
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
              {/* Physical 3D stacked chip layers beneath the top chip */}
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
                      style={{
                        transform: `translateY(${-layerIdx * 2.5}px)`,
                      }}
                    />
                  );
                })}
              </div>
              <span className="poker-stack__count">{count}</span>
              {picked > 0 && <span className="poker-stack__picked-badge">+{picked}</span>}
            </button>
          );
        })}

        {/* Gold Crown Joker Stack */}
        <div
          className={`poker-stack poker-stack--gold poker-stack--readonly ${bank.gold === 0 ? 'poker-stack--empty' : ''}`}
          title={`黄金百搭（剩余 ${bank.gold}，预定发展卡时获得）`}
        >
          <div className="poker-stack__pile">
            {Array.from({ length: Math.max(1, Math.min(bank.gold, 4)) }).map((_, layerIdx) => {
              const isTop = layerIdx === Math.max(1, Math.min(bank.gold, 4)) - 1;
              return (
                <img
                  key={layerIdx}
                  src={ART_GEM_CHIP.gold}
                  alt=""
                  draggable={false}
                  className={`poker-stack__chip ${isTop ? 'poker-stack__chip--top' : 'poker-stack__chip--under'}`}
                  style={{
                    transform: `translateY(${-layerIdx * 2.5}px)`,
                  }}
                />
              );
            })}
          </div>
          <span className="poker-stack__count">{bank.gold}</span>
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
            <button type="button" className="btn btn--ghost btn--xs" onClick={onClearSelection}>
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
