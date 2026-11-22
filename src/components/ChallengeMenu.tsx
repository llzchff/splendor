import React from 'react';
import { ArrowLeft, Play, Star } from 'lucide-react';
import { CHALLENGES, ChallengeDefinition } from '../engine/data/challenges';
import { GameConfig } from '../engine/types';
import { ChallengeRecord } from '../storage/progress';

interface ChallengeMenuProps {
  records: Record<string, ChallengeRecord>;
  onStartChallenge: (config: GameConfig) => void;
  onBack: () => void;
}

const DIFF_LABEL = { easy: '入门', medium: '进阶', hard: '大师' } as const;

export const ChallengeMenu: React.FC<ChallengeMenuProps> = ({
  records,
  onStartChallenge,
  onBack,
}) => {
  const launch = (ch: ChallengeDefinition) => {
    const players = [
      { id: 'p_1', name: '挑战者', isAI: false, avatarIndex: 0 },
      ...Array.from({ length: ch.opponents }).map((_, idx) => ({
        id: `ai_${idx + 1}`,
        name: `守关宗师 #${idx + 1}`,
        isAI: true,
        aiDifficulty: ch.difficulty,
        avatarIndex: idx + 1,
      })),
    ];

    onStartChallenge({
      players,
      expansions: ch.expansions,
      targetPoints: ch.rules.targetPoints ?? 15,
      seed: ch.seed,
      challenge: ch.rules,
    });
  };

  return (
    <div className="subpage-screen">
      <header className="subpage-header">
        <button type="button" className="icon-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          返回大厅
        </button>
        <h2>单人挑战模式 · 璀璨试炼</h2>
        <div className="subpage-header__meta">共 {CHALLENGES.length} 关</div>
      </header>

      <div className="challenge-grid">
        {CHALLENGES.map((ch) => {
          const rec = records[ch.id];
          const expTags = [
            ch.expansions.orient && '东方',
            ch.expansions.cities && '城市',
            ch.expansions.tradingPosts && '贸易站',
            ch.expansions.strongholds && '要塞',
          ].filter(Boolean) as string[];

          return (
            <div key={ch.id} className={`challenge-card ${rec ? 'challenge-card--cleared' : ''}`}>
              <div className="challenge-card__top">
                <span className="challenge-card__num">#{ch.number}</span>
                <span className={`diff-badge diff-badge--${ch.difficulty}`}>
                  {DIFF_LABEL[ch.difficulty]}
                </span>
                <div className="challenge-card__stars">
                  {[1, 2, 3].map((n) => (
                    <Star
                      key={n}
                      size={14}
                      fill={rec && rec.stars >= n ? '#f59e0b' : 'none'}
                      color={rec && rec.stars >= n ? '#f59e0b' : '#475569'}
                    />
                  ))}
                </div>
              </div>
              <h3>{ch.title}</h3>
              <div className="challenge-card__sub">{ch.subtitle}</div>
              <p className="challenge-card__desc">{ch.description}</p>
              <div className="challenge-card__tags">
                <span>1v{ch.opponents}</span>
                {ch.rules.maxTurns && <span>限 {ch.rules.maxTurns} 回合</span>}
                {expTags.map((t) => (
                  <span key={t} className="tag-gold">
                    {t}
                  </span>
                ))}
              </div>
              <div className="challenge-card__foot">
                <small>
                  {rec ? `最佳：${rec.bestTurns} 回合` : `三星目标 ≤${ch.starThresholds.threeStarsMaxTurns} 回合`}
                </small>
                <button type="button" className="btn btn--gold btn--sm" onClick={() => launch(ch)}>
                  <Play size={14} />
                  挑战
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
