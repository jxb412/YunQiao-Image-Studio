# YunQiao Image Studio

YunQiao Image Studio（云桥图像工坊 / 云桥Pro）是一款开源的 AI 图像生成与编辑桌面工具，基于 Electron、React 和 TypeScript 构建。它面向电商、短剧、自媒体、设计团队和商业内容生产场景，支持文生图、图生图、批量生产、行业模板、素材管理、AI 修图工具箱和云端存储。

项目默认使用 OpenAI `gpt-image-2` 模型完成图片生成和图片编辑：文生图调用图片生成接口，图生图、局部重绘和 AI 修图调用图片编辑接口。

## 核心功能

- 文生图创作：行业模板、提示词组合、尺寸/质量/格式参数控制。
- 图生图继续编辑：载入本地图片或生成结果，继续二次创作。
- AI 修图工具箱：扩图、去杂物、换背景、统一色调、商品光影、人像精修、局部重绘等。
- 批量生产工坊：支持 Excel 导入、多任务队列、批量图生图、底图文件夹绑定、暂停/继续/停止、失败重试和日志导出。
- 行业模板库：内置电商、短剧、漫画、自媒体、餐饮、品牌广告等模板。
- 作品素材库：保存生成结果、提示词、参数快照、本地路径和云端 URL。
- 云端存储：支持 OSS、COS、OBS、七牛、MinIO、FTP、SFTP。
- 固定接口：API Base URL 固定为 `https://api.0029.org`。
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
npm test
npm run build
```

## API 设置

在应用内打开 `API与云端存储设置` 页面，填写：

- API Base URL：固定为 `https://api.0029.org`，界面不提供自定义修改。
- API Key：由服务商提供，只保存在本机安全存储中。
- 请求超时时间：默认 300 秒，最高 600 秒。
- 测试 API：可在设置页直接测试 API Key 与接口连通性，并查看状态码、耗时和返回摘要。

如果使用 `0029.org` 服务，需要先到 `0029.org` 购买套餐并生成秘钥。

## 图片生成说明

本项目的图片生成和图片编辑能力均围绕 `gpt-image-2` 设计：

- 文生图：使用 `gpt-image-2` 生成图片。
- 图生图：使用 `gpt-image-2` 基于输入图片继续编辑。
- 局部重绘 / AI 修图：使用 `gpt-image-2` 图片编辑能力处理原图。

当前默认每次生成或编辑 1 张图片，不主动传递多图数量参数。这样可以避免部分中转接口把数量参数转换成 `tools[0].n` 后被官方接口拒绝。

图生图和编辑接口使用本地文件上传方式，避免把本地图片错误地以 `application/octet-stream` 的 URL 形式传给接口。

AI 修图工具箱支持局部遮罩：可在图片上绘制需要修改的区域，保存遮罩后会随下一次图片编辑请求一起提交。

## 批量生产说明

- Excel 列顺序：项目、行业、模板、数量、提示词、尺寸（可选）。
- 每条任务可单独绑定底图；有底图时走图生图，没有底图时走文生图。
- 可选择一个图片文件夹批量绑定底图，系统会按任务顺序循环分配。
- 队列支持暂停、继续、停止、失败重试和任务日志导出。
- 设置页和作品库支持真实云上传测试、URL 清单导出和素材包打包。

## 模板与项目管理

- 创作页支持填写项目名称，生成作品会自动归入对应项目。
- 行业模板库支持新增、编辑、导入和导出 JSON 模板包。
- 作品素材库支持搜索、项目筛选、云端状态筛选、预览、继续编辑、修图和打开本地文件位置。
- 顶部工具栏支持检查 GitHub 最新 Release，方便下载新版客户端。

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

## macOS 客户端打开方式

当前开源版本未做 Apple Developer ID 签名和公证，macOS 首次打开时可能提示“无法验证开发者”或“已损坏，无法打开”。下面方法只适用于你确认来源可信的软件；不明来源软件不要绕过系统安全检查。

方法 1：右键打开，单次临时放行。

1. 打开 DMG，把应用拖到 `Applications`。
2. 在 `Applications` 中找到应用。
3. 右键点击 `.app`，选择 `打开`。
4. 弹窗提示无法验证时，再次点击 `打开`。

这种方式较安全，但有时重启或重新打开后需要再次确认。

方法 2：终端移除隔离标记，永久放行。

打开“终端”，执行下面命令。可以把 `.app` 直接拖进终端自动补全路径：

```bash
xattr -cr /Applications/你的软件名.app
```

示例：

```bash
xattr -cr /Applications/云桥Pro.app
```

这条命令会删除 macOS 给下载应用添加的隔离检疫属性，之后通常可以正常双击打开。

方法 3：临时关闭安全策略，不推荐。

仅在你清楚风险时临时使用，用完务必恢复：

```bash
# 关闭公证拦截
sudo spctl --master-disable

# 恢复系统默认安全策略
sudo spctl --master-enable
```

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

## 文档

- [用户使用说明](./docs/05-user-guide.md)
- [产品 PRD](./docs/00-product-prd-final.md)
- [UI 设计规范](./docs/01-ui-design-spec.md)
- [技术与 API 规范](./docs/02-technical-api-spec.md)
- [行业提示词模板库](./docs/03-industry-prompt-library.md)
- [编译打包与交付说明](./docs/04-build-and-delivery.md)
- [macOS 构建说明](./MAC_BUILD.md)

## 安全说明

- 不要把真实 API Key、云存储 AccessKey、SecretKey 提交到 Git。
- `.env`、本地配置、构建产物和依赖目录已通过 `.gitignore` 排除。
- `config/api.example.json` 只保留示例配置。
- 生成的图片和云端 URL 由用户自行管理，请注意版权、隐私和平台合规要求。

## 开源协作

欢迎提交 Issue 和 Pull Request。适合优先完善的方向：

- 更多行业模板和提示词变量。
- 更完整的自动更新、签名和安装包分发流程。
- 更多兼容 OpenAI 图片接口的服务适配。
- 发布签名、自动更新和多平台 Release 流程。
- 更多兼容 OpenAI 图片接口的服务适配。
