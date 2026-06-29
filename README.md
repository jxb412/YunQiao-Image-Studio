# 云桥Pro

云桥Pro 是一个基于 Electron、React 和 TypeScript 的 AI 商用生图桌面端，支持文生图、图生图、批量生产、作品素材库、云端上传和 AI 修图工具箱。

## 功能

- 文生图创作和图生图继续编辑
- AI 修图工具箱
- 批量生产工坊
- 行业模板库
- 作品素材库
- 云端存储配置
- 自定义 API Base URL 和本机安全存储 API Key
- Windows / macOS 多平台打包配置

## 开发

```bash
npm install
npm run dev
```

## 检查

```bash
npm run lint
npm run typecheck
npm run build
```

## Windows 打包

```bat
scripts\build-win-portable.cmd
```

或：

```bash
npm run dist:win-portable
```

## macOS 打包

macOS 产物需要在 macOS 上打包：

```bash
bash scripts/build-mac.sh
```

详见 [MAC_BUILD.md](./MAC_BUILD.md)。

## API 设置

在应用的 `API与云端存储设置` 页面填写：

- API Base URL，例如 `https://api.0029.org`
- API Key

API Key 只保存在本机安全存储中，不应提交到 Git。
