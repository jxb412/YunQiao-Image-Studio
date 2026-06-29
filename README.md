# YunQiao Image Studio

YunQiao Image Studio（云桥图像工坊 / 云桥Pro）是一款开源的 AI 图像生成与编辑桌面工具，基于 Electron、React 和 TypeScript 构建。它面向电商、短剧、自媒体、设计团队和商业内容生产场景，支持文生图、图生图、批量生产、行业模板、素材管理、AI 修图工具箱和云端存储。

项目默认使用 OpenAI `gpt-image-2` 模型完成图片生成和图片编辑：文生图调用图片生成接口，图生图、局部重绘和 AI 修图调用图片编辑接口。

## 核心功能

- 文生图创作：行业模板、提示词组合、尺寸/质量/格式参数控制。
- 图生图继续编辑：载入本地图片或生成结果，继续二次创作。
- AI 修图工具箱：扩图、去杂物、换背景、统一色调、商品光影、人像精修、局部重绘等。
- 批量生产工坊：支持 Excel 导入、多任务队列、失败记录和逐张生成。
- 行业模板库：内置电商、短剧、漫画、自媒体、餐饮、品牌广告等模板。
- 作品素材库：保存生成结果、提示词、参数快照、本地路径和云端 URL。
- 云端存储：支持 OSS、COS、OBS、七牛、MinIO、FTP、SFTP。
- 自定义接口：支持自定义兼容 OpenAI 图片接口的 API Base URL。
- 本机安全存储：API Key 和云存储密钥只保存在本机安全存储中。
- 跨平台配置：同一套代码支持 Windows 和 macOS 构建。

## 技术栈

- Electron
- Electron Vite
- React
- TypeScript
- Lucide React
- OpenAI 兼容图片接口
- 默认图片模型：`gpt-image-2`

## 快速开始

安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

代码检查：

```bash
npm run lint
npm run typecheck
npm run build
```

## API 设置

在应用内打开 `API与云端存储设置` 页面，填写：

- API Base URL：默认示例为 `https://api.0029.org`，也可以改成其他兼容 OpenAI 图片接口的服务地址。
- API Key：由服务商提供，只保存在本机安全存储中。
- 请求超时时间：默认 300 秒，最高 600 秒。

如果使用 `0029.org` 服务，需要先到 `0029.org` 购买套餐并生成秘钥。

## 图片生成说明

本项目的图片生成和图片编辑能力均围绕 `gpt-image-2` 设计：

- 文生图：使用 `gpt-image-2` 生成图片。
- 图生图：使用 `gpt-image-2` 基于输入图片继续编辑。
- 局部重绘 / AI 修图：使用 `gpt-image-2` 图片编辑能力处理原图。

当前默认每次生成或编辑 1 张图片，不主动传递多图数量参数。这样可以避免部分中转接口把数量参数转换成 `tools[0].n` 后被官方接口拒绝。

图生图和编辑接口使用本地文件上传方式，避免把本地图片错误地以 `application/octet-stream` 的 URL 形式传给接口。

## Windows 构建

生成便携版：

```bat
scripts\build-win-portable.cmd
```

或：

```bash
npm run dist:win-portable
```

产物默认输出到：

```text
release/
```

## macOS 构建

Windows 不能直接生成 macOS `.app` 或 `.dmg`，需要在 macOS 或 GitHub Actions 的 macOS Runner 上构建。

生成 `.app` 目录：

```bash
bash scripts/build-mac-dir.sh
```

生成 `.dmg`：

```bash
bash scripts/build-mac.sh
```

更多说明见 [MAC_BUILD.md](./MAC_BUILD.md)。

## 项目结构

```text
src/main/        Electron 主进程
src/preload/     预加载桥接层
src/renderer/    React 前端界面
src/shared/      共享类型、API 适配、尺寸校验、提示词合成
config/          示例配置和模板数据
docs/            PRD、UI、API 和交付文档
scripts/         Windows/macOS 构建与图标脚本
build/           应用图标资源
```

## 安全说明

- 不要把真实 API Key、云存储 AccessKey、SecretKey 提交到 Git。
- `.env`、本地配置、构建产物和依赖目录已通过 `.gitignore` 排除。
- `config/api.example.json` 只保留示例配置。
- 生成的图片和云端 URL 由用户自行管理，请注意版权、隐私和平台合规要求。

## 开源协作

欢迎提交 Issue 和 Pull Request。适合优先完善的方向：

- 更多行业模板和提示词变量。
- 更完整的批量队列控制。
- 更强的局部重绘和遮罩编辑体验。
- 发布签名、自动更新和多平台 Release 流程。
- 更多兼容 OpenAI 图片接口的服务适配。
