import React from 'react';
import { TRADING_POSTS } from '../engine/data/tradingPosts';
import { PlayerState } from '../engine/types';
import { PLAYER_COLORS } from './GemIcon';

interface TradingPostDrawerProps {
  players: PlayerState[];
  onClose: () => void;
}

export const TradingPostDrawer: React.FC<TradingPostDrawerProps> = ({ players, onClose }) => {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>丝路贸易站 · 家族徽章特权</h3>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            关闭
          </button>
        </div>
        <div className="tp-grid">
          {TRADING_POSTS.map((tp) => {
            const owners = players
              .map((p, idx) => ({ p, idx }))
              .filter(({ p }) => p.tradingPosts.includes(tp.id));
            return (
              <div key={tp.id} className="tp-item">
                <div className="tp-item__head">
                  <span className="tp-item__name">{tp.name}</span>
                  <span className="tp-item__req">{tp.requirementText}</span>
                </div>
                <p className="tp-item__desc">{tp.description}</p>
                <div className="tp-item__crests">
                  {owners.length === 0 ? (
                    <span className="tp-item__none">尚无人解锁</span>
                  ) : (
                    owners.map(({ p, idx }) => (
                      <span
                        key={p.id}
                        className="crest-pill"
                        style={{ borderColor: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}
                      >
                        <span
                          className="crest-dot"
                          style={{ background: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}
                        />
                        {p.name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
