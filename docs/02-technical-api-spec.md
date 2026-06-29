# 云桥Pro 技术与 API 落地规范

版本: v1.0  
日期: 2026-06-28

## 1. 目标

本规范用于把云桥Pro 从 PRD 变成可开发的桌面应用。所有 API 参数以 OpenAI GPT Image 官方文档为基准，并适配用户配置的兼容 OpenAI 图片接口服务地址。

## 2. 服务配置

```ts
export const IMAGE_API_CONFIG = {
  defaultBaseURL: "https://api.0029.org",
  model: "gpt-image-2",
  generationPath: "/v1/images/generations",
  editPath: "/v1/images/edits",
  timeoutMs: 300_000,
};
```

应用设置页允许用户自定义 API Base URL。请求时会移除末尾 `/`，并只允许 `http` 或 `https`。

密钥来源:

1. 首次启动由用户在设置页输入。
2. 保存到操作系统密钥链。
3. 开发调试可从环境变量 `YUNQIAO_API_KEY` 读取。
4. 禁止明文写入仓库、工程文件、日志。

请求头:

```http
Authorization: Bearer <api_key>
```

## 3. 文生图接口

端点:

```http
POST {apiBaseUrl}/v1/images/generations
Content-Type: application/json
```

请求体:

```json
{
  "model": "gpt-image-2",
  "prompt": "商业摄影风格的白底商品主图...",
  "size": "1024x1024",
  "quality": "medium",
  "output_format": "png",
  "background": "auto",
  "moderation": "auto"
}
```

字段:

| 字段 | 必填 | UI 名称 | 允许值 | 说明 |
| --- | --- | --- | --- | --- |
| `model` | 是 | 模型 | `gpt-image-2` | 固定 |
| `prompt` | 是 | 提示词 | 字符串 | 由模板和用户输入合成 |
| `size` | 否 | 尺寸 | `auto` 或 `WIDTHxHEIGHT` | GPT Image 2 支持灵活尺寸 |
| `quality` | 否 | 质量 | `auto`/`low`/`medium`/`high` | 草稿到精修 |
| `n` | 否 | 数量 | 暂不传递 | 当前中转接口会把多图数量转成 `tools[0].n` 并导致官方接口报错，默认只生成 1 张 |
| `output_format` | 否 | 格式 | `png`/`jpeg`/`webp` | GPT 图像模型返回 base64 |
| `output_compression` | 否 | 压缩 | 0 到 100 | 仅 JPEG/WebP 有效 |
| `background` | 否 | 背景 | `auto`/`opaque` | `gpt-image-2` 当前不支持透明背景 |
| `moderation` | 否 | 内容审核 | `auto`/`low` | 默认 `auto` |
| `stream` | 否 | 流式预览 | true/false | 需要服务端兼容 |
| `partial_images` | 否 | 中间图数量 | 0 到 3 | 仅 stream 时使用 |
| `user` | 否 | 用户标识 | 字符串 | 用于风控和审计 |

尺寸校验:

- 宽和高都必须是 16 的倍数。
- 长短边比例需要在 1:3 到 3:1 之间。
- 最大边不超过 2048px。
- 总像素不少于 655360，不超过 2048x2048。
- 自定义尺寸最高按 2K 控制，宽高都必须是 16 的倍数。

推荐尺寸:

| 场景 | 尺寸 | 用途 |
| --- | --- | --- |
| 商品主图 | `1024x1024` | 淘宝/京东/拼多多 |
| 详情页竖图 | `1024x1536` | 电商详情和海报 |
| 横版广告 | `1536x1024` | Banner 和 B 站封面 |
| 短剧封面 | `1024x1536` | 接口稳定竖版，导出时可裁切到 9:16 |
| 2K 横图 | `2048x1152` | 影视概念和横版封面 |
| 2K 竖图 | `1152x2048` | 竖版海报和高清封面 |

