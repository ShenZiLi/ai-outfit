# 衣序 Implementation Plan

> **For agentic workers:** 使用 executing-plans 在本会话顺序执行，用户已授权全程自主决策。每个阶段完成验证后提交本地 Git。

**Goal:** 交付具有真实试衣链路和持久化衣橱的可运行安卓 APK。

**Architecture:** 本地 React/TypeScript + IndexedDB，Android Java 宿主承载离线资源和系统能力。AI 服务独立适配，公共 IDM-VTON 与可配置阿里云试衣，不使用假生成。

**Tech Stack:** React、TypeScript、Vite、idb、Lucide、Gradio JS client、Vitest、Playwright、Java17、Android SDK36、Gradle8.14.5。

## Task 1 · 项目、数据与测试
- [x] 创建 package.json、TypeScript/Vite/Vitest 配置，依赖锁文件。
- [x] 先写 tests/domain.test.ts：拒绝无名称或无图的单品、中文搜索、组合推荐、删除引用清理、备份非法数据和密钥排除；运行 `npm test` 观察缺少功能失败。
- [x] 实现 src/domain.ts、src/storage.ts、src/seed.ts 和服装示例 SVG。快照由衣物、穿搭、试衣历史和档案组成，保存走事务。
- [x] 运行 `npm test` 与 `npm run build`，通过后本地提交。

## Task 2 · 可用手机界面
- [x] 先写 tests/app.spec.ts，覆盖入库、编辑、查询、刷新持久化、保存穿搭、数据备份。
- [x] 实现 src/App.tsx、src/components、src/screens、src/styles.css；图片压缩、模态框焦点、提示和持久化错误反馈。
- [x] `npm run test:e2e` 验证行为，手机/桌面截图检查无横向溢出和遮挡，提交。

## Task 3 · 真实试衣
- [x] 先写 tests/tryon.test.ts，覆盖传参、服务失败、取消、结果校验与阿里云任务状态。
- [x] 实现 src/tryon.ts：Gradio 客户端上传与队列、阿里云异步提交查询、取消、原图结果对比、历史落地。API 请求 4 分钟截止，取消不自动重复提交计费任务。
- [x] 用作者公开服务实际提交示例人像和原创上装，记录请求状态与生成输出/真实限制。单元测试通过、界面错误可重试后提交。

## Task 4 · Android 宿主和交付
- [x] 创建 android/settings.gradle、build.gradle、app/build.gradle、AndroidManifest.xml、MainActivity.java、资源及 scripts/build-android.ps1。打包 React 输出到资产目录。
- [x] 系统照片选择和拍照、下载导出、HTTPS 请求桥、外部导航拦截、Android 返回键。
- [x] `npm run android:build` 生成 APK；启动独立任务模拟器，`adb install -r` 和 `am start`，检查界面、离线与重启持久化以及原生导出。
- [x] 完成 README、docs/verification.md、APK 校验摘要，运行最终测试构建与日志检查，提交全部本次文件。

## 追踪
所有阶段以实际代码、测试输出、截图与安装包为证据，不因尚缺密钥或公共演示限额把真实 AI 生成视为已验证。
