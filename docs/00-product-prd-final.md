# 云桥Pro AI生图桌面端 PRD 最终落地版

版本: v1.0  
日期: 2026-06-28  
模型: `gpt-image-2`  
默认 API Base URL: `https://api.0029.org`，可在设置页自定义兼容 OpenAI 图片接口的服务地址

## 1. 产品定位

云桥Pro 是一款面向商用生产的桌面 AI 生图软件，服务电商美工、短剧制作团队、漫画原画师、自媒体 MCN、品牌设计团队。核心价值不是单次生成好看图片，而是让用户完成可批量、可归档、可复用、可继续编辑的生产闭环。

核心口号: 批量出图、云端归档、无限续改、商用交付。

## 2. 技术校准结论

豆包原文中的四分支模型需要调整为真实可开发形态:

1. 模型只有一个主模型: `gpt-image-2`。
2. “极速草图、高清商业、影视写实、二次元漫画”不作为模型 ID，而作为产品预设。
3. 预设通过 `quality`、`size`、`output_format`、行业提示词、后处理参数组合实现。
4. `负面提示词`不是独立 API 参数，需要在最终 prompt 中拼接为“避免出现...”约束。
5. `创意自由度、锐化、饱和度、景深、电影镜头`不是官方独立参数，应分为两类:
   - 镜头、景深、风格、构图: 写入 prompt。
   - 锐化、饱和度、压缩、格式: 应用层后处理或导出层控制。
6. 图生图相似度没有单独 `strength` 参数。云桥Pro 内部把相似度映射为提示词强度、参考图保真工作流、局部 mask 范围，而不是传一个不存在的 API 字段。
7. `gpt-image-2` 的 GPT 图像模型默认返回 base64 图片，不返回长期 URL。云桥Pro 的公网 URL 必须由软件上传到 OSS/COS/OBS/MinIO/FTP/SFTP 后生成。
8. `gpt-image-2` 当前不支持 `background: "transparent"`。透明底素材应作为后处理能力实现，例如本地抠图、第三方背景移除、或后续接入专用抠图模型。

## 3. 目标用户

### 3.1 电商美工

典型任务:

- 商品白底主图
- 场景种草图
- 详情页卖点图
- 多 SKU 批量图
- 节日促销图
- 直播间背景

关键诉求:

- 出图风格统一
- 商品不能变形
- 支持 Excel 批量关键词
- 支持云端 URL 直接给运营上架

### 3.2 短剧制作团队

典型任务:

- 竖版封面
- 角色定妆
- 剧情海报
- 分镜气氛图
- 场景概念图

关键诉求:

- 人物气质一致
- 竖版 9:16 优先
- 情绪和戏剧冲突强
- 可用同一张图反复图生图微调

### 3.3 漫画原画师

典型任务:

- 角色设定
- 三视图
- 表情表
- 分镜页
- 线稿上色
- 背景设定

关键诉求:

- 线条清晰
- 角色稳定
- 分镜构图明确
- 支持局部重绘修脸、修手、修道具

### 3.4 自媒体 MCN

典型任务:

- 小红书封面
- 抖音封面
- B 站封面
- 公众号头图
- 知识图解
- 账号 IP 形象

关键诉求:

- 强点击率构图
- 留白方便加字
- 批量换标题和主题
- 云端分发和链接复制方便

## 4. 平台范围

一期:

- Windows 10/11 桌面客户端

二期:

- macOS 13+ 桌面客户端

三期:

- 团队账号、云端协作、素材共享、权限管理

## 5. 推荐技术方案

推荐采用 Electron + React + TypeScript + SQLite 的全 TypeScript 技术栈。

选择理由:

- Windows 当前落地最快，macOS 后续打包迁移成本低。
- OSS/COS/OBS/七牛/MinIO/FTP/SFTP 的 Node SDK 和生态更完整。
- Excel 批处理、文件系统、压缩包、图片处理、上传队列更容易实现。
- React 生态适合复杂工作台、画布、素材库、参数面板。
- TypeScript 前后端统一，团队招人和维护更友好。

建议技术组成:

- 桌面壳: Electron
- 前端: React + Vite + TypeScript
- UI: Tailwind CSS + Radix UI 或 Ant Design X 风格自研主题
- 图像画布: Fabric.js 或 Konva
- 本地数据库: MVP 阶段先用 JSON/IndexedDB 或纯 JS SQLite 方案，避免客户侧和打包机依赖 Python/Visual Studio 编译工具。正式作品库阶段再接 SQLite。
- 本地文件索引: JSON/IndexedDB + 磁盘目录，正式版可升级 SQLite + 磁盘目录
- Excel: ExcelJS
- 图片后处理: MVP 阶段先用 Canvas/浏览器能力，正式版可引入 sharp 或独立后处理服务
- 上传队列: MVP 阶段使用本地 JSON 队列，正式版可升级 SQLite 队列表
- 密钥保存: keytar 或 Electron safeStorage + OS Keychain/Credential Manager
- 打包: electron-builder

备选方案:

