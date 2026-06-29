# 云桥Pro 编译打包与客户交付说明

## 1. 客户是否需要安装环境

不需要。

客户只需要拿到开发方打包好的 Windows 安装包或绿色版程序，双击即可运行。Node.js、npm、Electron、源码、开发依赖都只存在于开发机和打包机上。

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
cd D:\btc\st
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
cd D:\btc\st
npm run dist:win
```

如果命令行里 npm 可用但脚本提示找不到 `node`，直接运行项目提供的一键脚本:

```bat
D:\btc\st\scripts\build-win.cmd
```

输出目录:

```text
D:\btc\st\release
```

客户拿到类似下面的文件即可安装:

```text
云桥Pro-0.1.0-x64.exe
```

## 6. 打包 Windows 绿色版

```powershell
npm run dist:win-portable
```

绿色版适合内测，客户无需安装，双击 exe 运行。

如果命令行 PATH 异常，使用一键绿色版脚本:

```bat
D:\btc\st\scripts\build-win-portable.cmd
```

## 7. 客户交付包建议

正式交付:

```text
云桥Pro-Setup.exe
使用说明.pdf
```

内测交付:

```text
云桥Pro-Portable.exe
使用说明.txt
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

正式对外销售建议购买代码签名证书，并在 electron-builder 中配置签名。内测阶段可以先不签名，但需要提示客户这是内测包。

## 10. macOS 后续交付

macOS 客户同样不需要安装 Node。开发方在 macOS 打包:

```bash
npm run dist:mac
```

正式发布需要 Apple Developer 证书和 notarization，否则 macOS 会提示安全限制。
