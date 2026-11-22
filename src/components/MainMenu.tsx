import React, { useState } from 'react';
import { BookOpen, Play, RotateCcw, Swords, Trophy, Users, Wifi } from 'lucide-react';
import { AIDifficulty, ExpansionConfig, GameConfig, PlayerSetup } from '../engine/types';
import { GemIcon } from './GemIcon';

interface MainMenuProps {
  hasSavedGame: boolean;
  challengeStarsTotal: number;
  challengeStarsMax: number;
  onStartGame: (config: GameConfig) => void;
  onResumeGame: () => void;
  onOpenChallenges: () => void;
  onOpenMultiplayer: () => void;
  onOpenRules: () => void;
}

const DEFAULT_NAMES = ['威尼斯商人', '美第奇学徒', '安特卫普行商', '佛罗伦萨大师'];

export const MainMenu: React.FC<MainMenuProps> = ({
  hasSavedGame,
  challengeStarsTotal,
  challengeStarsMax,
  onStartGame,
  onResumeGame,
  onOpenChallenges,
  onOpenMultiplayer,
  onOpenRules,
}) => {
  const [modeTab, setModeTab] = useState<'solo' | 'passplay'>('solo');
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(3);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');
  const [targetPoints, setTargetPoints] = useState(15);
  const [expansions, setExpansions] = useState<ExpansionConfig>({
    orient: false,
    cities: false,
    tradingPosts: false,
    strongholds: false,
  });

  const toggleExpansion = (key: keyof ExpansionConfig) => {
    setExpansions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLaunch = () => {
    const players: PlayerSetup[] = [];
    for (let i = 0; i < playerCount; i++) {
      const isAI = modeTab === 'solo' && i > 0;
      players.push({
        id: `p_${i + 1}`,
        name:
          modeTab === 'passplay'
            ? `玩家 ${i + 1}`
            : i === 0
              ? '你（大商人）'
              : DEFAULT_NAMES[i],
        isAI,
        aiDifficulty: isAI ? aiDifficulty : 'medium',
        avatarIndex: i,
      });
    }
    onStartGame({
      players,
      expansions,
      targetPoints,
      seed: Date.now() & 0x7fffffff,
    });
  };

  return (
    <div className="menu-screen">
      {/* Left Hero Column */}
      <section className="menu-hero">
        <div className="menu-hero__gems">
          <GemIcon color="white" size={26} />
          <GemIcon color="blue" size={26} />
          <GemIcon color="green" size={26} />
          <GemIcon color="red" size={26} />
          <GemIcon color="black" size={26} />
          <GemIcon color="gold" size={26} />
        </div>
        <h1 className="menu-hero__title">璀璨宝石</h1>
        <p className="menu-hero__subtitle">SPLENDOR · 文艺复兴安卓横屏完整版</p>

        <div className="menu-hero__nav">
          {hasSavedGame && (
            <button type="button" className="menu-card-btn menu-card-btn--resume" onClick={onResumeGame}>
              <RotateCcw size={18} />
              <div>
                <strong>继续上次对局</strong>
                <small>自动保存进度</small>
              </div>
            </button>
          )}

          <button type="button" className="menu-card-btn" onClick={onOpenChallenges}>
            <Trophy size={18} />
            <div>
              <strong>单人挑战模式</strong>
              <small>
                8 大特色残局与规则试炼 · ★ {challengeStarsTotal}/{challengeStarsMax}
              </small>
            </div>
          </button>

          <button type="button" className="menu-card-btn" onClick={onOpenMultiplayer}>
            <Wifi size={18} />
            <div>
              <strong>局域网 / 在线联机</strong>
              <small>建房 6 位房间码 · AI 补位 · 断线重连</small>
            </div>
          </button>

          <button type="button" className="menu-card-btn menu-card-btn--subtle" onClick={onOpenRules}>
            <BookOpen size={18} />
            <div>
              <strong>完整规则手册</strong>
              <small>基础规则 + 璀璨都市四大扩展详解</small>
            </div>
          </button>
        </div>
      </section>

      {/* Right Quick/Custom Match Configurator */}
      <section className="menu-config">
        <div className="menu-config__tabs">
          <button
            type="button"
            className={`tab-btn ${modeTab === 'solo' ? 'tab-btn--active' : ''}`}
            onClick={() => setModeTab('solo')}
          >
            <Swords size={15} />
            单人 vs AI
          </button>
          <button
            type="button"
            className={`tab-btn ${modeTab === 'passplay' ? 'tab-btn--active' : ''}`}
            onClick={() => setModeTab('passplay')}
          >
            <Users size={15} />
            同屏传玩 (Pass &amp; Play)
          </button>
        </div>

        <div className="config-grid">
          <div className="config-group">
            <label>对局人数</label>
            <div className="pill-group">
              {([2, 3, 4] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`pill-btn ${playerCount === n ? 'pill-btn--active' : ''}`}
                  onClick={() => setPlayerCount(n)}
                >
                  {n} 人局
                </button>
              ))}
            </div>
          </div>

          {modeTab === 'solo' ? (
            <div className="config-group">
              <label>AI 强度（Web Worker 独立线程）</label>
              <div className="pill-group">
                {(
                  [
                    ['easy', '见习'],
                    ['medium', '资深'],
                    ['hard', '大师 MCTS'],
                  ] as const
                ).map(([diff, label]) => (
                  <button
                    key={diff}
                    type="button"
                    className={`pill-btn ${aiDifficulty === diff ? 'pill-btn--active' : ''}`}
                    onClick={() => setAiDifficulty(diff)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="config-group">
              <label>目标威望分</label>
              <div className="pill-group">
                {[12, 15, 20].map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    className={`pill-btn ${targetPoints === pts ? 'pill-btn--active' : ''}`}
                    onClick={() => setTargetPoints(pts)}
                  >
                    {pts} 分
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="config-group">
          <label>《璀璨都市》四大扩展模块（可自由混搭）</label>
          <div className="expansion-grid">
            <button
              type="button"
              className={`exp-toggle ${expansions.orient ? 'exp-toggle--on' : ''}`}
              onClick={() => toggleExpansion('orient')}
            >
              <strong>东方 The Orient</strong>
              <small>30 张东方特权卡：双金袋 / 百搭 / 免费夺卡 / 献祭</small>
            </button>
            <button
              type="button"
              className={`exp-toggle ${expansions.cities ? 'exp-toggle--on' : ''}`}
              onClick={() => toggleExpansion('cities')}
            >
              <strong>城市 The Cities</strong>
              <small>14 座欧洲名城取代贵族，先达城邦要求触发终局</small>
            </button>
            <button
              type="button"
              className={`exp-toggle ${expansions.tradingPosts ? 'exp-toggle--on' : ''}`}
              onClick={() => toggleExpansion('tradingPosts')}
            >
              <strong>贸易站 Trading Posts</strong>
              <small>5 大永久家族徽章特权：双倍黄金 / 购卡赠宝石等</small>
            </button>
            <button
              type="button"
              className={`exp-toggle ${expansions.strongholds ? 'exp-toggle--on' : ''}`}
              onClick={() => toggleExpansion('strongholds')}
            >
              <strong>要塞 Strongholds</strong>
              <small>每人 3 座要塞塔：封锁卡位 / 拆塔 / 3 塔合围突袭购卡</small>
            </button>
          </div>
        </div>

        <button type="button" className="btn btn--gold btn--lg menu-start-btn" onClick={handleLaunch}>
          <Play size={18} />
          开始文艺复兴宝石之旅
        </button>
      </section>
    </div>
  );
};
