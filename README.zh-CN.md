<p align="center"><img src="public/icons/yixu-icon-192.png" width="96" alt="衣序冰川蓝折纸衣服图标" /></p>

# 衣序 YIXU · AI 衣橱

**让已有的衣服，穿出更多可能。** 本地保存衣橱、整理穿搭，联网生成 AI 试衣效果的安卓应用。

[English](README.md) · [安卓构建](https://github.com/ShenZiLi/ai-outfit/actions/workflows/android.yml) · [验证记录](docs/verification.md)

把衣物管理、穿搭组合和试衣放在一起。当前应用界面为中文。这是独立项目，参考「个人形象 → 选衣 → 上身效果」流程，与淘宝无官方关联。

## 应用预览

下图为 2026 年 10 月 24 日验证时的安卓模拟器截图，其中试衣间显示此前真实生成的结果。本轮真机截图仍等待手机解锁，详见[当前验证状态](docs/verification-2026-10-30.md)。

| 今日 | 衣橱 | 试衣间 |
| --- | --- | --- |
| ![今日页的衣橱统计与穿搭灵感](docs/screenshots/today.png) | ![衣橱页的分类与示例单品](docs/screenshots/wardrobe.png) | ![试衣间此前真实生成的试衣结果](docs/screenshots/tryon.png) |

## 功能

- **衣橱**：相册/拍照入库，记录分类、颜色、季节、场景、品牌与价格；支持搜索、筛选、排序、收藏、编辑和删除。
- **穿搭**：组合已有单品，保存笔记、记录「今天穿了」，累计穿着次数与每次穿着成本。本地搭配建议使用规则推荐。
- **AI 试衣**：选择人像与上装、外套、下装或连衣裙，确认上传后查看队列、取消、原图对比、导出和保存结果。
- **个人档案**：档案、试衣历史、穿搭集，完整 JSON 备份与恢复。数据和照片保存在本机。
- **离线使用**：整理与浏览本地内容；生成新的 AI 结果需要联网。

初次启动含 8 件标注清楚的原创示例衣物与 AI 示例人像。示例可删除，清空后不会重新注入。鞋履与配饰支持管理和穿搭组合，当前试衣模型不支持换装。

## 安装与上手

1. 打开 [Build Android APK](https://github.com/ShenZiLi/ai-outfit/actions/workflows/android.yml)，选择成功的运行，下载 **yixu-wardrobe-android**，解压 APK 和 SHA256 文件。下载可能需要登录 GitHub，产物保留 30 天。
2. 安装到 Android 8.0+ 手机，Android System WebView / Chrome 需为 111 或更新版本。当前构建使用调试签名。
3. 在「衣橱」添加衣物；在「试衣间」选人像和衣物，确认上传后生成效果。
4. 在「穿搭集」保存组合或结果；右上角头像进入档案，可导出备份。

本地打包输出 `artifacts/yixu-wardrobe-1.0.0.apk`，构建产物不随 Git 分发。云端和本机调试签名可能不同；若更新提示签名冲突，先导出衣橱再卸载、重装并恢复备份。

## 试衣服务与隐私

| 服务 | 限制 |
| --- | --- |
| FASHN · 默认 | Hugging Face 上的作者公开 FASHN VTON 1.5 演示，无需 API Key；需能访问该服务，可用性、排队时间与 GPU 额度随服务变化。 |
| IDM-VTON · 研究备用 | 仅上装，受非商业研究限制；此前检查曾遇到公共服务端错误。 |
| 阿里云 · 可选 | 自行开通北京地域试衣 Plus 并提供密钥，可能收费；已有协议测试，尚未用真实账户验证。 |

照片只在确认后上传，远程处理与留存遵循服务方政策。密钥仅当前会话使用，不进入备份。应用没有账号、广告或行为分析。

AI 可能改变衣物细节，不能判断实际尺码或合身度。身高体重仅作档案记录。卸载会删除本地数据，备份包含照片。正式运营需稳定服务并核对适用条款。

## 本地开发

需要 Node.js 22.12+（CI 使用 24）、npm、JDK 17、Android SDK Platform 36 与 Build Tools 36.1.0。依赖以 `package-lock.json` 为准。

```sh
git clone https://github.com/ShenZiLi/ai-outfit.git
cd ai-outfit
npm ci
npm run dev
```

打开 Vite 显示的地址，通常为 `http://localhost:5173`。浏览器与安卓应用的数据相互独立。

```sh
npm run build
npm run preview
npm test
npm run format:check
npx playwright install chromium
npm run test:e2e
```

### 安卓构建

**Windows：** 设置 `ANDROID_HOME` 或 `ANDROID_SDK_ROOT`，运行 `npm run android:build`。PowerShell 脚本打包前端、执行安卓构建/lint，并输出 APK 与校验文件。

**macOS/Linux：** 在 `android/local.properties` 设置 `sdk.dir=/absolute/path/to/sdk`，然后：

```sh
npm run build
mkdir -p android/app/src/main/assets/www
cp -R dist/. android/app/src/main/assets/www/
cd android
bash ./gradlew --console=plain assembleDebug lintDebug
```

APK 位于 `android/app/build/outputs/apk/debug/app-debug.apk`。可用 Android Studio 打开 `android/`。前端改动后需重新打包网页资源；SDK 路径、密钥、缓存与签名文件不要进入 Git。正式分发需发布签名。

推送到 `main` / `codex/**`、提交 PR 或手动触发 Actions，将执行依赖安装、格式检查、单元测试、前端构建与安卓构建/lint。

### 集成验证

`YIXU_LIVE_AI=1 npx playwright test tests/live-tryon.spec.ts --workers=1` 仅上传项目示例，调用公共 GPU 服务，可能因网络或额度失败。普通测试不依赖该服务。

`npm run test:android` 只操作专用 `emulator-5582`，不会自动选择当前连接的手机。样本准备和历史检查见[验证记录](docs/verification.md)。[当前验证状态](docs/verification-2026-10-30.md)记录本轮已完成的构建检查，以及待完成的真机安装与截图。

## 工程结构

| 路径 | 职责 |
| --- | --- |
| `src/domain.ts`、`src/storage.ts` | 衣橱规则、校验、备份与 IndexedDB |
| `src/screens/`、`src/components/` | React 页面、表单与弹窗 |
| `src/tryon.ts` | 服务适配、取消与结果下载 |
| `android/app/src/main/java/` | 安卓宿主、系统照片/文件与受限网络桥 |
| `public/icons/` | 选定的 imagegen 冰川蓝折纸图标 |
| `docs/icon-concepts/` | 设计候选与生成提示词 |

## 贡献与署名

欢迎提交 [Issue](https://github.com/ShenZiLi/ai-outfit/issues)，附复现步骤、设备/WebView 版本与脱敏日志，或提交范围清晰的 PR。运行相关检查，不提交个人照片、凭据、本机配置或构建产物。

请阅读[项目规范](AGENTS.md)、[调研决策](docs/research.md)和[第三方说明](THIRD_PARTY_NOTICES.md)。首页照片、示例人像及本次图标使用 imagegen 生成；示例衣物 SVG 为原创素材。目前没有声明项目代码许可证，依赖与模型许可各自适用。
