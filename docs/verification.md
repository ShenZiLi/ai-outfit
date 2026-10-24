# 衣序 1.0.0 验证记录

日期：2026-10-24，Asia/Shanghai。生产代码提交：`c38a246`；后续文档提交不改变安装包内容。

## 安装包

- 文件：`artifacts/yixu-wardrobe-1.0.0.apk`，调试签名，包名 `com.yixu.wardrobe`。
- 最低 Android API26，目标/编译 API36。Android System WebView / Chrome111+；较旧版本显示原生更新提示。
- `assembleDebug` 与 `lintDebug` 成功。Lint：0 错误，1 条 Gradle 有更新版本的建议，不影响构建和运行。
- `apksigner verify --verbose` 成功，APK Signature Scheme v2 签名有效。
- SHA256：`e7bc649c6980234868704e0b01887816310e322108e56d311328fbe484012c28`。
- 逐文件比对：安装包内 14 个页面/图片/脚本资源与当前 `dist/` 完全一致。

## 需求验收

| 要求 | 当前证据 | 结果 |
| --- | --- | --- |
| 调研淘宝 AI 试衣 | `docs/research.md`，公开报道、作者模型与官方接口资料 | 完成；未声称登录淘宝逐屏实测 |
| 可运行安卓应用 | APK 构建、签名、API36 模拟器安装与实际启动 | 完成 |
| 衣物管理 | 浏览器增删改/搜索/刷新测试，原生系统选择器导入照片，读回 9 件衣物备份 | 通过 |
| 相机入库 | 从应用「拍照添加衣物」进入系统相机，拍摄虚拟场景并确认，应用成功解码 960×1280 JPEG | 通过 |
| 真实 AI 试衣 | FASHN 作者服务真实队列与生成输出；浏览器完整闭环；原生 APK 生成白衬衫效果，本地 JPEG 56,562 字节 | 通过真实生成；服务另有额度限制，见下文 |
| 原图/结果、历史、穿搭 | 浏览器真实测试保存穿搭并刷新恢复；新安装包读取已有真实生成历史 | 通过 |
| 穿着记录与档案 | 昵称、身高、组合保存、当日记录去重与刷新恢复 E2E | 通过 |
| 本地数据与离线使用 | 实际进程结束重启后，WebView 设为离线并重新加载，`navigator.onLine === false`，仍找到原生导入单品 | 通过 |
| 完整备份与恢复 | 系统 DocumentsUI 导出 218,631 字节 JSON；浏览器恢复需确认；损坏文件保留原档案 | 通过 |
| Android 返回键 | 系统 Back 从衣橱回到今日 | 通过 |
| 每次完成变更提交本地 Git | `git log` 中设计、数据、界面、修复、安卓交付与文档提交 | 执行 |

## 自动化与复查

最终运行：

- `npm test`：5 个测试文件、16 个测试通过。覆盖校验、搜索、搭配、引用清理、备份、IndexedDB、图片读取、服务协议与取消。
- `npm run format:check`：通过。
- `npm run build`：TypeScript 与生产打包通过。
- `npm run test:e2e`：5 项通过，1 项真实 GPU 测试默认跳过；有小屏 375px、横屏 812px、桌面 1440px 布局与资源验证。
- `YIXU_LIVE_AI=1` 的浏览器真实测试曾通过：选择原创示例人像/白衬衫、确认、生成、保存历史/穿搭、刷新恢复。
- `npm run test:android`：最新 APK 安装后通过本地资源、原生备份、重启、离线重载和返回键检查。

独立代码复查发现并修复了上传取消竞态：Gradio SDK 在上传未结束时 cancel/close，仍可能提交新任务。现在所有上传/提交请求受取消信号控制，`cancel`/`reset` 清理请求独立保留。测试使用真实 SDK 加延迟上传和无网络传输，按 URL pathname 检查无后续 `queue/join`；另有未取消时确实提交的正向对照。关闭了 SDK 自带重复历史记录，应用自己管理本地历史。

## 真实服务的当前限制

首次作者样本请求约 25 秒得到输出。随后浏览器真实闭环与原生 APK 也成功生成。多次验证后，作者公共服务返回 GPU quota exceeded，应用正确显示“公共试衣服务的 GPU 额度暂时用尽”。最近一次 `--live` 复测因此未获得新图片，并非把它计为成功。

取消修复后的 SDK 正常提交与中止由真实客户端离线对照测试覆盖；修复后的 APK 安装、历史读取、照片/相机/导出、离线与重启均再次通过。公共服务限额期间不伪造新生成、不绕过限额，也不自动重复提交。已有结果可离线查看，服务恢复后可继续尝试。

IDM-VTON 公共演示本次曾返回服务端错误，只作为研究备用。阿里云适配仅协议测试，尚无真实账户证据；不把它计入默认可运行体验。正式运营需部署自己的合规模型服务或开通稳定商业 API，本次交付是本地可安装、使用公共模型服务的应用。

## 本次环境与证据文件

独立设备：`YixuWardrobe_API36` / `emulator-5582`，Android16 x86_64。早期软件图形渲染模式曾导致模拟器退出；改用宿主 GPU 并关闭 Vulkan 后完成验证。测试设备使用宿主已有网络代理连接公共服务；真实手机同样需能访问 Hugging Face。没有修改宿主网络设置或其他模拟器数据。

生成记录：

- `artifacts/fashn-live-probe.json`、`artifacts/fashn-live-result.webp`：作者公共服装样本真实任务。
- `artifacts/android-live-result.jpg`：原生白衬衫真实生成图。
- `artifacts/android-verification.json`：最新 APK 的非联网回归，`success: true`。
- `artifacts/android-verification-live.json`：最近公共服务限额的真实记录。
- `artifacts/native-camera-verification.json`：系统相机返回的有效 JPEG。
- `artifacts/unit-test-results.json`、`artifacts/browser-test-results.json`：最终自动化报告。
- `artifacts/screenshots/`：布局、原生与生成截图。

运行输出与 APK 不进入 Git，源码、原创素材和下列原生预览进入 Git。重新构建可生成安装包。

## 复现原生系统文件测试

在专用模拟器安装 APK，把 `public/images/editorial.png` 放入模拟器 Downloads。通过应用「添加衣物 → 衣物照片 → Files」选择该图片，命名 `安卓导入白衬衫`，保存。在「我的档案」导出当天备份到 Downloads；保持默认文件名。然后运行 `npm run test:android`。脚本只连接专用序列号，不操作其他设备。`--live` 会上传明确的项目示例，需服务可用额度。

## 最新原生界面

| 今日 | 衣橱 | 真实试衣历史 |
| --- | --- | --- |
| ![今日](screenshots/today.png) | ![衣橱](screenshots/wardrobe.png) | ![真实试衣结果](screenshots/tryon.png) |