注意: 若 `api.0029.org` 的代理暂不支持任意尺寸，需要在适配层降级到 `1024x1024`、`1536x1024`、`1024x1536`。

## 4. 图生图和编辑接口

端点:

```http
POST {apiBaseUrl}/v1/images/edits
```

推荐使用 multipart/form-data 发送本地文件:

```http
model=gpt-image-2
prompt=保持商品主体不变，将背景换成高端厨房台面...
image[]=@source.png
mask=@mask.png
size=1024x1024
quality=medium
output_format=png
```

如服务端支持 JSON 图片引用，也可使用:

```json
{
  "model": "gpt-image-2",
  "images": [
    {
      "image_url": "data:image/png;base64,..."
    }
  ],
  "mask": {
    "image_url": "data:image/png;base64,..."
  },
  "prompt": "只重绘被遮罩区域，保持主体和构图不变...",
  "size": "1024x1024",
  "quality": "medium",
  "output_format": "png"
}
```

字段:

| 字段 | 必填 | UI 名称 | 说明 |
| --- | --- | --- | --- |
| `model` | 是 | 模型 | 固定 `gpt-image-2` |
| `images`/`image[]` | 是 | 参考图 | 1 到 16 张 |
| `prompt` | 是 | 编辑描述 | 说明保留和修改内容 |
| `mask` | 否 | 遮罩 | 局部重绘时使用 |
| `size` | 否 | 输出尺寸 | 建议与原图比例一致 |
| `quality` | 否 | 质量 | `auto`/`low`/`medium`/`high` |
| `n` | 否 | 数量 | 暂不传递，默认 1 张 |
| `output_format` | 否 | 格式 | 推荐 PNG 便于继续编辑 |
| `output_compression` | 否 | 压缩 | JPEG/WebP 有效 |
| `background` | 否 | 背景 | `auto`/`opaque` |
| `moderation` | 否 | 内容审核 | 默认 `auto` |
| `stream` | 否 | 流式 | 服务端兼容时开启 |

不要传:

- `negative_prompt`
- `seed`
- `steps`
- `sampler`
- `cfg_scale`
- `strength`
- `style`
- `response_format`
- `input_fidelity`。默认不暴露、不主动传。`gpt-image-2` 图片输入按官方模型摘要已默认高保真；若目标代理服务实测支持，可作为开发者实验字段透传。

## 5. Prompt 合成器

内部结构:

```ts
type PromptInput = {
  industry: string;
  templateId: string;
  userPrompt: string;
  subject?: string;
  scene?: string;
  style?: string;
  camera?: string;
  lighting?: string;
  composition?: string;
  textToRender?: string;
  avoid?: string;
  similarityLevel?: number;
  outputUse?: string;
};
```

合成顺序:

1. 任务目标: 这张图用于什么商业场景。
2. 主体: 商品、人物、场景或画面核心。
3. 参考保持: 图生图时说明哪些要保留。
4. 视觉风格: 摄影、电影、漫画、插画等。
5. 构图: 居中、三分法、留白、近景、远景。
6. 光线与色彩。
7. 输出约束: 不要水印、不要错字、不要多余 logo。
8. 文案渲染: 只有用户明确需要时加入。
9. 避免内容: 由负面词转为自然语言约束。

示例:

```text
为电商平台生成一张商用商品主图。主体是 {product_name}，保持产品外形、颜色、材质真实准确。纯白干净背景，柔光棚拍，高级商品摄影，居中构图，阴影自然，边缘清晰，适合电商上架。避免出现水印、乱码文字、变形结构、额外品牌 logo、脏污背景、夸张反光。
```

## 6. 任务队列

任务状态:

- `waiting`
- `running`
- `succeeded`
- `failed`
- `canceled`
- `paused`

任务类型:

- `txt2img`
- `img2img`
- `inpaint`
- `outpaint`
- `batch_txt2img`
- `batch_img2img`
- `upload`
- `export`

队列策略:

