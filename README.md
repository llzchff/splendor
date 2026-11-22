<img src="public/icon.svg" width="64" height="64" alt="">

# 璀璨宝石 · Splendor 安卓横屏完整版

基于 **React + TypeScript + Capacitor** 构建的固定横屏安卓版《璀璨宝石（Splendor）》，采用原创文艺复兴宝石视觉风格与高度还原 Steam PC 端的桌面布局，规则引擎与 AI 完全解耦（AI 运行于独立 Web Worker，接口设计兼容后续平滑替换为 Rust WASM）。

## 核心特性

1. **完整基础版规则（2~4 人）**
   - 完整 90 张五色对称标准发展卡（1 级 40 张 / 2 级 30 张 / 3 级 20 张）+ 10 位贵族板块
   - 支持单人 vs AI、同屏传玩（Pass & Play）、自动存档续玩、Web Audio 合成音效 + 安卓触觉震动
2. **《璀璨都市》四大扩展全覆盖（支持自由混搭）**
   - **东方（The Orient）**：30 张东方卡（2×黄金袋、丝绸百搭、双宝石、免费 1/2 级夺卡、预定贵族、献祭换分）
   - **城市（The Cities）**：7 张双面共 14 座欧洲名城取代贵族，先占名城触发终局
   - **贸易站（Trading Posts）**：5 大永久家族徽章特权（购卡赠宝石、拿 2 赠 1、双倍黄金、+5 分、按徽章加分）
   - **要塞（Strongholds）**：每人 3 座要塞塔（封锁、移动、拆塔、3 塔合围突袭购卡）
3. **三档 Web Worker AI**
   - **见习（Easy）** / **资深（Medium）** / **大师（Hard · 时间预算 MCTS 蒙特卡洛树搜索）**，独立线程不卡顿
4. **8 关单人挑战模式**
   - 速度引擎、贵族盛宴、黄金禁令、禁购 3 级卡、五回合绝境翻盘残局、东方秘宝、名城霸主、全扩展丝路帝国，带 1~3 星评级与本地记录
5. **局域网 / 在线联机对战**
   - 内置权威 Node.js WebSocket 房主服务端（复用同一套 `src/engine` 状态机防作弊），支持 6 位房间码、AI 补位、房间聊天、断线重连

## 快速运行

```bash
# 安装依赖
pnpm install

# 启动前端开发预览（桌面浏览器或手机同 Wi-Fi 访问）
pnpm run dev

# 启动局域网/在线联机房间服务器（默认端口 8765）
pnpm run server

# 运行全量单元测试（规则 + 4 扩展 + AI 对局模拟 + WebSocket 联机）
pnpm run test

# 构建生产包并同步至 Android 原生工程
pnpm run cap:sync
```

## 编译安卓 APK

已预先生成并配置好 Capacitor 原生安卓工程 `android/`（已强制锁定横屏 `sensorLandscape`、沉浸全屏及局域网明文 WebSocket 权限）：

1. 安装 **Android Studio**（或 Android SDK Command-line Tools），设置环境变量 `ANDROID_HOME`。
2. 执行 `pnpm run cap:sync` 同步最新前端资源到 `android/`。
3. 方式 A：运行 `pnpm run cap:open` 在 Android Studio 中点击 **Build → Build APK(s)**。
4. 方式 B：命令行直接打包调试包：
   ```bash
   cd android
   .\gradlew.bat assembleDebug
   ```
   生成的 APK 位于 `android/app/build/outputs/apk/debug/app-debug.apk`。
