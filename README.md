<p align="center">
  <img src="public/art/app_icon.png" width="112" height="112" alt="璀璨宝石 Splendor 图标">
</p>

<h1 align="center">璀璨宝石 · Splendor 安卓横屏完整版</h1>

<p align="center">
  基于 <strong>React + TypeScript + Capacitor</strong> 打造的固定横屏安卓版《璀璨宝石（Splendor）》<br/>
  文艺复兴原创高清油画美术 · 3D 物理纵深牌桌 · 完整基础版 +《璀璨都市》四大扩展 · Web Worker MCTS AI · 局域网联机
</p>

<p align="center">
  <a href="https://github.com/llzchff/splendor/releases/latest">
    <img src="https://img.shields.io/badge/Android%20APK-v5.0%20下载-D4AF37?style=for-the-badge&logo=android&logoColor=white" alt="Download v5.0 APK">
  </a>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5.8">
  <img src="https://img.shields.io/badge/Capacitor-7-119EFF?style=for-the-badge&logo=capacitor&logoColor=white" alt="Capacitor 7">
</p>

<p align="center">
  <img src="public/art/bg_menu.jpg" width="88%" alt="璀璨宝石主界面威尼斯港插画">
</p>

---

## ✨ 项目亮点

本项目是一款面向移动端横屏体验独立重制的桌游《璀璨宝石（Splendor）》数字版，采用 **100% 原创代码与 73 张原创高清文艺复兴油画美术资源**，将物理牌桌的立体厚重感、流畅的对局交互编排与完整桌游规则深度融合：

### 1. 完整规则 +《璀璨都市》四大扩展（2~4 人自由混搭）
- **基础版（Base Game）**：严格还原 90 张五色对称标准发展卡（1 级 40 张 / 2 级 30 张 / 3 级 20 张）与 10 位贵族板块，支持单人 vs AI、同屏传玩（Pass & Play）及自动存档续玩。
- **东方扩展（The Orient）**：完整实装 30 张东方卡与 7 大特殊机制（双倍黄金袋、丝绸百搭、双宝石产出、购卡免费夺取 1/2 级卡、预定贵族、献祭发展卡换取高额声望）。
- **城市扩展（The Cities）**：7 张双面共 14 座文艺复兴欧洲名城取代贵族，每位名城均配备独立定制城景油画，达成名城条件即触发终局。
- **贸易站扩展（Trading Posts）**：5 大丝绸之路家族徽章永久特权（购卡赠宝石、拿 2 同色赠 1 异色、黄金当双倍支付、+5 声望、按徽章数量结算额外加分）。
- **要塞扩展（Strongholds）**：每人 3 座要塞塔，支持封锁发展卡、移动/拆毁对手要塞，以及 3 塔合围时的突袭购卡机制。

### 2. 文艺复兴高清美术与 3D 物理桌面（v2.0 → v5.0 持续进化）
- **73 张原创高清艺术资源（~10.5 MB）**：1920×1080 红木丝绒牌桌与威尼斯港主界面、36 幅 600×800 发展卡油画、10 位风格各异的贵族肖像、14 座欧洲名城全景、4 套烫金皮革牌背及 6 枚 320px 透明立体浮雕筹码。
- **3D 物理纵深桌面**：12° 透视俯角牌桌 + 陀螺仪/指针微视差、多层立体柱状筹码堆、带物理厚度与扫光质感的 3:4 竖版卡牌、可购买绿光提示与弧形大理石底部托盘。
- **Steam 级交互动效编排**：
  - 左侧玩家头像滑出式金框行动抽屉（`PortraitDrawer`），支持实时暂存/回退与对手行动展示。
  - 牌桌原地抬升选牌（1.6× 浮起）+ 藏蓝烫金尖角横幅按钮（`OrnateButton`：「购买」「预定」「结束回合」+ 撤销 `✕`）。
  - 筹码弧线落袋、开局顺位提示与倾斜扫牌发牌演出、贵族降临暗场「恭喜！」仪式、终局顶部提示横幅与 2 秒「璀璨宝石 · 胜利」演出。
- **沉浸式音画反馈**：内置 Web Audio 程序化合成 D-Dorian 调式文艺复兴鲁特琴/竖琴 BGM、陶瓷筹码清脆碰撞音效、竖琴滑音胜利号角，并接入 Android 原生触觉震动（Capacitor Haptics）。

### 3. 三档 Web Worker AI 与 8 关单人挑战
- **三档离线 AI**：**见习（Easy）** / **资深（Medium）** / **大师（Hard · 时间预算 MCTS 蒙特卡洛树搜索）**，全部运行于独立 Web Worker 线程，界面零卡顿，接口设计预留平滑切换至 Rust WASM 的扩展能力。
- **8 关单人挑战模式**：涵盖速度引擎、贵族盛宴、黄金禁令、禁购 3 级卡、五回合绝境翻盘预设残局、东方秘宝、名城霸主、全扩展丝路帝国，配备 1~3 星评级与本地最佳战绩存档。

### 4. 权威服务端局域网 / 在线联机
- 内置 Node.js WebSocket 权威房主服务器（`server/index.ts`），直接复用纯 TypeScript 规则状态机（`src/engine`）校验每一步操作防止作弊，支持 6 位房间码加入、AI 补位、局内聊天与断线重连。

---

## 🎨 原创美术一览

| 发展卡油画 | 欧洲名城全景 | 贵族肖像与立体筹码 |
| :---: | :---: | :---: |
| <img src="public/art/card_t3_palace.jpg" width="170" alt="三级宫殿卡"> <img src="public/art/card_orient_dragon.jpg" width="170" alt="东方金龙卡"> | <img src="public/art/city_venice.jpg" width="185" alt="威尼斯名城"> <img src="public/art/city_florence.jpg" width="185" alt="佛罗伦萨名城"> | <img src="public/art/noble_1.jpg" width="130" alt="贵族肖像"> <img src="public/art/gem_red.png" width="96" alt="红宝石筹码"> <img src="public/art/gem_gold.png" width="96" alt="黄金筹码"> |

