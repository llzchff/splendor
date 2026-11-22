import React from 'react';
import { Crown, Home, RotateCcw, Star } from 'lucide-react';
import { getPlayerPoints } from '../engine/rules';
import { GameState } from '../engine/types';

interface VictoryModalProps {
  state: GameState;
  onRematch: () => void;
  onExit: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({ state, onRematch, onExit }) => {
  const ranked = [...state.players].sort((a, b) => {
    const aWin = state.winnerIds.includes(a.id) ? 1 : 0;
    const bWin = state.winnerIds.includes(b.id) ? 1 : 0;
    if (aWin !== bWin) return bWin - aWin;
    const pts = getPlayerPoints(b) - getPlayerPoints(a);
    if (pts !== 0) return pts;
    return a.cards.length - b.cards.length;
  });

  const ch = state.challengeResult;

  return (
    <div className="modal-backdrop victory-backdrop-delayed">
      <div className="modal-card victory-modal">
        <div className="victory-crown">
          <Crown size={34} color="#f59e0b" />
        </div>
        <h2>
          {ch
            ? ch.won
              ? '挑战胜利！'
              : '挑战未达成'
            : `${ranked[0]?.name} 加冕宝石宗师！`}
        </h2>

        {ch && (
          <div className="victory-challenge-box">
            <div className="victory-stars">
              {[1, 2, 3].map((n) => (
                <Star
                  key={n}
                  size={24}
                  fill={ch.stars >= n ? '#f59e0b' : 'none'}
                  color={ch.stars >= n ? '#f59e0b' : '#475569'}
                />
              ))}
            </div>
            <p>{ch.reason}</p>
          </div>
        )}

        <div className="victory-table">
          {ranked.map((p, idx) => {
            const isWin = state.winnerIds.includes(p.id);
            return (
              <div key={p.id} className={`victory-row ${isWin ? 'victory-row--win' : ''}`}>
                <span className="victory-rank">#{idx + 1}</span>
                <strong>{p.name}</strong>
                <span>{getPlayerPoints(p)} 威望分</span>
                <span>{p.cards.length} 张发展卡</span>
                <span>
                  {p.claimedCity
                    ? `占领 ${p.claimedCity.name}`
                    : `贵族 ${p.nobles.length}`}
                </span>
              </div>
            );
          })}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn--ghost" onClick={onExit}>
            <Home size={15} />
            返回大厅
          </button>
          <button type="button" className="btn btn--gold" onClick={onRematch}>
            <RotateCcw size={15} />
            再来一局
          </button>
        </div>
      </div>
    </div>
  );
};
