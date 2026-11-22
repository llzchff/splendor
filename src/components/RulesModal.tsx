import React from 'react';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card--wide rules-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>璀璨宝石 · 完整规则速查</h3>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="rules-body">
          <section>
            <h4>一、基础规则（先达 15 威望触发终局）</h4>
            <ul>
              <li>每回合四选一：① 拿取 <strong>3 枚不同色</strong>宝石；② 拿取 <strong>2 枚同色</strong>宝石（该色余量需 ≥4）；③ <strong>预定</strong> 1 张明牌或牌堆顶牌（最多持有 3 张）并获 1 枚黄金百搭；④ <strong>购买</strong> 1 张明牌或已预定卡。</li>
              <li>已购发展卡右上角提供<strong>永久宝石折扣</strong>，买卡先扣折扣再付筹码，黄金可替代任意颜色。</li>
              <li>回合结束时筹码上限为 <strong>10 枚</strong>（超出需弃置）；若宝石加成满足贵族要求，自动获 1 位贵族造访（+3 分，每回合限 1 位）。</li>
              <li>任一玩家达到 15 分后，本轮所有玩家完成相同回合数后结算：分高者胜，平分则发展卡少者胜。</li>
            </ul>
          </section>

          <section>
            <h4>二、《东方 The Orient》扩展</h4>
            <ul>
              <li>每个等级新增 2 张绯红金边东方卡（共 30 张）：</li>
              <li><strong>2×金袋（1级）</strong>：存入个人金袋区，下次购卡可一次性抵 2 枚任意宝石（不占 10 筹码上限）。</li>
              <li><strong>丝绸百搭（1/2级）</strong>：必须绑定到你已拥有的某色发展卡，永久 +1 该色加成；2 级款还附赠免费拿取 1 张 1 级明牌！</li>
              <li><strong>双宝石 / 定贵族（2级）</strong>：提供双倍永久加成，或将 1 位贵族预定为己方专属。</li>
              <li><strong>免费 2 级 / 献祭 2 卡（3级）</strong>：直接白拿 1 张 2 级明牌，或弃置 2 点指定色加成换取 3 威望分。</li>
            </ul>
          </section>

          <section>
            <h4>三、《城市 The Cities》扩展</h4>
            <ul>
              <li>3 张随机欧洲文艺复兴名城取代贵族，不再以 15 分直接触发终局。</li>
              <li>率先在回合结束满足任一名城（威望分 + 宝石加成组合）的玩家占领该城并触发终局回合；仅占领名城者有资格争冠。</li>
            </ul>
          </section>

          <section>
            <h4>四、《贸易站 Trading Posts》扩展</h4>
            <ul>
              <li>满足丝路贸易站条件后自动落家族徽章，永久解锁强力被动：购卡赠 1 宝石、拿 2 同色额外拿 1 异色、黄金抵 2 枚同色、+5 威望分、每枚徽章 +1 威望分。</li>
            </ul>
          </section>

          <section>
            <h4>五、《要塞 Strongholds》扩展</h4>
            <ul>
              <li>每人拥有 3 座要塞塔：每次购卡后必须建造/移动 1 座己方要塞，或摧毁 1 座敌方要塞。</li>
              <li>有己方要塞的卡<strong>对手无法购买或预定</strong>；若将 3 座要塞全叠在同一张卡上，可触发<strong>要塞突袭</strong>当回合立刻额外购入该卡！</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};