---

## 📦 版本下载与演进历史

前往 [**Releases 页面**](https://github.com/llzchff/splendor/releases) 即可直接下载 **v1.0 ~ v5.0 全系列签名安卓 APK**，体验项目从基础可玩版到 3D 高清重制版的完整演进历程（详细变更见 [CHANGELOG.md](CHANGELOG.md)）：

| 版本 | 核心里程碑 |
| :--- | :--- |
| [**v5.0**](https://github.com/llzchff/splendor/releases/tag/v5.0) *(推荐)* | Steam 级动效与交互编排：头像滑出金框抽屉、原地抬牌 + 藏蓝金尖角按钮、弧线拿币、开局发牌/贵族降临/终局横幅与胜利演出 |
| [**v4.0**](https://github.com/llzchff/splendor/releases/tag/v4.0) | 3D 物理纵深桌面 + 73 张高清美术全覆盖（10 贵族 & 14 名城独立绘制）、12° 透视视差、立体柱状筹码、飞行轨迹层 `FxLayer` |
| [**v3.0**](https://github.com/llzchff/splendor/releases/tag/v3.0) | Steam 风格五区全屏横屏桌面重构：移除顶栏、左侧大理石头像柱、3:4 竖版绿光可购卡、丝绒悬浮筹码与底部弧形托盘 |
| [**v2.0**](https://github.com/llzchff/splendor/releases/tag/v2.0) | 文艺复兴油画美术与音频大升级：41 张原创油画、程序化鲁特琴 BGM + 陶瓷筹码音效、定制安卓自适应图标与启动图 |
| [**v1.0**](https://github.com/llzchff/splendor/releases/tag/v1.0) | 首个完整可玩安卓横屏版：90 张基础卡 +《璀璨都市》4 大扩展 + 3 档 Web Worker MCTS AI + 8 关挑战 + WebSocket 联机 |

---

## 🗂️ 项目结构

```text
splendor/
├── src/
│   ├── engine/               # 纯 TypeScript 确定性规则引擎（前后端共享，零 UI 依赖）
│   │   ├── data/             # 基础 90 卡、10 贵族、30 东方卡、14 名城、5 贸易站、8 挑战数据
│   │   ├── rules.ts          # 完整状态机与动作合法性校验
│   │   ├── payment.ts        # 最优宝石/黄金/双倍黄金/丝绸支付算法
│   │   └── rules.test.ts     # 规则引擎与四大扩展单元测试
│   ├── ai/                   # 独立 Web Worker 离线 AI（启发式评估 + 时间预算 MCTS）
│   ├── network/              # WebSocket 联机协议与客户端封装
│   ├── art/                  # 73 张原创高清艺术资源映射表
│   ├── audio/                # Web Audio 鲁特琴 BGM、陶瓷筹码音效与 Capacitor Haptics
│   ├── components/           # 3D 牌桌、行动抽屉、飞行特效层、联机大厅、挑战菜单等 UI
│   └── storage/              # 自动存档与挑战星级本地持久化
├── server/                   # Node.js WebSocket 权威联机房主服务端 + 自动化联机测试
├── public/art/               # 73 张原创高清油画、城景、贵族肖像与透明立体筹码资源
├── android/                  # Capacitor 7 原生安卓工程（锁定横屏 sensorLandscape + 沉浸全屏）
└── CHANGELOG.md              # v1.0 ~ v5.0 完整版本更新日志
```

---

## 🚀 本地开发与测试

环境要求：**Node.js >= 20**、**pnpm >= 9**。

```bash
# 1. 安装依赖
pnpm install

# 2. 启动前端开发预览（桌面浏览器或手机同 Wi-Fi 访问）
pnpm run dev

# 3. 启动局域网 / 在线联机房间服务器（默认端口 8765）
pnpm run server

# 4. 运行全量自动化测试（规则引擎 + 4 扩展 + 完整 AI 模拟对局 + WebSocket 联机）
pnpm run test

# 5. 构建生产包并同步至 Android 原生工程
pnpm run cap:sync
```

---

## 📱 自行编译安卓 APK

仓库已预置配置完成的 Capacitor 安卓工程 `android/`（强制锁定横屏 `sensorLandscape`、沉浸全屏状态栏及局域网明文 WebSocket 通信支持）：

1. 安装 **JDK 21** 与 **Android Studio / Android SDK（API 35）**，配置环境变量 `ANDROID_HOME`（或在 `android/local.properties` 中写入 `sdk.dir=...`）。
2. 执行 `pnpm run cap:sync` 构建前端并同步到原生工程。
3. 编译 APK：
   - **Android Studio**：运行 `pnpm run cap:open`，点击菜单 **Build → Build APK(s)**。
   - **命令行打包**：
     ```bash
     cd android
     ./gradlew assembleDebug   # Windows 请使用 .\gradlew.bat assembleDebug
     ```
   生成的 APK 位于 `android/app/build/outputs/apk/debug/app-debug.apk`。

---

## ⚠️ 版权与免责声明

- 本项目为桌游爱好者的**独立开源学习与复刻作品**，与《Splendor（璀璨宝石）》原版桌游出版商 Space Cowboys / Asmodee 无任何商业关联或官方背书。
- 仓库内**全部源代码、音频合成逻辑及 73 张美术贴图均为独立原创绘制**，不包含任何商业客户端的解包文件或受版权保护的第三方素材。如喜爱该桌游，欢迎支持正版实体桌游及官方数字版本。