- Tauri + React + Rust: 包体更小，安全边界更好，但多云存储 SDK 和 FTP/SFTP 落地成本更高。
- Flutter: UI 跨平台优秀，但桌面端复杂文件、云存储、画布和 Node 生态不如 Electron 直接。

最终建议: v1 用 Electron 快速商业化落地。后续如对包体极度敏感，再评估 Tauri 重构外壳，业务层保持 TypeScript core 包。

## 6. 信息架构

左侧 8 大入口:

1. 工作台
2. 文生图创作
3. 图生图与局部重绘
4. 批量生产工坊
5. 行业模板库
6. 作品素材库
7. AI 修图工具箱
8. API 与云端存储设置

顶部通栏:

- Logo 与标题: 云桥Pro AI绘图 · GPT-Image-2 商用专业版
- 搜索框: 搜索模板/关键词/历史作品
- 当前模型: `gpt-image-2`
- 质量档位: 草稿/标准/精修/自动
- 云同步状态
- 算力/额度
- 设置
- 窗口控制

右侧固定面板:

- 当前预览
- 图像信息
- 云端 URL
- 一键复制
- 载入图生图继续创作
- 导出
- 上传队列

底部状态栏:

- API 连接
- 网络代理
- 当前队列
- 剩余任务
- 今日出图
- 本地缓存占用

## 7. 模块需求

### 7.1 工作台

核心内容:

- 今日出图数量
- 本月出图数量
- 剩余额度或预估消耗
- 云端容量
- 最近项目
- 最近作品
- 最近失败任务
- 四大行业快捷入口
- 常用尺寸入口

快捷入口:

- 电商主图
- 短剧封面
- 漫画角色
- 小红书封面
- 商品换背景
- 局部重绘
- Excel 批量生成
- OSS 上传配置

### 7.2 文生图创作

表单字段:

- 行业: 电商/短剧/漫画/自媒体/品牌广告/游戏/家装/教育/文旅/餐饮
- 场景模板
- 正向描述
- 避免内容
- 关键词优化开关
- 输出尺寸
- 质量档位
- 输出格式
- 生成张数暂不在接口参数中传递，当前默认每次返回 1 张
- 自动上传
- 保存到项目

真实 API 映射:

- `model`: 固定 `gpt-image-2`
- `prompt`: 由用户描述、行业模板、避免内容、输出约束组合
- `size`: UI 尺寸
- `quality`: `low` / `medium` / `high` / `auto`
- `n`: 暂不传递，当前默认生成 1 张；批量生产按任务循环逐张生成。
- `output_format`: `png` / `jpeg` / `webp`
- `output_compression`: 仅 JPEG/WebP 有效
- `background`: `auto` / `opaque`。`gpt-image-2` 当前不支持 `transparent`。
- `moderation`: `auto` 默认，企业内部测试可提供 `low` 选项但需提示合规风险。

重要闭环:

- 每张生成结果都必须保存完整参数快照。
- 每张结果都显示“载入图生图继续创作”。
- 点击后进入图生图页，自动带入原图和上轮参数。

### 7.3 图生图与局部重绘

核心能力:

- 单图参考重绘
- 多图参考融合
- 局部 mask 重绘
- AI 扩图
- 换背景
- 擦除物体
- 商品保真换场景
- 角色一致性续改

真实 API 映射:

- 端点: `/v1/images/edits`
- `model`: `gpt-image-2`
- `images`: 1 到 16 张参考图
- `mask`: 局部重绘时传入
- `prompt`: 编辑目标
- `size`: 输出尺寸
- `quality`: 输出质量
- `output_format`: 输出格式
- `output_compression`: 压缩
- `n`: 暂不传递，当前默认 1 张

不应传入:

- `strength`
- `cfg_scale`
- `seed`
- `negative_prompt`
- `steps`
- `sampler`
- `input_fidelity`。默认不在 UI 暴露、不主动传。官方模型摘要说明 `gpt-image-2` 对图片输入已默认高保真；若 `api.0029.org` 实测兼容该字段，可在开发者实验开关中启用。

相似度 UI 设计:

- 90% 到 100%: “尽量保持原图主体、脸部、商品结构、构图，仅调整指定细节”
- 70% 到 89%: “保持主体和大构图，允许调整光线、背景、材质和局部姿态”
- 40% 到 69%: “保留主体特征，允许重新设计场景、风格和构图”
- 0% 到 39%: “仅把原图作为灵感参考，可大幅重构”

这些相似度不直接进入 API 参数，而是进入 prompt 生成器。

### 7.4 批量生产工坊

输入方式:

- Excel
- CSV
- 手工表格
- 文件夹底图
- 粘贴多行关键词

Excel 字段建议:

- `project`
- `industry`
- `template_id`
- `subject`
- `product_name`
- `selling_points`
- `style`
- `scene`
- `size`
- `quality`
- `count`
- `output_format`
- `upload`
- `folder`

批处理规则:

