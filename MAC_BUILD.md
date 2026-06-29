# macOS 构建说明

Windows 上不能直接生成 macOS `.app` 或 `.dmg`，electron-builder 会提示 macOS 构建只能在 macOS 上运行。当前工程已包含 macOS 图标 `build/icon.icns` 和 Mac 构建配置。

## 在 macOS 上生成 .app

```bash
npm install
bash scripts/build-mac-dir.sh
```

产物：

```text
release/mac/云桥Pro.app
```

## 在 macOS 上生成 DMG

```bash
npm install
bash scripts/build-mac.sh
```

产物：

```text
release/云桥Pro-0.1.8-*.dmg
```
