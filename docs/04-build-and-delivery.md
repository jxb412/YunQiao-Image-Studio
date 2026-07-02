# 云桥Pro 编译打包与客户交付说明

## 1. 客户是否需要安装环境

不需要。

客户只需要拿到开发方打包好的 Windows 便携版、macOS Intel DMG 或 macOS Apple Silicon DMG，双击即可运行。Node.js、npm、Electron、源码、开发依赖都只存在于开发机、打包机或 GitHub Actions 上。

## 2. 开发机需要安装什么

只有开发者或打包机需要:

- Node.js LTS
- npm
- Windows 10/11

安装 Node.js:

```powershell
winget install OpenJS.NodeJS.LTS
```

检查:

```powershell
node -v
npm -v
```

## 3. 第一次安装依赖

```powershell
cd D:\btc\st\st3
npm install
```

国内网络建议使用项目内置 `.npmrc`，它会把 npm、Electron、electron-builder 下载源切到国内镜像，避免 `ECONNRESET`。

如果曾经安装失败，先清理半截依赖:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm cache verify
npm install
```

## 4. 开发调试运行

```powershell
npm run dev
```

这一步只给开发者使用，客户不需要。

## 5. 打包 Windows 安装包

```powershell
cd D:\btc\st\st3
npm run dist:win
```

如果命令行里 npm 可用但脚本提示找不到 `node`，直接运行项目提供的一键脚本:

D:\btc\st\st3\scripts\build-win.cmd
```

输出目录:

```text
D:\btc\st\st3\release
```

客户拿到类似下面的文件即可安装:

```text
云桥Pro-0.1.14-x64.exe
```

## 6. 打包 Windows 绿色版

```powershell
npm run dist:win-portable
```

绿色版适合内测，客户无需安装，双击 exe 运行。

如果命令行 PATH 异常，使用一键绿色版脚本:

```bat
D:\btc\st\st3\scripts\build-win-portable.cmd
```

## 7. 客户交付包建议

正式交付:

```text
YunQiao-Image-Studio-0.1.14-win-x64-portable.exe
docs/05-user-guide.md
```

内测交付:

```text
云桥Pro-0.1.14-x64.exe
docs/05-user-guide.md
```

## 8. API Key 交付策略

不要把总测试 Key 写死进安装包。安装包里的密钥很容易被反编译或抓包拿到。

推荐三种方式:

1. 每个客户一个独立 API Key，首次启动时让客户输入。
2. 你做一个授权后台，客户端登录后由后台代理请求 `https://api.0029.org`。
3. 内测阶段临时把 Key 发给可信客户，但需要限制额度和有效期。

正式商业版推荐第 2 种: 客户只登录账号，不直接接触底层 API Key。

## 9. Windows 签名

未签名的 exe 可能触发 Windows SmartScreen 提示。

当前开源 Release 的 Windows 便携版未做商业代码签名，因此首次运行可能出现：

```text
Windows 已保护你的电脑
发布者：发布者未知
```

客户确认文件来自可信 GitHub Release 后，可以点击 `更多信息`，再点击 `仍要运行`。这只是 Windows 对未签名新应用的安全提示，不代表程序损坏。

正式对外销售建议购买代码签名证书，并在 electron-builder 中配置签名。签名后仍可能需要一段下载和安装信誉积累，SmartScreen 才会完全减少或消失。内测阶段可以先不签名，但需要明确提示客户这是内测包。

## 10. macOS 交付

macOS 客户同样不需要安装 Node。开发方在 macOS 打包:

```bash
npm run dist:mac
```

当前 GitHub Actions 会在 tag 发布时自动构建：

```text
YunQiao-Image-Studio-0.1.14-mac-x64.dmg
YunQiao-Image-Studio-0.1.14-mac-arm64.dmg
```

正式发布需要 Apple Developer 证书和 notarization，否则 macOS 会提示安全限制。未签名版本的打开方式见 `MAC_BUILD.md` 和 `docs/05-user-guide.md`。

## 11. GitHub Release 自动发布

推送 `v*` tag 会触发 `.github/workflows/release.yml`：

1. Windows runner 构建 Windows x64 便携版。
2. macOS runner 分别构建 Intel x64 DMG 和 Apple Silicon arm64 DMG。
3. 所有 job 运行 `npm run lint`、`npm run typecheck`、`npm test`、`npm run build`。
4. 构建产物上传到 GitHub Release。
5. 生成带渠道、最低支持版本、文件大小和 SHA256 的发布清单。
6. 如果配置了服务器 Secret，自动把三个客户端和发布清单上传到下载站目录。

GitHub Actions 自动上传需要配置：

- Secret `UPDATE_SSH_HOST`
- Secret `UPDATE_SSH_PORT`
- Secret `UPDATE_SSH_USER`
- Secret `UPDATE_SSH_PASSWORD`
- Secret `UPDATE_SSH_REMOTE_ROOT`

不要把服务器账号密码写入源码、README 或 workflow。

发布新版本建议流程：

```powershell
npm version 0.1.14 --no-git-tag-version
npm run lint
npm run typecheck
npm test
npm run build
npm run dist:win-portable
git add .
git commit -m "release: v0.1.14"
git tag -a v0.1.14 -m "YunQiao Image Studio v0.1.14"
git push origin main
git push origin v0.1.14
```