- 单个 API 请求默认 1 张，不主动传递 `n`。
- 用户选择 16 张、50 张、100 张时，系统拆分为多个 job 并逐张生成。
- 每个 job 有独立状态: waiting/running/succeeded/failed/canceled。
- 支持失败重试、暂停、继续、跳过。
- 生成后自动入库、归档、可上传云端。

### 7.5 行业模板库

模板结构:

- 模板名称
- 行业
- 使用场景
- 推荐尺寸
- 推荐质量
- 推荐格式
- Prompt 模板
- 避免内容
- 参数默认值
- 示例变量

模板操作:

- 一键使用
- 收藏
- 另存为我的模板
- 导入/导出
- 批量套用

### 7.6 作品素材库

作品需要保存:

- 原图文件
- 缩略图
- 云端 URL
- prompt
- 避免内容
- 最终合成 prompt
- 模型
- API 参数
- 所属项目
- 标签
- 生成来源
- 父级作品 ID
- 迭代链路

核心功能:

- 项目分类
- 标签筛选
- 按行业筛选
- 按尺寸筛选
- 批量导出
- 批量上传
- 批量复制 URL
- 复制全套提示词
- 查看迭代历史
- 继续图生图

### 7.7 AI 修图工具箱

功能映射:

- 扩画布: edits + 画布扩展后的透明或纯色底图 + prompt
- 去杂物: edits + mask + prompt
- 换背景: edits + mask/主体保留 prompt
- 统一色调: edits + 原图 + 色调 prompt
- 商品光影优化: edits + 原图 + 商品保真 prompt
- 线稿提取: edits 或本地 CV 后处理，优先本地后处理再给模型优化
- 无损放大: 不属于 `gpt-image-2` 原生参数，建议本地或第三方超分模块

每个修图输出同样进入作品库，并支持继续图生图。

## 8. 云端存储系统

支持类型:

- 阿里云 OSS
- 腾讯云 COS
- 华为云 OBS
- 七牛云
- MinIO
- FTP
- SFTP

配置项:

- 存储名称
- 类型
- Endpoint/Region
- Bucket
- AccessKey
- SecretKey
- 根目录
- CDN 域名
- 公网 URL 前缀
- 默认通道
- 自动上传
- 测试连接

存储模式:

- 仅本地保存
- 本地保存 + 云端上传
- 仅云端保存

路径变量:

- `{industry}`
- `{project}`
- `{template}`
- `{year}`
- `{month}`
- `{day}`
- `{timestamp}`
- `{serial}`
- `{img_type}`
- `{size}`
- `{quality}`

默认路径:

```text
{industry}/{project}/{year}{month}{day}/{img_type}/{serial}_{timestamp}_{size}.{ext}
```

上传链路:

1. 图片生成完成。
2. 写入本地临时文件。
3. 生成作品记录。
4. 若自动上传开启，加入上传队列。
5. 上传成功后写入云端 URL。
6. 右侧面板显示复制 URL。
7. 批量任务完成后生成 TXT/CSV 链接清单。

## 9. 密钥与安全

API Base URL 默认值:

```text
https://api.0029.org
```

用户可在设置页改为其他兼容 OpenAI 图片接口的服务地址。

密钥处理:

- 用户输入的测试密钥只能保存到本机系统密钥链。
- Windows 使用 Credential Manager 或 Electron safeStorage。
- macOS 使用 Keychain。
- 不写入 Git、日志、崩溃报告、工程文件。
- UI 中只显示尾号，例如 `sk-****2ad`。
- 导出工程时默认不包含 API Key 和云存储 Secret。

日志脱敏:

- Authorization header 一律不打印。
- AccessKey/SecretKey 一律脱敏。
- 云端 URL 可打印，但私有桶签名 URL 需脱敏 query。

## 10. 版本排期

### 一期: MVP 基础可用版

- Electron 桌面壳
- 主 UI 框架
- API 设置
- 文生图
- 图生图
- 本地作品库
- 行业模板基础版
- 本地导出

### 二期: 商用生产版

- Excel 批量工坊
- 任务队列
- 局部重绘
- 修图工具箱
- 迭代链路
- 工程文件保存
- 批量导出

### 三期: 云端团队版

- OSS/COS/OBS/七牛/MinIO/FTP/SFTP
- 自动上传
- URL 清单
- 批量迁移
- 团队素材分发
- 权限与协作

## 11. 验收标准

基础生成:

- 用户能配置 API Key。
- 用户能使用默认或自定义 API Base URL 发起生图请求。
- 单次默认生成 1 张图片；多图数量参数暂不传递，避免中转接口和官方接口返回 `tools[0].n` 错误。
- 图片能保存到本地作品库。

图生图:

- 任意生成图能一键载入图生图。
- 系统继承上一轮参数。
- 用户修改 prompt 后可再次生成。
- 迭代链路能追溯。

批量:

- Excel 导入后能生成任务。
- 任务可暂停、继续、失败重试。
- 每个任务结果可单独继续编辑。

云端:

- 能配置至少一种 OSS 和一种 SFTP。
- 生成后能自动上传。
- 成功后能复制公网 URL。
- 批量完成后能导出 URL 清单。