- 默认并发 3。
- 高质量和 2K 任务默认并发 1。
- 429/5xx 自动指数退避。
- 用户取消时中断未开始任务，运行中请求尽量取消。
- 每个任务保存 request_id、参数快照、耗时、错误信息。

## 7. 本地数据模型

### projects

```sql
id TEXT PRIMARY KEY,
name TEXT NOT NULL,
industry TEXT,
created_at INTEGER NOT NULL,
updated_at INTEGER NOT NULL
```

### assets

```sql
id TEXT PRIMARY KEY,
project_id TEXT,
parent_asset_id TEXT,
source_type TEXT NOT NULL,
local_path TEXT,
thumbnail_path TEXT,
cloud_url TEXT,
prompt TEXT,
final_prompt TEXT,
avoid_prompt TEXT,
model TEXT,
api_params_json TEXT,
width INTEGER,
height INTEGER,
format TEXT,
quality TEXT,
industry TEXT,
template_id TEXT,
created_at INTEGER NOT NULL
```

### jobs

```sql
id TEXT PRIMARY KEY,
type TEXT NOT NULL,
status TEXT NOT NULL,
progress INTEGER DEFAULT 0,
request_json TEXT,
result_json TEXT,
error_message TEXT,
created_at INTEGER NOT NULL,
updated_at INTEGER NOT NULL
```

### storage_profiles

```sql
id TEXT PRIMARY KEY,
name TEXT NOT NULL,
type TEXT NOT NULL,
config_json TEXT NOT NULL,
is_default INTEGER DEFAULT 0,
auto_upload INTEGER DEFAULT 0,
created_at INTEGER NOT NULL,
updated_at INTEGER NOT NULL
```

Secret 字段不进 SQLite 明文，`config_json` 只保存引用 ID。

## 8. 云存储适配器

统一接口:

```ts
interface StorageAdapter {
  test(): Promise<StorageTestResult>;
  upload(input: UploadInput): Promise<UploadResult>;
  delete?(path: string): Promise<void>;
  list?(prefix: string): Promise<StorageObject[]>;
}
```

适配器:

- `AliOssAdapter`
- `TencentCosAdapter`
- `HuaweiObsAdapter`
- `QiniuAdapter`
- `MinioAdapter`
- `FtpAdapter`
- `SftpAdapter`

上传结果:

```ts
type UploadResult = {
  storageId: string;
  remotePath: string;
  publicUrl: string;
  etag?: string;
  size: number;
};
```

## 9. 图片保存策略

默认目录:

```text
%USERPROFILE%/Pictures/YunqiaoPro
```

项目结构:

```text
YunqiaoPro/
  projects/
    {project_id}/
      originals/
      generated/
      edits/
      thumbs/
      exports/
  cache/
  temp/
```

文件命名:

```text
{industry}_{template}_{serial}_{timestamp}_{size}.{ext}
```

## 10. API 错误处理

用户可读错误:

- 401: API Key 无效或已过期
- 403: 当前账号无模型权限或服务拒绝访问
- 408/504: 生成超时，建议降低尺寸或稍后重试
- 413: 图片过大，建议压缩或降低输入图数量
- 429: 请求过快，已自动排队重试
- 500/502/503: 服务暂时异常，已自动重试

失败记录必须保留:

- 请求时间
- 任务类型
- 参数快照
- 错误码
- 脱敏错误信息

## 11. 开发里程碑

第 1 周:

- Electron + React 项目骨架
- 主题系统
- 设置页 API Key 保存
- 文生图请求打通

第 2 周:

- 作品库 SQLite
- 图片保存和缩略图
- 右侧预览面板
- 参数快照

第 3 周:

- 图生图和局部 mask
- 迭代链路
- Prompt 合成器

第 4 周:

- 行业模板库
- Excel 批量导入
- 批量队列

第 5 周:

- 云存储 OSS/MinIO/SFTP 首批适配
- 自动上传
- URL 清单导出

第 6 周:

- 打包、异常恢复、性能优化
- Windows 安装包
- 内测反馈修复
