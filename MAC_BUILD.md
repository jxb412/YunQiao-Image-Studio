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

产物示例：

```text
release/云桥Pro-0.1.9-x64.dmg
release/云桥Pro-0.1.9-arm64.dmg
```

GitHub Release 自动构建会生成：

```text
YunQiao-Image-Studio-0.1.9-mac-x64.dmg
YunQiao-Image-Studio-0.1.9-mac-arm64.dmg
```

- Intel 芯片 Mac 下载 `mac-x64.dmg`。
- M1/M2/M3/M4 等 Apple Silicon Mac 下载 `mac-arm64.dmg`。

## 未签名应用的打开方式

当前开源构建默认未做 Apple Developer ID 签名和公证，macOS 可能提示“无法验证开发者”或“已损坏，无法打开”。下面方法只适用于你确认来源可信的软件；不明来源软件不要绕过系统安全检查。

### 方法 1：右键打开

1. 打开 DMG，把应用拖到 `Applications`。
2. 在 `Applications` 中右键点击 `.app`。
3. 选择 `打开`。
4. 弹窗提示无法验证时，再次点击 `打开`。

### 方法 2：移除隔离标记

打开“终端”，执行：

```bash
xattr -cr /Applications/你的软件名.app
```

示例：

```bash
xattr -cr /Applications/云桥Pro.app
```

### 方法 3：临时关闭安全策略（不推荐）

仅在你清楚风险时临时使用，用完务必恢复：

```bash
sudo spctl --master-disable
sudo spctl --master-enable
```
