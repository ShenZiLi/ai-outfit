# 衣序 YIXU · AI 衣橱

参考淘宝 AI 试衣的「个人形象 → 选衣 → 上身效果」流程，做一个把已有衣服穿得更好的安卓应用。原创界面与素材，非淘宝官方产品。

## 直接使用

安卓安装包：[`artifacts/yixu-wardrobe-1.0.0.apk`](artifacts/yixu-wardrobe-1.0.0.apk)。构建后同时生成 SHA256 校验文件。

1. 将 APK 传到安卓手机，允许该来源安装后打开「衣序」。支持 Android 8.0 及以上，系统 Android System WebView / Chrome 需为 111 或更新版本。
2. 在「衣橱」添加衣物，从相册导入或拍照。记录分类、颜色、季节、场景、品牌与价格，可搜索、收藏和编辑。
3. 在「试衣间」添加全身照或使用 AI 示例模特，再选一件衣物。确认上传后，等待真实 AI 生成上身效果。
4. 在结果页对比原图、导出图片或保存到「穿搭集」。点「今天穿了」记录穿着，单品同步累计次数与每次穿着成本。
5. 右上角头像进入「我的档案」，设置个人信息、切换试衣服务、导出或恢复完整衣橱备份。

衣橱、照片和历史保存在本机。离线可整理衣物和查看已保存结果。**生成新试衣图需要联网，默认 FASHN 公共服务需要能访问 Hugging Face。** 它是作者公共演示，可能排队、限额或不可用。应用显示真实状态和错误，不用叠图或预制图片冒充新生成。

初次打开附带 8 件明确标注的原创示例衣物。可直接删除；清空后不会重新注入。首页封面和示例模特为 AI 创作。本地场景搭配为规则推荐，界面明确标识。

## 功能

| 模块 | 已实现行为 |
| --- | --- |
| 今日 | 实际衣橱统计、收藏单品、按场景组合现有衣物、保存推荐组合 |
| 衣橱 | 相册/拍照入库、增删改、中文关键词组合搜索、分类/季节/收藏筛选、排序 |
| 试衣间 | 本人或示例人像、上装/外套/下装/连衣裙、上传确认、真实排队、取消、超时、原图对比、历史与图片导出 |
| 穿搭集 | 单品组合或试衣结果、场景/笔记、收藏、穿着足迹、删除 |
| 我的 | 昵称、照片、身高体重、服务配置、完整 JSON 备份校验与确认恢复 |
| 安卓系统 | 离线打包资源、系统文件选择/拍照、系统文件保存、返回键、安全区域、旧 WebView 提示 |

鞋履与配饰支持衣橱管理和穿搭组合，当前模型不支持其换装。AI 效果可能改变细节，不能判定实际尺码与合身度。身高体重只作档案记录。

## 服务与隐私

- **FASHN（默认）**：作者公开的 FASHN VTON 1.5 演示，无需 API Key，已完成真实调用验证。
- **IDM-VTON（备用研究演示）**：仅上装，仅限非商业研究。当前检查中公共演示曾返回服务端错误，可切回 FASHN。
- **阿里云（可选适配）**：需自行开通北京地域试衣 Plus 并提供密钥，可能收费。只有协议、错误与任务状态测试，未用真实账户验证，不属于默认开箱体验。服务地址与图片输入要求以账户当前文档为准。

照片在确认后才发送给所选服务，处理与留存由服务方决定。密钥仅在当前会话使用，不进入 Git 或备份。应用无自建账号、广告和行为分析。卸载会删除本地衣橱，请先备份；备份含照片，请妥善保管。

## GitHub Actions 构建

推送到 `main` 或 `codex/**`、提交 Pull Request，或在 Actions 中手动运行 **Build Android APK**，都会执行依赖安装、格式检查、单元测试、前端打包及安卓构建/静态检查。

在 [Actions](https://github.com/ShenZiLi/ai-outfit/actions/workflows/android.yml) 打开成功的运行，下载 **yixu-wardrobe-android** 产物。ZIP 内含可安装 APK 和 SHA256 校验文件，保留 30 天。运行摘要也提供下载入口。测试与 lint 报告单独保留 14 天。

云端使用 Ubuntu24.04、Node24、JDK17、Android SDK36 与 Build Tools36.1.0，不需要本机路径、模型密钥或正式签名密钥。生成的是调试签名 APK；云端和本机调试签名可能不同，若更新安装提示签名冲突，请先在旧版导出衣橱备份，再卸载旧版安装新包、导入备份。

## 本地开发与构建

环境：Node.js 22.12+（本机使用 24）、JDK 17、Android SDK 36、Build Tools 36.1.0。SDK 默认读取 `ANDROID_HOME` / `ANDROID_SDK_ROOT`，或 Windows 的 `%LOCALAPPDATA%\Android\Sdk`。

```powershell
npm ci
npm run dev
```

浏览器打开终端显示的地址。支持手机、横屏、平板和桌面。浏览器预览与安卓应用数据相互独立。

```powershell
npm run android:build
```

脚本将页面与图片打进 APK，执行 Android lint，输出 APK 和校验摘要。默认调试签名包适合本地体验；上架需正式签名。

可在 Android Studio 打开 `android/`。修改前端后需重新运行打包脚本。仅修改 Java 时可用 `android/gradlew.bat -p android assembleDebug lintDebug`。不要提交 `local.properties`、缓存或密钥。

## 验证

```powershell
npm test
npm run format:check
npx playwright install chromium
npm run test:e2e
```

默认不调用外部 GPU。真实测试仅上传项目公开的 AI 示例人像与原创示例衣物：

```powershell
$env:YIXU_LIVE_AI = '1'
npx playwright test tests/live-tryon.spec.ts --workers=1
```

`node scripts/probe-fashn.mjs` 使用原创人像与作者公共服装样本，记录真实任务状态和输出到 `artifacts/`。应用会把生成图片下载到本地，不依赖临时链接。

`scripts/start-emulator.ps1` 创建独立测试设备，需要 API36 Google APIs x86_64 镜像。`scripts/verify-android.mjs` 核验打包资源、原生备份、重启、离线重载与返回键；`--live` 额外真实试衣。只连接 `emulator-5582`。原生导入/导出测试样本准备见 [验证记录](docs/verification.md)。

## 结构与资料

- `src/domain.ts`：数据、校验、检索、搭配与备份。
- `src/storage.ts`：IndexedDB 持久化，保存失败保留原状态。
- `src/screens/`、`src/components/`：界面与表单。
- `src/tryon.ts`：真实服务适配与错误处理。
- `android/app/src/main/java/`：安卓宿主、照片、文件和受限网络桥。
- [调研决策](docs/research.md)、[验证记录](docs/verification.md)、[第三方说明](THIRD_PARTY_NOTICES.md)。

规范见 [AGENTS.md](AGENTS.md)：每次完成变更并验证后，提交本地 Git。
