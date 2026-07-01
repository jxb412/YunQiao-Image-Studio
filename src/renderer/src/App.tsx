import {
  Archive,
  BadgeCheck,
  BookOpen,
  Boxes,
  Brush,
  ChevronDown,
  Cloud,
  CloudCog,
  Clipboard,
  Copy,
  Database,
  Download,
  Eye,
  ExternalLink,
  FileDown,
  FileSpreadsheet,
  FolderOpen,
  Gauge,
  History,
  ImagePlus,
  LayoutDashboard,
  Lock,
  Pause,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Square,
  Sparkles,
  TestTube2,
  TimerReset,
  Trash2,
  Undo2,
  UploadCloud,
  WandSparkles,
  X
} from "lucide-react";
import type { ComponentType, CSSProperties, PointerEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { COMMON_IMAGE_SIZES, makeImageSize, validateGptImage2Size, type ImageSizeValue } from "../../shared/imageSize";
import "./styles.css";

type NavItem = {
  label: string;
  icon: ComponentType<{ size?: number | string }>;
  group: "create" | "assets" | "system";
};

type Template = {
  id: string;
  industry: string;
  scene: string;
  size: ImageSize;
  quality: ImageQuality;
  format: ImageFormat;
  prompt: string;
  avoid: string;
  tags: string[];
  custom?: boolean;
};

type StorageProfile = {
  id: string;
  name: string;
  type: string;
  endpoint: string;
  bucket: string;
  accessKey?: string;
  secretKey?: string;
  username?: string;
  password?: string;
  host?: string;
  port?: string;
  root: string;
  publicUrl: string;
  mode: StorageDraft["mode"];
  autoUpload: boolean;
  status: "未测试" | "连接正常" | "默认通道" | "连接异常";
};

type StorageDraft = {
  name: string;
  type: string;
  endpoint: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  host: string;
  port: string;
  username: string;
  password: string;
  root: string;
  publicUrl: string;
  autoUpload: boolean;
  mode: "本地+云端" | "仅本地" | "仅云端";
};

type StoragePreset = Omit<StorageDraft, "accessKey" | "secretKey" | "username" | "password" | "autoUpload" | "mode">;

type Asset = {
  id: string;
  name: string;
  project: string;
  source: string;
  cloudUrl: string;
  prompt: string;
  status: string;
  previewUrl?: string;
  localPath?: string;
};

type Toast = {
  id: number;
  type: "success" | "info" | "warning";
  message: string;
};

type Modal =
  | { kind: "template"; template: Template }
  | { kind: "template-editor"; template?: Template }
  | { kind: "history" }
  | { kind: "asset"; asset: Asset }
  | { kind: "image-preview"; result: GenerationResult }
  | { kind: "mask-editor"; result: GenerationResult }
  | { kind: "update"; result: UpdateCheckResult; automatic: boolean }
  | null;

type ImageSize = ImageSizeValue;
type ImageQuality = "auto" | "low" | "medium" | "high";
type ImageFormat = "png" | "jpeg" | "webp";
type ImageBackground = "auto" | "opaque";

type GenerationParams = {
  prompt: string;
  avoid: string;
  size: ImageSize;
  quality: ImageQuality;
  outputFormat: ImageFormat;
  background: ImageBackground;
};

type RetouchToolPreset = {
  id: string;
  title: string;
  hint: string;
  prompt: string;
  avoid: string;
  params: Partial<GenerationParams>;
};

type UploadStatus = {
  status: "未上传" | "上传中" | "已上传" | "上传失败";
  storageName?: string;
  storageType?: string;
  objectKey?: string;
  url?: string;
  error?: string;
  durationMs?: number;
  uploadedAt?: number;
};

type GenerationResult = {
  id: string;
  label: string;
  dataUrl?: string;
  localPath?: string;
  status: string;
  source?: string;
  prompt?: string;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  responseType?: "base64" | "url" | "local" | "none";
  mimeType?: string;
  format?: string;
  byteSize?: number;
  width?: number;
  height?: number;
  requestSize?: ImageSize;
  requestQuality?: ImageQuality;
  requestBackground?: ImageBackground;
  revisedPrompt?: string;
  error?: string;
  parentId?: string | null;
  upload?: UploadStatus;
};

type StageView = "grid" | "compare" | "chain";
type VariableValues = Record<string, string>;

type BatchTask = {
  id: string;
  project: string;
  industry: string;
  template: string;
  count: number;
  prompt: string;
  imagePath?: string;
  imageName?: string;
  size?: ImageSize;
  status: "待导入" | "已导入" | "生成中" | "已完成" | "失败";
  completedCount?: number;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  retryCount?: number;
};

type ImportedImage = {
  path: string;
  name: string;
  dataUrl: string;
};

type CustomSizeDraft = {
  enabled: boolean;
  width: string;
  height: string;
};

type ApiDiagnostic = {
  ok: boolean;
  status?: number;
  statusText?: string;
  endpoint?: string;
  durationMs?: number;
  bodyPreview?: string;
  error?: string;
  testedAt: number;
};

type BatchControlStatus = "idle" | "running" | "paused" | "stopping";

type ImageFolderPick = {
  directory: string;
  images: Array<{ path: string; name: string }>;
};

type UpdateCheckResult = {
  currentVersion: string;
  latestVersion: string;
  updateAvailable?: boolean;
  source?: "website" | "github";
  platformKey?: string;
  releaseUrl?: string;
  downloadUrl?: string;
  fallbackDownloadUrl?: string;
  downloadName?: string;
  downloadSize?: number;
  downloadSha256?: string;
  publishedAt?: string;
  notes?: string;
  checkedAt?: number;
};

type AppSettingsSnapshot = {
  saveDirectory: string;
  hasApiKey?: boolean;
  storageProfiles?: StorageProfile[];
  requestTimeoutSeconds?: number;
  apiBaseUrl?: string;
  autoCheckUpdates?: boolean;
  skippedUpdateVersion?: string;
};

type YunqiaoBridge = {
  setApiKey?: (key: string) => Promise<unknown>;
  generateImage?: (request: {
    prompt: string;
    size?: ImageSize;
    quality?: ImageQuality;
    output_format?: ImageFormat;
    background?: ImageBackground;
  }) => Promise<{
    data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>;
  }>;
  editImage?: (request: {
    prompt: string;
    imagePaths: string[];
    maskPath?: string;
    size?: ImageSize;
    quality?: ImageQuality;
    output_format?: ImageFormat;
    background?: ImageBackground;
  }) => Promise<{
    data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>;
  }>;
  testApi?: () => Promise<Omit<ApiDiagnostic, "testedAt">>;
  getSettings?: () => Promise<AppSettingsSnapshot>;
  checkUpdate?: () => Promise<UpdateCheckResult>;
  updateSettings?: (patch: Record<string, unknown>) => Promise<AppSettingsSnapshot>;
  chooseDirectory?: () => Promise<{ saveDirectory: string } | null>;
  chooseImages?: () => Promise<ImportedImage[]>;
  chooseImageFolder?: () => Promise<ImageFolderPick | null>;
  openDirectory?: (directory?: string) => Promise<{ ok: boolean; path: string }>;
  openFileLocation?: (path: string) => Promise<{ ok: boolean; path: string }>;
  copyImage?: (dataUrl: string) => Promise<{ ok: boolean }>;
  saveImage?: (payload: { dataUrl: string; name: string }) => Promise<{ path: string }>;
  saveTempImage?: (payload: { dataUrl: string; name: string }) => Promise<{ path: string }>;
  getAssetLibrary?: () => Promise<Asset[]>;
  saveAssetLibrary?: (assets: Asset[]) => Promise<{ ok: boolean }>;
  getCustomTemplates?: () => Promise<Template[]>;
  saveCustomTemplates?: (templates: Template[]) => Promise<{ ok: boolean }>;
  exportTemplates?: (templates: Template[]) => Promise<{ path: string } | null>;
  importTemplates?: () => Promise<{ path: string; templates: Template[] } | null>;
  uploadAsset?: (asset: { name: string; project?: string; source?: string; localPath?: string }) => Promise<{ storageName: string; storageType: string; objectKey: string; url: string }>;
  exportUrlList?: (assets: Array<{ name: string; cloudUrl: string }>) => Promise<{ path: string }>;
  createAssetZip?: (assets: Array<{ name: string; prompt: string; cloudUrl: string; localPath?: string }>) => Promise<{ path: string }>;
  importBatchExcel?: () => Promise<{ filePath: string; rows: string[][] } | null>;
  exportBatchTemplate?: () => Promise<{ path: string }>;
  exportBatchLog?: (tasks: BatchTask[]) => Promise<{ path: string }>;
  testStorage?: (payload: { type: string; endpoint?: string; host?: string; port?: string }) => Promise<{ ok: boolean; message: string }>;
  testStorageUpload?: (profile: StorageProfile) => Promise<{ ok: boolean; storageName: string; storageType: string; objectKey: string; url: string; durationMs: number }>;
  openExternal?: (url: string) => Promise<{ ok: boolean; url?: string }>;
};

const navItems: NavItem[] = [
  { label: "工作台", icon: LayoutDashboard, group: "create" },
  { label: "文生图创作", icon: ImagePlus, group: "create" },
  { label: "图生图与局部重绘", icon: WandSparkles, group: "create" },
  { label: "批量生产工坊", icon: FileSpreadsheet, group: "create" },
  { label: "行业模板库", icon: BookOpen, group: "assets" },
  { label: "作品素材库", icon: Archive, group: "assets" },
  { label: "AI修图工具箱", icon: Brush, group: "assets" },
  { label: "API与云端存储设置", icon: CloudCog, group: "system" }
];

const pageHints: Record<string, string> = {
  工作台: "查看产能、队列、快捷入口和最近项目。",
  文生图创作: "选择行业模板，填写主体与卖点，生成商用图片。",
  "图生图与局部重绘": "载入生成图或本地图片，继续二次编辑和局部重绘。",
  批量生产工坊: "导入 Excel 或多行关键词，批量生成并自动归档。",
  行业模板库: "维护电商、短剧、漫画、自媒体等行业提示词模板。",
  作品素材库: "管理作品、项目、云端链接和迭代历史。",
  AI修图工具箱: "扩图、去杂物、换背景、局部重绘、人像商品精修和老照片修复。",
  API与云端存储设置: "配置 API Key、OSS、FTP、SFTP 和上传规则。"
};

const creatorPages = new Set(["文生图创作", "图生图与局部重绘", "AI修图工具箱"]);

const retouchToolPresets: RetouchToolPreset[] = [
  {
    id: "outpaint",
    title: "AI扩图",
    hint: "补画边缘与构图",
    prompt: "在保持原图主体、视角、光源、材质和画面风格一致的前提下扩展画面边缘，补全自然背景、空间透视、阴影和环境细节。主体比例不要改变，新增区域要和原图无缝融合，适合商业发布。",
    avoid: "避免改变主体身份、五官、产品结构、品牌标识、已有文字和核心构图；避免边缘重复、拉伸、拼贴感、低清晰度、明显接缝。",
    params: { size: "1536x1024", quality: "high", outputFormat: "png", background: "auto" }
  },
  {
    id: "remove",
    title: "去杂物",
    hint: "移除遮挡和污点",
    prompt: "移除画面中不需要的杂物、污点、遮挡物、路人、反光噪点或多余元素，保持背景纹理、透视、光影和材质自然连续。主体边缘要干净，修补区域不能留下明显涂抹痕迹。",
    avoid: "避免改变主体、人物五官、产品形状、服装结构、品牌标识和已有重要文字；避免修补区域模糊、重复纹理、残影和不自然阴影。",
    params: { size: "auto", quality: "high", outputFormat: "png", background: "auto" }
  },
  {
    id: "background",
    title: "换背景",
    hint: "保主体换场景",
    prompt: "保持原图主体完全准确不变，替换为干净高级的新背景。背景应符合主体用途和商业场景，光源方向、色温、阴影、反射和景深与主体一致，整体看起来像一次真实拍摄。",
    avoid: "避免改变主体轮廓、材质、颜色、五官、产品结构和品牌细节；避免背景过度复杂、主体边缘毛糙、光影不匹配、文字乱码。",
    params: { size: "1024x1024", quality: "high", outputFormat: "png", background: "auto" }
  },
  {
    id: "color",
    title: "统一色调",
    hint: "曝光色彩校正",
    prompt: "统一整体色调、曝光、白平衡、对比度和饱和度，让画面更干净、通透、适合商业发布。保留原图构图和主体细节，只优化视觉质感，不改变内容。",
    avoid: "避免过曝、过度磨皮、肤色失真、产品颜色偏差、暗部死黑、高光溢出和廉价滤镜感。",
    params: { size: "auto", quality: "high", outputFormat: "jpeg", background: "auto" }
  },
  {
    id: "product-light",
    title: "商品光影",
    hint: "产品质感精修",
    prompt: "优化商品轮廓光、反光、阴影、材质质感和展示角度，保持产品结构、颜色、图案和品牌细节真实准确。让商品看起来更高级、更适合电商主图、详情页和广告投放。",
    avoid: "避免产品变形、LOGO 错误、颜色偏差、虚假材质、过度锐化、边缘锯齿、廉价合成感和多余文字。",
    params: { size: "1024x1024", quality: "high", outputFormat: "png", background: "auto" }
  },
  {
    id: "portrait",
    title: "人像精修",
    hint: "自然修脸修肤",
    prompt: "自然优化人物皮肤、发丝、服装褶皱、面部光影和整体气色，保持真实人像质感和身份一致。修饰瑕疵但保留皮肤纹理，增强眼神、轮廓和服装细节。",
    avoid: "避免换脸、五官漂移、过度磨皮、塑料皮肤、年龄变化、身材夸张、手指错误、服装结构变化和不真实美颜。",
    params: { size: "auto", quality: "high", outputFormat: "jpeg", background: "auto" }
  },
  {
    id: "local-redraw",
    title: "局部重绘",
    hint: "改局部保整体",
    prompt: "只修改用户描述的局部区域，保持原图其他区域完全一致。新增或替换的局部内容要匹配原图透视、材质、光影、噪点、清晰度和风格，边缘自然融合。",
    avoid: "避免全图风格变化、主体漂移、背景被整体重画、局部边缘生硬、比例不一致和无关元素增加。",
    params: { size: "auto", quality: "high", outputFormat: "png", background: "auto" }
  },
  {
    id: "text-clean",
    title: "去文字水印",
    hint: "清理文字标记",
    prompt: "移除画面中的水印、无关文字、贴纸、时间戳、二维码或平台标记，并自然补全被遮挡的背景纹理。保留主体、真实内容和画面质感。",
    avoid: "避免删除产品本身必要标识、改变主体结构、留下模糊块、重复纹理、涂抹痕迹和新增乱码文字。",
    params: { size: "auto", quality: "high", outputFormat: "png", background: "auto" }
  },
  {
    id: "old-photo",
    title: "老照片修复",
    hint: "修复划痕褪色",
    prompt: "修复老照片的划痕、折痕、噪点、褪色、破损和模糊区域，尽量恢复人物或场景原有细节。保持年代感和真实质感，不要过度现代化。",
    avoid: "避免改变人物身份和五官、过度锐化、AI 感过强、肤色怪异、服饰年代错误、背景乱补和不自然上色。",
    params: { size: "auto", quality: "high", outputFormat: "jpeg", background: "auto" }
  },
  {
    id: "social-cover",
    title: "封面增强",
    hint: "强化点击率",
    prompt: "在保持原图主体准确的基础上增强封面视觉冲击力，提高主体识别度、明暗层次、背景氛围和可读留白。适合小红书、抖音、视频号或电商封面二次优化。",
    avoid: "避免生成乱码文字、夸张特效、主体变形、画面过度拥挤、颜色脏乱和廉价模板感。",
    params: { size: "1024x1536", quality: "high", outputFormat: "jpeg", background: "auto" }
  }
];

const storagePresets: Record<string, StoragePreset> = {
  "阿里云 OSS": {
    name: "阿里云 OSS 主通道",
    type: "阿里云 OSS",
    endpoint: "oss-cn-hangzhou.aliyuncs.com",
    bucket: "yunqiao-assets",
    host: "",
    port: "",
    root: "{industry}/{project}/{year}{month}{day}",
    publicUrl: ""
  },
  "腾讯云 COS": {
    name: "腾讯云 COS 主通道",
    type: "腾讯云 COS",
    endpoint: "cos.ap-guangzhou.myqcloud.com",
    bucket: "yunqiao-assets-1250000000",
    host: "",
    port: "",
    root: "{industry}/{project}/{year}{month}{day}",
    publicUrl: "https://yunqiao-assets.cos.ap-guangzhou.myqcloud.com"
  },
  "华为 OBS": {
    name: "华为 OBS 主通道",
    type: "华为 OBS",
    endpoint: "obs.cn-east-3.myhuaweicloud.com",
    bucket: "yunqiao-assets",
    host: "",
    port: "",
    root: "{industry}/{project}/{year}{month}{day}",
    publicUrl: "https://yunqiao-assets.obs.cn-east-3.myhuaweicloud.com"
  },
  七牛云: {
    name: "七牛云 Kodo 主通道",
    type: "七牛云",
    endpoint: "s3-cn-east-1.qiniucs.com",
    bucket: "yunqiao-assets",
    host: "",
    port: "",
    root: "{industry}/{project}/{year}{month}{day}",
    publicUrl: ""
  },
  MinIO: {
    name: "MinIO 私有存储",
    type: "MinIO",
    endpoint: "",
    bucket: "yunqiao-assets",
    host: "",
    port: "",
    root: "{industry}/{project}/{year}{month}{day}",
    publicUrl: ""
  },
  FTP: {
    name: "FTP 上传通道",
    type: "FTP",
    endpoint: "",
    bucket: "",
    host: "",
    port: "21",
    root: "/public_html/yunqiao/{industry}/{project}/{year}{month}{day}",
    publicUrl: ""
  },
  SFTP: {
    name: "SFTP 安全上传通道",
    type: "SFTP",
    endpoint: "",
    bucket: "",
    host: "",
    port: "22",
    root: "/data/www/yunqiao/{industry}/{project}/{year}{month}{day}",
    publicUrl: ""
  }
};

const storageTypeList = Object.keys(storagePresets);

function makeStorageDraft(type = "阿里云 OSS", patch: Partial<StorageDraft> = {}): StorageDraft {
  const preset = storagePresets[type] ?? storagePresets["阿里云 OSS"];
  return {
    ...preset,
    accessKey: "",
    secretKey: "",
    username: "",
    password: "",
    autoUpload: true,
    mode: "本地+云端",
    ...patch
  };
}

const baseTemplateLibrary: Template[] = [
  tpl("ecom_white", "电商零售", "白底商品主图", "1024x1024", "medium", "png", ["主图", "上架"], "为电商平台生成一张商用商品白底主图。主体是 {product_name}，产品特征为 {selling_points}。保持商品外形、颜色、包装和材质真实准确，纯白干净背景，柔光棚拍，居中构图，阴影自然，边缘清晰，细节锐利，适合淘宝、京东、拼多多上架。", "避免改变商品结构、虚假 logo、水印、乱码文字、杂乱背景、过曝反光、产品边缘变形。"),
  tpl("ecom_scene", "电商零售", "商品场景种草图", "1024x1536", "medium", "png", ["种草", "详情页"], "生成一张电商种草场景图。主体是 {product_name}，突出 {selling_points}。场景为 {scene}，整体风格 {style}，画面有真实生活氛围，商品位于视觉中心，背景干净但不空洞，光线柔和自然，色彩高级，适合详情页和小红书种草。", "保持商品外观准确，不要改变品牌包装，不要添加无关配件。"),
  tpl("ecom_detail", "电商零售", "详情页卖点图", "1024x1536", "medium", "png", ["详情页", "卖点"], "为电商详情页生成一张卖点视觉图。商品为 {product_name}，核心卖点是 {selling_points}。使用清晰的商业摄影构图，主体占画面 60%，周围保留干净留白，背景与卖点相关但不抢主体，光影突出材质和功能。", "不要生成复杂文字，留出顶部或右侧排版区域，避免水印、乱码、结构变形。"),
  tpl("ecom_fashion", "电商零售", "服装模特穿搭", "1024x1536", "medium", "png", ["服装", "模特"], "生成一张服装电商模特图。服装为 {product_name}，风格 {style}，目标人群 {audience}。模特姿态自然，服装版型清晰，面料纹理真实，光线柔和，背景简洁高级，适合服装上新展示。", "重点保持服装颜色、剪裁、长度、图案准确。避免肢体畸形、手部错误、衣服结构错乱、过度修饰。"),
  tpl("ecom_beauty", "电商零售", "美妆质感图", "1024x1536", "high", "png", ["美妆", "质感"], "生成一张高端美妆产品商业摄影图。产品为 {product_name}，突出 {selling_points}。使用微距质感、柔和高光、精致反射和干净背景，画面呈现膏体、粉质、玻璃、金属或包装材质的真实细节。构图高级，适合详情页首屏和品牌海报。", "避免包装文字错乱、产品变形、过曝反光、廉价塑料感。"),
  tpl("ecom_food", "餐饮茶饮", "菜品主图", "1024x1024", "medium", "jpeg", ["外卖", "菜单"], "生成一张餐饮菜品主图。菜品为 {product_name}，口味卖点为 {selling_points}。食材新鲜，摆盘干净，光线自然诱人，背景符合 {scene}，适合菜单、外卖和团购平台。", "避免颜色异常、食物不可食用质感、餐具脏乱、过度油腻。"),
  tpl("drink_new", "餐饮茶饮", "茶饮新品图", "1024x1536", "medium", "jpeg", ["茶饮", "新品"], "生成一张茶饮新品宣传图。饮品为 {product_name}，卖点为 {selling_points}。杯身清晰，液体层次、冰块、水珠、奶盖、果肉或茶汤质感真实，背景清爽，符合 {season} 氛围，留出文案区域。", "避免杯标乱码、液体结构怪异、过度反光。"),
  tpl("short_cover", "短剧影视", "竖版短剧封面", "1024x1536", "medium", "jpeg", ["封面", "9:16"], "生成一张短剧竖版封面。题材为 {subject}，核心冲突是 {selling_points}。画面包含 1 到 3 个主要人物，人物表情强烈，关系张力明确，电影级布光，背景为 {scene}，构图适合 9:16 手机封面，上方或下方留出标题区域。风格写实、戏剧化、高点击率。", "避免卡通感、五官崩坏、手部畸形、文字乱码、人物过多。"),
  tpl("short_male", "短剧影视", "男频逆袭海报", "1024x1536", "medium", "jpeg", ["男频", "逆袭"], "生成一张男频逆袭短剧海报。主角是 {subject}，情绪为隐忍、爆发、反击，背景包含都市夜景、豪门、职场或商业竞争元素。画面有强烈明暗对比和电影感，主角处于视觉中心，反派或压力源在背景中形成压迫感。", "避免过度玄幻、廉价特效、人物脸部不一致。"),
  tpl("short_female", "短剧影视", "女频情感封面", "1024x1536", "medium", "jpeg", ["女频", "情感"], "生成一张女频情感短剧封面。主题为 {subject}，关系冲突为 {selling_points}。女主表情有情绪层次，男主或对立角色形成视觉关系，背景为豪门、婚礼、雨夜、医院、办公室或家庭场景。画面精致写实，色调高级，留出标题区域。", "避免人物僵硬、过度网红脸、五官错位、俗艳背景。"),
  tpl("short_character", "短剧影视", "角色定妆照", "1024x1536", "medium", "png", ["角色", "定妆"], "生成一张短剧角色定妆照。角色为 {subject}，身份设定为 {selling_points}。人物半身或全身，服装、发型、妆容符合角色身份，表情和姿态体现人物性格，背景简洁电影棚拍，方便后续统一角色形象。", "避免夸张滤镜、脸部崩坏、服装细节混乱、手部畸形。"),
  tpl("manga_character", "漫画动漫", "角色设定", "1024x1536", "medium", "png", ["角色", "设定"], "生成一张二次元角色设定图。角色为 {subject}，性格和身份为 {selling_points}。画风 {style}，清晰线条，干净上色，服装设计完整，姿态自然，背景简洁，突出角色轮廓和配色。适合漫画、动画、游戏前期设定。", "避免真人写实、线条脏乱、手部畸形、服装结构混乱。"),
  tpl("manga_turnaround", "漫画动漫", "角色三视图", "1536x1024", "high", "png", ["三视图", "建模"], "生成一张角色三视图设定稿。角色为 {subject}。包含正面、侧面、背面三个视图，比例统一，服装、发型、配饰保持一致，白色或浅灰背景，线条清晰，适合建模和漫画制作参考。", "不要加入复杂背景，不要改变每个视图的服装细节。"),
  tpl("manga_expression", "漫画动漫", "角色表情表", "1536x1024", "medium", "png", ["表情", "设定"], "生成一张角色表情表。角色为 {subject}，画风 {style}。展示开心、惊讶、愤怒、伤心、害羞、严肃六种表情，五官和发型保持一致，白底排版，线条清晰，适合漫画角色设定。", "避免变成不同角色、发型变化、五官比例漂移。"),
  tpl("manga_page", "漫画动漫", "漫画分镜页", "1024x1536", "medium", "png", ["分镜", "线稿"], "生成一页漫画分镜草图。剧情为 {subject}，场景为 {scene}，情绪为 {style}。使用 4 到 6 个分镜格，镜头有远景、中景、特写变化，角色动作清楚，画面节奏明确，黑白线稿或简洁上色。文字气泡留空，不生成具体文字。", "避免分镜混乱、角色不一致、线条脏乱。"),
  tpl("media_xhs", "自媒体内容", "小红书封面底图", "1024x1536", "medium", "jpeg", ["小红书", "封面"], "生成一张小红书封面底图。主题是 {subject}，面向 {audience}。画面干净、高级、有生活方式氛围，色调 {color_palette}，主体明确，左侧或上方保留大面积文字留白，适合后期叠加标题。", "不要生成具体文字、二维码、水印或复杂小元素。"),
  tpl("media_douyin", "自媒体内容", "抖音竖版封面", "1024x1536", "medium", "jpeg", ["抖音", "竖版"], "生成一张抖音视频竖版封面。主题为 {subject}，核心吸引点为 {selling_points}。画面高对比、高识别度，主体大，占画面 60%，背景简洁但有冲击力，适合手机小屏快速点击。中上部留出标题区域。", "避免过多细节、低清晰度、乱码文字。"),
  tpl("media_bili", "自媒体内容", "B站横版封面", "1536x1024", "medium", "jpeg", ["B站", "横版"], "生成一张 B 站视频横版封面底图。主题为 {subject}，风格 {style}。画面有明确主体和强故事感，左右构图平衡，右侧或左侧预留标题区，色彩鲜明但不廉价，适合知识、娱乐、影视解说或科技视频。", "不要直接生成标题文字。"),
  tpl("brand_kv", "品牌广告", "品牌 KV 主视觉", "1536x1024", "high", "png", ["品牌", "KV"], "生成一张品牌广告 KV 主视觉。品牌为 {brand}，主题为 {subject}，核心信息为 {selling_points}。画面高级、有明确视觉锤，主体突出，构图适合线上线下传播，保留标题和 logo 排版区域。风格 {style}，色彩 {color_palette}。", "不要生成未经确认的品牌标识或乱码文字。"),
  tpl("brand_launch", "品牌广告", "新品发布海报", "1536x1024", "high", "png", ["新品", "发布"], "生成一张新品发布海报底图。产品为 {product_name}，发布主题为 {subject}。画面有发布会仪式感，产品居中或偏中心，背景具有科技、高端或艺术氛围，光影聚焦产品，底部留出时间地点和按钮区域。", "避免文字乱码、产品结构错误、过度复杂背景。"),
  tpl("game_character", "游戏美术", "游戏角色概念", "1024x1536", "medium", "png", ["游戏", "角色"], "生成一张游戏角色概念设计。角色为 {subject}，职业或阵营为 {selling_points}。画风 {style}，全身展示，装备、服装、武器和轮廓清晰，姿态有角色性格，背景简洁。适合立项概念和美术方向探索。", "避免装备逻辑混乱、肢体畸形、过度细碎。"),
  tpl("game_card", "游戏美术", "卡牌角色立绘", "1024x1536", "high", "png", ["卡牌", "立绘"], "生成一张游戏卡牌角色立绘。角色为 {subject}，能力或元素为 {selling_points}。竖版构图，人物占据中心，动作有张力，特效围绕角色但不遮挡脸部和身体结构，背景有层次。", "避免五官崩坏、手部畸形、特效过曝。"),
  tpl("interior_room", "家装建筑", "室内设计效果图", "1536x1024", "high", "jpeg", ["家装", "室内"], "生成一张室内设计效果图。空间为 {scene}，风格 {style}，色彩为 {color_palette}。画面真实、整洁、比例准确，家具布局合理，光线自然，材质包括木材、石材、织物或金属的真实细节。", "避免透视错误、家具悬浮、空间比例异常。"),
  tpl("travel_city", "文旅酒店", "城市旅游海报", "1024x1536", "medium", "jpeg", ["文旅", "海报"], "生成一张城市旅游宣传海报底图。目的地为 {subject}，核心体验为 {selling_points}。画面包含标志性建筑、当地街景、自然风光或文化元素，风格 {style}，构图有旅行向往感，留出标题和日期区域。", "避免错误地标、乱码文字、游客过多。"),
  tpl("hotel_room", "文旅酒店", "酒店民宿宣传图", "1536x1024", "high", "jpeg", ["酒店", "民宿"], "生成一张酒店/民宿宣传图。空间为 {scene}，卖点为 {selling_points}。画面真实、高级、舒适，突出房间、窗景、床品、浴室或公共空间，光线柔和，适合 OTA 平台和社媒宣传。", "避免空间脏乱、过度广角畸变、家具变形。"),
  tpl("education_cover", "教育知识", "课程封面", "1536x1024", "medium", "jpeg", ["课程", "封面"], "生成一张在线课程封面底图。课程主题为 {subject}，目标学员为 {audience}。画面专业、可信、现代，包含与课程相关的抽象元素、学习场景或人物，留出标题和讲师信息区域。", "不要生成具体文字。"),
  tpl("medical_kv", "医美健康", "医美机构 KV", "1536x1024", "medium", "jpeg", ["医美", "健康"], "生成一张医美机构品牌 KV 底图。主题为 {subject}，卖点为 {selling_points}。画面干净、专业、可信，人物皮肤自然，光线柔和，高级白色或浅色空间，留出品牌和活动文字区域。", "避免过度磨皮、虚假医疗效果、夸张对比、乱码文字。"),
  tpl("b2b_equipment", "工业企业与 B2B", "工业设备宣传图", "1536x1024", "medium", "png", ["工业", "设备"], "生成一张工业设备宣传图。设备为 {product_name}，卖点为 {selling_points}。画面专业、洁净、可信，设备结构清晰，金属材质真实，背景为工厂、实验室或抽象科技场景，适合官网和产品手册。", "避免设备结构错乱、危险操作、过度科幻。"),
  tpl("realestate", "房产本地生活", "楼盘宣传海报", "1536x1024", "medium", "jpeg", ["房产", "楼盘"], "生成一张房地产楼盘宣传底图。楼盘卖点为 {selling_points}，场景为 {scene}。画面有高端居住氛围，建筑、园林、会所、城市天际线或家庭生活场景自然融合，构图大气，留出标题和价格区域。", "避免虚假地标、透视错误、过度豪华不真实。"),
  tpl("baby_product", "母婴宠物", "母婴产品图", "1024x1536", "medium", "jpeg", ["母婴", "产品"], "生成一张母婴产品商业图。产品为 {product_name}，卖点为 {selling_points}。画面温暖、安全、干净，材质柔软真实，背景为婴儿房、家庭或纯净棚拍，适合电商和社媒种草。", "避免危险使用场景、过度医疗暗示、产品结构改变。"),
  tpl("auto_poster", "汽车出行", "汽车宣传海报", "1536x1024", "high", "jpeg", ["汽车", "出行"], "生成一张汽车宣传海报底图。车辆类型为 {subject}，卖点为 {selling_points}。画面有速度感、高级光影、城市道路、山路或未来科技场景，车身比例准确，漆面反光真实。", "避免车标错乱、车身结构变形、轮胎错误。"),
  tpl("ecom_flatlay", "电商零售", "服饰平铺图", "1024x1536", "medium", "png", ["服饰", "平铺"], "生成一张服饰电商平铺图。商品为 {product_name}，风格为 {style}，卖点为 {selling_points}。衣物平整自然，面料纹理、缝线、版型和颜色准确，配饰少量点缀但不抢主体，背景为干净布面、木纹或纯色摄影台，适合详情页和上新预览。", "避免衣服结构变形、袖口领口错乱、图案漂移、过度褶皱、乱码文字和水印。"),
  tpl("ecom_jewelry", "电商零售", "珠宝首饰微距图", "1024x1536", "high", "png", ["珠宝", "微距"], "生成一张珠宝首饰商业微距图。主体是 {product_name}，材质和卖点为 {selling_points}。画面突出金属、宝石、珍珠、钻面或镶嵌细节，光线精致，反射受控，背景高级简洁，构图适合首图和详情页局部放大。", "避免宝石数量错误、戒圈变形、过曝反光、廉价塑料感、虚假品牌标识。"),
  tpl("ecom_home_appliance", "电商零售", "家电功能场景图", "1536x1024", "medium", "png", ["家电", "功能"], "生成一张家电产品功能场景图。产品为 {product_name}，核心功能为 {selling_points}。场景为现代厨房、客厅、浴室或办公空间，产品比例准确，材质真实，环境整洁，使用状态自然，保留右侧或底部卖点排版区域。", "避免改变产品结构、生成错误屏幕文字、插头线路混乱、空间透视错误。"),
  tpl("ecom_digital", "电商零售", "数码产品科技图", "1536x1024", "high", "png", ["数码", "科技"], "生成一张数码产品科技感商业图。产品为 {product_name}，卖点为 {selling_points}。使用干净深色或浅色背景、精确边缘、微弱科技光、真实金属/玻璃/塑料材质，画面适合官网首屏、详情页和新品发布。", "避免产品接口错误、屏幕乱码、夸张科幻光效、产品比例失真。"),
  tpl("ecom_furniture", "电商零售", "家具软装场景图", "1536x1024", "high", "jpeg", ["家具", "软装"], "生成一张家具软装电商场景图。主体为 {product_name}，风格 {style}，卖点为 {selling_points}。空间明亮舒适，家具比例真实，材质和颜色准确，软装搭配克制，高级但不空洞，适合家具详情页、首页 banner 和种草内容。", "避免家具悬浮、透视错误、空间杂乱、材质塑料感、过度豪宅化。"),
  tpl("food_bakery", "餐饮茶饮", "烘焙甜品图", "1024x1536", "high", "jpeg", ["烘焙", "甜品"], "生成一张烘焙甜品商业摄影图。甜品为 {product_name}，口味卖点为 {selling_points}。突出奶油、酥皮、巧克力、水果、糖霜或面包组织质感，光线柔和诱人，背景干净温暖，适合门店菜单、外卖平台和社媒。", "避免食物不可食用质感、颜色异常、餐具脏乱、过度油腻、文字乱码。"),
  tpl("food_hotpot", "餐饮茶饮", "火锅烧烤聚餐图", "1536x1024", "medium", "jpeg", ["火锅", "聚餐"], "生成一张火锅/烧烤聚餐宣传图。主题为 {subject}，卖点为 {selling_points}。食材新鲜丰盛，锅气或炭火氛围自然，桌面有秩序，画面热闹但不杂乱，适合团购套餐、门店海报和短视频封面。", "避免食材混乱、烟雾过重、人物手部畸形、食品安全风险场景。"),
  tpl("food_store", "餐饮茶饮", "餐饮门店宣传图", "1536x1024", "medium", "jpeg", ["门店", "宣传"], "生成一张餐饮门店宣传底图。门店类型为 {subject}，核心卖点为 {selling_points}。画面展示整洁门头、用餐区、招牌菜或服务氛围，光线明亮可信，适合美团、大众点评、朋友圈和本地生活广告。", "避免虚假门牌文字、夸张排队、杂乱卫生环境、过度滤镜。"),
  tpl("food_package", "餐饮茶饮", "食品包装陈列图", "1024x1536", "medium", "png", ["包装", "陈列"], "生成一张食品包装陈列图。产品为 {product_name}，卖点为 {selling_points}。包装排列整齐，口味或规格层次清楚，搭配少量原料元素，背景干净，适合电商主图、礼盒介绍和渠道招商。", "避免包装文字乱码、包装结构变形、夸大功效、元素过多。"),
  tpl("short_suspense", "短剧影视", "悬疑惊悚封面", "1024x1536", "medium", "jpeg", ["悬疑", "封面"], "生成一张悬疑短剧竖版封面。故事关键词为 {subject}，核心线索为 {selling_points}。画面包含紧张人物、暗处线索、门缝、走廊、监控、雨夜或旧宅元素，低调冷色布光，强对比，构图紧张但清晰。", "避免血腥露骨、低俗恐怖、画面过暗看不清、文字乱码、人物五官崩坏。"),
  tpl("short_costume", "短剧影视", "古装权谋封面", "1024x1536", "medium", "jpeg", ["古装", "权谋"], "生成一张古装权谋短剧封面。主题为 {subject}，人物关系或冲突为 {selling_points}。服饰、发冠、宫廷或江湖场景有时代氛围，人物表情有张力，光影戏剧化，竖版构图，留出标题区域。", "避免现代物品穿帮、服饰结构混乱、廉价影楼感、文字乱码。"),
  tpl("short_storyboard", "短剧影视", "导演分镜气氛图", "1536x1024", "medium", "jpeg", ["分镜", "气氛"], "生成一张影视分镜气氛图。场景为 {scene}，剧情动作是 {subject}，情绪为 {style}。使用电影镜头语言，明确景别、构图、人物位置和光线方向，画面像电影剧照，适合导演、美术和摄影沟通。", "避免海报式大字、人物过多、空间逻辑混乱、镜头语言不明确。"),
  tpl("manga_cover", "漫画动漫", "漫画封面", "1024x1536", "high", "png", ["封面", "漫画"], "生成一张漫画封面。作品主题为 {subject}，核心情绪为 {selling_points}。主角位于画面中心，背景包含关键世界观元素，构图有冲击力，色彩鲜明，线条精致，顶部留出标题区域，适合网络漫画、轻小说和漫画平台封面。", "避免真实照片感、乱码文字、人物五官崩坏、角色不一致。"),
  tpl("manga_scene", "漫画动漫", "漫画场景设定", "1536x1024", "medium", "png", ["场景", "设定"], "生成一张漫画场景设定图。场景为 {scene}，世界观为 {subject}，氛围 {style}。画面包含清晰空间结构、前中后景层次和可用于分镜的构图参考，线条干净，色彩统一，适合漫画背景和动画美术参考。", "避免透视错误、细节杂乱、风格漂移、过度写实。"),
  tpl("manga_chibi_pack", "漫画动漫", "Q版表情包", "1024x1024", "medium", "png", ["Q版", "表情包"], "生成一组 Q 版角色表情包。角色为 {subject}，画风 {style}。包含开心、震惊、委屈、生气、点赞、加油等表情，角色发型、服装和配色保持一致，背景简洁，适合社群运营和自媒体贴纸。", "避免变成不同角色、文字乱码、表情过度夸张、边缘脏乱。"),
  tpl("media_wechat", "自媒体内容", "公众号头图", "1536x1024", "medium", "jpeg", ["公众号", "头图"], "生成一张公众号文章头图底图。主题为 {subject}，读者为 {audience}。画面专业、信息感强、主体明确，左侧或中部留出标题区域，风格适合知识科普、商业分析、职场成长、教育或品牌内容。", "不要生成具体标题文字、二维码、水印、夸张表情和低俗元素。"),
  tpl("media_knowledge_card", "自媒体内容", "知识卡片底图", "1024x1536", "medium", "png", ["知识卡片", "图文"], "生成一张知识卡片底图。主题为 {subject}，面向 {audience}。画面简洁有层级，包含抽象图形、学习场景或轻量图标感元素，保留大面积文字排版区域，适合小红书、朋友圈和社群课程图文。", "不要生成具体文字，不要复杂背景，不要过多图标导致阅读干扰。"),
  tpl("media_livestream_bg", "自媒体内容", "直播间背景", "1536x1024", "medium", "jpeg", ["直播", "背景"], "生成一个直播间背景画面。行业为 {subject}，主题为 {season}，卖点为 {selling_points}。画面干净、有销售或知识分享氛围，背景包含货架、柔光、品牌感装饰或展示台，中间或右侧留出主播站位。", "不要生成真实文字和价格，避免杂乱、过多人物、水印、二维码、低清晰度。"),
  tpl("brand_festival", "品牌广告", "节日营销海报", "1024x1536", "high", "jpeg", ["节日", "营销"], "生成一张节日营销海报底图。节日为 {season}，品牌或产品为 {brand}，核心活动为 {selling_points}。画面有节日氛围但不过度俗艳，主体明确，色彩高级，保留主标题、优惠信息和 logo 区域。", "不要直接生成促销文字、虚假 logo、二维码、水印或低俗符号。"),
  tpl("brand_pop", "品牌广告", "线下活动物料", "1536x1024", "medium", "png", ["活动", "物料"], "生成一张线下活动主视觉底图。活动主题为 {subject}，品牌调性为 {style}，核心信息为 {selling_points}。构图适合展架、易拉宝、门店屏幕或会场背景，视觉中心明确，周围留出文案和二维码位置。", "避免生成真实二维码、错误品牌字样、信息过密、舞台透视混乱。"),
  tpl("brand_social_campaign", "品牌广告", "社媒整合传播图", "1536x1024", "medium", "jpeg", ["社媒", "传播"], "生成一张品牌社媒传播底图。品牌为 {brand}，传播主题为 {subject}，关键词为 {selling_points}。画面适合微博、小红书、朋友圈和信息流广告，主体强识别，情绪明确，留白充分，能延展成多尺寸物料。", "不要生成未经确认的品牌标识、文字乱码、夸张承诺或低俗视觉。"),
  tpl("game_prop_icon", "游戏美术", "游戏道具图标", "1024x1024", "high", "png", ["道具", "图标"], "生成一组游戏道具图标。道具为 {subject}，风格 {style}。图标居中，轮廓清晰，光影统一，材质明确，背景干净或深色底，适合 UI 小尺寸识别。", "避免过多细节、低对比、不同道具风格不统一、透明底错误边缘。"),
  tpl("game_environment", "游戏美术", "游戏场景概念", "1536x1024", "high", "png", ["场景", "概念"], "生成一张游戏场景概念图。场景为 {scene}，世界观为 {subject}，氛围 {style}。画面包含明确空间层次、可探索路径、关键建筑或自然地貌，光影和色彩统一，适合立项氛围和美术方向。", "避免空间逻辑混乱、细节堆砌、过度电影海报化、人物抢主体。"),
  tpl("interior_facade", "家装建筑", "建筑外立面效果图", "1536x1024", "high", "jpeg", ["建筑", "外立面"], "生成一张建筑外立面效果图。建筑类型为 {subject}，风格 {style}，卖点为 {selling_points}。立面比例准确，材质真实，门窗和景观协调，日景或夜景光线自然，适合方案汇报和地产宣传。", "避免透视错误、门窗重复错乱、建筑悬浮、虚假地标。"),
  tpl("interior_garden", "家装建筑", "庭院景观方案", "1536x1024", "high", "jpeg", ["庭院", "景观"], "生成一张庭院/露台景观效果图。空间为 {scene}，风格 {style}，核心需求为 {selling_points}。画面包含植物、水景、休闲家具、灯光或铺装，比例合理，氛围舒适，适合设计提案和客户沟通。", "避免植物比例异常、空间拥挤、家具悬浮、过度奢华不真实。"),
  tpl("travel_route", "文旅酒店", "旅行路线攻略封面", "1024x1536", "medium", "jpeg", ["攻略", "路线"], "生成一张旅行路线攻略封面底图。目的地为 {subject}，核心体验为 {selling_points}。画面包含地图感、地标、交通、自然风景或当地文化元素，清爽有秩序，保留标题和路线信息排版区域。", "避免错误地标、具体地图文字乱码、游客过多、过度拥挤。"),
  tpl("travel_camping", "文旅酒店", "露营民宿种草图", "1536x1024", "high", "jpeg", ["露营", "民宿"], "生成一张露营/民宿种草图。场景为 {scene}，卖点为 {selling_points}。画面突出帐篷、木屋、露台、篝火、山谷、湖边或星空氛围，真实舒适，高级但不失生活感，适合 OTA 和社媒。", "避免火源危险、空间脏乱、过度滤镜、人物比例异常。"),
  tpl("education_admission", "教育知识", "招生宣传图", "1024x1536", "medium", "jpeg", ["招生", "教育"], "生成一张教育机构招生宣传底图。课程或机构为 {subject}，目标学员为 {audience}，卖点为 {selling_points}。画面专业可信，有学习氛围、课堂或成长感元素，留出标题、时间和报名信息区域。", "不要生成具体承诺、夸大升学结果、真实校徽、二维码或乱码文字。"),
  tpl("education_children_book", "教育知识", "儿童绘本插画", "1024x1536", "medium", "png", ["儿童", "绘本"], "生成一张儿童绘本插画。故事主题为 {subject}，场景为 {scene}，情绪为 {style}。画面温暖、清晰、友好，角色表情自然，色彩柔和，适合儿童读物、课程材料和亲子内容。", "避免恐怖元素、复杂阴影、成人化审美、文字乱码。"),
  tpl("medical_science", "医美健康", "健康科普图", "1024x1536", "medium", "jpeg", ["健康", "科普"], "生成一张健康科普图底图。主题为 {subject}，受众为 {audience}。画面干净、专业、可信，可包含医生、咨询场景、身体健康抽象元素或医疗空间，留出科普文字排版区域。", "避免夸大疗效、恐吓式画面、血腥细节、虚假医疗承诺、乱码文字。"),
  tpl("fitness_poster", "医美健康", "健身塑形海报", "1024x1536", "medium", "jpeg", ["健身", "运动"], "生成一张健身/塑形宣传海报底图。主题为 {subject}，卖点为 {selling_points}。人物动作专业，光线健康有力量感，场景为健身房、户外跑道或瑜伽空间，留出课程和活动信息区域。", "避免过度夸张身材、危险动作、低俗姿态、虚假效果对比。"),
  tpl("b2b_factory", "工业企业与 B2B", "工厂车间形象图", "1536x1024", "medium", "jpeg", ["工厂", "车间"], "生成一张工业企业工厂车间形象图。行业为 {subject}，核心优势为 {selling_points}。画面展示整洁产线、设备、工程师或质检场景，光线专业可信，适合官网、宣传册和招商材料。", "避免危险操作、设备结构错乱、车间脏乱、过度科幻。"),
  tpl("b2b_exhibition", "工业企业与 B2B", "展会招商海报", "1024x1536", "medium", "png", ["展会", "招商"], "生成一张 B2B 展会招商海报底图。企业或产品为 {brand}，展会主题为 {subject}，卖点为 {selling_points}。画面包含展台、产品展示、商务沟通或科技空间，留出展位号、日期和联系方式区域。", "不要生成具体展位文字、虚假 logo、二维码、拥挤人群和乱码。"),
  tpl("realestate_local_shop", "房产本地生活", "本地门店探店图", "1024x1536", "medium", "jpeg", ["探店", "本地生活"], "生成一张本地门店探店种草图。门店类型为 {subject}，卖点为 {selling_points}。画面展示门头、环境、招牌产品或服务体验，真实干净，有生活方式氛围，适合小红书、抖音团购和朋友圈。", "避免虚假店名文字、环境脏乱、夸张排队、过度滤镜。"),
  tpl("realestate_rental", "房产本地生活", "租房公寓展示图", "1536x1024", "medium", "jpeg", ["租房", "公寓"], "生成一张租房/公寓展示图。房源类型为 {subject}，核心卖点为 {selling_points}。画面展示卧室、客厅、厨房、收纳或社区配套，干净明亮，真实可信，适合租房平台和本地中介宣传。", "避免空间比例失真、虚假窗景、过度豪华、家具悬浮。"),
  tpl("baby_parenting", "母婴宠物", "亲子家庭场景图", "1024x1536", "medium", "jpeg", ["亲子", "家庭"], "生成一张亲子家庭场景图。主题为 {subject}，卖点为 {selling_points}。画面温暖、安全、真实，包含亲子互动、儿童房、学习桌、玩具或生活用品，适合母婴品牌、课程和社媒内容。", "避免危险动作、儿童隐私过度暴露、医疗暗示、人物肢体畸形。"),
  tpl("pet_food", "母婴宠物", "宠物食品主图", "1024x1024", "medium", "png", ["宠物", "食品"], "生成一张宠物食品电商主图。产品为 {product_name}，卖点为 {selling_points}。包装清晰，搭配猫狗、食材或喂食场景，画面干净可信，适合电商首图和详情页。", "避免宠物姿态异常、包装文字乱码、夸大医疗功效、食物不可食用质感。"),
  tpl("auto_interior", "汽车出行", "汽车内饰氛围图", "1536x1024", "high", "jpeg", ["汽车", "内饰"], "生成一张汽车内饰氛围图。车型或主题为 {subject}，卖点为 {selling_points}。画面突出座舱、方向盘、中控、座椅材质、氛围灯或智能屏幕，比例准确，光线高级，适合汽车内容和宣传物料。", "避免方向盘错位、屏幕乱码、车内结构混乱、品牌标识错误。"),
  tpl("auto_charging", "汽车出行", "新能源充电场景", "1536x1024", "medium", "jpeg", ["新能源", "充电"], "生成一张新能源车充电场景图。主题为 {subject}，卖点为 {selling_points}。画面包含城市充电站、家庭车库、光伏、智能电桩或出行生活场景，科技感克制，车辆比例真实。", "避免充电线连接错误、车标错乱、过度科幻、危险用电场景。"),
  tpl("finance_trust", "金融保险", "金融信任品牌图", "1536x1024", "medium", "jpeg", ["金融", "信任"], "生成一张金融/保险品牌宣传底图。主题为 {subject}，目标人群为 {audience}，核心信息为 {selling_points}。画面专业、稳重、可信，可包含家庭、商务人士、城市、数据抽象元素，留出标题和免责声明区域。", "避免承诺收益、夸大保障、具体金额文字、虚假机构标识、二维码。"),
  tpl("finance_course", "金融保险", "理财课程封面", "1536x1024", "medium", "jpeg", ["课程", "理财"], "生成一张理财/财商课程封面底图。课程主题为 {subject}，学员为 {audience}。画面有知识感、秩序感和可信专业氛围，包含书桌、数据图形、城市或讲师场景，留出课程标题区域。", "不要生成收益承诺、具体数字、证券代码、真实机构 logo 和乱码文字。"),
  tpl("legal_public", "法律政务", "普法宣传图", "1024x1536", "medium", "jpeg", ["法律", "普法"], "生成一张普法宣传图底图。主题为 {subject}，受众为 {audience}。画面庄重、清晰、可信，可包含法槌、书籍、咨询场景、城市公共服务空间或抽象秩序元素，留出标题和条文说明区域。", "避免生成真实机关徽章、错误法律条文、恐吓式画面、乱码文字。"),
  tpl("legal_service", "法律政务", "法律咨询服务图", "1536x1024", "medium", "jpeg", ["咨询", "服务"], "生成一张法律咨询服务宣传底图。服务方向为 {subject}，核心卖点为 {selling_points}。画面体现专业、保密、沟通和解决问题，可包含会议桌、合同文件、律师形象或现代办公环境。", "避免承诺胜诉、生成真实律所标识、合同文字乱码、人物表情夸张。"),
  tpl("agri_product", "农业生鲜", "农产品主图", "1024x1024", "medium", "jpeg", ["农产品", "生鲜"], "生成一张农产品电商主图。产品为 {product_name}，卖点为 {selling_points}。突出新鲜、产地、色泽、大小和包装，背景干净自然，可搭配田园、果园或原料元素，适合生鲜平台和私域团购。", "避免颜色过度艳丽、腐坏质感、虚假产地文字、包装乱码。"),
  tpl("agri_origin", "农业生鲜", "产地溯源宣传图", "1536x1024", "medium", "jpeg", ["产地", "溯源"], "生成一张农产品产地溯源宣传图。产地为 {subject}，卖点为 {selling_points}。画面包含田地、果园、采摘、农户、包装或物流场景，真实阳光、干净可信，适合品牌故事和详情页。", "避免虚假地图文字、过度摆拍、环境脏乱、夸大有机认证。"),
  tpl("saas_hero", "SaaS科技", "官网首屏视觉", "1536x1024", "high", "png", ["SaaS", "官网"], "生成一张 SaaS/科技产品官网首屏视觉。产品方向为 {subject}，核心卖点为 {selling_points}。画面包含抽象产品界面、数据流、团队协作或业务场景，风格现代、可信、简洁，右侧或左侧留出标题和 CTA 区域。", "不要生成具体界面文字、虚假 logo、过度炫光、复杂到影响阅读。"),
  tpl("saas_dashboard", "SaaS科技", "数据大屏背景", "1536x1024", "high", "png", ["数据", "大屏"], "生成一张数据大屏/BI 可视化背景图。行业为 {subject}，指标方向为 {selling_points}。画面有清晰面板层次、图表感和科技质感，适合产品演示、汇报和官网场景。", "不要生成具体数字和文字，不要图表过密，不要赛博朋克过度。"),
  tpl("sports_campaign", "运动户外", "运动品牌海报", "1024x1536", "medium", "jpeg", ["运动", "海报"], "生成一张运动品牌宣传海报底图。运动项目为 {subject}，卖点为 {selling_points}。人物动作有力量和速度感，装备清晰，场景可为城市、球场、山地或健身房，留出活动标题区域。", "避免危险动作、身体结构错误、品牌标识错乱、过度肌肉夸张。"),
  tpl("outdoor_gear", "运动户外", "户外装备场景图", "1536x1024", "medium", "jpeg", ["户外", "装备"], "生成一张户外装备场景图。装备为 {product_name}，卖点为 {selling_points}。画面包含山地、营地、徒步、骑行或露营场景，装备功能和材质清晰，氛围真实可靠。", "避免危险使用方式、装备结构错误、天气过度极端、画面杂乱。"),
  tpl("wedding_poster", "婚庆摄影", "婚礼主视觉", "1024x1536", "high", "jpeg", ["婚礼", "主视觉"], "生成一张婚礼主视觉底图。婚礼主题为 {subject}，风格 {style}，色彩为 {color_palette}。画面浪漫、干净、高级，可包含花艺、宴会厅、户外仪式、戒指或新人剪影，留出新人姓名和日期区域。", "不要生成具体姓名文字、人物脸部崩坏、俗艳装饰、过度梦幻失真。"),
  tpl("photo_portrait", "婚庆摄影", "写真样片风格图", "1024x1536", "high", "jpeg", ["写真", "样片"], "生成一张人像写真样片风格图。主题为 {subject}，情绪为 {style}，场景为 {scene}。人物姿态自然，光影高级，服装和背景协调，适合摄影工作室样片、套餐展示和社媒推广。", "避免过度磨皮、五官崩坏、手部畸形、低俗姿态和文字水印。"),
  tpl("hr_recruit", "招聘人力", "招聘海报底图", "1024x1536", "medium", "jpeg", ["招聘", "海报"], "生成一张招聘海报底图。岗位方向为 {subject}，企业卖点为 {selling_points}。画面专业、有团队氛围和成长感，可包含办公空间、协作场景或城市背景，留出岗位名称、薪资和联系方式区域。", "不要生成具体薪资文字、虚假公司 logo、过度鸡血、人物表情夸张。"),
  tpl("hr_culture", "招聘人力", "企业文化宣传图", "1536x1024", "medium", "jpeg", ["企业文化", "团队"], "生成一张企业文化宣传图。企业主题为 {brand}，文化关键词为 {selling_points}。画面体现团队协作、开放办公、培训、创新或服务精神，真实可信，适合官网、公众号和招聘页。", "避免虚假品牌标识、人物过度摆拍、口号文字乱码、空间杂乱。"),
  tpl("crossborder_amazon", "跨境电商", "亚马逊白底主图", "1024x1024", "high", "png", ["亚马逊", "白底"], "生成一张亚马逊平台商品白底主图。商品为 {product_name}，核心卖点为 {selling_points}。主体占画面 85% 左右，纯白背景，产品结构、材质、颜色和包装准确，边缘清晰，光影自然，适合跨境电商 Listing 首图。", "避免道具、模特、文字、价格、徽章、水印、变形包装和不符合白底主图规范的背景。"),
  tpl("crossborder_lifestyle", "跨境电商", "海外生活方式图", "1536x1024", "medium", "jpeg", ["生活方式", "Listing"], "生成一张跨境电商生活方式图。商品为 {product_name}，目标人群为 {audience}，使用场景为 {scene}。画面符合欧美或东南亚消费场景，人物和空间自然，突出产品使用价值，适合 Listing 图组和广告素材。", "避免夸张摆拍、文化不匹配、产品结构改变、错误文字和低质感背景。"),
  tpl("shoes_bags", "鞋包配饰", "鞋包商业大片", "1024x1536", "high", "jpeg", ["鞋包", "大片"], "生成一张鞋包配饰商业大片。产品为 {product_name}，风格 {style}，卖点为 {selling_points}。突出皮革、织物、五金、鞋底或包型结构，光影高级，构图适合品牌海报、电商首屏和社媒种草。", "避免包型变形、鞋底结构错误、五金错乱、廉价质感和虚假品牌标识。"),
  tpl("luxury_watch", "鞋包配饰", "腕表珠宝质感图", "1024x1536", "high", "png", ["腕表", "珠宝"], "生成一张腕表/高级配饰质感图。主体为 {product_name}，卖点为 {selling_points}。画面突出表盘、指针、表带、金属拉丝、宝石或精密结构，微距光影精致，背景简洁高级。", "避免刻度错乱、指针结构错误、过曝反光、廉价塑料感、未经确认的品牌标识。"),
  tpl("beauty_before_after", "美业个护", "美业服务宣传图", "1024x1536", "medium", "jpeg", ["美业", "服务"], "生成一张美业/个护服务宣传底图。服务主题为 {subject}，目标人群为 {audience}，卖点为 {selling_points}。画面干净、精致、可信，可包含护理空间、工具、自然人像或产品陈列，留出活动文案区域。", "避免夸大效果、过度前后对比、医疗暗示、皮肤失真、文字乱码。"),
  tpl("salon_store", "美业个护", "美容美发门店图", "1536x1024", "medium", "jpeg", ["门店", "美发"], "生成一张美容美发/美甲门店宣传图。门店主题为 {subject}，风格为 {style}，核心卖点为 {selling_points}。展示整洁空间、服务台、座椅、镜面、灯光或作品墙，氛围专业舒适，适合团购和社媒引流。", "避免虚假店名、空间脏乱、镜面人物错乱、廉价装饰和过度滤镜。"),
  tpl("medical_device", "医疗器械", "医疗器械产品图", "1536x1024", "high", "png", ["器械", "产品"], "生成一张医疗器械/健康设备产品图。产品为 {product_name}，卖点为 {selling_points}。画面专业、洁净、可信，设备结构清晰，材质真实，背景为医疗空间、实验室或纯净棚拍，适合官网、手册和展会物料。", "避免夸大疗效、错误操作、危险使用场景、虚假认证标识和文字乱码。"),
  tpl("medical_clinic", "医疗器械", "诊所机构形象图", "1536x1024", "medium", "jpeg", ["诊所", "机构"], "生成一张诊所/健康管理机构形象图。机构方向为 {subject}，核心优势为 {selling_points}。画面体现专业、卫生、温和服务，可包含前台、诊室、医生沟通、设备或客户咨询场景。", "避免血腥细节、夸大承诺、错误医疗流程、真实医院标识和过度商业化。"),
  tpl("gov_party", "法律政务", "党建政务宣传底图", "1536x1024", "medium", "jpeg", ["党建", "政务"], "生成一张党建/政务宣传底图。主题为 {subject}，核心关键词为 {selling_points}。画面庄重、清晰、积极，可包含城市公共空间、会议场景、红色视觉元素、服务窗口或基层治理氛围，留出标题和正文区域。", "避免生成真实徽章细节、错误标语文字、人物夸张、画面俗艳和乱码。"),
  tpl("public_service", "法律政务", "公共服务宣传图", "1024x1536", "medium", "jpeg", ["公共服务", "社区"], "生成一张公共服务/社区活动宣传底图。主题为 {subject}，服务对象为 {audience}，活动亮点为 {selling_points}。画面亲和、秩序清楚，可包含社区、志愿服务、窗口办理、活动现场或家庭服务场景。", "避免真实个人信息、错误标识、拥挤混乱、恐吓式画面和文字乱码。"),
  tpl("exhibition_booth", "会展活动", "展台空间效果图", "1536x1024", "high", "jpeg", ["展台", "会展"], "生成一张会展展台空间效果图。品牌为 {brand}，展会主题为 {subject}，卖点为 {selling_points}。空间结构清晰，产品展示区、洽谈区、灯箱或屏幕布局合理，光线高级，适合展会方案提案。", "避免品牌文字乱码、透视错误、展台结构不合理、人群拥堵和虚假 logo。"),
  tpl("event_stage", "会展活动", "发布会舞台视觉", "1536x1024", "high", "png", ["发布会", "舞台"], "生成一张发布会/年会舞台主视觉。活动主题为 {subject}，品牌调性为 {style}，核心信息为 {selling_points}。画面有舞台、屏幕、灯光、座席或展示区域，构图大气，适合提案和主视觉延展。", "避免直接生成具体文字、舞台透视混乱、灯光过曝、低清晰度。"),
  tpl("podcast_cover", "音频播客", "播客封面底图", "1024x1024", "medium", "png", ["播客", "封面"], "生成一张播客/音频节目封面底图。节目主题为 {subject}，听众为 {audience}，风格 {style}。画面有清晰主体、声音或访谈元素、稳定识别度，适合方形封面和音频平台展示。", "不要生成具体节目标题文字、二维码、水印、复杂小元素和低对比背景。"),
  tpl("music_single", "音频播客", "音乐单曲封面", "1024x1024", "high", "jpeg", ["音乐", "封面"], "生成一张音乐单曲/专辑封面底图。音乐主题为 {subject}，情绪为 {style}，核心意象为 {selling_points}。画面有强记忆点、艺术感和方形构图，适合流媒体平台封面。", "避免文字乱码、真实艺人肖像侵权、过度复杂元素和低清晰度。"),
  tpl("local_promo", "本地门店营销", "门店促销海报", "1024x1536", "medium", "jpeg", ["促销", "门店"], "生成一张本地门店促销海报底图。门店类型为 {subject}，活动为 {season}，卖点为 {selling_points}。画面热闹但清爽，产品或服务突出，留出价格、优惠和二维码区域，适合朋友圈、社群和团购平台。", "不要生成具体价格文字、虚假二维码、环境脏乱、低俗促销和乱码。"),
  tpl("local_service_card", "本地门店营销", "服务项目展示图", "1024x1536", "medium", "jpeg", ["服务", "项目"], "生成一张本地服务项目展示图。服务为 {subject}，目标客户为 {audience}，卖点为 {selling_points}。画面真实、可信、容易理解，可包含服务过程、工具、门店环境或顾客体验，留出项目名称和套餐区域。", "避免夸大效果、虚假资质、人物隐私暴露、文字乱码和杂乱背景。"),
  tpl("ebook_cover", "出版内容", "电子书封面底图", "1024x1536", "medium", "png", ["电子书", "封面"], "生成一张电子书/资料包封面底图。主题为 {subject}，读者为 {audience}，价值点为 {selling_points}。画面有知识产品感、专业可信，构图适合竖版封面，留出书名、作者和副标题区域。", "不要生成具体书名文字、盗用真实封面、二维码、水印或过多细节。"),
  tpl("magazine_editorial", "出版内容", "杂志专题视觉", "1536x1024", "high", "jpeg", ["杂志", "专题"], "生成一张杂志专题视觉图。专题主题为 {subject}，风格 {style}，核心观点为 {selling_points}。画面具有编辑感、人物或物件构图高级，适合专题头图、长图首屏和品牌内容。", "避免生成真实杂志 masthead、文字乱码、过度商业广告感和肖像侵权。"),
  tpl("craft_product", "手作文创", "文创手作产品图", "1024x1536", "medium", "jpeg", ["文创", "手作"], "生成一张文创/手作产品宣传图。产品为 {product_name}，风格 {style}，卖点为 {selling_points}。画面突出手工质感、材料细节、包装和使用场景，温度感强，适合市集、电商和社媒。", "避免材质失真、产品结构改变、过度廉价摆拍、文字乱码和杂乱背景。"),
  tpl("nonprofit_campaign", "公益组织", "公益活动宣传图", "1024x1536", "medium", "jpeg", ["公益", "活动"], "生成一张公益活动宣传底图。主题为 {subject}，服务对象为 {audience}，活动目标为 {selling_points}。画面温暖、可信、克制，可包含志愿者、社区、环保、儿童关怀或公共服务场景，留出活动信息区域。", "避免苦难消费、真实隐私、夸大承诺、标识错误和文字乱码。"),
  tpl("toy_blindbox", "潮玩玩具", "潮玩盲盒主图", "1024x1024", "high", "png", ["潮玩", "盲盒"], "生成一张潮玩/盲盒商品主图。产品为 {product_name}，系列主题为 {subject}，卖点为 {selling_points}。画面突出角色造型、表情、材质和包装，色彩年轻有辨识度，背景干净，可用于电商首图、社媒种草和新品预热。", "避免角色结构变形、盒身文字乱码、盗用知名 IP、材质廉价、主体过小。"),
  tpl("toy_scene", "潮玩玩具", "玩具收藏陈列图", "1536x1024", "medium", "jpeg", ["收藏", "陈列"], "生成一张玩具/手办收藏陈列图。主体为 {product_name}，场景为 {scene}，风格 {style}。展示柜、桌面、灯光和背景有收藏氛围，主体比例真实，适合详情页、社群晒图和品牌内容。", "避免角色侵权、货架杂乱、比例错误、玻璃反光过曝、文字水印。"),
  tpl("jewelry_wedding_ring", "珠宝婚戒", "婚戒对戒海报", "1024x1536", "high", "png", ["婚戒", "对戒"], "生成一张婚戒/对戒高级海报底图。产品为 {product_name}，材质为 {material}，卖点为 {selling_points}。画面包含戒指微距、柔和高光、花艺、丝绸或极简高级背景，留出品牌和活动文案区域。", "避免戒圈变形、钻石结构错误、过曝反光、俗艳背景、虚假品牌标识。"),
  tpl("jewelry_gift", "珠宝婚戒", "节日礼赠珠宝图", "1024x1536", "high", "jpeg", ["礼赠", "珠宝"], "生成一张节日珠宝礼赠宣传图。节日为 {season}，产品为 {product_name}，目标人群为 {audience}。画面精致、温暖、有礼物仪式感，突出项链、耳饰、手链或戒指细节，适合朋友圈、小红书和电商活动页。", "避免文字乱码、首饰结构错乱、廉价礼盒、过度红金俗艳、人物手部畸形。"),
  tpl("beauty_skincare_routine", "美妆护肤", "护肤流程套装图", "1024x1536", "high", "png", ["护肤", "套装"], "生成一张护肤套装流程图。产品为 {product_name}，功效卖点为 {selling_points}，材质/肤感为 {material}。多件产品排列有层次，背景干净高级，可加入水滴、植物、实验室或浴室元素，留出步骤说明区域。", "避免功效夸大、包装文字乱码、瓶身变形、医疗暗示、杂乱道具。"),
  tpl("beauty_makeup_look", "美妆护肤", "妆容灵感图", "1024x1536", "high", "jpeg", ["妆容", "灵感"], "生成一张妆容灵感图。主题为 {subject}，色彩为 {color_palette}，目标人群为 {audience}。人物妆容干净精致，眼妆、唇妆、腮红和肤质自然，背景与妆容氛围统一，适合美妆教程封面和新品种草。", "避免过度磨皮、五官崩坏、妆面脏乱、低俗姿态、文字水印。"),
  tpl("fashion_lookbook", "服饰鞋包", "品牌 Lookbook", "1024x1536", "high", "jpeg", ["Lookbook", "服饰"], "生成一张服饰品牌 Lookbook 图片。服装为 {product_name}，风格 {style}，目标人群 {audience}，价格带 {price_tier}。模特姿态自然，服装版型、面料、颜色和搭配清晰，背景符合品牌调性。", "避免衣服结构错乱、肢体畸形、过度网红滤镜、品牌 logo 乱码、图案漂移。"),
  tpl("fashion_accessory_flatlay", "服饰鞋包", "配饰平铺搭配图", "1024x1536", "medium", "jpeg", ["配饰", "搭配"], "生成一张配饰平铺搭配图。主体为 {product_name}，材质为 {material}，搭配风格 {style}。画面包含包、鞋、帽、首饰、香水或衣物局部，排列高级有秩序，适合小红书种草和详情页组合推荐。", "避免元素过多、比例混乱、材质失真、文字乱码、假品牌标识。"),
  tpl("realestate_aerial", "房产物业", "楼盘航拍鸟瞰图", "1536x1024", "high", "jpeg", ["航拍", "楼盘"], "生成一张楼盘/园区鸟瞰宣传图。项目为 {subject}，卖点为 {selling_points}，地区为 {region}。画面展示建筑群、园林、水系、道路和城市关系，光线清晰，构图大气，适合楼书、海报和招商材料。", "避免虚假地标、建筑悬浮、道路逻辑错误、透视混乱、过度豪华不真实。"),
  tpl("property_service", "房产物业", "物业服务宣传图", "1536x1024", "medium", "jpeg", ["物业", "服务"], "生成一张物业/社区服务宣传底图。服务主题为 {subject}，服务对象为 {audience}，卖点为 {selling_points}。画面体现保洁、安防、维修、前台、园区巡检或邻里活动，干净、可信、有秩序。", "避免制服标识错误、人员表情夸张、环境脏乱、隐私信息和文字乱码。"),
  tpl("logistics_warehouse", "物流仓储", "仓储自动化宣传图", "1536x1024", "medium", "jpeg", ["仓储", "物流"], "生成一张物流仓储自动化宣传图。业务为 {subject}，核心优势为 {selling_points}。画面包含货架、分拣线、叉车、机器人、包装台或数据看板，空间整洁，效率感强，适合官网和招商材料。", "避免危险操作、货架结构错乱、过度科幻、真实运单信息、文字乱码。"),
  tpl("logistics_delivery", "物流仓储", "同城配送服务图", "1024x1536", "medium", "jpeg", ["配送", "同城"], "生成一张同城配送/快递服务宣传图。服务为 {subject}，卖点为 {selling_points}，地区为 {region}。画面体现骑手、车辆、包裹、城市街区或门店交付，速度感和可信度兼具，留出服务承诺文案区域。", "避免真实个人信息、危险驾驶、品牌标识错误、包裹文字乱码。"),
  tpl("manufacturing_process", "制造加工", "生产工艺流程图", "1536x1024", "medium", "png", ["工艺", "流程"], "生成一张制造业生产工艺流程视觉图。产品为 {product_name}，工艺为 {material}，优势为 {selling_points}。画面展示原料、加工、质检、包装或出货环节，层次清晰，适合官网、展会和宣传册。", "避免设备结构错乱、危险操作、工人防护不当、文字乱码、流程过密。"),
  tpl("manufacturing_quality", "制造加工", "质检实验室图", "1536x1024", "high", "jpeg", ["质检", "实验室"], "生成一张质检/实验室形象图。行业为 {subject}，检测优势为 {selling_points}。画面包含工程师、检测仪器、样品、数据屏或洁净空间，体现专业、可靠和标准化。", "避免仪器结构错误、危险场景、虚假认证标识、人员操作不规范。"),
  tpl("energy_solar", "能源环保", "光伏新能源宣传图", "1536x1024", "high", "jpeg", ["光伏", "新能源"], "生成一张光伏/新能源宣传图。主题为 {subject}，核心卖点为 {selling_points}，地区为 {region}。画面包含太阳能板、储能设备、工厂屋顶、家庭能源或城市绿色能源场景，阳光真实，科技感克制。", "避免电路错误、过度科幻、危险施工、虚假数据文字、环境比例异常。"),
  tpl("energy_recycle", "能源环保", "环保回收活动图", "1024x1536", "medium", "jpeg", ["环保", "回收"], "生成一张环保/回收活动宣传底图。活动主题为 {subject}，服务对象为 {audience}，目标为 {selling_points}。画面包含社区回收、绿色植物、低碳生活、志愿服务或城市公共空间，清爽可信，留出活动信息区域。", "避免脏乱垃圾堆、苦难化表达、真实个人信息、错误环保标识。"),
  tpl("personal_ip_portrait", "个人IP", "专家个人品牌形象图", "1024x1536", "high", "jpeg", ["个人IP", "专家"], "生成一张专家/讲师个人品牌形象图。人物为 {character}，领域为 {subject}，核心标签为 {selling_points}。画面专业、自信、亲和，可包含书房、办公室、演讲台或城市背景，适合头像、课程页和社媒主页。", "避免过度磨皮、五官崩坏、廉价影楼感、虚假证书文字、夸张姿态。"),
  tpl("personal_ip_course", "个人IP", "知识付费课程海报", "1024x1536", "medium", "jpeg", ["课程", "知识付费"], "生成一张知识付费课程宣传底图。课程主题为 {subject}，目标学员为 {audience}，卖点为 {selling_points}。画面体现专业、体系化和成长感，留出课程标题、讲师、价格或报名按钮区域。", "避免收益承诺、具体价格文字、虚假头衔、二维码、信息过密。"),
  tpl("festival_newyear", "节庆活动", "春节新年海报", "1024x1536", "high", "jpeg", ["春节", "新年"], "生成一张春节/新年活动海报底图。品牌为 {brand}，活动为 {promotion}，产品或主题为 {subject}。画面喜庆但高级，包含年味、礼盒、灯笼、烟花、团圆或国潮元素，留出促销信息区域。", "避免俗艳过度、文字乱码、错误生肖、虚假 logo、元素堆砌。"),
  tpl("festival_618_double11", "节庆活动", "大促活动视觉", "1024x1536", "medium", "png", ["大促", "活动"], "生成一张电商大促活动视觉底图。平台为 {platform}，活动机制为 {promotion}，产品为 {product_name}。画面有强促销氛围、商品突出、层次清楚，适合 618、双11、年货节、直播间预热。", "不要生成具体价格和复杂文字，避免廉价爆炸贴、商品变形、水印和二维码。"),
  tpl("live_ecommerce", "直播电商", "直播间货盘背景", "1536x1024", "medium", "jpeg", ["直播", "货盘"], "生成一张直播电商货盘背景。品类为 {subject}，卖点为 {selling_points}，活动为 {promotion}。画面包含展示台、货架、柔光、品牌色装饰和主播站位，商品陈列有秩序，适合直播间布景和封面。", "不要生成价格文字、虚假二维码、过度拥挤、人脸崩坏、低清晰度。"),
  tpl("live_training", "直播电商", "直播课程封面", "1024x1536", "medium", "jpeg", ["直播课", "封面"], "生成一张直播课程封面底图。主题为 {subject}，讲师/人物为 {character}，目标人群为 {audience}。画面专业有吸引力，包含讲师、屏幕、课堂或社群元素，留出直播时间和标题区域。", "避免虚假证书、收益承诺、文字乱码、人物表情夸张。"),
  tpl("mobile_app_store", "APP产品", "应用商店截图背景", "1024x1536", "high", "png", ["APP", "商店"], "生成一张 APP 应用商店宣传截图背景。产品方向为 {subject}，核心卖点为 {selling_points}，平台为 {platform}。画面现代、清晰、有产品界面承载区，适合 App Store、应用宝、官网和投放素材。", "不要生成具体 UI 文字、虚假手机品牌、过度炫光、界面内容拥挤。"),
  tpl("mobile_app_onboarding", "APP产品", "新手引导插画", "1024x1536", "medium", "png", ["引导页", "插画"], "生成一张 APP 新手引导页插画。功能主题为 {subject}，目标用户为 {audience}，视觉风格 {style}。画面简洁、友好、有明确功能隐喻，适合移动端首屏和功能引导。", "避免文字乱码、图标过多、风格幼稚、人物肢体异常。"),
  tpl("packaging_design", "包装设计", "产品包装概念图", "1024x1536", "high", "png", ["包装", "概念"], "生成一张产品包装概念展示图。产品为 {product_name}，材质为 {material}，风格为 {style}，价格带 {price_tier}。展示盒型、瓶型、袋装或礼盒结构，背景干净，适合包装提案和品牌方向探索。", "避免文字乱码、包装结构不成立、盗用品牌、比例错误、过度复杂花纹。"),
  tpl("packaging_giftbox", "包装设计", "礼盒套装陈列图", "1536x1024", "high", "jpeg", ["礼盒", "套装"], "生成一张礼盒套装陈列图。品牌为 {brand}，节日为 {season}，产品卖点为 {selling_points}。画面包含外盒、内托、产品组合、丝带或原料元素，光影高级，适合电商详情页和渠道招商。", "避免礼盒文字乱码、产品数量混乱、过度奢华不真实、包装变形。"),
  tpl("portrait_social_avatar", "人物图像", "社交头像写真", "1024x1024", "high", "jpeg", ["头像", "写真"], "生成一张高质感社交头像写真。人物为 {character}，身份/气质为 {selling_points}，风格 {style}，面向 {audience}。半身或近景构图，眼神自然，脸部清晰，背景干净有层次，小尺寸也有识别度，适合微信、小红书、抖音、个人主页头像。", "避免真实明星肖像、过度磨皮、五官崩坏、手部畸形、低俗暴露、未成年人不当表达、文字水印。"),
  tpl("portrait_ai_photo", "人物图像", "AI 写真大片", "1024x1536", "high", "jpeg", ["写真", "大片"], "生成一张 AI 人像写真大片。人物为 {character}，主题为 {subject}，情绪为 {style}，场景为 {scene}。人物姿态自然，服装妆发协调，光影高级，肤质真实，构图适合社媒发布、个人形象和写真样片。", "避免真实明星肖像、低俗姿态、脸部崩坏、皮肤塑料感、肢体比例异常、文字乱码。"),
  tpl("portrait_street_snap", "人物图像", "城市街拍人像", "1024x1536", "medium", "jpeg", ["街拍", "穿搭"], "生成一张城市街拍人像。人物为 {character}，穿搭风格 {style}，场景为 {scene}，色彩 {color_palette}。画面自然抓拍感，服装轮廓清晰，背景有城市生活气息，适合穿搭分享、社媒封面和个人主页。", "避免侵权品牌 logo、人物脸部崩坏、手部畸形、背景杂乱、过度网红滤镜。"),
  tpl("portrait_business_young", "人物图像", "年轻职场形象照", "1024x1536", "high", "jpeg", ["职场", "形象照"], "生成一张年轻职场形象照。人物为 {character}，领域为 {subject}，核心标签为 {selling_points}。画面专业、亲和、自信，背景可为办公室、书房、城市空间或简洁棚拍，适合简历、讲师页、个人 IP 和商务头像。", "避免虚假证书文字、过度修图、廉价影楼感、表情僵硬、服装结构错乱。"),
  tpl("portrait_hanfu_guochao", "人物图像", "国风汉服写真", "1024x1536", "high", "jpeg", ["国风", "汉服"], "生成一张国风汉服人像写真。人物为 {character}，主题为 {subject}，场景为 {scene}，色彩 {color_palette}。服饰、发饰和姿态优雅，光线柔和，画面有东方审美和年轻化表达，适合写真、社媒和国风活动视觉。", "避免服饰结构混乱、历史元素乱搭、真实明星脸、手部畸形、文字水印。"),
  tpl("portrait_couple_avatar", "人物图像", "情侣头像氛围图", "1024x1024", "medium", "jpeg", ["情侣", "头像"], "生成一张情侣头像氛围图。人物关系为 {selling_points}，风格 {style}，场景为 {scene}。两个人物互动自然、情绪温暖，构图适合裁切成方形头像，可用于情侣头像、社交主页和节日内容。", "避免真实名人肖像、低俗暗示、脸部相似度混乱、手部畸形、文字乱码。"),
  tpl("portrait_graduation_youth", "人物图像", "校园青春毕业照", "1536x1024", "medium", "jpeg", ["校园", "青春"], "生成一张校园青春毕业照氛围图。人物为 {character}，主题为 {subject}，场景为校园、操场、教室、图书馆或树荫大道。画面明亮自然，有青春、纪念和成长感，适合毕业季海报、社媒封面和相册封面。", "避免未成年人不当表达、校徽乱码、人物脸部崩坏、人数错误、手部畸形。"),
  tpl("portrait_music_artist", "人物图像", "音乐人宣传照", "1024x1536", "high", "jpeg", ["音乐", "艺人"], "生成一张音乐人/唱作人宣传照。人物为 {character}，音乐风格为 {style}，核心气质为 {selling_points}。可包含舞台、录音室、城市夜景、乐器或灯光氛围，画面有专辑宣传感，适合音乐封面、艺人主页和演出海报。", "避免真实艺人肖像侵权、文字乱码、过度暗黑、手指畸形、乐器结构错误。"),
  tpl("anime_avatar_clean", "二次元头像", "日系清透头像", "1024x1024", "high", "png", ["头像", "日系"], "生成一张日系清透二次元头像。角色为 {character}，性格为 {selling_points}，画风 {style}，色彩 {color_palette}。头像构图清晰，五官精致，发型、服装和配色统一，背景简洁，适合社交头像、账号 IP 和虚拟形象。", "避免盗用知名动漫角色、真实明星转绘、五官崩坏、发型漂移、低清晰度、文字水印。"),
  tpl("anime_avatar_cool", "二次元头像", "酷感少年少女头像", "1024x1024", "high", "png", ["酷感", "头像"], "生成一张酷感二次元头像。角色为 {character}，关键词为 {selling_points}，风格可结合街头、赛博、暗色、运动或音乐元素。轮廓强、小尺寸识别度高，表情有态度，适合年轻账号头像和社群形象。", "避免知名 IP 服装和发型复刻、真实明星脸、五官错位、过度复杂背景。"),
  tpl("anime_chibi_avatar", "二次元头像", "Q版萌系头像", "1024x1024", "medium", "png", ["Q版", "萌系"], "生成一张 Q 版萌系二次元头像。角色为 {character}，性格为 {selling_points}，风格 {style}。头身比例可爱，表情清楚，配色干净，边缘清晰，适合头像、贴纸、表情包和粉丝社群。", "避免侵权角色、表情过度夸张到失真、低清晰度、乱码文字、边缘脏乱。"),
  tpl("anime_couple_avatar", "二次元头像", "二次元情侣头像", "1024x1024", "medium", "png", ["情侣", "头像"], "生成一张二次元情侣头像。角色关系为 {selling_points}，风格 {style}，场景为 {scene}。两位角色互动自然，服装与色彩互相呼应，画面适合裁切为头像，可用于情侣头像、CP 头像和社交主页。", "避免知名 IP 复刻、低俗表达、角色年龄不当、五官崩坏、两人比例异常。"),
  tpl("anime_wallpaper_mobile", "二次元头像", "动漫手机壁纸", "1152x2048", "high", "png", ["壁纸", "手机"], "生成一张二次元手机壁纸。主题为 {subject}，角色为 {character}，氛围为 {style}。竖版构图，角色与背景层次清楚，上方和下方保留手机锁屏图标空间，适合年轻用户手机壁纸和社媒分享。", "避免文字乱码、侵权角色、人物脸部崩坏、背景过乱、关键主体被裁切。"),
  tpl("anime_expression_pack", "二次元头像", "二次元表情包套图", "1024x1024", "medium", "png", ["表情包", "套图"], "生成一组二次元角色表情包套图。角色为 {character}，性格为 {selling_points}，画风 {style}。包含开心、震惊、委屈、点赞、生气、加油等表情，角色发型、服装和配色保持一致，背景简洁。", "避免角色变成不同人物、盗用知名 IP、文字乱码、表情过度扭曲、边缘不干净。"),
  tpl("anime_idol_support", "二次元头像", "偶像应援头像", "1024x1024", "high", "png", ["偶像", "应援"], "生成一张二次元偶像应援头像。角色为 {character}，应援主题为 {subject}，色彩为 {color_palette}。画面有舞台灯光、星光、应援棒或徽章感元素，但不生成具体文字，适合粉丝头像、活动头像框和社群物料。", "避免真实偶像肖像侵权、知名 IP 复刻、文字乱码、灯光过曝、主体太小。"),
  tpl("trend_y2k_poster", "潮流社交", "Y2K 潮流海报", "1024x1536", "medium", "jpeg", ["Y2K", "海报"], "生成一张 Y2K 潮流社交海报底图。主题为 {subject}，目标人群为 {audience}，色彩 {color_palette}。画面包含金属、闪光、复古数码、贴纸、街头或音乐元素，构图年轻有冲击力，留出标题区域。", "避免侵权品牌标识、乱码文字、元素过度拥挤、低清晰度、低俗内容。"),
  tpl("trend_dopamine_cover", "潮流社交", "多巴胺封面", "1024x1536", "medium", "jpeg", ["多巴胺", "封面"], "生成一张多巴胺风格社交封面。主题为 {subject}，情绪为 {style}，色彩 {color_palette}。画面明快、活泼、层次清楚，适合小红书、朋友圈、活动预热、穿搭或生活方式内容封面。", "避免颜色脏乱、文字乱码、主体不清、廉价贴纸堆砌、过曝。"),
  tpl("trend_cyber_avatar", "潮流社交", "赛博朋克头像", "1024x1024", "high", "png", ["赛博", "头像"], "生成一张赛博朋克风格头像。人物或角色为 {character}，关键词为 {selling_points}，场景为霓虹城市、未来街区或电子音乐现场。头像轮廓清楚，色彩有霓虹对比但脸部可读，适合游戏、社群和年轻账号。", "避免真实明星脸、过度暗到看不清、赛博元素遮挡五官、文字乱码、侵权 logo。"),
  tpl("trend_music_cover", "潮流社交", "独立音乐封面", "1024x1024", "high", "jpeg", ["音乐", "封面"], "生成一张独立音乐单曲封面底图。音乐主题为 {subject}，情绪为 {style}，核心意象为 {selling_points}。方形构图，有艺术感和记忆点，适合流媒体、播客、歌单和社交平台发布。", "避免真实艺人肖像侵权、乱码文字、低清晰度、过度复杂元素、盗用唱片封面。"),
  tpl("trend_meme_reaction", "潮流社交", "社交热梗表情图", "1024x1024", "medium", "png", ["热梗", "表情"], "生成一张社交热梗表情图底图。主题为 {subject}，情绪动作为 {action}，风格 {style}。表情夸张但清晰，主体居中，背景简单，方便后期添加文字，适合群聊、评论区和社群运营。", "不要生成具体敏感文字，避免低俗攻击、侵权角色、五官崩坏、边缘脏乱。"),
  tpl("trend_lockscreen", "潮流社交", "手机锁屏壁纸", "1152x2048", "high", "jpeg", ["锁屏", "壁纸"], "生成一张年轻化手机锁屏壁纸。主题为 {subject}，风格 {style}，色彩 {color_palette}。竖版构图，中心视觉有记忆点，上下区域保留图标和时间显示空间，适合手机壁纸、社交分享和主题活动。", "避免文字乱码、主体被顶部时间遮挡、过暗、低清晰度、侵权素材。"),
  tpl("trend_outfit_board", "潮流社交", "穿搭灵感板", "1024x1536", "medium", "jpeg", ["穿搭", "灵感"], "生成一张穿搭灵感板。主题为 {subject}，风格 {style}，目标人群 {audience}。画面包含服装、配饰、鞋包、色卡或生活方式元素，排版有秩序，适合小红书穿搭、品牌种草和个人风格记录。", "避免盗用品牌 logo、单品比例混乱、文字乱码、元素过多、材质失真。"),
  tpl("virtual_vtuber_avatar", "虚拟IP", "虚拟主播头像", "1024x1024", "high", "png", ["VTuber", "头像"], "生成一张虚拟主播头像。角色为 {character}，人设关键词为 {selling_points}，风格 {style}，色彩 {color_palette}。头像精致、轮廓清楚、表情有亲和力，适合直播间、社交账号和虚拟主播主页。", "避免复刻知名 VTuber 或动漫 IP、真实明星脸、五官崩坏、装饰过度遮挡脸部。"),
  tpl("virtual_character_sheet", "虚拟IP", "虚拟人设定稿", "1024x1536", "high", "png", ["虚拟人", "设定"], "生成一张虚拟人角色设定稿。角色为 {character}，身份/世界观为 {subject}，性格和卖点为 {selling_points}。展示完整服装、发型、配饰和标志性元素，背景简洁，适合虚拟主播、品牌 IP 和账号人设。", "避免侵权角色、服装结构混乱、手部畸形、设定元素过多、文字乱码。"),
  tpl("virtual_live_background", "虚拟IP", "直播间虚拟背景", "1536x1024", "high", "png", ["直播间", "背景"], "生成一张虚拟主播直播间背景。主题为 {subject}，风格 {style}，色彩 {color_palette}。画面包含主播站位、桌面、灯光、屏幕、收藏物或世界观元素，中间或侧边留出人物位置，适合直播推流和封面。", "避免具体文字乱码、空间透视错误、元素过密、侵权标识、人物位置被遮挡。"),
  tpl("virtual_emote_pack", "虚拟IP", "虚拟 IP 表情包", "1024x1024", "medium", "png", ["表情包", "IP"], "生成一组虚拟 IP 表情包。角色为 {character}，性格为 {selling_points}，风格 {style}。包含打招呼、开心、震惊、催更、收到、加油等常用表情，角色形象保持一致，适合直播弹幕、社群和粉丝运营。", "避免角色漂移、知名 IP 复刻、文字乱码、表情过度变形、边缘脏乱。"),
  tpl("virtual_mascot_brand", "虚拟IP", "品牌吉祥物 IP", "1024x1024", "high", "png", ["吉祥物", "品牌IP"], "生成一个品牌吉祥物 IP 形象。品牌为 {brand}，行业或主题为 {subject}，性格标签为 {selling_points}。形象亲和、有记忆点，轮廓清晰，适合头像、贴纸、包装、活动物料和社媒运营。", "避免盗用知名吉祥物、品牌标识乱码、结构复杂难识别、低清晰度。"),
  tpl("virtual_blindbox_concept", "虚拟IP", "IP 盲盒概念图", "1024x1024", "high", "png", ["盲盒", "潮玩"], "生成一张虚拟 IP 盲盒概念图。角色为 {character}，系列主题为 {subject}，卖点为 {selling_points}。展示角色造型、材质、包装或底座概念，色彩年轻，适合潮玩立项、电商主图和新品预热。", "避免知名 IP 侵权、盒身文字乱码、结构不合理、材质廉价、主体过小。"),
  tpl("virtual_profile_card", "虚拟IP", "角色资料卡底图", "1536x1024", "medium", "png", ["资料卡", "人设"], "生成一张虚拟角色资料卡底图。角色为 {character}，世界观为 {subject}，核心标签为 {selling_points}。画面包含角色展示区、资料模块区、色卡或元素图标，但不生成具体文字，适合后期填写人设资料。", "避免具体文字乱码、角色比例错误、信息区域拥挤、侵权元素。")
];

function tpl(
  id: string,
  industry: string,
  scene: string,
  size: ImageSize,
  quality: ImageQuality,
  format: ImageFormat,
  tags: string[],
  prompt: string,
  avoid: string
): Template {
  return { id, industry, scene, size, quality, format, tags, prompt, avoid };
}

type TemplateSeed = {
  scene: string;
  tags: string[];
  size?: ImageSize;
  quality?: ImageQuality;
  format?: ImageFormat;
  prompt: string;
  avoid?: string;
};

const commonAvoid = "避免水印、二维码、乱码文字、侵权品牌标识、主体变形、低清晰度、杂乱背景、错误透视和明显 AI 伪影。";

const universalTemplateSeeds: TemplateSeed[] = [
  {
    scene: "行业爆款首图",
    tags: ["首图", "爆款"],
    size: "1024x1536",
    format: "jpeg",
    prompt: "为{industry}生成一张高点击率商业首图。主题为 {subject}，核心卖点为 {selling_points}，面向 {audience}。主体清晰，占画面核心位置，背景与业务场景相关，构图适合平台投放和社媒首屏，留出标题排版区域。",
  },
  {
    scene: "竖版推广海报",
    tags: ["海报", "竖版"],
    size: "1024x1536",
    format: "jpeg",
    prompt: "为{industry}生成一张竖版推广海报底图。品牌或主题为 {brand} / {subject}，活动或主张为 {selling_points}。画面有明确视觉焦点，层次清楚，适合朋友圈、小红书、抖音和活动页使用，顶部或中部留出文案空间。",
  },
  {
    scene: "横版广告 Banner",
    tags: ["Banner", "横版"],
    size: "1536x1024",
    format: "jpeg",
    prompt: "为{industry}生成一张横版广告 Banner。主题为 {subject}，核心信息为 {selling_points}，风格 {style}，色彩 {color_palette}。画面左右构图平衡，主体和留白区域明确，适合官网、投放广告、公众号头图和展会屏幕。",
  },
  {
    scene: "详情页卖点视觉",
    tags: ["详情页", "卖点"],
    size: "1024x1536",
    prompt: "为{industry}生成一张详情页卖点视觉图。主体为 {product_name} / {subject}，卖点为 {selling_points}。使用商业摄影或高质量插画构图，将功能、材质、体验或服务价值可视化，保留清晰排版空间。",
  },
  {
    scene: "小红书种草图",
    tags: ["小红书", "种草"],
    size: "1024x1536",
    format: "jpeg",
    prompt: "为{industry}生成一张小红书种草底图。主题为 {subject}，目标人群为 {audience}，风格 {style}。画面有真实生活方式氛围、干净留白和可分享感，主体明确，适合后期叠加标题和标签。",
  },
  {
    scene: "抖音短视频封面",
    tags: ["抖音", "封面"],
    size: "1024x1536",
    format: "jpeg",
    prompt: "为{industry}生成一张抖音短视频封面底图。主题为 {subject}，核心钩子为 {selling_points}。画面高识别度、高对比、主体大，适合手机小屏快速识别，中上部留出标题区域。",
  },
  {
    scene: "官网首屏 KV",
    tags: ["官网", "KV"],
    size: "1536x1024",
    quality: "high",
    prompt: "为{industry}生成一张官网首屏 KV 主视觉。品牌为 {brand}，主题为 {subject}，价值点为 {selling_points}。画面专业、可信、有视觉锤，主体不遮挡标题和按钮区域，适合官网、招商页和产品介绍页。",
  },
  {
    scene: "客户案例封面",
    tags: ["案例", "封面"],
    size: "1536x1024",
    format: "jpeg",
    prompt: "为{industry}生成一张客户案例或成功故事封面。主题为 {subject}，成果或亮点为 {selling_points}。画面体现真实业务场景、专业合作和结果可信度，适合案例文章、PPT、官网案例库。",
  },
  {
    scene: "活动促销底图",
    tags: ["活动", "促销"],
    size: "1024x1536",
    format: "jpeg",
    prompt: "为{industry}生成一张活动促销底图。活动为 {promotion}，产品或服务为 {product_name} / {subject}，目标用户为 {audience}。画面有活动氛围但不杂乱，主体突出，留出价格、时间、按钮或二维码区域。",
  },
  {
    scene: "服务流程说明图",
    tags: ["流程", "说明"],
    size: "1536x1024",
    prompt: "为{industry}生成一张服务流程说明视觉底图。主题为 {subject}，流程价值为 {selling_points}。画面包含清晰阶段感、箭头/模块/场景分区，但不生成具体小字，适合后期加流程说明和销售材料。",
  },
  {
    scene: "专业团队形象图",
    tags: ["团队", "形象"],
    size: "1536x1024",
    format: "jpeg",
    prompt: "为{industry}生成一张专业团队或机构形象图。团队方向为 {subject}，核心优势为 {selling_points}。画面体现专业、可信、协作和服务感，可包含办公、沟通、展示、服务现场或设备环境。",
  },
  {
    scene: "产品组合陈列图",
    tags: ["组合", "陈列"],
    size: "1024x1536",
    prompt: "为{industry}生成一张产品/服务组合陈列图。主体为 {product_name}，组合卖点为 {selling_points}。多元素排列有层次，风格统一，背景干净，适合套餐介绍、详情页、渠道招商和社媒发布。",
  },
  {
    scene: "招商合作海报",
    tags: ["招商", "合作"],
    size: "1024x1536",
    format: "jpeg",
    prompt: "为{industry}生成一张招商合作海报底图。主题为 {subject}，合作价值为 {selling_points}，面向 {audience}。画面商务可信、增长感强，留出品牌、联系方式、政策亮点和二维码区域。",
  },
  {
    scene: "信息图解底图",
    tags: ["信息图", "图解"],
    size: "1536x1024",
    prompt: "为{industry}生成一张信息图解底图。主题为 {subject}，关键要点为 {selling_points}。画面包含模块化区域、简洁图标、层级和数据可视化感，但不生成具体文字，适合后期标注。",
  },
  {
    scene: "节日营销视觉",
    tags: ["节日", "营销"],
    size: "1024x1536",
    format: "jpeg",
    prompt: "为{industry}生成一张节日营销视觉底图。节日或节点为 {season}，品牌/产品为 {brand} / {product_name}，活动主张为 {promotion}。画面有节日氛围但高级克制，适合电商、门店、社群和广告投放。",
  },
  {
    scene: "私域社群海报",
    tags: ["私域", "社群"],
    size: "1024x1536",
    format: "jpeg",
    prompt: "为{industry}生成一张私域社群海报底图。主题为 {subject}，用户收益为 {selling_points}，面向 {audience}。画面亲和、可信、有行动引导空间，适合微信群、朋友圈、社群公告和转化活动。",
  }
];

const industryTemplateSeeds: Record<string, TemplateSeed[]> = {
  电商零售: [
    { scene: "直播间爆品首图", tags: ["直播", "爆品"], size: "1024x1536", prompt: "生成一张电商直播间爆品首图。产品为 {product_name}，核心卖点为 {selling_points}，活动机制为 {promotion}。商品占据视觉中心，背景有直播氛围、货架或展示台，留出价格和口播卖点区域。", avoid: "避免生成具体价格、二维码、虚假品牌标识、商品结构变形和杂乱货架。" },
    { scene: "多 SKU 规格图", tags: ["SKU", "规格"], size: "1536x1024", prompt: "生成一张多 SKU 规格展示图。产品为 {product_name}，包含 {color_palette} 款式或颜色。所有 SKU 角度、比例、光线一致，排列整齐，适合详情页规格选择和商品列表。", avoid: "避免每个 SKU 外形不一致、颜色漂移、文字乱码、配件数量错误。" },
    { scene: "开箱包装图", tags: ["开箱", "包装"], prompt: "生成一张电商开箱包装图。产品为 {product_name}，卖点为 {selling_points}。展示外盒、内托、说明书、配件和产品主体，包装质感真实，画面干净，适合详情页和社媒种草。", avoid: "避免包装文字乱码、产品缺件、多余配件、包装结构不合理。" },
    { scene: "材质细节特写", tags: ["材质", "特写"], quality: "high", prompt: "生成一张商品材质细节特写图。产品为 {product_name}，材质或工艺为 {material}，卖点为 {selling_points}。使用微距商业摄影，突出纹理、边缘、反光、缝线或结构细节。", avoid: "避免材质失真、边缘融化、过度锐化、文字乱码和廉价质感。" },
    { scene: "使用前后对比图", tags: ["对比", "效果"], size: "1536x1024", prompt: "生成一张商品使用前后对比底图。产品为 {product_name}，效果或价值为 {selling_points}。左右分区清晰，场景真实，留出后期标注文字空间，适合详情页卖点解释。", avoid: "避免夸大功效、虚假对比、低质拼贴、文字乱码。" },
    { scene: "节日礼盒主图", tags: ["礼盒", "节日"], prompt: "生成一张节日礼盒电商主图。产品为 {product_name}，节日为 {season}，卖点为 {selling_points}。礼盒、产品和节日元素搭配高级，构图适合首图和活动页。", avoid: "避免俗艳堆砌、礼盒结构错误、文字乱码、虚假 logo。" },
    { scene: "亚马逊白底图", tags: ["亚马逊", "白底"], size: "1024x1024", prompt: "生成一张符合跨境电商审美的纯白底产品图。产品为 {product_name}，特征为 {selling_points}。商品居中、边缘清晰、阴影轻微、无装饰元素，适合亚马逊或独立站主图。", avoid: "避免背景杂色、水印、配件干扰、产品比例错误、包装文字改写。" },
    { scene: "详情页场景分镜", tags: ["详情页", "分镜"], size: "1024x1536", prompt: "生成一张电商详情页场景分镜图。产品为 {product_name}，围绕 {selling_points} 展示 3 到 4 个使用场景或卖点画面，整体风格统一，留出分区标题位置。", avoid: "避免分区混乱、人物手部畸形、文字乱码、商品外观变化。" },
    { scene: "直播切片封面", tags: ["切片", "封面"], size: "1024x1536", prompt: "生成一张直播切片视频封面底图。产品为 {product_name}，核心钩子为 {selling_points}，平台为 {platform}。主体大、对比强、背景简洁，有适合叠加大标题的留白。", avoid: "不要生成具体大字、价格、二维码，避免低清晰度和产品变形。" },
    { scene: "买家秀风格种草图", tags: ["买家秀", "种草"], format: "jpeg", prompt: "生成一张真实买家秀风格种草图。产品为 {product_name}，使用场景为 {scene}，卖点为 {selling_points}。画面真实自然、有生活感，但构图和光线保持商业可用。", avoid: "避免脏乱背景、过度摆拍、产品被遮挡、人物隐私信息。" },
    { scene: "详情页功能爆炸图", tags: ["功能", "结构"], size: "1536x1024", prompt: "生成一张商品功能结构爆炸图底图。产品为 {product_name}，功能结构为 {selling_points}。主体拆解清晰、组件关系合理，适合后期标注功能点和材质说明。", avoid: "避免结构不可能、零件混乱、文字乱码、过度科幻。" },
    { scene: "大促会场入口图", tags: ["大促", "会场"], size: "1536x1024", format: "png", prompt: "生成一张电商大促会场入口视觉。平台为 {platform}，活动为 {promotion}，主推品类为 {subject}。画面有促销氛围、商品陈列和层级空间，适合活动页首屏。", avoid: "不要生成具体价格、复杂文字、二维码、水印和虚假平台标识。" }
  ],
  短剧影视: [
    { scene: "甜宠短剧封面", tags: ["甜宠", "封面"], size: "1024x1536", format: "jpeg", prompt: "生成一张甜宠短剧竖版封面。主题为 {subject}，关系钩子为 {selling_points}。男女主有清晰情绪互动，背景为都市、婚礼、办公室或雨夜，画面精致、有点击欲，留出标题区。", avoid: "避免网红脸过度、人物脸不一致、手部畸形、文字乱码。" },
    { scene: "复仇逆袭封面", tags: ["逆袭", "复仇"], size: "1024x1536", format: "jpeg", prompt: "生成一张复仇逆袭短剧封面。主角为 {subject}，冲突为 {selling_points}。人物表情强烈，背景包含豪门、职场、商业竞争或家庭对峙元素，光影戏剧化。", avoid: "避免廉价特效、人物过多、脸部崩坏、文字乱码。" },
    { scene: "都市职场剧海报", tags: ["职场", "都市"], size: "1024x1536", prompt: "生成一张都市职场短剧海报。主题为 {subject}，核心冲突为 {selling_points}。人物穿着商务，场景为办公室、会议室、城市夜景或电梯间，构图有权力关系和情绪张力。", avoid: "避免服装错乱、办公空间不真实、文字乱码、人物僵硬。" },
    { scene: "家庭伦理剧封面", tags: ["家庭", "伦理"], size: "1024x1536", prompt: "生成一张家庭伦理短剧封面。主题为 {subject}，关系冲突为 {selling_points}。画面包含家庭空间、对峙人物或情绪特写，氛围真实、戏剧化但不夸张。", avoid: "避免低俗夸张、表情失真、人物过多、文字乱码。" },
    { scene: "古装虐恋海报", tags: ["古装", "虐恋"], size: "1024x1536", prompt: "生成一张古装虐恋短剧海报。人物为 {character}，情绪为 {style}，冲突为 {selling_points}。服饰精致，背景有宫墙、雪夜、灯火或江湖元素，画面有悲剧美感。", avoid: "避免现代元素穿帮、服饰结构混乱、文字乱码、廉价影楼感。" },
    { scene: "悬疑线索海报", tags: ["悬疑", "线索"], size: "1024x1536", prompt: "生成一张悬疑短剧线索海报。主题为 {subject}，关键线索为 {selling_points}。画面包含暗门、照片、监控、雨夜、旧物或人物特写，低调冷色，构图紧张但清晰。", avoid: "避免血腥露骨、画面过暗、文字乱码、空间混乱。" },
    { scene: "角色关系海报", tags: ["角色", "关系"], size: "1536x1024", prompt: "生成一张短剧角色关系海报。角色包括 {character}，核心关系为 {selling_points}。多人物站位有层次，表情和视线体现关系张力，背景简洁电影感，适合宣发物料。", avoid: "避免人物身份不一致、人数错误、脸部崩坏、文字乱码。" },
    { scene: "爆款开场镜头", tags: ["开场", "镜头"], size: "1536x1024", prompt: "生成一张短剧爆款开场镜头气氛图。场景为 {scene}，动作或情绪为 {subject} / {style}。使用电影级构图、明确光线方向和故事钩子，适合分镜、美术和封面延展。", avoid: "避免镜头语言混乱、空间不合理、人物手部畸形。" },
    { scene: "角色单人宣发照", tags: ["角色", "宣发"], size: "1024x1536", prompt: "生成一张短剧角色单人宣发照。角色为 {character}，身份设定为 {selling_points}。半身或全身，服装妆发符合身份，背景简洁高级，适合角色物料和账号发布。", avoid: "避免五官漂移、过度滤镜、服装结构错乱、文字乱码。" },
    { scene: "双人对峙封面", tags: ["对峙", "双人"], size: "1024x1536", prompt: "生成一张双人对峙短剧封面。人物关系为 {selling_points}，背景为 {scene}。两人表情和站位形成强烈冲突，光影有电影感，竖版构图，留标题区。", avoid: "避免人物比例错误、脸部相似度混乱、文字乱码、过度拥挤。" }
  ],
  自媒体内容: [
    { scene: "知识卡片封面", tags: ["知识", "卡片"], prompt: "生成一张知识卡片封面底图。主题为 {subject}，读者为 {audience}，核心收获为 {selling_points}。画面干净、有信息层级，适合后期叠加大标题和 3 个要点。", avoid: "不要生成具体小字、二维码、水印、复杂背景。" },
    { scene: "人设 IP 头像", tags: ["IP", "头像"], size: "1024x1024", prompt: "生成一个自媒体账号 IP 头像。角色为 {character}，领域为 {subject}，性格标签为 {selling_points}。轮廓清晰，小尺寸识别度高，背景简洁，适合头像和封面角标。", avoid: "避免侵权角色、复杂细节、五官崩坏、低清晰度。" },
    { scene: "干货长图首屏", tags: ["长图", "干货"], size: "1024x1536", prompt: "生成一张干货长图首屏底图。主题为 {subject}，目标人群为 {audience}。画面有专业感、模块感和大标题留白，适合知识付费、公众号、小红书长图。", avoid: "不要生成具体段落文字、乱码、二维码、水印。" },
    { scene: "探店封面底图", tags: ["探店", "封面"], size: "1024x1536", format: "jpeg", prompt: "生成一张探店内容封面底图。门店或目的地为 {subject}，亮点为 {selling_points}。画面真实、有生活气息，主体清晰，适合叠加标题和定位标签。", avoid: "避免真实隐私信息、虚假招牌文字、过度滤镜、环境脏乱。" },
    { scene: "影视解说封面", tags: ["影视", "解说"], size: "1536x1024", prompt: "生成一张影视解说视频封面底图。主题为 {subject}，核心看点为 {selling_points}。画面有强故事感和悬念，左右留出人物和标题区域，适合 B 站、抖音、西瓜视频。", avoid: "避免侵权具体剧照、文字乱码、人物脸崩、画面过暗。" },
    { scene: "财经观点封面", tags: ["财经", "观点"], size: "1536x1024", prompt: "生成一张财经/商业观点封面底图。主题为 {subject}，观点或钩子为 {selling_points}。画面专业、克制，可包含城市、数据、会议、人物剪影或抽象金融元素，留标题区。", avoid: "避免虚假数据、具体证券代码文字、乱码、夸张暴富暗示。" },
    { scene: "情绪疗愈封面", tags: ["疗愈", "情绪"], size: "1024x1536", prompt: "生成一张情绪疗愈类内容封面底图。主题为 {subject}，受众为 {audience}。画面温柔、安静、有陪伴感，可包含人物、植物、阳光、房间或自然场景，留大标题空间。", avoid: "避免低清晰度、恐惧氛围、过度悲伤、文字乱码。" },
    { scene: "职场成长封面", tags: ["职场", "成长"], size: "1024x1536", prompt: "生成一张职场成长内容封面底图。主题为 {subject}，价值点为 {selling_points}。画面体现专业、自信、学习和行动感，适合小红书、公众号、课程导流。", avoid: "避免鸡汤感过重、人物僵硬、办公空间杂乱、文字乱码。" }
  ],
  餐饮茶饮: [
    { scene: "外卖平台首图", tags: ["外卖", "首图"], size: "1024x1024", format: "jpeg", prompt: "生成一张外卖平台菜品首图。菜品为 {product_name}，口味卖点为 {selling_points}。食物份量真实诱人，背景干净，光线自然，适合美团、饿了么和团购列表。", avoid: "避免颜色异常、过度油腻、食材不可食用、餐具脏乱。" },
    { scene: "门店套餐海报", tags: ["套餐", "门店"], size: "1024x1536", prompt: "生成一张餐饮门店套餐海报底图。套餐主题为 {subject}，卖点为 {selling_points}，活动为 {promotion}。多道菜排列有层次，热闹但不拥挤，留价格和二维码区域。", avoid: "不要生成具体价格、二维码、乱码文字，避免食材混乱。" },
    { scene: "新品饮品上新图", tags: ["新品", "饮品"], size: "1024x1536", prompt: "生成一张新品饮品上新图。饮品为 {product_name}，季节为 {season}，卖点为 {selling_points}。杯身清晰，冰块、水珠、奶盖、果肉或茶汤质感真实，背景清爽。", avoid: "避免杯身文字乱码、液体结构异常、过度反光。" },
    { scene: "高端餐厅环境图", tags: ["餐厅", "环境"], size: "1536x1024", format: "jpeg", prompt: "生成一张高端餐厅环境宣传图。餐厅类型为 {subject}，风格为 {style}，卖点为 {selling_points}。空间整洁、光线温暖、桌面布置高级，适合门店形象、点评平台和官网。", avoid: "避免环境脏乱、人物拥挤、透视错误、虚假招牌文字。" },
    { scene: "节日限定菜单图", tags: ["节日", "菜单"], size: "1024x1536", prompt: "生成一张节日限定菜单宣传底图。节日为 {season}，主推菜品为 {product_name}，卖点为 {selling_points}。画面有节日氛围和食欲，留菜单文字区域。", avoid: "避免俗艳堆砌、价格文字、二维码、食材比例错误。" },
    { scene: "食材新鲜特写", tags: ["食材", "特写"], quality: "high", prompt: "生成一张食材新鲜特写图。食材或菜品为 {product_name}，口味/品质卖点为 {selling_points}。突出水分、纹理、色泽和新鲜度，适合详情页和短视频封面。", avoid: "避免食材变形、颜色异常、不可食用质感、过度油光。" },
    { scene: "团购封面图", tags: ["团购", "封面"], size: "1024x1024", prompt: "生成一张餐饮团购封面图。门店类型为 {subject}，套餐亮点为 {selling_points}。画面主体大、食物丰富、背景明亮，适合本地生活平台小图展示。", avoid: "不要生成价格文字、低俗促销贴、乱码、水印。" },
    { scene: "品牌联名饮品图", tags: ["联名", "饮品"], prompt: "生成一张品牌联名饮品宣传图。品牌为 {brand}，饮品为 {product_name}，主题为 {subject}。画面年轻、有记忆点，可包含包装、杯身、原料和联名氛围，留 logo 和标题区域。", avoid: "避免未经确认的真实品牌标识、杯标乱码、元素过多。" }
  ],
  品牌广告: [
    { scene: "品牌发布会主视觉", tags: ["发布会", "主视觉"], size: "1536x1024", quality: "high", prompt: "生成一张品牌发布会主视觉。品牌为 {brand}，发布主题为 {subject}，核心信息为 {selling_points}。画面有舞台感、产品聚焦和高级光影，适合大屏、邀请函和官网首屏。", avoid: "不要生成具体文字、错误 logo、过度复杂背景。" },
    { scene: "户外大屏广告", tags: ["户外", "大屏"], size: "1536x1024", prompt: "生成一张户外大屏广告视觉。品牌为 {brand}，主题为 {subject}。元素少、对比强、远距离可识别，主体占比大，留品牌和短文案位置。", avoid: "避免细碎文字、低对比、复杂背景、虚假品牌标识。" },
    { scene: "社媒 Campaign 视觉", tags: ["Campaign", "社媒"], size: "1024x1536", prompt: "生成一张品牌社媒 Campaign 视觉。主题为 {subject}，目标人群为 {audience}，风格 {style}。画面有传播记忆点，适合小红书、微博、抖音和朋友圈投放。", avoid: "避免文字乱码、过度堆元素、低清晰度、侵权素材。" },
    { scene: "品牌故事长图首屏", tags: ["品牌故事", "长图"], prompt: "生成一张品牌故事长图首屏底图。品牌为 {brand}，故事主题为 {subject}，核心价值为 {selling_points}。画面有情绪、质感和叙事开头，留标题区域。", avoid: "避免廉价模板感、文字乱码、主体不清晰。" },
    { scene: "线下物料背景", tags: ["线下", "物料"], size: "1536x1024", prompt: "生成一张品牌线下物料背景图。场景为展架、易拉宝、门店屏幕或海报，主题为 {subject}，风格 {style}。画面干净、有品牌感，便于后期排版。", avoid: "避免生成具体文字、二维码、水印、复杂小元素。" },
    { scene: "品牌色资产图", tags: ["品牌色", "资产"], quality: "high", prompt: "生成一张品牌色视觉资产图。品牌为 {brand}，色彩为 {color_palette}，主题为 {subject}。画面强调品牌色、材质、光影和图形记忆点，适合视觉规范和营销素材延展。", avoid: "避免颜色脏乱、过度渐变、文字乱码、侵权 logo。" }
  ],
  漫画动漫: [
    { scene: "角色半身立绘", tags: ["立绘", "半身"], size: "1024x1536", prompt: "生成一张漫画/动漫角色半身立绘。角色为 {character}，性格和身份为 {selling_points}，画风 {style}。五官、发型、服装和配色清晰，背景简洁，适合头像、宣传和角色设定。", avoid: "避免手部畸形、五官漂移、服装结构混乱、线条脏乱。" },
    { scene: "角色全身立绘", tags: ["立绘", "全身"], size: "1024x1536", prompt: "生成一张动漫角色全身立绘。角色为 {character}，职业或阵营为 {selling_points}，风格 {style}。展示完整服装、配饰、姿态和轮廓，背景简洁，适合设定稿和游戏立绘。", avoid: "避免比例异常、脚手畸形、装备逻辑混乱、背景抢主体。" },
    { scene: "漫画封面分层图", tags: ["封面", "分层"], size: "1024x1536", quality: "high", prompt: "生成一张漫画封面底图。作品主题为 {subject}，核心冲突为 {selling_points}。主角、背景和氛围层次清楚，顶部留标题区域，色彩有冲击力，适合平台封面。", avoid: "避免真实照片感、文字乱码、人物五官崩坏、构图拥挤。" },
    { scene: "Q版表情包角色", tags: ["Q版", "表情包"], size: "1024x1024", prompt: "生成一个 Q 版表情包角色。角色为 {character}，性格为 {selling_points}，风格 {style}。表情夸张可爱、轮廓清晰、适合小尺寸表情和社媒贴纸。", avoid: "避免侵权角色、五官错位、复杂背景、低清晰度。" },
    { scene: "漫画场景背景", tags: ["场景", "背景"], size: "1536x1024", prompt: "生成一张漫画场景背景。场景为 {scene}，氛围为 {style}，主题为 {subject}。空间层次清楚，线条和色彩统一，适合分镜、封面和剧情背景。", avoid: "避免透视错误、空间逻辑混乱、细节脏乱、文字乱码。" },
    { scene: "分镜关键帧", tags: ["分镜", "关键帧"], size: "1536x1024", prompt: "生成一张漫画分镜关键帧。剧情动作是 {action}，场景为 {scene}，情绪为 {style}。镜头有明确景别和动势，角色动作清楚，适合漫画脚本和动画前期。", avoid: "避免动作不清、人物不一致、分镜边界混乱。" },
    { scene: "轻小说封面", tags: ["轻小说", "封面"], size: "1024x1536", quality: "high", prompt: "生成一张轻小说封面底图。作品主题为 {subject}，主角为 {character}，核心看点为 {selling_points}。人物与世界观元素有层次，顶部或中部保留书名区域，画面精致、有年轻阅读平台审美。", avoid: "避免直接复刻知名作品、真实照片感、文字乱码、人物五官崩坏。" },
    { scene: "动漫海报 KV", tags: ["动漫", "KV"], size: "1024x1536", quality: "high", prompt: "生成一张动漫作品 KV 主视觉。主题为 {subject}，角色为 {character}，氛围为 {style}。画面有主角、关键场景和世界观线索，构图适合海报、宣发和平台推荐图。", avoid: "避免知名 IP 侵权、角色比例错误、背景过乱、标题文字乱码。" },
    { scene: "角色服装设定", tags: ["服装", "设定"], size: "1024x1536", prompt: "生成一张动漫角色服装设定图。角色为 {character}，职业/阵营为 {selling_points}，风格 {style}。重点展示服装结构、配饰、材质和配色，背景简洁，适合设定稿和 cosplay 参考。", avoid: "避免服装结构不成立、配饰位置漂移、低俗暴露、手部畸形。" },
    { scene: "漫画头像九宫格", tags: ["头像", "九宫格"], size: "1536x1024", prompt: "生成一张漫画角色头像九宫格。角色为 {character}，画风 {style}。九个头像保持同一角色特征，展示不同角度、表情或情绪，适合角色设定、社媒头像和账号 IP 延展。", avoid: "避免每格变成不同角色、五官漂移、发色变化、文字乱码。" },
    { scene: "漫画动作姿势参考", tags: ["动作", "姿势"], size: "1536x1024", prompt: "生成一张漫画角色动作姿势参考图。角色为 {character}，动作为 {action}，风格 {style}。展示 3 到 5 个动态姿势，身体结构清楚，动势自然，背景简洁。", avoid: "避免肢体扭曲、手脚畸形、动作不连贯、角色服装变化。" },
    { scene: "动漫社团招新海报", tags: ["社团", "海报"], size: "1024x1536", prompt: "生成一张动漫社团/同好活动招新海报底图。主题为 {subject}，目标人群为 {audience}，风格 {style}。画面有青春、兴趣社群和活动氛围，留出标题、时间、地点和二维码区域。", avoid: "不要生成具体文字、避免侵权角色、画面拥挤、人物脸崩。" },
    { scene: "漫画周边贴纸", tags: ["周边", "贴纸"], size: "1024x1024", prompt: "生成一组漫画角色周边贴纸。角色为 {character}，主题为 {subject}，风格 {style}。每个贴纸轮廓清晰、表情可爱、适合手机壳、手账、社群贴纸和周边售卖。", avoid: "避免盗用知名 IP、边缘脏乱、文字乱码、角色不一致。" },
    { scene: "国风动漫角色", tags: ["国风", "角色"], size: "1024x1536", quality: "high", prompt: "生成一张国风动漫角色立绘。角色为 {character}，身份为 {selling_points}，场景或文化元素为 {region}。服饰、发型、纹样和道具有东方审美，色彩高级，适合国漫、轻小说和游戏角色方向。", avoid: "避免历史元素乱搭、服饰结构混乱、侵权角色、低俗表达。" }
  ],
  人物图像: [
    { scene: "证件照风格头像", tags: ["证件照", "头像"], size: "1024x1024", format: "jpeg", prompt: "生成一张干净专业的证件照风格头像。人物为 {character}，身份气质为 {selling_points}。正面或微侧脸，光线均匀，背景纯净，表情自然，适合简历、平台认证和正式头像。", avoid: "避免真实明星肖像、过度磨皮、脸部变形、服装低俗、背景杂乱。" },
    { scene: "小红书生活写真", tags: ["小红书", "写真"], size: "1024x1536", format: "jpeg", prompt: "生成一张小红书生活方式人像写真。人物为 {character}，主题为 {subject}，风格 {style}，场景 {scene}。画面自然、有分享感，服装妆发精致但不夸张，留出标题区域。", avoid: "避免真实名人脸、过度摆拍、低俗姿态、五官崩坏、文字水印。" },
    { scene: "胶片感人像", tags: ["胶片", "人像"], size: "1024x1536", format: "jpeg", prompt: "生成一张胶片感人像写真。人物为 {character}，情绪为 {style}，场景为 {scene}。画面有自然颗粒、柔和高光和生活瞬间感，适合年轻用户头像、社媒封面和写真样片。", avoid: "避免过暗、皮肤脏污、脸部崩坏、真实明星肖像、文字乱码。" },
    { scene: "韩系清透人像", tags: ["韩系", "清透"], size: "1024x1536", quality: "high", format: "jpeg", prompt: "生成一张韩系清透人像写真。人物为 {character}，风格 {style}，色彩 {color_palette}。妆容自然，光线柔和，背景干净，整体有轻盈、精致、年轻的社媒审美。", avoid: "避免过度磨皮、网红脸模板化、真实明星脸、手部畸形、低俗表达。" },
    { scene: "日系通勤人像", tags: ["日系", "通勤"], size: "1024x1536", format: "jpeg", prompt: "生成一张日系通勤人像。人物为 {character}，穿搭风格 {style}，场景为街道、咖啡店、车站、书店或办公室。画面自然、安静、干净，适合穿搭、生活记录和个人主页。", avoid: "避免侵权品牌 logo、脸部崩坏、背景人群混乱、文字水印。" },
    { scene: "运动健身人像", tags: ["运动", "健身"], size: "1024x1536", format: "jpeg", prompt: "生成一张运动健身人像。人物为 {character}，运动项目为 {subject}，核心气质为 {selling_points}。动作健康、有力量，装备清晰，场景可为健身房、球场、户外或城市跑道，适合运动账号和品牌内容。", avoid: "避免危险动作、身体结构错误、过度肌肉夸张、低俗姿态、品牌标识错乱。" },
    { scene: "舞台演出人像", tags: ["舞台", "演出"], size: "1024x1536", quality: "high", format: "jpeg", prompt: "生成一张舞台演出人像。人物为 {character}，表演主题为 {subject}，氛围为 {style}。灯光有层次，人物动作自然，服装和舞台元素协调，适合演出海报、艺人主页和短视频封面。", avoid: "避免真实艺人肖像侵权、灯光过曝、手指畸形、文字乱码。" },
    { scene: "头像风格组图", tags: ["头像", "组图"], size: "1536x1024", prompt: "生成一张人物头像风格组图。人物为 {character}，围绕 {style} 展示 4 到 6 种头像风格变化，包括不同光线、背景或表情，但保持同一人物特征。适合头像筛选和个人 IP 方向探索。", avoid: "避免变成不同人物、真实明星脸、脸部崩坏、风格过度割裂。" },
    { scene: "旅行人像大片", tags: ["旅行", "人像"], size: "1024x1536", format: "jpeg", prompt: "生成一张旅行人像大片。人物为 {character}，目的地或场景为 {scene}，情绪为 {style}。人物与风景自然融合，画面有旅拍、自由和生活方式氛围，适合旅游博主和个人社媒。", avoid: "避免错误地标、人物比例异常、过度滤镜、真实隐私信息、文字水印。" },
    { scene: "个人品牌封面", tags: ["个人品牌", "封面"], size: "1536x1024", quality: "high", format: "jpeg", prompt: "生成一张个人品牌主页封面。人物为 {character}，领域为 {subject}，核心标签为 {selling_points}。画面专业、有亲和力，左侧或右侧留出标题和介绍文字区域，适合公众号、视频号、课程页和主页 banner。", avoid: "避免虚假头衔文字、证书乱码、人物脸崩、廉价模板感。" }
  ],
  二次元头像: [
    { scene: "软萌头像", tags: ["软萌", "头像"], size: "1024x1024", prompt: "生成一张软萌二次元头像。角色为 {character}，性格为 {selling_points}，色彩 {color_palette}。五官可爱、表情亲和、背景简洁，适合女生头像、社群头像和账号 IP。", avoid: "避免知名角色复刻、幼态不当表达、五官错位、文字乱码。" },
    { scene: "暗黑系头像", tags: ["暗黑", "头像"], size: "1024x1024", quality: "high", prompt: "生成一张暗黑系二次元头像。角色为 {character}，关键词为 {selling_points}，风格 {style}。画面有神秘、冷感和高级暗色氛围，但脸部清晰可读，适合游戏、音乐和社群头像。", avoid: "避免过暗看不清、血腥露骨、侵权角色、五官崩坏。" },
    { scene: "校园系头像", tags: ["校园", "头像"], size: "1024x1024", prompt: "生成一张校园系二次元头像。角色为 {character}，主题为 {subject}，氛围为 {style}。画面有青春、阳光、教室或校园元素，背景简洁，适合年轻用户社交头像。", avoid: "避免未成年人不当表达、知名校服 IP 复刻、文字乱码、脸部崩坏。" },
    { scene: "机能风头像", tags: ["机能风", "头像"], size: "1024x1024", quality: "high", prompt: "生成一张机能风二次元头像。角色为 {character}，设定为 {selling_points}。包含机能服、耳机、战术配件、电子元素或城市背景，轮廓清晰，适合游戏和潮流账号。", avoid: "避免武器危险表达过重、侵权角色、配件混乱、五官被遮挡。" },
    { scene: "像素风头像", tags: ["像素风", "头像"], size: "1024x1024", prompt: "生成一张像素风二次元头像。角色为 {character}，主题为 {subject}，配色 {color_palette}。像素块清晰，轮廓好识别，有复古游戏氛围，适合游戏社区、头像和贴纸。", avoid: "避免低分辨率脏边、知名游戏角色复刻、文字乱码、主体太小。" },
    { scene: "半厚涂头像", tags: ["厚涂", "头像"], size: "1024x1024", quality: "high", prompt: "生成一张半厚涂二次元头像。角色为 {character}，气质为 {selling_points}，风格 {style}。脸部光影精致，发丝和材质有层次，背景克制，适合高质感头像和角色展示。", avoid: "避免真实照片感、侵权角色、五官漂移、过度油腻笔触。" },
    { scene: "头像框活动图", tags: ["头像框", "活动"], size: "1024x1024", prompt: "生成一张二次元头像框活动底图。角色或主题为 {subject}，色彩为 {color_palette}，活动为 {season}。画面包含头像框、装饰元素和中心头像位置，但不生成具体文字，适合节日头像框和社群活动。", avoid: "避免文字乱码、侵权角色、装饰遮挡头像、元素拥挤。" },
    { scene: "双人 CP 头像", tags: ["CP", "双人"], size: "1024x1024", prompt: "生成一张双人 CP 二次元头像。两位角色为 {character}，关系为 {selling_points}，风格 {style}。人物互动自然，构图适合社交头像，色彩和服装互相呼应。", avoid: "避免知名 CP 复刻、低俗表达、角色年龄不当、脸部崩坏。" },
    { scene: "节日限定头像", tags: ["节日", "头像"], size: "1024x1024", prompt: "生成一张节日限定二次元头像。角色为 {character}，节日为 {season}，配色 {color_palette}。画面有节日氛围、头像识别度高，适合活动头像、粉丝群和社交账号换新。", avoid: "避免俗艳堆砌、文字乱码、侵权 IP、装饰过度遮挡脸部。" },
    { scene: "游戏公会头像", tags: ["游戏", "公会"], size: "1024x1024", prompt: "生成一张游戏公会/战队二次元头像。角色为 {character}，阵营或气质为 {selling_points}，风格 {style}。轮廓有力量，小尺寸识别度高，适合作为公会头像、战队头像和社群标识。", avoid: "避免真实战队 logo 侵权、武器结构混乱、文字乱码、主体过小。" }
  ],
  潮流社交: [
    { scene: "INS 风拼贴封面", tags: ["拼贴", "INS"], size: "1024x1536", format: "jpeg", prompt: "生成一张 INS 风拼贴社交封面。主题为 {subject}，风格 {style}，色彩 {color_palette}。画面包含照片拼贴、贴纸、手账、街头或生活方式元素，留出标题区域。", avoid: "避免真实品牌侵权、文字乱码、元素拥挤、低清晰度。" },
    { scene: "朋友圈活动海报", tags: ["朋友圈", "活动"], size: "1024x1536", format: "jpeg", prompt: "生成一张年轻化朋友圈活动海报底图。活动为 {promotion}，主题为 {subject}，面向 {audience}。画面轻松、有参与感，适合社群活动、快闪、派对、课程和新品预热。", avoid: "不要生成具体价格和二维码，避免低俗营销、文字乱码、主体不清。" },
    { scene: "社群头像 Logo", tags: ["社群", "Logo"], size: "1024x1024", prompt: "生成一个年轻社群头像图标。社群主题为 {subject}，人群为 {audience}，风格 {style}。图形简洁、有识别度，适合微信群、Discord、贴吧、社群头像和活动头像。", avoid: "避免侵权 logo、复杂小字、低清晰度、主体不居中。" },
    { scene: "电子音乐派对海报", tags: ["电音", "派对"], size: "1024x1536", quality: "high", format: "jpeg", prompt: "生成一张电子音乐派对海报底图。主题为 {subject}，氛围为 {style}，色彩 {color_palette}。画面有舞台灯光、节奏、霓虹和人群氛围，保留标题、日期和地点区域。", avoid: "不要生成具体文字，避免真实 DJ 肖像侵权、画面过暗、低俗表达。" },
    { scene: "城市夜生活封面", tags: ["夜生活", "城市"], size: "1024x1536", format: "jpeg", prompt: "生成一张城市夜生活内容封面。主题为 {subject}，场景为 {scene}，风格 {style}。画面有夜景、灯光、街区、咖啡馆、Livehouse 或潮流店铺氛围，适合探店、Vlog 和社媒封面。", avoid: "避免真实店招乱码、隐私信息、画面过暗、人物脸崩。" },
    { scene: "潮流贴纸套图", tags: ["贴纸", "潮流"], size: "1024x1024", prompt: "生成一组潮流贴纸套图。主题为 {subject}，关键词为 {selling_points}，风格 {style}。贴纸包含图形、表情、符号或小物件，边缘清晰，适合手账、社群、周边和社媒装饰。", avoid: "避免侵权图案、乱码文字、边缘脏乱、元素过小。" },
    { scene: "社交主页 Banner", tags: ["主页", "Banner"], size: "1536x1024", format: "jpeg", prompt: "生成一张社交主页 Banner。账号主题为 {subject}，人设或品牌为 {brand}，核心标签为 {selling_points}。画面年轻、有识别度，左右留出头像和简介区域，适合 B 站、小红书、抖音和个人主页。", avoid: "避免具体文字乱码、侵权素材、主体遮挡头像区域、低清晰度。" },
    { scene: "潮流开箱封面", tags: ["开箱", "封面"], size: "1024x1536", format: "jpeg", prompt: "生成一张潮流开箱视频封面底图。开箱主题为 {product_name} / {subject}，看点为 {selling_points}。画面有年轻、兴奋和发现感，主体大，留出大标题空间，适合短视频和小红书。", avoid: "避免真实品牌 logo 乱码、产品变形、文字乱码、画面杂乱。" },
    { scene: "校园社团活动视觉", tags: ["校园", "社团"], size: "1024x1536", format: "jpeg", prompt: "生成一张校园社团活动视觉底图。活动主题为 {subject}，目标人群为 {audience}，风格 {style}。画面青春、有兴趣社群氛围，留出活动标题、地点和时间区域。", avoid: "不要生成具体文字，避免校徽侵权、人物脸崩、过度拥挤。" },
    { scene: "社交头像背景板", tags: ["头像", "背景板"], size: "1024x1024", prompt: "生成一张社交头像背景板。主题为 {subject}，风格 {style}，色彩 {color_palette}。画面中心留出头像或人物位置，背景有轻量图形、氛围和层次，适合头像合成和账号视觉统一。", avoid: "避免文字乱码、背景太复杂、侵权符号、中心区域拥挤。" }
  ],
  虚拟IP: [
    { scene: "虚拟偶像主视觉", tags: ["虚拟偶像", "主视觉"], size: "1024x1536", quality: "high", prompt: "生成一张虚拟偶像主视觉。角色为 {character}，主题为 {subject}，核心魅力为 {selling_points}。画面有舞台、灯光、粉丝应援或世界观元素，适合宣发海报、主页和活动预热。", avoid: "避免真实偶像肖像、知名 VTuber 复刻、文字乱码、人物脸崩。" },
    { scene: "虚拟人半身直播立绘", tags: ["直播", "立绘"], size: "1024x1536", quality: "high", prompt: "生成一张虚拟人半身直播立绘。角色为 {character}，人设为 {selling_points}，风格 {style}。角色正面或微侧，表情亲和，服装和配饰清楚，背景透明感或简洁底，适合直播头像和人物设定。", avoid: "避免侵权角色、手部畸形、服饰结构混乱、发饰遮挡五官。" },
    { scene: "IP 三视图", tags: ["三视图", "IP"], size: "1536x1024", quality: "high", prompt: "生成一张虚拟 IP 三视图。角色为 {character}，主题为 {subject}。包含正面、侧面、背面，服装、发型、配饰和比例保持一致，白色或浅灰背景，适合建模、周边和设定稿。", avoid: "避免三个视图细节不一致、角色漂移、文字乱码、比例错误。" },
    { scene: "IP 周边贴纸", tags: ["周边", "贴纸"], size: "1024x1024", prompt: "生成一组虚拟 IP 周边贴纸。角色为 {character}，风格 {style}，主题为 {subject}。贴纸表情和动作多样，轮廓清楚，适合社群、手账、手机壳和活动物料。", avoid: "避免知名 IP 侵权、边缘脏乱、角色不一致、文字乱码。" },
    { scene: "直播礼物图标", tags: ["直播", "礼物"], size: "1024x1024", prompt: "生成一组直播礼物图标。主题为 {subject}，风格 {style}，色彩 {color_palette}。图标轮廓清晰、材质统一、适合小尺寸展示，可用于直播间互动、粉丝牌和虚拟礼物概念。", avoid: "避免平台 logo 侵权、图标过细、文字乱码、低清晰度。" },
    { scene: "粉丝徽章设计", tags: ["粉丝", "徽章"], size: "1024x1024", quality: "high", prompt: "生成一张虚拟 IP 粉丝徽章设计。角色或品牌为 {brand} / {character}，主题为 {subject}，色彩 {color_palette}。徽章图形简洁、有纪念感，适合粉丝群、会员等级和活动头像框。", avoid: "避免具体文字乱码、侵权标识、元素过密、主体不居中。" },
    { scene: "虚拟人房间设定", tags: ["房间", "设定"], size: "1536x1024", quality: "high", prompt: "生成一张虚拟人房间设定图。角色为 {character}，兴趣和世界观为 {selling_points}，风格 {style}。房间包含桌面、收藏物、屏幕、灯光和个人符号，适合直播背景、故事设定和社媒内容。", avoid: "避免空间透视错误、元素过密、文字乱码、侵权海报。" },
    { scene: "IP 动态表情姿势", tags: ["动态", "姿势"], size: "1536x1024", prompt: "生成一张虚拟 IP 动态表情姿势图。角色为 {character}，动作包括 {action}，性格为 {selling_points}。展示多个动作姿势，角色特征保持一致，适合表情包、动画和直播互动。", avoid: "避免肢体畸形、角色漂移、表情不清、文字乱码。" },
    { scene: "虚拟 IP 发布海报", tags: ["发布", "海报"], size: "1024x1536", format: "jpeg", prompt: "生成一张虚拟 IP 发布海报底图。角色为 {character}，发布主题为 {subject}，卖点为 {selling_points}。画面有仪式感和年轻传播感，留出名称、日期和按钮区域。", avoid: "不要生成具体文字，避免侵权角色、画面拥挤、低清晰度。" },
    { scene: "IP 包装视觉", tags: ["包装", "IP"], size: "1536x1024", quality: "high", prompt: "生成一张虚拟 IP 包装视觉。角色为 {character}，产品或周边为 {product_name}，风格 {style}。画面展示包装、贴纸、卡片、徽章或盲盒组合，适合周边提案和电商宣传。", avoid: "避免盒身文字乱码、产品数量混乱、侵权角色、包装结构错误。" }
  ],
  美妆护肤: [
    { scene: "护肤品棚拍主图", tags: ["护肤", "棚拍"], size: "1024x1536", quality: "high", prompt: "生成一张护肤品棚拍主图。产品为 {product_name}，功效卖点为 {selling_points}，材质/肤感为 {material}。瓶身清晰、反光受控，背景干净高级，适合电商首图和品牌海报。", avoid: "避免功效夸大、瓶身文字乱码、包装变形、医疗暗示。" },
    { scene: "美妆试色灵感图", tags: ["试色", "美妆"], size: "1024x1536", prompt: "生成一张美妆试色灵感图。产品为 {product_name}，色彩为 {color_palette}，目标人群为 {audience}。妆面干净、质感真实，适合教程封面、新品种草和详情页。", avoid: "避免过度磨皮、五官崩坏、妆面脏乱、文字水印。" },
    { scene: "功效成分视觉图", tags: ["成分", "功效"], size: "1536x1024", prompt: "生成一张护肤功效成分视觉图。成分或功效为 {selling_points}，产品为 {product_name}。画面可包含水滴、植物、实验室、肌肤质感或抽象分子元素，专业可信，留出说明区域。", avoid: "避免医疗化夸张、虚假数据文字、包装错误、低清晰度。" },
    { scene: "套装礼盒陈列图", tags: ["套装", "礼盒"], prompt: "生成一张美妆护肤套装礼盒陈列图。产品为 {product_name}，节日为 {season}，卖点为 {selling_points}。多件产品排列有层次，包装精致，背景高级，适合礼赠和活动页。", avoid: "避免产品数量混乱、包装文字乱码、礼盒结构变形。" }
  ],
  服饰鞋包: [
    { scene: "服装上新 Lookbook", tags: ["Lookbook", "上新"], size: "1024x1536", prompt: "生成一张服装上新 Lookbook 图。服装为 {product_name}，风格 {style}，目标人群 {audience}。模特姿态自然，版型、面料、颜色和搭配清晰，背景符合品牌调性。", avoid: "避免衣服结构错乱、肢体畸形、图案漂移、过度滤镜。" },
    { scene: "鞋履质感主图", tags: ["鞋履", "质感"], size: "1024x1024", quality: "high", prompt: "生成一张鞋履商品质感主图。产品为 {product_name}，材质为 {material}，卖点为 {selling_points}。鞋型、鞋底、缝线和材质清晰，背景干净，适合电商首图。", avoid: "避免鞋型变形、左右脚错误、材质失真、文字乱码。" },
    { scene: "包袋街拍图", tags: ["包袋", "街拍"], size: "1024x1536", prompt: "生成一张包袋街拍种草图。产品为 {product_name}，风格 {style}，目标人群 {audience}。包袋清晰可见，人物穿搭自然，背景有城市生活感，适合小红书和详情页。", avoid: "避免包身变形、品牌标识乱码、人物手部畸形、背景杂乱。" },
    { scene: "配饰组合搭配图", tags: ["配饰", "搭配"], prompt: "生成一张服饰配饰组合搭配图。主体为 {product_name}，搭配风格 {style}，材质为 {material}。画面包含包、鞋、帽、首饰或衣物局部，排列高级有秩序。", avoid: "避免元素过多、比例混乱、材质失真、假品牌标识。" }
  ]
};

const industryTemplateGoals: Record<string, number> = {
  电商零售: 36,
  短剧影视: 28,
  自媒体内容: 36,
  人物图像: 34,
  二次元头像: 34,
  潮流社交: 32,
  虚拟IP: 32,
  餐饮茶饮: 24,
  品牌广告: 22,
  漫画动漫: 32,
  美妆护肤: 18,
  服饰鞋包: 18,
  跨境电商: 18,
  直播电商: 18,
  潮玩玩具: 22,
  个人IP: 22,
  母婴宠物: 16,
  房产本地生活: 16,
  游戏美术: 24,
  教育知识: 16,
  文旅酒店: 16,
  SaaS科技: 14,
  金融保险: 14,
  汽车出行: 14,
  医美健康: 14,
  "工业企业与 B2B": 14
};

function makeTemplateId(industry: string, index: number) {
  const industryCode = Array.from(industry).map((char) => char.charCodeAt(0).toString(36)).join("_");
  return `auto_${industryCode}_${index}`;
}

function renderIndustryText(text: string, industry: string) {
  return text.replace(/\{industry\}/g, industry);
}

function makeSupplementalTemplates(existing: Template[]) {
  const existingIds = new Set(existing.map((template) => template.id));
  const industries = Array.from(new Set(existing.map((template) => template.industry)));
  const supplemental: Template[] = [];

  for (const industry of industries) {
    const target = industryTemplateGoals[industry] ?? 10;
    const usedScenes = new Set(existing.filter((template) => template.industry === industry).map((template) => template.scene));
    const seeds = [...(industryTemplateSeeds[industry] ?? []), ...universalTemplateSeeds];
    let currentCount = usedScenes.size;
    let seedIndex = 0;

    while (currentCount < target) {
      const seed = seeds[seedIndex % seeds.length];
      const cycle = Math.floor(seedIndex / seeds.length);
      const scene = cycle === 0 ? seed.scene : `${seed.scene} ${cycle + 1}`;
      seedIndex += 1;
      if (usedScenes.has(scene)) continue;

      let id = makeTemplateId(industry, seedIndex);
      while (existingIds.has(id)) {
        id = `${id}_${supplemental.length + 1}`;
      }
      existingIds.add(id);
      usedScenes.add(scene);
      currentCount += 1;
      supplemental.push(
        tpl(
          id,
          industry,
          scene,
          seed.size ?? "1024x1536",
          seed.quality ?? "medium",
          seed.format ?? "png",
          seed.tags,
          renderIndustryText(seed.prompt, industry),
          renderIndustryText(seed.avoid ?? commonAvoid, industry)
        )
      );
    }
  }

  return supplemental;
}

const templateLibrary: Template[] = [
  ...baseTemplateLibrary,
  ...makeSupplementalTemplates(baseTemplateLibrary)
];

const variableMeta: Record<string, { label: string; placeholder: string; defaultValue: string }> = {
  product_name: { label: "产品/商品名", placeholder: "例如 玻璃保温杯", defaultValue: "核心产品" },
  selling_points: { label: "核心卖点", placeholder: "例如 轻量、防漏、长效保温", defaultValue: "高清质感、真实光影、商业可用" },
  scene: { label: "场景", placeholder: "例如 现代厨房、雨夜街头、露营地", defaultValue: "干净专业的商业场景" },
  style: { label: "风格", placeholder: "例如 高级极简、电影写实、清新治愈", defaultValue: "高级、真实、干净" },
  audience: { label: "目标人群", placeholder: "例如 年轻白领、新手妈妈、企业客户", defaultValue: "目标客户" },
  subject: { label: "主题/主体", placeholder: "例如 夏季新品、悬疑短剧、企业培训", defaultValue: "创作主题" },
  brand: { label: "品牌/机构", placeholder: "例如 云桥品牌、某某门店", defaultValue: "品牌" },
  season: { label: "节日/季节", placeholder: "例如 618、春节、夏季上新", defaultValue: "当前活动季" },
  color_palette: { label: "色彩倾向", placeholder: "例如 莫兰迪、黑金、奶油白", defaultValue: "协调高级的商业配色" },
  platform: { label: "投放平台", placeholder: "例如 淘宝、抖音、小红书、亚马逊", defaultValue: "主流商业平台" },
  camera: { label: "镜头语言", placeholder: "例如 微距、俯拍、半身特写、广角空间", defaultValue: "清晰商业镜头" },
  material: { label: "材质/工艺", placeholder: "例如 玻璃、金属、棉麻、陶瓷、木质", defaultValue: "真实细腻材质" },
  price_tier: { label: "价格带", placeholder: "例如 平价、高端、轻奢、专业级", defaultValue: "有质感的商业定位" },
  region: { label: "地区/文化", placeholder: "例如 江南、欧美、东南亚、城市社区", defaultValue: "目标地区文化语境" },
  promotion: { label: "活动机制", placeholder: "例如 新品首发、限时团购、预约咨询", defaultValue: "清晰促销主题" },
  character: { label: "人物/角色", placeholder: "例如 年轻宝妈、商务男士、国风少女", defaultValue: "目标人物" },
  action: { label: "动作/行为", placeholder: "例如 正在使用、展示产品、对话、奔跑", defaultValue: "自然可信动作" }
};

const placeholderPattern = /\{([a-zA-Z0-9_]+)\}/g;

function getTemplateVariables(template: Template) {
  const keys = new Set<string>();
  `${template.prompt} ${template.avoid}`.replace(placeholderPattern, (_match, key: string) => {
    keys.add(key);
    return "";
  });
  return Array.from(keys);
}

function makeVariableValues(template: Template, previous: VariableValues = {}) {
  return getTemplateVariables(template).reduce<VariableValues>((values, key) => {
    values[key] = previous[key] ?? "";
    return values;
  }, {});
}

function fillPromptVariables(text: string, values: VariableValues) {
  return text.replace(placeholderPattern, (_match, key: string) => {
    const value = values[key]?.trim();
    return value || variableMeta[key]?.defaultValue || "具体业务信息";
  });
}

function makePreviewUrl(label: string) {
  const safeLabel = label.slice(0, 18);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="960" viewBox="0 0 960 960">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="#1f3a5f"/>
          <stop offset="0.48" stop-color="#26314f"/>
          <stop offset="1" stop-color="#3b2f5f"/>
        </linearGradient>
        <radialGradient id="glow" cx="68%" cy="26%" r="58%">
          <stop stop-color="#5eead4" stop-opacity="0.42"/>
          <stop offset="1" stop-color="#5eead4" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="960" height="960" fill="url(#bg)"/>
      <rect width="960" height="960" fill="url(#glow)"/>
      <rect x="96" y="118" width="768" height="612" rx="34" fill="#101827" opacity="0.58" stroke="#79a8ff" stroke-opacity="0.34"/>
      <circle cx="252" cy="286" r="74" fill="#f8fafc" opacity="0.86"/>
      <path d="M138 680 C248 512 340 492 442 622 C540 746 662 496 826 676 L826 730 L138 730 Z" fill="#60a5fa" opacity="0.72"/>
      <path d="M146 728 C294 588 422 584 526 686 C616 774 708 644 834 718 L834 778 L146 778 Z" fill="#a78bfa" opacity="0.78"/>
      <text x="480" y="835" text-anchor="middle" fill="#eef6ff" font-family="Microsoft YaHei, Arial" font-size="40" font-weight="700">${safeLabel}</text>
      <text x="480" y="884" text-anchor="middle" fill="#9fb7d4" font-family="Arial" font-size="24">Yunqiao Pro Preview</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function isImageResult(result: GenerationResult) {
  return Boolean(result.dataUrl && !result.id.startsWith("placeholder-") && !result.id.startsWith("loading-"));
}

function dataUrlMime(dataUrl?: string) {
  return dataUrl?.match(/^data:([^;]+);base64,/)?.[1];
}

function dataUrlByteSize(dataUrl?: string) {
  if (!dataUrl?.startsWith("data:")) return undefined;
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  if (!base64) return undefined;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function responseTypeFromData(dataUrl?: string): GenerationResult["responseType"] {
  if (!dataUrl) return "none";
  return dataUrl.startsWith("data:") ? "base64" : /^https?:\/\//i.test(dataUrl) ? "url" : "local";
}

function formatDuration(ms?: number) {
  if (ms === undefined) return "未记录";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} 秒`;
}

function formatBytes(bytes?: number) {
  if (bytes === undefined) return "未知";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatTime(timestamp?: number) {
  return timestamp ? new Date(timestamp).toLocaleString() : "未记录";
}

function clampRequestTimeoutSeconds(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 300;
  return Math.min(600, Math.max(1, Math.round(numeric)));
}

function readImageDimensions(src: string) {
  return new Promise<{ width: number; height: number }>((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = src;
  });
}

function makeCustomSizeDraft(size: ImageSize): CustomSizeDraft {
  const parsed = /^(\d+)x(\d+)$/.exec(size);
  return parsed && !COMMON_IMAGE_SIZES.includes(size)
    ? { enabled: true, width: parsed[1], height: parsed[2] }
    : { enabled: false, width: "1024", height: "1024" };
}

function customSizeValue(draft: CustomSizeDraft) {
  return makeImageSize(Number(draft.width), Number(draft.height));
}

function imageSizeHint(size: ImageSize) {
  const validation = validateGptImage2Size(size);
  if (!validation.ok) return validation.message ?? "尺寸不符合 gpt-image-2 要求。";
  if (size === "auto") return "由 gpt-image-2 自动选择尺寸。";
  return "符合 gpt-image-2：16 倍数、比例不超过 3:1，且不超过 2K。";
}

function creatorGenerateLabel(active: string, isGenerating: boolean) {
  if (isGenerating) return "生成中...";
  if (active === "AI修图工具箱") return "开始修图";
  if (active === "图生图与局部重绘") return "开始图生图";
  return "生成图片";
}

function makeBatchTask(project: string, industry: string, template: string, count: number, prompt?: string, size?: string): BatchTask {
  const normalizedCount = Math.min(10, Math.max(1, Math.round(Number(count) || 1)));
  const trimmedSize = size?.trim();
  const batchSizeValidation = trimmedSize ? validateGptImage2Size(trimmedSize) : null;
  return {
    id: `batch-task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    project,
    industry,
    template,
    count: normalizedCount,
    prompt: prompt || `项目：${project}。行业：${industry}。模板：${template}。生成适合商业使用的高质量图片。`,
    size: batchSizeValidation?.ok ? batchSizeValidation.value : trimmedSize ? trimmedSize as ImageSize : undefined,
    status: "已导入",
    completedCount: 0
  };
}

function normalizeImportedTemplate(template: Partial<Template>, index: number): Template | null {
  if (!template.prompt || !template.scene) return null;
  const sizeValidation = validateGptImage2Size(String(template.size ?? "1024x1536"));
  return {
    id: template.id?.startsWith("custom-") ? template.id : `custom-import-${Date.now()}-${index}`,
    industry: String(template.industry || "导入模板"),
    scene: String(template.scene),
    size: sizeValidation.ok ? sizeValidation.value : "1024x1536",
    quality: (["auto", "low", "medium", "high"].includes(String(template.quality)) ? template.quality : "medium") as ImageQuality,
    format: (["png", "jpeg", "webp"].includes(String(template.format)) ? template.format : "png") as ImageFormat,
    prompt: String(template.prompt),
    avoid: String(template.avoid || "避免文字乱码、水印、主体变形、低清晰度、杂乱背景。"),
    tags: Array.isArray(template.tags) ? template.tags.map(String).filter(Boolean) : ["导入"],
    custom: true
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function App() {
  const [active, setActive] = useState("工作台");
  const [selectedTemplate, setSelectedTemplate] = useState(templateLibrary[0]);
  const [currentProject, setCurrentProject] = useState("默认项目");
  const [promptText, setPromptText] = useState(templateLibrary[0].prompt);
  const [avoidText, setAvoidText] = useState(templateLibrary[0].avoid);
  const [variableValues, setVariableValues] = useState<VariableValues>(() => makeVariableValues(templateLibrary[0]));
  const [globalQuery, setGlobalQuery] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState("https://api.0029.org");
  const [apiDiagnostic, setApiDiagnostic] = useState<ApiDiagnostic | null>(null);
  const [saveDirectory, setSaveDirectory] = useState("");
  const [requestTimeoutSeconds, setRequestTimeoutSeconds] = useState(300);
  const [autoCheckUpdates, setAutoCheckUpdates] = useState(true);
  const [skippedUpdateVersion, setSkippedUpdateVersion] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modal, setModal] = useState<Modal>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationParams, setGenerationParams] = useState<GenerationParams>({
    prompt: templateLibrary[0].prompt,
    avoid: templateLibrary[0].avoid,
    size: templateLibrary[0].size,
    quality: templateLibrary[0].quality as ImageQuality,
    outputFormat: templateLibrary[0].format as ImageFormat,
    background: "auto"
  });
  const [results, setResults] = useState<GenerationResult[]>(
    Array.from({ length: 1 }, (_, index) => ({
      id: `placeholder-${index + 1}`,
      label: `等待生成 ${index + 1}`,
      status: "empty"
    }))
  );
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [editSourcePaths, setEditSourcePaths] = useState<string[]>([]);
  const [retouchMaskPath, setRetouchMaskPath] = useState<string | null>(null);
  const [stageView, setStageView] = useState<StageView>("grid");
  const [selectedRetouchToolId, setSelectedRetouchToolId] = useState(retouchToolPresets[0].id);
  const [storages, setStorages] = useState<StorageProfile[]>([]);
  const [storageDraft, setStorageDraft] = useState<StorageDraft>(() => makeStorageDraft());
  const [assets, setAssets] = useState<Asset[]>([]);
  const [customTemplates, setCustomTemplates] = useState<Template[]>([]);
  const allTemplates = useMemo(() => [...templateLibrary, ...customTemplates], [customTemplates]);
  const [batchTasks, setBatchTasks] = useState<BatchTask[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchControlStatus, setBatchControlStatus] = useState<BatchControlStatus>("idle");
  const [batchSize, setBatchSize] = useState<ImageSize>("1024x1024");
  const [batchRetryLimit, setBatchRetryLimit] = useState(1);
  const batchControlRef = useRef<BatchControlStatus>("idle");
  const autoUpdateCheckedRef = useRef(false);

  const currentHint = useMemo(() => pageHints[active] ?? "管理云桥Pro工作流。", [active]);
  const queuedCount = useMemo(() => batchTasks.filter((task) => task.status === "已导入" || task.status === "生成中").length, [batchTasks]);
  const isCreatorActive = creatorPages.has(active);

  const bridge = (window as Window & { yunqiao?: YunqiaoBridge }).yunqiao;

  useEffect(() => {
    const appBridge = (window as Window & { yunqiao?: YunqiaoBridge }).yunqiao;
    void appBridge?.getSettings?.().then((settings) => {
      if (settings?.saveDirectory) setSaveDirectory(settings.saveDirectory);
      if (settings?.hasApiKey) setApiKeySaved(true);
      if (settings?.storageProfiles) setStorages(settings.storageProfiles);
      if (settings?.requestTimeoutSeconds) setRequestTimeoutSeconds(clampRequestTimeoutSeconds(settings.requestTimeoutSeconds));
      if (settings?.apiBaseUrl) setApiBaseUrl(settings.apiBaseUrl);
      if (typeof settings?.autoCheckUpdates === "boolean") setAutoCheckUpdates(settings.autoCheckUpdates);
      if (typeof settings?.skippedUpdateVersion === "string") setSkippedUpdateVersion(settings.skippedUpdateVersion);
    }).catch(() => {
      notify("设置读取失败，已使用默认配置", "warning");
    }).finally(() => {
      setSettingsLoaded(true);
    });
    void appBridge?.getAssetLibrary?.().then((library) => {
      if (Array.isArray(library)) setAssets(library);
      setAssetsLoaded(true);
    }).catch(() => {
      setAssetsLoaded(true);
    });
    void appBridge?.getCustomTemplates?.().then((templates) => {
      if (Array.isArray(templates)) setCustomTemplates(templates.map((template) => ({ ...template, custom: true })));
      setTemplatesLoaded(true);
    }).catch(() => {
      setTemplatesLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!settingsLoaded || !autoCheckUpdates || autoUpdateCheckedRef.current || !bridge?.checkUpdate) return;
    autoUpdateCheckedRef.current = true;
    const timer = window.setTimeout(() => {
      void checkForUpdates({ automatic: true });
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [settingsLoaded, autoCheckUpdates]);

  useEffect(() => {
    if (!assetsLoaded) return;
    const appBridge = (window as Window & { yunqiao?: YunqiaoBridge }).yunqiao;
    void appBridge?.saveAssetLibrary?.(assets);
  }, [assets, assetsLoaded]);

  useEffect(() => {
    if (!templatesLoaded) return;
    const appBridge = (window as Window & { yunqiao?: YunqiaoBridge }).yunqiao;
    void appBridge?.saveCustomTemplates?.(customTemplates);
  }, [customTemplates, templatesLoaded]);

  useEffect(() => {
    if (active !== "AI修图工具箱") return;
    const preset = retouchToolPresets.find((item) => item.id === selectedRetouchToolId) ?? retouchToolPresets[0];
    if (promptText.trim() === selectedTemplate.prompt.trim()) {
      setPromptText(preset.prompt);
      setAvoidText(preset.avoid);
      setGenerationParams((params) => ({ ...params, ...preset.params, prompt: preset.prompt, avoid: preset.avoid }));
    }
  }, [active, promptText, selectedRetouchToolId, selectedTemplate.prompt]);

  function notify(message: string, type: Toast["type"] = "success") {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items, { id, type, message }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 2600);
  }

  function openOfficialSite() {
    if (!bridge?.openExternal) {
      notify("请访问 0029.org 购买套餐并生成 API Key", "info");
      return;
    }
    void bridge.openExternal("https://0029.org").catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "无法打开 0029.org";
      notify(message, "warning");
    });
  }

  async function openUpdateTarget(result: UpdateCheckResult) {
    const targetUrl = result.downloadUrl || result.releaseUrl || result.fallbackDownloadUrl;
    if (!targetUrl || !bridge?.openExternal) return false;
    await bridge.openExternal(targetUrl);
    return true;
  }

  async function checkForUpdates(options: { automatic?: boolean } = {}) {
    if (!bridge?.checkUpdate) {
      if (!options.automatic) notify("当前运行环境不支持检查更新，请到 GitHub Release 页面查看", "warning");
      return;
    }
    try {
      const result = await bridge.checkUpdate();

      if (result.updateAvailable) {
        if (options.automatic && skippedUpdateVersion === result.latestVersion) {
          return;
        }
        setModal({ kind: "update", result, automatic: Boolean(options.automatic) });
        return;
      }

      if (!options.automatic) {
        const sourceLabel = result.source === "website" ? "主更新服务" : "备用更新服务";
        notify(`当前已是最新版本 ${result.currentVersion}（${sourceLabel}）`, "info");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      if (!options.automatic) notify(`检查更新失败：${message}`, "warning");
    }
  }

  async function saveUpdatePreferences(patch: { autoCheckUpdates?: boolean; skippedUpdateVersion?: string }, message: string) {
    if (!bridge?.updateSettings) {
      notify("当前窗口未加载设置桥接，请在桌面客户端中保存更新偏好", "warning");
      return;
    }
    const settings = await bridge.updateSettings(patch);
    if (typeof settings.autoCheckUpdates === "boolean") setAutoCheckUpdates(settings.autoCheckUpdates);
    if (typeof settings.skippedUpdateVersion === "string") setSkippedUpdateVersion(settings.skippedUpdateVersion);
    notify(message, "info");
  }

  async function skipUpdateVersion(result: UpdateCheckResult) {
    await saveUpdatePreferences({ skippedUpdateVersion: result.latestVersion }, `已跳过版本 ${result.latestVersion}`);
    setModal(null);
  }

  function useTemplate(template: Template) {
    setSelectedTemplate(template);
    setCurrentProject((project) => (project === "默认项目" || !project.trim() ? template.industry : project));
    setPromptText(template.prompt);
    setAvoidText(template.avoid);
    setVariableValues((values) => makeVariableValues(template, values));
    setGenerationParams((params) => ({
      ...params,
      prompt: template.prompt,
      avoid: template.avoid,
      size: template.size,
      quality: template.quality as ImageQuality,
      outputFormat: template.format as ImageFormat
    }));
    setActive("文生图创作");
    notify(`已载入模板：${template.industry} / ${template.scene}`);
  }

  function copyText(text: string, label: string) {
    void navigator.clipboard?.writeText(text);
    notify(`${label}已复制到剪贴板`);
  }

  async function copyImageToClipboard(result?: GenerationResult) {
    if (!result?.dataUrl) {
      notify("请先选择一张图片", "warning");
      return;
    }
    if (bridge?.copyImage) {
      await bridge.copyImage(result.dataUrl);
      notify("图片已复制到系统剪贴板");
      return;
    }
    copyText(result.dataUrl, "图片数据");
  }

  async function openSelectedFileLocation(result?: GenerationResult) {
    if (!result?.localPath) {
      notify("当前结果还没有本地文件路径", "warning");
      return;
    }
    if (!bridge?.openFileLocation) {
      notify("当前运行环境不支持打开文件位置，请使用桌面客户端", "warning");
      return;
    }
    await bridge.openFileLocation(result.localPath);
    notify("已在文件管理器中定位图片");
  }

  function saveCustomTemplate(template: Template) {
    const normalized: Template = {
      ...template,
      id: template.custom ? template.id : `custom-${Date.now()}`,
      industry: template.industry.trim() || "自定义行业",
      scene: template.scene.trim() || "自定义场景",
      prompt: template.prompt.trim(),
      avoid: template.avoid.trim(),
      tags: template.tags.map((tag) => tag.trim()).filter(Boolean),
      custom: true
    };
    if (!normalized.prompt) {
      notify("请填写模板提示词", "warning");
      return;
    }
    setCustomTemplates((items) => {
      const exists = items.some((item) => item.id === normalized.id);
      return exists ? items.map((item) => (item.id === normalized.id ? normalized : item)) : [normalized, ...items];
    });
    notify(`自定义模板已保存：${normalized.industry} / ${normalized.scene}`);
  }

  function syncTemplateToCreator(template: Template) {
    setSelectedTemplate(template);
    setCurrentProject((project) => (project === "默认项目" || !project.trim() ? template.industry : project));
    setPromptText(template.prompt);
    setAvoidText(template.avoid);
    setVariableValues((values) => makeVariableValues(template, values));
    setGenerationParams((params) => ({
      ...params,
      prompt: template.prompt,
      avoid: template.avoid,
      size: template.size,
      quality: template.quality as ImageQuality,
      outputFormat: template.format as ImageFormat
    }));
  }

  function getRequestParams(): GenerationParams {
    return {
      ...generationParams,
      prompt: fillPromptVariables(promptText, variableValues),
      avoid: fillPromptVariables(avoidText, variableValues)
    };
  }

function makeAssetFromResult(result: GenerationResult, params: GenerationParams): Asset {
    const timestamp = Date.now();
    return {
      id: result.id,
      name: `${selectedTemplate.scene}-${new Date(timestamp).toLocaleTimeString()}`,
      project: currentProject.trim() || selectedTemplate.industry,
      source: result.source ?? "文生图",
      cloudUrl: "未上传",
      prompt: `${params.prompt}\n避免内容：${params.avoid}`,
      status: result.dataUrl ? "已生成" : "生成记录",
      previewUrl: result.dataUrl ?? makePreviewUrl(selectedTemplate.scene),
      localPath: result.localPath
    };
  }

  async function generateImages() {
    const params = getRequestParams();
    if (!params.prompt.trim()) {
      notify("请先填写提示词", "warning");
      return;
    }
    const sizeValidation = validateGptImage2Size(params.size);
    if (!sizeValidation.ok) {
      notify(`尺寸不符合 gpt-image-2 要求：${sizeValidation.message}`, "warning");
      return;
    }
    const editingMode = active !== "文生图创作";
    if (editingMode && editSourcePaths.length === 0) {
      notify(active === "AI修图工具箱" ? "请先选择要修的原图，或点击结果区的“载入 AI 修图”" : "请先从作品库继续编辑，或点击底图区域选择本地图片", "warning");
      return;
    }

    setGenerationParams(params);
    setIsGenerating(true);
    const startedAt = Date.now();
    const generationSource = active === "AI修图工具箱" ? "AI修图" : editingMode ? "图生图" : "文生图";
    const parentId = editingMode ? (results.find((item) => item.id === selectedResultId)?.id ?? null) : null;
    const previousResults = editingMode
      ? results.filter((item) => isImageResult(item) || item.localPath || item.error)
      : [];
    const loadingResult: GenerationResult = {
      id: "loading-0",
      label: "生成中 1",
      status: "生成中",
      startedAt,
      source: generationSource,
      requestSize: sizeValidation.value,
      requestQuality: params.quality,
      requestBackground: params.background,
      prompt: `${params.prompt}\n避免内容：${params.avoid}`,
      parentId
    };
    setResults(
      [...previousResults, loadingResult]
    );
    setSelectedResultId(loadingResult.id);

    try {
      if (!apiKeySaved && !apiKey.trim()) {
        throw new Error("请先在设置页保存 API Key");
      }
      if (!editingMode && !bridge?.generateImage) {
        throw new Error("当前运行环境没有加载生图桥接");
      }
      if (editingMode && !bridge?.editImage) {
        throw new Error("当前运行环境没有加载图片编辑桥接");
      }
      const imageBridge = bridge;
      if (!imageBridge) {
        throw new Error("当前运行环境没有加载桌面桥接");
      }

      const request = {
        prompt: `${params.prompt}\n避免内容：${params.avoid}`,
        size: sizeValidation.value,
        quality: params.quality,
        output_format: params.outputFormat,
        background: params.background
      };
      const maskPath = editingMode && retouchMaskPath ? retouchMaskPath : undefined;
      const response = editingMode
        ? await imageBridge.editImage!({ ...request, imagePaths: editSourcePaths, maskPath })
        : await imageBridge.generateImage!(request);
      const completedAt = Date.now();
      const responseItems = (response.data ?? []).filter((item) => item.b64_json || item.url);
      if (responseItems.length === 0) {
        throw new Error("接口没有返回图片数据");
      }
      const apiResults: GenerationResult[] = await Promise.all(responseItems.map(async (item, index) => {
        const dataUrl = item.b64_json ? `data:image/${params.outputFormat};base64,${item.b64_json}` : item.url;
        const dimensions = dataUrl ? await readImageDimensions(dataUrl) : { width: 0, height: 0 };
        const mimeType = dataUrlMime(dataUrl) ?? (dataUrl ? `image/${params.outputFormat}` : undefined);
        return {
          id: `asset-${Date.now()}-${index}`,
          label: `${selectedTemplate.scene} ${index + 1}`,
          dataUrl,
          status: item.revised_prompt ? "已按模型优化提示词生成" : "已生成",
          source: generationSource,
          prompt: `${params.prompt}\n避免内容：${params.avoid}`,
          startedAt,
          completedAt,
          durationMs: completedAt - startedAt,
          responseType: responseTypeFromData(dataUrl),
          mimeType,
          format: mimeType?.replace("image/", "") ?? params.outputFormat,
          byteSize: dataUrlByteSize(dataUrl),
          width: dimensions.width || undefined,
          height: dimensions.height || undefined,
          requestSize: sizeValidation.value,
          requestQuality: params.quality,
          requestBackground: params.background,
          revisedPrompt: item.revised_prompt,
          parentId,
          upload: { status: "未上传" }
        };
      }));
      if (bridge?.saveImage) {
        const savedPaths = await Promise.all(
          apiResults
            .filter((result) => result.dataUrl)
            .map((result) => bridge.saveImage!({ dataUrl: result.dataUrl!, name: result.label }))
        );
        let savedIndex = 0;
        for (const result of apiResults) {
          if (result.dataUrl) {
            result.localPath = savedPaths[savedIndex]?.path;
            savedIndex += 1;
          }
        }
      }
      setResults([...previousResults, ...apiResults]);
      setSelectedResultId(apiResults[0]?.id ?? null);
      if (editingMode && apiResults[0]?.localPath) {
        setEditSourcePaths([apiResults[0].localPath]);
        setRetouchMaskPath(null);
      }
      setAssets((items) => [...apiResults.map((result) => makeAssetFromResult(result, params)), ...items]);
      notify(`已生成 ${apiResults.length} 张图片，并写入作品素材库`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      const completedAt = Date.now();
      setResults([
        ...previousResults,
        {
          id: `error-${completedAt}`,
          label: editingMode ? `${generationSource}失败` : "生成失败",
          status: "失败",
          error: message,
          source: generationSource,
          prompt: `${params.prompt}\n避免内容：${params.avoid}`,
          startedAt,
          completedAt,
          durationMs: completedAt - startedAt,
          responseType: "none",
          requestSize: sizeValidation.value,
          requestQuality: params.quality,
          requestBackground: params.background,
          parentId
        }
      ]);
      setSelectedResultId(`error-${completedAt}`);
      notify(`生成失败：${message}`, "warning");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleGlobalSearch() {
    const query = globalQuery.trim();
    if (!query) {
      notify("请输入要搜索的模板、项目或关键词", "warning");
      return;
    }
    const template = allTemplates.find((item) => {
      const text = `${item.industry} ${item.scene} ${item.prompt} ${item.tags.join(" ")}`;
      return text.toLowerCase().includes(query.toLowerCase());
    });
    if (template) {
      syncTemplateToCreator(template);
      setActive("行业模板库");
      notify(`已定位到模板方向：${template.industry} / ${template.scene}`);
      return;
    }
    const asset = assets.find((item) => `${item.name} ${item.project} ${item.prompt}`.toLowerCase().includes(query.toLowerCase()));
    if (asset) {
      setActive("作品素材库");
      notify(`已在作品库找到：${asset.name}`);
      return;
    }
    notify("未找到匹配内容，可在行业模板库继续搜索", "warning");
    setActive("行业模板库");
  }

  async function saveApiKey() {
    if (!apiKey.trim()) {
      notify("请先输入 API Key", "warning");
      return;
    }
    if (!bridge?.setApiKey) {
      notify("当前窗口未加载安全存储桥接，请在桌面客户端中保存 Key", "warning");
      return;
    }
    await bridge.setApiKey(apiKey.trim());
    setApiKey("");
    setApiKeySaved(true);
    notify("API Key 已保存到本机安全存储");
  }

  async function testApiConnection() {
    if (!apiKeySaved && !apiKey.trim()) {
      notify("请先保存 API Key 后再测试接口", "warning");
      return;
    }
    if (!bridge?.testApi) {
      notify("当前窗口未加载 API 测试桥接，请在桌面客户端中测试", "warning");
      return;
    }
    const testedAt = Date.now();
    try {
      const result = await bridge.testApi();
      const diagnostic: ApiDiagnostic = { ...result, testedAt };
      setApiDiagnostic(diagnostic);
      notify(result.ok ? `API 连接正常：HTTP ${result.status}` : `API 返回异常：HTTP ${result.status}`, result.ok ? "success" : "warning");
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      setApiDiagnostic({ ok: false, error: message, endpoint: `${apiBaseUrl}/v1/models`, testedAt });
      notify(`API 测试失败：${message}`, "warning");
    }
  }

  async function saveRequestTimeout() {
    const nextTimeout = clampRequestTimeoutSeconds(requestTimeoutSeconds);
    if (!bridge?.updateSettings) {
      notify("当前窗口未加载设置桥接，请在桌面客户端中保存超时设置", "warning");
      return;
    }
    const settings = await bridge.updateSettings({ requestTimeoutSeconds: nextTimeout });
    setRequestTimeoutSeconds(clampRequestTimeoutSeconds(settings.requestTimeoutSeconds ?? nextTimeout));
    notify(`请求超时时间已保存：${nextTimeout} 秒`);
  }

  async function changeAutoCheckUpdates(enabled: boolean) {
    setAutoCheckUpdates(enabled);
    await saveUpdatePreferences({ autoCheckUpdates: enabled }, enabled ? "已开启启动检查更新" : "已关闭启动检查更新");
  }

  async function clearSkippedUpdateVersion() {
    await saveUpdatePreferences({ skippedUpdateVersion: "" }, "已恢复所有版本提醒");
  }

  async function persistStorages(nextStorages: StorageProfile[]) {
    setStorages(nextStorages);
    await bridge?.updateSettings?.({ storageProfiles: nextStorages });
  }

  async function addStorage(profile: StorageProfile) {
    const nextStorages = [profile, ...storages.map((item) => ({ ...item, status: item.status === "默认通道" ? "连接正常" as const : item.status }))];
    await persistStorages(nextStorages);
    notify(`已保存默认上传通道：${profile.name}`);
  }

  async function saveStorageDraft() {
    const isFtp = storageDraft.type === "FTP" || storageDraft.type === "SFTP";
    if (!storageDraft.name.trim()) {
      notify("请填写存储备注名称", "warning");
      return;
    }
    if (isFtp && !storageDraft.host.trim()) {
      notify("请填写 FTP/SFTP 服务器地址", "warning");
      return;
    }
    if (!isFtp && (!storageDraft.endpoint.trim() || !storageDraft.bucket.trim())) {
      notify("请填写 Endpoint 和 Bucket", "warning");
      return;
    }
    if (!storageDraft.publicUrl.trim() && storageDraft.mode !== "仅本地") {
      notify("请填写公网 URL 前缀，后续复制链接会依赖它", "warning");
      return;
    }
    await addStorage({
      id: `storage-${Date.now()}`,
      name: storageDraft.name,
      type: storageDraft.type,
      endpoint: isFtp ? `${storageDraft.host}:${storageDraft.port}` : storageDraft.endpoint,
      bucket: isFtp ? storageDraft.root : storageDraft.bucket,
      accessKey: storageDraft.accessKey,
      secretKey: storageDraft.secretKey,
      username: storageDraft.username,
      password: storageDraft.password,
      host: storageDraft.host,
      port: storageDraft.port,
      root: storageDraft.root,
      publicUrl: storageDraft.publicUrl,
      mode: storageDraft.mode,
      autoUpload: storageDraft.autoUpload,
      status: "默认通道"
    });
  }

  async function testStorageDraft() {
    const isFtp = storageDraft.type === "FTP" || storageDraft.type === "SFTP";
    if (isFtp && (!storageDraft.host.trim() || !storageDraft.port.trim())) {
      notify("请先填写服务器地址和端口", "warning");
      return;
    }
    if (!isFtp && (!storageDraft.endpoint.trim() || !storageDraft.bucket.trim())) {
      notify("请先填写 Endpoint 和 Bucket", "warning");
      return;
    }
    if (!bridge?.testStorage) {
      notify("当前窗口不支持网络连通性测试，请使用桌面客户端", "warning");
      return;
    }
    const result = await bridge.testStorage({
      type: storageDraft.type,
      endpoint: storageDraft.endpoint,
      host: storageDraft.host,
      port: storageDraft.port
    });
    notify(`${storageDraft.type} ${result.message}`, result.ok ? "success" : "warning");
  }

  async function uploadAsset(asset: Asset) {
    if (storages.length === 0) {
      notify("请先新增云端存储配置，保存默认通道后再上传", "warning");
      setActive("API与云端存储设置");
      return;
    }
    if (!asset.localPath) {
      notify("该作品缺少本地图片文件，请先保存图片或重新生成后再上传", "warning");
      return;
    }
    if (!bridge?.uploadAsset) {
      notify("当前运行环境不支持云端上传，请使用桌面客户端", "warning");
      return;
    }
    const uploadStartedAt = Date.now();
    setAssets((items) =>
      items.map((item) =>
        item.id === asset.id ? { ...item, status: `上传中：${storages[0].name}` } : item
      )
    );
    setResults((items) =>
      items.map((item) =>
        item.id === asset.id
          ? {
              ...item,
              upload: {
                ...(item.upload ?? { status: "未上传" }),
                status: "上传中",
                storageName: storages[0]?.name,
                uploadedAt: uploadStartedAt
              }
            }
          : item
      )
    );
    try {
      const result = await bridge.uploadAsset({
        name: asset.name,
        project: asset.project,
        source: asset.source,
        localPath: asset.localPath
      });
      const uploadCompletedAt = Date.now();
      const upload: UploadStatus = {
        status: "已上传",
        storageName: result.storageName,
        storageType: result.storageType,
        objectKey: result.objectKey,
        url: result.url,
        durationMs: uploadCompletedAt - uploadStartedAt,
        uploadedAt: uploadCompletedAt
      };
      setAssets((items) =>
        items.map((item) =>
          item.id === asset.id ? { ...item, status: `已上传：${result.storageName}`, cloudUrl: result.url } : item
        )
      );
      setResults((items) =>
        items.map((item) =>
          item.id === asset.id
            ? {
                ...item,
                upload
              }
            : item
        )
      );
      notify(`上传成功，公网 URL 已写入作品库：${result.storageName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      setAssets((items) => items.map((item) => (item.id === asset.id ? { ...item, status: "上传失败" } : item)));
      setResults((items) =>
        items.map((item) =>
          item.id === asset.id
            ? {
                ...item,
                upload: {
                  status: "上传失败",
                  storageName: storages[0]?.name,
                  error: message,
                  durationMs: Date.now() - uploadStartedAt,
                  uploadedAt: Date.now()
                }
              }
            : item
        )
      );
      notify(`上传失败：${message}`, "warning");
    }
  }

  function continueSelectedResult() {
    const selected = results.find((item) => item.id === selectedResultId && isImageResult(item)) ?? results.find(isImageResult);
    if (!selected?.dataUrl) {
      notify("请先生成或选择一张图片", "warning");
      return;
    }
    setSelectedResultId(selected.id);
    setEditSourcePaths(selected.localPath ? [selected.localPath] : []);
    setActive("图生图与局部重绘");
    notify(selected.localPath ? "已载入当前结果，可继续图生图编辑" : "已载入预览；若要调用编辑接口，请先选择本地底图", selected.localPath ? "success" : "warning");
  }

  function retouchSelectedResult() {
    const selected = results.find((item) => item.id === selectedResultId && isImageResult(item)) ?? results.find(isImageResult);
    if (!selected?.dataUrl) {
      notify("请先生成、导入或选择一张要修的图片", "warning");
      return;
    }
    setSelectedResultId(selected.id);
    setEditSourcePaths(selected.localPath ? [selected.localPath] : []);
    setActive("AI修图工具箱");
    notify(selected.localPath ? "已载入当前图片，可直接选择修图工具" : "当前图片缺少本地文件，请先保存图片或重新选择原图", selected.localPath ? "success" : "warning");
  }

  function clearEditSourceImages() {
    setEditSourcePaths([]);
    notify("已清空修图底图", "info");
  }

  async function chooseSaveDirectory() {
    if (!bridge?.chooseDirectory) {
      notify("当前运行环境不支持选择目录，请使用桌面客户端", "warning");
      return;
    }
    const settings = await bridge.chooseDirectory();
    if (settings?.saveDirectory) {
      setSaveDirectory(settings.saveDirectory);
      notify(`保存目录已更新：${settings.saveDirectory}`);
    }
  }

  async function openSaveDirectory() {
    if (!bridge?.openDirectory) {
      notify("当前运行环境不支持打开目录，请使用桌面客户端", "warning");
      return;
    }
    const result = await bridge.openDirectory(saveDirectory || undefined);
    setSaveDirectory(result.path);
    notify(`已打开保存目录：${result.path}`);
  }

  async function exportUrlList() {
    if (assets.length === 0) {
      notify("作品素材库为空，暂无 URL 可导出", "warning");
      return;
    }
    if (!bridge?.exportUrlList) {
      notify("当前运行环境不支持写入文件，请使用桌面客户端", "warning");
      return;
    }
    const result = await bridge.exportUrlList(assets.map((asset) => ({ name: asset.name, cloudUrl: asset.cloudUrl })));
    notify(`URL 清单已导出：${result.path}`);
  }

  async function createAssetZip() {
    if (assets.length === 0) {
      notify("作品素材库为空，暂无素材可打包", "warning");
      return;
    }
    if (!bridge?.createAssetZip) {
      notify("当前运行环境不支持打包文件，请使用桌面客户端", "warning");
      return;
    }
    const result = await bridge.createAssetZip(assets.map((asset) => ({ name: asset.name, prompt: asset.prompt, cloudUrl: asset.cloudUrl, localPath: asset.localPath })));
    notify(`素材包已生成：${result.path}`);
  }

  async function saveSelectedImage() {
    const selected = results.find((item) => item.id === selectedResultId) ?? results.find((item) => item.dataUrl);
    if (!selected?.dataUrl) {
      notify("请先选择一张已生成图片", "warning");
      return;
    }
    if (!bridge?.saveImage) {
      notify("当前运行环境不支持保存图片，请使用桌面客户端", "warning");
      return;
    }
    const result = await bridge.saveImage({ dataUrl: selected.dataUrl, name: selected.label });
    setResults((items) => items.map((item) => (item.id === selected.id ? { ...item, localPath: result.path } : item)));
    setAssets((items) => items.map((item) => (item.id === selected.id ? { ...item, localPath: result.path } : item)));
    notify(`图片已保存：${result.path}`);
  }

  async function uploadSelectedResult() {
    const selected = results.find((item) => item.id === selectedResultId && isImageResult(item)) ?? results.find(isImageResult);
    if (!selected) {
      notify("请先生成或选择一张图片", "warning");
      return;
    }
    const asset = assets.find((item) => item.id === selected.id);
    if (!asset) {
      notify("当前结果尚未写入作品库，请重新生成或到作品库上传", "warning");
      return;
    }
    await uploadAsset(asset);
  }

  async function chooseEditSourceImage() {
    if (!bridge?.chooseImages) {
      notify("当前运行环境不支持选择本地图片，请使用桌面客户端", "warning");
      return;
    }
    const images = await bridge.chooseImages();
    if (!images.length) return;
    setEditSourcePaths(images.map((image) => image.path));
    const first = images[0];
    const dimensions = await readImageDimensions(first.dataUrl);
    const now = Date.now();
    const importedResult: GenerationResult = {
      id: `source-${now}`,
      label: first.name,
      dataUrl: first.dataUrl,
      localPath: first.path,
      status: "底图已载入",
      source: "本地底图",
      startedAt: now,
      completedAt: now,
      durationMs: 0,
      responseType: "local",
      mimeType: dataUrlMime(first.dataUrl) ?? "image/png",
      format: (dataUrlMime(first.dataUrl) ?? "image/png").replace("image/", ""),
      byteSize: dataUrlByteSize(first.dataUrl),
      width: dimensions.width || undefined,
      height: dimensions.height || undefined,
      upload: { status: "未上传" }
    };
    setResults([importedResult]);
    setSelectedResultId(importedResult.id);
    notify(`已载入 ${images.length} 张底图`);
  }

  async function importBatchExcel() {
    if (!bridge?.importBatchExcel) {
      notify("当前运行环境不支持读取 Excel，请使用桌面客户端", "warning");
      return;
    }
    const imported = await bridge.importBatchExcel();
    if (!imported) return;
    const tasks = imported.rows.map((row) => makeBatchTask(row[0], row[1], row[2], Number(row[3]), row[4], row[5]));
    if (tasks.length === 0) {
      notify("Excel 中没有可导入的批量任务", "warning");
      return;
    }
    setBatchTasks(tasks);
    notify(`已从 Excel 导入 ${tasks.length} 条批量任务`);
  }

  async function exportBatchTemplate() {
    if (!bridge?.exportBatchTemplate) {
      notify("当前运行环境不支持导出 Excel 模板，请使用桌面客户端", "warning");
      return;
    }
    const result = await bridge.exportBatchTemplate();
    notify(`批量 Excel 模板已导出：${result.path}`);
  }

  async function exportBatchLog() {
    if (!bridge?.exportBatchLog) {
      notify("当前运行环境不支持导出批量日志，请使用桌面客户端", "warning");
      return;
    }
    const result = await bridge.exportBatchLog(batchTasks);
    notify(`批量任务日志已导出：${result.path}`);
  }

  async function bindBatchImageFolder() {
    if (batchTasks.length === 0) {
      notify("请先导入或创建批量任务，再绑定底图文件夹", "warning");
      return;
    }
    if (!bridge?.chooseImageFolder) {
      notify("当前运行环境不支持选择底图文件夹，请使用桌面客户端", "warning");
      return;
    }
    const picked = await bridge.chooseImageFolder();
    if (!picked || picked.images.length === 0) {
      notify("文件夹中没有可用图片，支持 png/jpg/jpeg/webp", "warning");
      return;
    }
    setBatchTasks((items) =>
      items.map((item, index) => {
        const image = picked.images[index % picked.images.length];
        return {
          ...item,
          imagePath: image.path,
          imageName: image.name,
          status: item.status === "失败" ? "已导入" : item.status,
          error: undefined
        };
      })
    );
    notify(`已从文件夹绑定 ${picked.images.length} 张底图到批量任务`);
  }

  async function exportTemplatePack() {
    if (!bridge?.exportTemplates) {
      notify("当前运行环境不支持导出模板包，请使用桌面客户端", "warning");
      return;
    }
    const result = await bridge.exportTemplates(customTemplates.length ? customTemplates : allTemplates);
    if (result?.path) notify(`模板包已导出：${result.path}`);
  }

  async function importTemplatePack() {
    if (!bridge?.importTemplates) {
      notify("当前运行环境不支持导入模板包，请使用桌面客户端", "warning");
      return;
    }
    const result = await bridge.importTemplates();
    if (!result) return;
    const imported = result.templates
      .map((template, index) => normalizeImportedTemplate(template, index))
      .filter((template): template is Template => Boolean(template));
    if (imported.length === 0) {
      notify("模板包中没有可导入的模板", "warning");
      return;
    }
    setCustomTemplates((items) => {
      const existingIds = new Set(items.map((item) => item.id));
      const next = imported.map((template) => existingIds.has(template.id) ? { ...template, id: `${template.id}-${Date.now()}` } : template);
      return [...next, ...items];
    });
    notify(`已导入 ${imported.length} 个模板`);
  }

  function addSampleBatchTasks() {
    const samples = [
      makeBatchTask("夏季上新", "电商零售", "商品场景种草图", 2, "为夏季新品生成电商种草场景图，突出清爽、轻量、高质感，适合详情页和小红书封面。"),
      makeBatchTask("悬疑短剧 A 组", "短剧影视", "竖版短剧封面", 2, "生成悬疑短剧竖版封面，雨夜街头，人物表情紧张，电影级布光，保留标题留白。"),
      makeBatchTask("漫画角色企划", "漫画动漫", "角色设定", 2, "生成二次元角色设定图，清晰线条，完整服装设计，适合漫画前期设定。")
    ];
    setBatchTasks(samples);
    notify(`已创建 ${samples.length} 条可编辑批量任务`);
  }

  async function startBatchQueue() {
    if (batchControlRef.current === "paused") {
      batchControlRef.current = "running";
      setBatchControlStatus("running");
      notify("批量队列已继续运行", "info");
      return;
    }
    if (isBatchRunning || batchControlRef.current === "running") {
      notify("批量队列正在运行，可先暂停或停止", "warning");
      return;
    }
    if (batchTasks.length === 0) {
      notify("请先导入 Excel 或创建样例任务", "warning");
      return;
    }
    if (!apiKeySaved && !apiKey.trim()) {
      notify("请先在设置页保存 API Key", "warning");
      setActive("API与云端存储设置");
      return;
    }
    const batchBridge = bridge;
    if (!batchBridge) {
      notify("当前运行环境没有加载桌面桥接", "warning");
      return;
    }
    const pendingTasks = batchTasks.filter((task) => task.status !== "已完成" && task.status !== "生成中");
    if (pendingTasks.length === 0) {
      notify("没有待处理任务；可导入新任务或重试失败任务", "info");
      return;
    }
    if (pendingTasks.some((task) => !task.imagePath) && !batchBridge.generateImage) {
      notify("当前运行环境没有加载生图桥接", "warning");
      return;
    }
    if (pendingTasks.some((task) => task.imagePath) && !batchBridge.editImage) {
      notify("当前运行环境没有加载图片编辑桥接，无法执行批量图生图", "warning");
      return;
    }
    const batchSizeValidation = validateGptImage2Size(batchSize);
    if (!batchSizeValidation.ok) {
      notify(`批量输出尺寸不符合 gpt-image-2 要求：${batchSizeValidation.message}`, "warning");
      return;
    }
    const invalidSizeTasks = pendingTasks
      .map((task) => ({ task, validation: validateGptImage2Size(task.size ?? batchSizeValidation.value) }))
      .filter(({ validation }) => !validation.ok);
    if (invalidSizeTasks.length > 0) {
      const invalidIds = new Set(invalidSizeTasks.map(({ task }) => task.id));
      setBatchTasks((items) =>
        items.map((item) => {
          if (!invalidIds.has(item.id)) return item;
          const validation = validateGptImage2Size(item.size ?? batchSizeValidation.value);
          return { ...item, status: "失败", error: `尺寸不符合 gpt-image-2 要求：${validation.message}` };
        })
      );
      notify(`发现 ${invalidSizeTasks.length} 条任务尺寸无效，已标记失败，请修正后重试`, "warning");
      return;
    }

    setIsBatchRunning(true);
    batchControlRef.current = "running";
    setBatchControlStatus("running");
    let successCount = 0;
    let failureCount = 0;
    const getBatchControlStatus = () => batchControlRef.current as BatchControlStatus;

    try {
      for (const task of pendingTasks) {
        if (getBatchControlStatus() === "stopping") break;
        while (getBatchControlStatus() === "paused") {
          await sleep(300);
        }
        const startedAt = Date.now();
        setBatchTasks((items) =>
          items.map((item) =>
            item.id === task.id
              ? { ...item, status: "生成中", completedCount: 0, error: undefined, startedAt, completedAt: undefined }
              : item
          )
        );

        const generatedResults: GenerationResult[] = [];
        const newAssets: Asset[] = [];

        try {
          for (let index = task.completedCount ?? 0; index < task.count; index += 1) {
            if (getBatchControlStatus() === "stopping") {
              throw new Error("队列已停止");
            }
            while (getBatchControlStatus() === "paused") {
              await sleep(300);
            }
            const itemStartedAt = Date.now();
            const request = {
              prompt: task.prompt,
              size: task.size ?? batchSizeValidation.value,
              quality: "medium" as ImageQuality,
              output_format: "png" as ImageFormat,
              background: "auto" as ImageBackground
            };
            const taskSizeValidation = validateGptImage2Size(request.size);
            if (!taskSizeValidation.ok) {
              throw new Error(`任务尺寸不符合 gpt-image-2 要求：${taskSizeValidation.message}`);
            }
            request.size = taskSizeValidation.value;
            let response: { data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }> } | null = null;
            let lastError: unknown = null;
            for (let attempt = 0; attempt <= batchRetryLimit; attempt += 1) {
              try {
                response = task.imagePath
                  ? await batchBridge.editImage!({ ...request, imagePaths: [task.imagePath] })
                  : await batchBridge.generateImage!(request);
                break;
              } catch (error) {
                lastError = error;
                if (attempt >= batchRetryLimit) throw error;
                setBatchTasks((items) =>
                  items.map((item) => (item.id === task.id ? { ...item, retryCount: attempt + 1, error: `第 ${attempt + 1} 次失败，准备重试` } : item))
                );
                await sleep(800);
              }
            }
            const first = response?.data?.[0];
            const dataUrl = first?.b64_json ? `data:image/png;base64,${first.b64_json}` : first?.url;
            if (!dataUrl) {
              throw lastError instanceof Error ? lastError : new Error("接口没有返回图片数据");
            }

            const completedAt = Date.now();
            const dimensions = await readImageDimensions(dataUrl);
            const mimeType = dataUrlMime(dataUrl) ?? "image/png";
            const result: GenerationResult = {
              id: `batch-asset-${Date.now()}-${index}`,
              label: `${task.project}-${index + 1}`,
              dataUrl,
              status: "批量生成完成",
              source: task.imagePath ? "批量图生图" : "批量工坊",
              prompt: task.prompt,
              startedAt: itemStartedAt,
              completedAt,
              durationMs: completedAt - itemStartedAt,
              responseType: responseTypeFromData(dataUrl),
              mimeType,
              format: mimeType.replace("image/", ""),
              byteSize: dataUrlByteSize(dataUrl),
              width: dimensions.width || undefined,
              height: dimensions.height || undefined,
              requestSize: request.size,
              requestQuality: "medium",
              requestBackground: "auto",
              revisedPrompt: first?.revised_prompt,
              upload: { status: "未上传" }
            };

            if (batchBridge.saveImage) {
              const saved = await batchBridge.saveImage({ dataUrl, name: result.label });
              result.localPath = saved.path;
            }

            generatedResults.push(result);
            newAssets.push({
              id: result.id,
              name: result.label,
              project: task.industry,
              source: task.imagePath ? "批量图生图" : "批量工坊",
              cloudUrl: "未上传",
              prompt: task.prompt,
              status: "已生成",
              previewUrl: result.dataUrl,
              localPath: result.localPath
            });

            setBatchTasks((items) =>
              items.map((item) => (item.id === task.id ? { ...item, completedCount: index + 1 } : item))
            );
          }

          setResults((items) => [...items.filter((item) => item.status !== "empty"), ...generatedResults]);
          setSelectedResultId(generatedResults[0]?.id ?? selectedResultId);
          setAssets((items) => [...newAssets, ...items]);
          successCount += generatedResults.length;
          setBatchTasks((items) =>
            items.map((item) =>
              item.id === task.id
                ? { ...item, status: "已完成", completedCount: generatedResults.length, retryCount: 0, completedAt: Date.now() }
                : item
            )
          );
        } catch (error) {
          failureCount += 1;
          if (generatedResults.length > 0) {
            setResults((items) => [...items.filter((item) => item.status !== "empty"), ...generatedResults]);
            setSelectedResultId(generatedResults[0]?.id ?? selectedResultId);
            setAssets((items) => [...newAssets, ...items]);
            successCount += generatedResults.length;
          }
          const message = error instanceof Error ? error.message : "未知错误";
          setBatchTasks((items) =>
            items.map((item) =>
              item.id === task.id
                ? { ...item, status: message === "队列已停止" ? "已导入" : "失败", completedCount: generatedResults.length, error: message === "队列已停止" ? undefined : message, completedAt: Date.now() }
                : item
            )
          );
          notify(message === "队列已停止" ? "批量队列已停止，未完成任务保留在队列中" : `${task.project} 生成失败：${message}`, "warning");
          if (message === "队列已停止") break;
        }
      }
      notify(getBatchControlStatus() === "stopping" ? `批量队列已停止：已成功 ${successCount} 张，失败 ${failureCount} 条` : `批量队列处理完成：成功 ${successCount} 张，失败 ${failureCount} 条`, failureCount ? "warning" : "success");
    } finally {
      setIsBatchRunning(false);
      batchControlRef.current = "idle";
      setBatchControlStatus("idle");
    }
  }

  function pauseBatchQueue() {
    if (batchControlRef.current !== "running") {
      notify("当前没有正在运行的批量队列", "info");
      return;
    }
    batchControlRef.current = "paused";
    setBatchControlStatus("paused");
    notify("批量队列已暂停，当前请求完成后会停在下一步", "info");
  }

  function stopBatchQueue() {
    if (batchControlRef.current === "idle") {
      notify("当前没有正在运行的批量队列", "info");
      return;
    }
    batchControlRef.current = "stopping";
    setBatchControlStatus("stopping");
    notify("正在停止批量队列，当前请求完成后停止", "warning");
  }

  function applyRetouchTool(toolId: string) {
    const preset = retouchToolPresets.find((item) => item.id === toolId) ?? retouchToolPresets[0];
    setSelectedRetouchToolId(preset.id);
    setPromptText(preset.prompt);
    setAvoidText(preset.avoid);
    setGenerationParams((params) => ({ ...params, ...preset.params, prompt: preset.prompt, avoid: preset.avoid }));
    if (active !== "AI修图工具箱") {
      setActive("AI修图工具箱");
    }
    notify(`${preset.title} 已载入专业修图参数${editSourcePaths.length ? "" : "，请先选择底图"}`, editSourcePaths.length ? "info" : "warning");
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark">云</div>
          <div>
            <div className="brandTitle">云桥Pro</div>
            <div className="brandSub">AI 商用生图工作台</div>
          </div>
        </div>

        <div className="globalSearch">
          <Search size={16} />
          <input
            value={globalQuery}
            onChange={(event) => setGlobalQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleGlobalSearch();
            }}
            placeholder="搜索模板、项目、关键词、历史作品"
          />
          <button className="iconButton compactSearchButton" aria-label="搜索" onClick={handleGlobalSearch}>
            <Search size={15} />
          </button>
        </div>

        <div className="topActions">
          <button className="modelButton" onClick={() => notify("当前固定模型：gpt-image-2")}>
            gpt-image-2
            <ChevronDown size={14} />
          </button>
          <button className="siteButton" onClick={openOfficialSite}>
            <ExternalLink size={15} />
            0029.org
          </button>
          <button className="quotaButton" onClick={() => setActive("API与云端存储设置")}>
            <Gauge size={16} />
            {apiKeySaved ? "API Key 已保存" : "配置 API Key"}
          </button>
          <button className="iconButton" aria-label="检查更新" onClick={() => checkForUpdates()}>
            <Download size={18} />
          </button>
          <button className="iconButton" aria-label="云同步" onClick={() => notify(storages.length ? "云端同步队列为空" : "请先配置云端存储", storages.length ? "info" : "warning")}>
            <Cloud size={18} />
          </button>
        </div>
      </header>

      <aside className="sidebar">
        <NavGroup title="生产" group="create" active={active} onChange={setActive} />
        <NavGroup title="资产" group="assets" active={active} onChange={setActive} />
        <NavGroup title="系统" group="system" active={active} onChange={setActive} />

        <div className="sideStatus">
          <div>
            <span>云端上传</span>
            <strong>{storages.length ? `${storages[0].name}` : "未连接"}</strong>
          </div>
          <div className={`statusDot ${storages.length ? "ok" : ""}`} />
        </div>
      </aside>

      <section className="workspace">
        <div className="pageHead">
          <div>
            <div className="eyebrow">Yunqiao Pro Console</div>
            <h1>{active}</h1>
            <p>{currentHint}</p>
          </div>
          <div className="pageActions">
            <button className="secondaryButton" onClick={() => setModal({ kind: "history" })}>
              <History size={16} />
              历史记录
            </button>
            {isCreatorActive ? (
              <button className="primaryButton" onClick={generateImages} disabled={isGenerating}>
                <Sparkles size={16} />
                {creatorGenerateLabel(active, isGenerating)}
              </button>
            ) : (
              <button className="primaryButton" onClick={() => setActive("文生图创作")}>
                <Play size={16} />
                新建任务
              </button>
            )}
          </div>
        </div>

        {active === "工作台" ? (
          <DashboardPage onOpen={setActive} onUseTemplate={useTemplate} templateCount={allTemplates.length} assetCount={assets.length} storageCount={storages.length} batchCount={batchTasks.length} />
        ) : creatorPages.has(active) ? (
          <CreatorPage
            active={active}
            selectedTemplate={selectedTemplate}
            promptText={promptText}
            avoidText={avoidText}
            variableValues={variableValues}
            templates={allTemplates}
            currentProject={currentProject}
            onProjectChange={setCurrentProject}
            onTemplateChange={(template) => {
              syncTemplateToCreator(template);
            }}
            onPromptChange={setPromptText}
            onAvoidChange={setAvoidText}
            onVariableChange={(key, value) => setVariableValues((values) => ({ ...values, [key]: value }))}
            params={generationParams}
            results={results}
            selectedResultId={selectedResultId}
            stageView={stageView}
            isGenerating={isGenerating}
            selectedRetouchToolId={selectedRetouchToolId}
            retouchTools={retouchToolPresets}
            editSourceCount={editSourcePaths.length}
            onParamsChange={(patch) => setGenerationParams((params) => ({ ...params, ...patch }))}
            onResultSelect={setSelectedResultId}
            onResultPreview={(result) => setModal({ kind: "image-preview", result })}
            onStageViewChange={setStageView}
            onContinueEdit={continueSelectedResult}
            onRetouchSelected={retouchSelectedResult}
            onOpenMaskEditor={() => {
              const selected = results.find((item) => item.id === selectedResultId && item.dataUrl) ?? results.find((item) => item.dataUrl);
              if (!selected?.dataUrl) {
                notify("请先载入或选择一张图片后再绘制遮罩", "warning");
                return;
              }
              setModal({ kind: "mask-editor", result: selected });
            }}
            onClearMask={() => {
              setRetouchMaskPath(null);
              notify("已清除当前遮罩", "info");
            }}
            maskReady={Boolean(retouchMaskPath)}
            onClearEditSource={clearEditSourceImages}
            onSaveImage={saveSelectedImage}
            onUploadSelected={uploadSelectedResult}
            onCopyImage={() => copyImageToClipboard(results.find((item) => item.id === selectedResultId) ?? results.find((item) => item.dataUrl))}
            onOpenFileLocation={() => openSelectedFileLocation(results.find((item) => item.id === selectedResultId) ?? results.find((item) => item.localPath))}
            onChooseSourceImage={chooseEditSourceImage}
            onApplyRetouchTool={applyRetouchTool}
            onGenerate={generateImages}
            onCopy={copyText}
            onNotify={notify}
          />
        ) : active === "批量生产工坊" ? (
          <BatchPage
            tasks={batchTasks}
            batchSize={batchSize}
            isRunning={isBatchRunning}
            controlStatus={batchControlStatus}
            retryLimit={batchRetryLimit}
            onBatchSizeChange={setBatchSize}
            onRetryLimitChange={setBatchRetryLimit}
            onImport={importBatchExcel}
            onExportTemplate={exportBatchTemplate}
            onExportLog={exportBatchLog}
            onBindFolder={bindBatchImageFolder}
            onCreateSamples={addSampleBatchTasks}
            onStart={startBatchQueue}
            onPause={pauseBatchQueue}
            onStop={stopBatchQueue}
            onChooseImage={async (taskId) => {
              if (!bridge?.chooseImages) {
                notify("当前运行环境不支持选择本地图片，请使用桌面客户端", "warning");
                return;
              }
              const images = await bridge.chooseImages();
              const first = images[0];
              if (!first) return;
              setBatchTasks((items) =>
                items.map((item) =>
                  item.id === taskId
                    ? { ...item, imagePath: first.path, imageName: first.name, status: item.status === "失败" ? "已导入" : item.status, error: undefined }
                    : item
                )
              );
              notify(`已为批量任务绑定底图：${first.name}`);
            }}
            onClearImage={(taskId) => {
              setBatchTasks((items) => items.map((item) => (item.id === taskId ? { ...item, imagePath: undefined, imageName: undefined } : item)));
              notify("已清除该批量任务底图", "info");
            }}
            onRetryFailed={() => {
              const hasFailed = batchTasks.some((task) => task.status === "失败");
              if (!hasFailed) {
                notify("当前没有失败任务可重试", "info");
                return;
              }
              setBatchTasks((items) =>
                items.map((item) =>
                  item.status === "失败" ? { ...item, status: "已导入", error: undefined, completedCount: 0 } : item
                )
              );
              notify("失败任务已重新加入队列");
            }}
            onClearCompleted={() => {
              setBatchTasks((items) => items.filter((item) => item.status !== "已完成"));
              notify("已清理完成任务", "info");
            }}
            onRemove={(taskId) => {
              setBatchTasks((items) => items.filter((item) => item.id !== taskId));
              notify("已移除批量任务", "info");
            }}
          />
        ) : active === "行业模板库" ? (
          <TemplatePage
            templates={allTemplates}
            onUse={useTemplate}
            onPreview={(template) => setModal({ kind: "template", template })}
            onCopy={copyText}
            onCreate={() => setModal({ kind: "template-editor" })}
            onEdit={(template) => setModal({ kind: "template-editor", template })}
            onImport={importTemplatePack}
            onExport={exportTemplatePack}
          />
        ) : active === "作品素材库" ? (
          <AssetPage
            assets={assets}
            onOpenFolder={openSaveDirectory}
            onCopy={copyText}
            onPreview={(asset) => {
              if (!asset.previewUrl) {
                notify("该作品没有可预览图片", "warning");
                return;
              }
              setModal({
                kind: "image-preview",
                result: {
                  id: asset.id,
                  label: asset.name,
                  dataUrl: asset.previewUrl,
                  localPath: asset.localPath,
                  status: asset.status,
                  source: asset.source,
                  prompt: asset.prompt,
                  upload: asset.cloudUrl && asset.cloudUrl !== "未上传" ? { status: "已上传", url: asset.cloudUrl } : { status: "未上传" }
                }
              });
            }}
            onOpenLocation={async (asset) => {
              if (!asset.localPath) {
                notify("该作品没有本地文件路径", "warning");
                return;
              }
              await openSelectedFileLocation({ id: asset.id, label: asset.name, status: asset.status, localPath: asset.localPath });
            }}
            onUpload={uploadAsset}
            onBatchExport={exportUrlList}
            onPack={createAssetZip}
            onEdit={(asset) => {
              setPromptText(asset.prompt);
              setAvoidText(selectedTemplate.avoid);
              setResults([
                {
                  id: asset.id,
                  label: asset.name,
                  dataUrl: asset.previewUrl,
                  localPath: asset.localPath,
                  status: "从作品库载入"
                }
              ]);
              setEditSourcePaths(asset.localPath ? [asset.localPath] : []);
              setSelectedResultId(asset.id);
              setActive("图生图与局部重绘");
              notify(asset.localPath ? "作品已载入图生图编辑页" : "作品已载入预览；缺少本地原图时需重新选择底图才能调用编辑接口", asset.localPath ? "success" : "warning");
            }}
            onRetouch={(asset) => {
              const preset = retouchToolPresets.find((item) => item.id === selectedRetouchToolId) ?? retouchToolPresets[0];
              setPromptText(preset.prompt);
              setAvoidText(preset.avoid);
              setGenerationParams((params) => ({ ...params, ...preset.params, prompt: preset.prompt, avoid: preset.avoid }));
              setResults([
                {
                  id: asset.id,
                  label: asset.name,
                  dataUrl: asset.previewUrl,
                  localPath: asset.localPath,
                  status: "从作品库载入",
                  source: "作品素材库"
                }
              ]);
              setEditSourcePaths(asset.localPath ? [asset.localPath] : []);
              setSelectedResultId(asset.id);
              setActive("AI修图工具箱");
              notify(asset.localPath ? "作品已载入 AI 修图工具箱" : "作品缺少本地原图，请重新选择底图后再修图", asset.localPath ? "success" : "warning");
            }}
            onDetail={(asset) => setModal({ kind: "asset", asset })}
          />
        ) : (
          <SettingsPage
            apiKey={apiKey}
            apiBaseUrl={apiBaseUrl}
            apiDiagnostic={apiDiagnostic}
            storages={storages}
            storageDraft={storageDraft}
            saveDirectory={saveDirectory}
            requestTimeoutSeconds={requestTimeoutSeconds}
            autoCheckUpdates={autoCheckUpdates}
            skippedUpdateVersion={skippedUpdateVersion}
            onApiKeyChange={setApiKey}
            onTestApi={testApiConnection}
            onRequestTimeoutChange={setRequestTimeoutSeconds}
            onAutoCheckUpdatesChange={changeAutoCheckUpdates}
            onClearSkippedUpdateVersion={clearSkippedUpdateVersion}
            onSaveApiKey={saveApiKey}
            onSaveRequestTimeout={saveRequestTimeout}
            onChooseSaveDirectory={chooseSaveDirectory}
            onOpenSaveDirectory={openSaveDirectory}
            onStorageDraftChange={(patch) => setStorageDraft((draft) => ({ ...draft, ...patch }))}
            onStorageTypeChange={(type) => {
              setStorageDraft((draft) => makeStorageDraft(type, { mode: draft.mode, autoUpload: draft.autoUpload }));
              notify(`已切换为 ${type} 配置表单`, "info");
            }}
            onAddStorage={saveStorageDraft}
            onTestDraft={testStorageDraft}
            onTestStorage={async (profile) => {
              if (!bridge?.testStorage) {
                notify("当前窗口不支持网络连通性测试，请使用桌面客户端", "warning");
                return;
              }
              const [hostPart, portPart] = profile.endpoint.split(":");
              const result = await bridge.testStorage({
                type: profile.type,
                endpoint: profile.endpoint,
                host: hostPart,
                port: portPart
              });
              const nextStorages = storages.map((item) =>
                item.id === profile.id ? { ...item, status: result.ok ? "连接正常" as const : "连接异常" as const } : item
              );
              void persistStorages(nextStorages);
              notify(`${profile.name} ${result.message}`, result.ok ? "success" : "warning");
            }}
            onTestStorageUpload={async (profile) => {
              if (!bridge?.testStorageUpload) {
                notify("当前窗口不支持真实上传测试，请使用桌面客户端", "warning");
                return;
              }
              try {
                const result = await bridge.testStorageUpload(profile);
                notify(`上传测试成功：${result.url}`);
              } catch (error) {
                const message = error instanceof Error ? error.message : "未知错误";
                notify(`上传测试失败：${message}`, "warning");
              }
            }}
            onSetDefault={(profile) => {
              const nextStorages = storages.map((item) => ({ ...item, status: item.id === profile.id ? "默认通道" as const : "连接正常" as const }));
              void persistStorages(nextStorages);
              notify(`${profile.name} 已设为默认上传通道`);
            }}
          />
        )}
      </section>

  <footer className="statusbar">
        <span>API: {apiKeySaved ? "已配置" : "未配置"}</span>
        <span>队列: {queuedCount}</span>
        <span>云端: {storages.length ? storages[0].name : "未连接"}</span>
        <span>作品: {assets.length}</span>
      </footer>

      <ToastStack toasts={toasts} />
      {modal?.kind === "template" && <TemplateModal template={modal.template} onClose={() => setModal(null)} onUse={useTemplate} onCopy={copyText} />}
      {modal?.kind === "template-editor" && (
        <TemplateEditorModal
          template={modal.template}
          onClose={() => setModal(null)}
          onSave={(template) => {
            saveCustomTemplate(template);
            setModal(null);
          }}
        />
      )}
      {modal?.kind === "history" && <HistoryModal assets={assets} results={results} onClose={() => setModal(null)} />}
      {modal?.kind === "asset" && <AssetModal asset={modal.asset} onClose={() => setModal(null)} onCopy={copyText} />}
      {modal?.kind === "image-preview" && <ImagePreviewModal result={modal.result} onClose={() => setModal(null)} onCopy={copyText} />}
      {modal?.kind === "update" && (
        <UpdateModal
          result={modal.result}
          automatic={modal.automatic}
          onClose={() => setModal(null)}
          onOpen={async () => {
            await openUpdateTarget(modal.result);
            setModal(null);
          }}
          onOpenRelease={async () => {
            if (!modal.result.releaseUrl || !bridge?.openExternal) return;
            await bridge.openExternal(modal.result.releaseUrl);
          }}
          onCopy={copyText}
          onSkip={() => skipUpdateVersion(modal.result)}
        />
      )}
      {modal?.kind === "mask-editor" && (
        <MaskEditorModal
          result={modal.result}
          onClose={() => setModal(null)}
          onSave={async (maskDataUrl) => {
            if (!bridge?.saveTempImage) {
              notify("当前运行环境不支持保存遮罩，请使用桌面客户端", "warning");
              return;
            }
            const saved = await bridge.saveTempImage({ dataUrl: maskDataUrl, name: `${modal.result.label}-mask` });
            setRetouchMaskPath(saved.path);
            setModal(null);
            notify("遮罩已保存，本次修图会优先编辑画笔区域");
          }}
        />
      )}
    </main>
  );
}

function NavGroup({
  title,
  group,
  active,
  onChange
}: {
  title: string;
  group: NavItem["group"];
  active: string;
  onChange: (label: string) => void;
}) {
  return (
    <div className="navGroup">
      <div className="navGroupTitle">{title}</div>
      {navItems
        .filter((item) => item.group === group)
        .map((item) => {
          const Icon = item.icon;
          return (
            <button className={`navItem ${active === item.label ? "active" : ""}`} key={item.label} onClick={() => onChange(item.label)}>
              <Icon size={17} />
              <span>{item.label}</span>
            </button>
          );
        })}
    </div>
  );
}

function DashboardPage({
  onOpen,
  onUseTemplate,
  templateCount,
  assetCount,
  storageCount,
  batchCount
}: {
  onOpen: (label: string) => void;
  onUseTemplate: (template: Template) => void;
  templateCount: number;
  assetCount: number;
  storageCount: number;
  batchCount: number;
}) {
  const quickEntries = [
    ["电商主图", "白底图、场景图、详情页卖点图", "ecom_white"],
    ["短剧封面", "竖版海报、角色定妆、分镜气氛图", "short_cover"],
    ["小红书封面", "种草底图、知识卡片、直播背景", "media_xhs"],
    ["餐饮门店", "菜品主图、套餐海报、门店宣传", "ecom_food"],
    ["品牌广告", "KV、节日营销、活动物料", "brand_kv"],
    ["工业 B2B", "设备图、工厂图、展会招商", "b2b_equipment"],
    ["教育课程", "课程封面、招生海报、儿童绘本", "education_cover"],
    ["本地生活", "探店、楼盘、公寓展示", "realestate_local_shop"]
  ];

  return (
    <div className="dashboardLayout">
      <section className="metricStrip">
        {[
          ["作品数量", String(assetCount), assetCount ? "已写入作品素材库" : "等待首次生成"],
          ["批量队列", String(batchCount), batchCount ? "可开始生产" : "等待导入任务"],
          ["云端通道", String(storageCount), storageCount ? "默认通道已保存" : "未连接存储"],
          ["行业模板", String(templateCount), "多行业提示词已就绪"]
        ].map(([title, value, note]) => (
          <div className="metricItem" key={title}>
            <span>{title}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </div>
        ))}
      </section>

      <section className="panel workflowPanel">
        <div className="panelHeader">
          <div>
            <h2>常用生产流</h2>
            <p>按业务场景快速进入，所有入口都有明确响应。</p>
          </div>
        </div>
        <div className="workflowGrid">
          {quickEntries.map(([title, desc, templateId]) => (
            <button className="workflowItem" key={title} onClick={() => onUseTemplate(templateLibrary.find((item) => item.id === templateId) ?? templateLibrary[0])}>
              <span>{title}</span>
              <small>{desc}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel queuePanel">
        <div className="panelHeader">
          <h2>最近任务</h2>
          <div className="buttonRow">
            <button className="ghostButton" onClick={() => onOpen("批量生产工坊")}>批量工坊</button>
            <button className="ghostButton" onClick={() => onOpen("作品素材库")}>查看全部</button>
          </div>
        </div>
        <DataTable
          columns={["任务", "类型", "状态", "更新时间"]}
          rows={[
            ["电商主图测试", "文生图", "待配置 API", "刚刚"],
            ["短剧封面模板", "模板", "可使用", "今天"],
            ["OSS 上传通道", "设置", storageCount ? "已配置" : "未配置", "今天"]
          ]}
        />
      </section>
    </div>
  );
}

function CreatorPage({
  active,
  selectedTemplate,
  promptText,
  avoidText,
  variableValues,
  templates,
  currentProject,
  params,
  results,
  selectedResultId,
  stageView,
  isGenerating,
  selectedRetouchToolId,
  retouchTools,
  editSourceCount,
  maskReady,
  onProjectChange,
  onTemplateChange,
  onPromptChange,
  onAvoidChange,
  onVariableChange,
  onParamsChange,
  onResultSelect,
  onResultPreview,
  onStageViewChange,
  onContinueEdit,
  onRetouchSelected,
  onOpenMaskEditor,
  onClearMask,
  onClearEditSource,
  onSaveImage,
  onUploadSelected,
  onCopyImage,
  onOpenFileLocation,
  onChooseSourceImage,
  onApplyRetouchTool,
  onGenerate,
  onCopy,
  onNotify
}: {
  active: string;
  selectedTemplate: Template;
  promptText: string;
  avoidText: string;
  variableValues: VariableValues;
  templates: Template[];
  currentProject: string;
  params: GenerationParams;
  results: GenerationResult[];
  selectedResultId: string | null;
  stageView: StageView;
  isGenerating: boolean;
  selectedRetouchToolId: string;
  retouchTools: RetouchToolPreset[];
  editSourceCount: number;
  maskReady: boolean;
  onProjectChange: (value: string) => void;
  onTemplateChange: (template: Template) => void;
  onPromptChange: (value: string) => void;
  onAvoidChange: (value: string) => void;
  onVariableChange: (key: string, value: string) => void;
  onParamsChange: (patch: Partial<GenerationParams>) => void;
  onResultSelect: (id: string) => void;
  onResultPreview: (result: GenerationResult) => void;
  onStageViewChange: (view: StageView) => void;
  onContinueEdit: () => void;
  onRetouchSelected: () => void;
  onOpenMaskEditor: () => void;
  onClearMask: () => void;
  onClearEditSource: () => void;
  onSaveImage: () => void;
  onUploadSelected: () => void;
  onCopyImage: () => void;
  onOpenFileLocation: () => void;
  onChooseSourceImage: () => void;
  onApplyRetouchTool: (toolId: string) => void;
  onGenerate: () => void;
  onCopy: (text: string, label: string) => void;
  onNotify: (message: string, type?: Toast["type"]) => void;
}) {
  const isEdit = active !== "文生图创作";
  const isRetouch = active === "AI修图工具箱";
  const templateVariables = getTemplateVariables(selectedTemplate);
  const finalPrompt = fillPromptVariables(promptText, variableValues);
  const finalAvoid = fillPromptVariables(avoidText, variableValues);
  const selectedRetouchTool = retouchTools.find((tool) => tool.id === selectedRetouchToolId) ?? retouchTools[0];
  const filledResults: GenerationResult[] = results.length > 0 ? results : Array.from({ length: 1 }, (_, index) => ({
    id: `placeholder-${index}`,
    label: `等待生成 ${index + 1}`,
    status: "empty"
  }));
  const selectedResult = filledResults.find((item) => item.id === selectedResultId);
  const previousImageResult = [...filledResults]
    .reverse()
    .find((item) => item.id !== selectedResult?.id && isImageResult(item));
  const sizeOptions = useMemo(
    () => Array.from(new Set([...COMMON_IMAGE_SIZES, ...templates.map((item) => item.size)])),
    [templates]
  );

  return (
    <div className="creatorLayout">
      <section className="panel composerPanel">
        <div className="panelHeader">
          <div>
            <h2>{isEdit ? "编辑描述" : "提示词编排"}</h2>
            <p>{isEdit ? "说明保留内容与修改目标。" : "行业模板会自动补齐商业输出约束。"}</p>
          </div>
          <BadgeCheck size={18} className="goodIcon" />
        </div>

        <label>
          项目名称
          <input value={currentProject} onChange={(event) => onProjectChange(event.target.value)} placeholder="例如 店铺名 / 短剧项目 / 客户名称" />
        </label>

        <label>
          行业模板
          <select value={selectedTemplate.id} onChange={(event) => onTemplateChange(templates.find((item) => item.id === event.target.value) ?? templates[0])}>
            {templates.map((template) => (
              <option value={template.id} key={template.id}>
                {template.industry} / {template.scene}
              </option>
            ))}
          </select>
        </label>
        <div className="templateSummary">
          <span>{selectedTemplate.industry}</span>
          <strong>{selectedTemplate.scene}</strong>
          <small>{selectedTemplate.tags.join(" / ")}</small>
        </div>

        {templateVariables.length > 0 && (
          <div className="variablePanel">
            <div className="miniHeader">
              <strong>业务信息</strong>
              <span>{templateVariables.length} 项会自动写入提示词</span>
            </div>
            <div className="variableGrid">
              {templateVariables.map((key) => {
                const meta = variableMeta[key] ?? { label: key, placeholder: `填写 ${key}`, defaultValue: "" };
                return (
                  <label key={key}>
                    {meta.label}
                    <input value={variableValues[key] ?? ""} onChange={(event) => onVariableChange(key, event.target.value)} placeholder={meta.placeholder} />
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {isEdit && (
          <button className="uploadDrop" onClick={onChooseSourceImage}>
            <UploadCloud size={20} />
            <span>{isRetouch ? "选择要修的原图，或从作品库继续编辑" : "选择底图或从作品库载入"}</span>
          </button>
        )}

        {isRetouch && (
          <>
            <div className={`sourceStatus ${editSourceCount ? "ready" : ""}`}>
              <div>
                <strong>{editSourceCount ? `已载入 ${editSourceCount} 张底图` : "未载入修图底图"}</strong>
                <span>{editSourceCount ? "可以直接开始修图，生成后会自动接入下一轮编辑" : "先选择本地原图，或从结果区载入当前图片"}</span>
              </div>
              <button onClick={onClearEditSource} disabled={!editSourceCount}>清空</button>
            </div>
            <div className="maskToolRow">
              <button className={maskReady ? "secondaryButton activeSoft" : "secondaryButton"} onClick={onOpenMaskEditor} disabled={!selectedResult?.dataUrl}>
                <Brush size={15} />
                {maskReady ? "遮罩已就绪" : "绘制局部遮罩"}
              </button>
              <button className="secondaryButton" onClick={onClearMask} disabled={!maskReady}>
                <Trash2 size={15} />
                清除遮罩
              </button>
            </div>
            <div className="toolShelf">
              {retouchTools.map((tool) => (
                <button
                  className={selectedRetouchToolId === tool.id ? "activeTool" : ""}
                  key={tool.id}
                  onClick={() => onApplyRetouchTool(tool.id)}
                >
                  <Brush size={14} />
                  <span>
                    <strong>{tool.title}</strong>
                    <small>{tool.hint}</small>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        <label>
          主体与目标
          <textarea value={promptText} onChange={(event) => onPromptChange(event.target.value)} />
        </label>
        <label>
          避免内容
          <textarea className="compactTextarea" value={avoidText} onChange={(event) => onAvoidChange(event.target.value)} />
        </label>
        <button className="secondaryButton wide" onClick={() => onCopy(`${finalPrompt}\n避免内容：${finalAvoid}`, "完整提示词")}>
          <Copy size={15} />
          复制完整提示词
        </button>
      </section>

      <section className="stagePanel">
        <div className="stageToolbar">
          <div className="segmented">
            {[
              ["grid", "结果网格"],
              ["compare", "对比"],
              ["chain", "迭代链"]
            ].map(([view, label]) => (
              <button className={stageView === view ? "active" : ""} key={view} onClick={() => onStageViewChange(view as StageView)}>
                {label}
              </button>
            ))}
          </div>
          <div className="previewActions">
            <button
              className="secondaryButton"
              onClick={onCopyImage}
            >
              <Clipboard size={15} />
              复制图片
            </button>
            <button className="secondaryButton" onClick={onOpenFileLocation}>
              <FolderOpen size={15} />
              文件位置
            </button>
            <button className="secondaryButton" onClick={onSaveImage}>
              <Download size={15} />
              保存图片
            </button>
            <button className="secondaryButton" onClick={onUploadSelected}>
              <UploadCloud size={15} />
              上传云端
            </button>
          </div>
        </div>
        <div className={`resultGrid ${filledResults.length === 1 ? "singleResult" : ""}`}>
          {filledResults.map((item, index) => (
            <button
              className={`resultTile ${item.dataUrl ? "hasImage" : ""} ${selectedResultId === item.id ? "selected" : ""}`}
              key={item.id}
              onClick={() => {
                onResultSelect(item.id);
                if (item.dataUrl) {
                  onResultPreview(item);
                  return;
                }
                onNotify(`已选中：${item.label}`, "info");
              }}
            >
              {item.dataUrl ? <img src={item.dataUrl} alt={item.label} /> : <ImagePlus size={24} />}
              <span>{isGenerating ? `生成中 ${index + 1}` : item.label}</span>
            </button>
          ))}
        </div>
        <StageDetailPanel
          view={stageView}
          selectedResult={selectedResult}
          previousResult={previousImageResult}
          results={filledResults}
          onCopy={onCopy}
        />
        <div className="stageFooter">
          <span>生成后可继续图生图或送入 AI 修图，保留完整参数快照。</span>
          <div className="buttonRow">
            <button className="secondaryButton" onClick={onContinueEdit}>
              <WandSparkles size={16} />
              继续图生图
            </button>
            <button className="primaryButton" onClick={onRetouchSelected}>
              <Brush size={16} />
              载入 AI 修图
            </button>
          </div>
        </div>
      </section>

      <aside className="panel inspectorPanel">
        <div className="panelHeader">
          <h2>参数检查器</h2>
          <div className="inspectorHeaderActions">
            <button className="primaryButton compactPrimary" onClick={onGenerate} disabled={isGenerating}>
              <Sparkles size={15} />
              {creatorGenerateLabel(active, isGenerating)}
            </button>
            <SlidersHorizontal size={18} />
          </div>
        </div>
        <label>
          尺寸
          <ImageSizeControl
            value={params.size}
            options={sizeOptions}
            onChange={(size) => onParamsChange({ size })}
          />
        </label>
        <label>
          质量
          <select value={params.quality} onChange={(event) => onParamsChange({ quality: event.target.value as ImageQuality })}>
            <option>auto</option>
            <option>low</option>
            <option>medium</option>
            <option>high</option>
          </select>
        </label>
        <label>
          输出格式
          <select value={params.outputFormat} onChange={(event) => onParamsChange({ outputFormat: event.target.value as ImageFormat })}>
            <option>png</option>
            <option>jpeg</option>
            <option>webp</option>
          </select>
        </label>
        <label>
          背景
          <select value={params.background} onChange={(event) => onParamsChange({ background: event.target.value as ImageBackground })}>
            <option>auto</option>
            <option>opaque</option>
          </select>
        </label>
        <div className="paramGroup">
          <div>
            <span>上传模式</span>
            <strong>本地自动保存</strong>
          </div>
          <div>
            <span>出图数量</span>
            <strong>单张</strong>
          </div>
          {isRetouch && selectedRetouchTool && (
            <div>
              <span>当前修图工具</span>
              <strong>{selectedRetouchTool.title}</strong>
            </div>
          )}
          <div>
            <span>当前行业</span>
            <strong>{selectedTemplate.industry}</strong>
          </div>
        </div>
        <div className="promptPreviewBox">
          <strong>最终提示词预览</strong>
          <p>{finalPrompt}</p>
        </div>
        <button className="primaryButton wide" onClick={onGenerate} disabled={isGenerating}>
          <Sparkles size={16} />
          {creatorGenerateLabel(active, isGenerating)}
        </button>
      </aside>
    </div>
  );
}

function StageDetailPanel({
  view,
  selectedResult,
  previousResult,
  results,
  onCopy
}: {
  view: StageView;
  selectedResult?: GenerationResult;
  previousResult?: GenerationResult;
  results: GenerationResult[];
  onCopy: (text: string, label: string) => void;
}) {
  if (view === "compare") {
    return <ComparePanel selectedResult={selectedResult} previousResult={previousResult} />;
  }
  if (view === "chain") {
    return <IterationChainPanel results={results} />;
  }
  return <ResultInfoPanel result={selectedResult} onCopy={onCopy} />;
}

function ImageSizeControl({
  value,
  options = COMMON_IMAGE_SIZES,
  onChange
}: {
  value: ImageSize;
  options?: ImageSize[];
  onChange: (size: ImageSize) => void;
}) {
  const normalizedOptions = useMemo(() => Array.from(new Set(options)), [options]);
  const isKnownSize = normalizedOptions.includes(value);
  const [draft, setDraft] = useState<CustomSizeDraft>(() => makeCustomSizeDraft(value));

  useEffect(() => {
    setDraft(makeCustomSizeDraft(value));
  }, [value]);

  const selectedMode = draft.enabled || !isKnownSize ? "custom" : value;
  const previewSize = draft.enabled ? customSizeValue(draft) : value;
  const validation = validateGptImage2Size(previewSize);
  const hint = validation.ok ? imageSizeHint(previewSize) : validation.message;

  function updateCustomSize(patch: Partial<CustomSizeDraft>) {
    setDraft((current) => {
      const next = { ...current, ...patch, enabled: true };
      const nextValue = customSizeValue(next);
      onChange(nextValue);
      return next;
    });
  }

  return (
    <div className="sizeControl">
      <select
        value={selectedMode}
        onChange={(event) => {
          const next = event.target.value;
          if (next === "custom") {
            const nextDraft = makeCustomSizeDraft(value);
            nextDraft.enabled = true;
            setDraft(nextDraft);
            onChange(customSizeValue(nextDraft));
            return;
          }
          setDraft(makeCustomSizeDraft(next as ImageSize));
          onChange(next as ImageSize);
        }}
      >
        {normalizedOptions.map((size) => (
          <option value={size} key={size}>{size === "auto" ? "auto 自动" : size}</option>
        ))}
        <option value="custom">自定义尺寸</option>
      </select>
      {selectedMode === "custom" && (
        <div className="customSizeGrid">
          <input
            type="number"
            min={16}
            max={2048}
            step={16}
            value={draft.width}
            onChange={(event) => updateCustomSize({ width: event.target.value })}
            aria-label="自定义宽度"
          />
          <span>x</span>
          <input
            type="number"
            min={16}
            max={2048}
            step={16}
            value={draft.height}
            onChange={(event) => updateCustomSize({ height: event.target.value })}
            aria-label="自定义高度"
          />
        </div>
      )}
      <small className={`sizeHint ${validation.ok ? "" : "warningText"}`}>{hint}</small>
    </div>
  );
}

function ResultInfoPanel({ result, onCopy }: { result?: GenerationResult; onCopy: (text: string, label: string) => void }) {
  if (!result) {
    return <div className="resultInfoPanel emptyInfo">暂无结果。生成、编辑或载入底图后，这里会显示接口状态、耗时、图片信息、本地路径和云端 URL。</div>;
  }

  const upload = result.upload;
  return (
    <section className="resultInfoPanel">
      <div className="miniHeader">
        <strong>运行结果</strong>
        <span>{result.status}</span>
      </div>
      <div className="infoGrid">
        <InfoMetric label="状态" value={result.error ? "失败" : result.status} tone={result.error ? "warning" : "success"} />
        <InfoMetric label="来源" value={result.source ?? "未记录"} />
        <InfoMetric label="耗时" value={formatDuration(result.durationMs)} />
        <InfoMetric label="完成时间" value={formatTime(result.completedAt)} />
        <InfoMetric label="返回类型" value={result.responseType ?? "未记录"} />
        <InfoMetric label="图片类型" value={result.mimeType ?? result.format ?? "未知"} />
        <InfoMetric label="图片尺寸" value={result.width && result.height ? `${result.width} x ${result.height}` : result.requestSize ?? "未知"} />
        <InfoMetric label="文件大小" value={formatBytes(result.byteSize)} />
        <InfoMetric label="质量" value={result.requestQuality ?? "未记录"} />
        <InfoMetric label="背景" value={result.requestBackground ?? "未记录"} />
      </div>

      {result.error && (
        <div className="logBox warningLog">
          <strong>错误信息</strong>
          <p>{result.error}</p>
        </div>
      )}

      {result.revisedPrompt && (
        <div className="logBox">
          <strong>模型优化提示词</strong>
          <p>{result.revisedPrompt}</p>
        </div>
      )}

      <div className="pathList">
        <PathRow label="本地文件" value={result.localPath ?? "尚未保存到本地文件"} />
        <PathRow label="云端状态" value={upload?.status ?? "未上传"} />
        {upload?.storageName && <PathRow label="存储通道" value={`${upload.storageName}${upload.storageType ? ` / ${upload.storageType}` : ""}`} />}
        {upload?.durationMs !== undefined && <PathRow label="上传耗时" value={formatDuration(upload.durationMs)} />}
        {upload?.objectKey && <PathRow label="对象路径" value={upload.objectKey} />}
        {upload?.url && <PathRow label="公网 URL" value={upload.url} action={() => onCopy(upload.url!, "公网 URL")} />}
        {upload?.error && <PathRow label="上传错误" value={upload.error} />}
      </div>
    </section>
  );
}

function InfoMetric({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" }) {
  return (
    <div className={`infoMetric ${tone ?? ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PathRow({ label, value, action }: { label: string; value: string; action?: () => void }) {
  return (
    <div className="pathRow">
      <span>{label}</span>
      <code>{value}</code>
      {action && <button onClick={action}>复制</button>}
    </div>
  );
}

function ComparePanel({ selectedResult, previousResult }: { selectedResult?: GenerationResult; previousResult?: GenerationResult }) {
  return (
    <section className="resultInfoPanel">
      <div className="miniHeader">
        <strong>对比视图</strong>
        <span>用于比较上一轮与当前图的构图、主体、光影和保真度</span>
      </div>
      <div className="compareGrid">
        <CompareSlot title="上一轮 / 参考图" result={previousResult} />
        <CompareSlot title="当前选中图" result={selectedResult} />
      </div>
      <p className="panelHint">图生图时，左侧通常是底图或上一轮结果，右侧是当前输出；文生图只有单张时，可先继续创作一轮后再回来对比。</p>
    </section>
  );
}

function CompareSlot({ title, result }: { title: string; result?: GenerationResult }) {
  return (
    <div className="compareSlot">
      <strong>{title}</strong>
      {result?.dataUrl ? <img src={result.dataUrl} alt={result.label} /> : <div className="emptyCompare">暂无图片</div>}
      <span>{result?.label ?? "未选择"}</span>
      <small>{result?.width && result.height ? `${result.width} x ${result.height}` : result?.status ?? "等待结果"}</small>
    </div>
  );
}

function IterationChainPanel({ results }: { results: GenerationResult[] }) {
  const chainItems = results.filter((item) => item.status !== "empty" || item.dataUrl || item.error || item.localPath);
  return (
    <section className="resultInfoPanel">
      <div className="miniHeader">
        <strong>迭代链</strong>
        <span>记录本次会话的底图、生成图和后续编辑图</span>
      </div>
      {chainItems.length === 0 ? (
        <div className="emptyInfo">暂无迭代记录。生成图片或载入底图后会自动形成链路。</div>
      ) : (
        <div className="chainList">
          {chainItems.map((item, index) => (
            <div className="chainItem" key={item.id}>
              <div className="chainIndex">{index + 1}</div>
              {item.dataUrl ? <img src={item.dataUrl} alt={item.label} /> : <div className="chainThumb"><ImagePlus size={16} /></div>}
              <div>
                <strong>{item.label}</strong>
                <span>{item.source ?? "未知来源"} · {item.status} · {formatDuration(item.durationMs)}</span>
                <small>{item.localPath ?? item.error ?? item.prompt ?? "暂无更多信息"}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function BatchPage({
  tasks,
  batchSize,
  isRunning,
  controlStatus,
  retryLimit,
  onBatchSizeChange,
  onRetryLimitChange,
  onImport,
  onExportTemplate,
  onExportLog,
  onBindFolder,
  onCreateSamples,
  onStart,
  onPause,
  onStop,
  onChooseImage,
  onClearImage,
  onRetryFailed,
  onClearCompleted,
  onRemove
}: {
  tasks: BatchTask[];
  batchSize: ImageSize;
  isRunning: boolean;
  controlStatus: BatchControlStatus;
  retryLimit: number;
  onBatchSizeChange: (size: ImageSize) => void;
  onRetryLimitChange: (value: number) => void;
  onImport: () => void;
  onExportTemplate: () => void;
  onExportLog: () => void;
  onBindFolder: () => void;
  onCreateSamples: () => void;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onChooseImage: (taskId: string) => void;
  onClearImage: (taskId: string) => void;
  onRetryFailed: () => void;
  onClearCompleted: () => void;
  onRemove: (taskId: string) => void;
}) {
  const rows = tasks.map((task) => [
    task.project,
    task.industry,
    task.template,
    <div className="tableClip" title={`${task.imageName ?? "文生图任务"} / ${task.size ?? batchSize}`} key={`${task.id}-mode`}>
      {task.imageName ? `图生图：${task.imageName}` : "文生图"} · {task.size ?? batchSize}
    </div>,
    `${task.completedCount ?? 0}/${task.count}`,
    <span className={`taskStatus status-${task.status}`} key={`${task.id}-status`}>{task.status}</span>,
    <div className="tableClip" title={task.error ?? task.prompt} key={`${task.id}-prompt`}>
      {task.error ? `错误：${task.error}` : task.retryCount ? `重试 ${task.retryCount} 次：${task.prompt}` : task.prompt}
    </div>,
    <div className="actionCell" key={`${task.id}-actions`}>
      <button onClick={() => onChooseImage(task.id)} disabled={isRunning}>
        <ImagePlus size={13} />
        底图
      </button>
      <button onClick={() => onClearImage(task.id)} disabled={isRunning || !task.imagePath}>
        清图
      </button>
      <button onClick={() => onRemove(task.id)} disabled={isRunning}>
        <Trash2 size={13} />
        移除
      </button>
    </div>
  ]);
  const totalRequested = tasks.reduce((sum, task) => sum + task.count, 0);
  const totalCompleted = tasks.reduce((sum, task) => sum + (task.completedCount ?? 0), 0);
  const failedCount = tasks.filter((task) => task.status === "失败").length;
  return (
    <div className="splitLayout">
      <section className="panel">
        <div className="panelHeader">
          <div>
            <h2>批量任务表</h2>
            <p>导入 Excel 后按数量顺序调用真实生图接口，成功结果自动保存并写入作品库。</p>
          </div>
          <div className="buttonRow">
            <button className="secondaryButton" onClick={onImport} disabled={isRunning}>
              <FileSpreadsheet size={16} />
              导入 Excel
            </button>
            <button className="secondaryButton" onClick={onExportTemplate} disabled={isRunning}>
              <FileDown size={16} />
              下载模板
            </button>
            <button className="secondaryButton" onClick={onBindFolder} disabled={isRunning || tasks.length === 0}>
              <FolderOpen size={16} />
              绑定底图文件夹
            </button>
            <button className="secondaryButton" onClick={onCreateSamples} disabled={isRunning}>
              <Plus size={16} />
              创建样例任务
            </button>
            <button className="secondaryButton" onClick={onExportLog} disabled={tasks.length === 0}>
              <Download size={16} />
              导出日志
            </button>
            <button className="secondaryButton" onClick={onRetryFailed} disabled={isRunning || failedCount === 0}>
              <RotateCcw size={16} />
              重试失败
            </button>
            <button className="secondaryButton" onClick={onClearCompleted} disabled={isRunning || !tasks.some((task) => task.status === "已完成")}>
              <Trash2 size={16} />
              清理完成
            </button>
            <button className="primaryButton" onClick={onStart} disabled={isRunning || tasks.length === 0}>
              <Play size={16} />
              {isRunning ? "队列运行中" : "开始队列"}
            </button>
            <button className="secondaryButton" onClick={onPause} disabled={controlStatus !== "running"}>
              <Pause size={16} />
              暂停
            </button>
            <button className="secondaryButton" onClick={onStart} disabled={controlStatus !== "paused"}>
              <Play size={16} />
              继续
            </button>
            <button className="secondaryButton" onClick={onStop} disabled={controlStatus === "idle"}>
              <Square size={16} />
              停止
            </button>
          </div>
        </div>
        <div className="batchSummary">
          <InfoMetric label="任务数" value={String(tasks.length)} />
          <InfoMetric label="计划图片" value={String(totalRequested)} />
          <InfoMetric label="已完成" value={String(totalCompleted)} />
          <InfoMetric label="失败任务" value={String(failedCount)} tone={failedCount ? "warning" : "success"} />
          <InfoMetric label="队列状态" value={controlStatus === "idle" ? "空闲" : controlStatus === "running" ? "运行中" : controlStatus === "paused" ? "已暂停" : "停止中"} tone={controlStatus === "stopping" ? "warning" : undefined} />
        </div>
        {rows.length === 0 ? (
          <div className="emptyBox">暂无批量任务。可导入 Excel，或先创建样例任务后再修改提示词方向。</div>
        ) : (
          <DataTable className="batchTable" columns={["项目", "行业", "模板", "模式 / 底图", "进度", "状态", "提示词 / 错误", "操作"]} rows={rows} />
        )}
      </section>
      <section className="panel sidePanel">
        <h2>批量规则</h2>
        <label className="compactLabel">
          批量输出尺寸
          <ImageSizeControl value={batchSize} onChange={onBatchSizeChange} />
        </label>
        <label className="compactLabel">
          失败自动重试次数
          <input type="number" min={0} max={5} value={retryLimit} onChange={(event) => onRetryLimitChange(Math.min(5, Math.max(0, Number(event.target.value) || 0)))} />
        </label>
        <InfoList items={["Excel 列顺序：项目、行业、模板、数量、提示词、尺寸（可选）", "每条任务可绑定底图；有底图走图生图，没有底图走文生图", "可从文件夹批量绑定底图，按任务顺序循环分配", "支持暂停、继续、停止和失败自动重试", "自定义尺寸最高 2K，宽高必须符合 gpt-image-2 规则"]} />
      </section>
    </div>
  );
}

function TemplatePage({
  templates,
  onUse,
  onPreview,
  onCopy,
  onCreate,
  onEdit,
  onImport,
  onExport
}: {
  templates: Template[];
  onUse: (template: Template) => void;
  onPreview: (template: Template) => void;
  onCopy: (text: string, label: string) => void;
  onCreate: () => void;
  onEdit: (template: Template) => void;
  onImport: () => void;
  onExport: () => void;
}) {
  const industries = ["全部", ...Array.from(new Set(templates.map((template) => template.industry)))];
  const [industry, setIndustry] = useState("全部");
  const [query, setQuery] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const templateContentRef = useRef<HTMLElement>(null);
  const featuredTags = new Set(["主图", "封面", "种草", "KV", "海报", "课程", "设备", "门店", "SaaS"]);
  const filtered = templates.filter((template) => {
    const hitIndustry = industry === "全部" || template.industry === industry;
    const text = `${template.industry} ${template.scene} ${template.prompt} ${template.tags.join(" ")}`;
    const hitFeatured = !featuredOnly || template.tags.some((tag) => featuredTags.has(tag));
    return hitIndustry && hitFeatured && text.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div className="templateLayout">
      <aside className="panel filterPanel">
        <h2>行业分类</h2>
        <div className="chipList">
          {industries.map((item) => (
            <button
              className={`chip ${industry === item ? "active" : ""}`}
              key={item}
              onClick={() => {
                setIndustry(item);
                window.setTimeout(() => templateContentRef.current?.scrollIntoView({ block: "start" }), 0);
              }}
            >
              <span>{item}</span>
              <small>{item === "全部" ? templates.length : templates.filter((template) => template.industry === item).length}</small>
            </button>
          ))}
        </div>
      </aside>
      <section className="templateContent" ref={templateContentRef}>
        <div className="templateTools">
          <div className="globalSearch localSearch">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索行业、场景、关键词" />
          </div>
          <div className="templateToolActions">
            <button className="primaryButton" onClick={onCreate}>
              <Plus size={15} />
              新增模板
            </button>
            <button className="secondaryButton" onClick={onImport}>
              <UploadCloud size={15} />
              导入
            </button>
            <button className="secondaryButton" onClick={onExport}>
              <Download size={15} />
              导出
            </button>
            <button className={featuredOnly ? "secondaryButton activeSoft" : "secondaryButton"} onClick={() => setFeaturedOnly((value) => !value)}>
              {featuredOnly ? "推荐模板" : "全部模板"}
            </button>
            <span>{filtered.length} 个模板</span>
          </div>
        </div>
        <div className="templateGrid">
          {filtered.length === 0 ? (
            <div className="emptyBox templateEmpty">没有找到匹配模板。可以换一个行业词、用途词或直接在创作页输入自定义提示词。</div>
          ) : (
            filtered.map((template, index) => (
              <section className="templateItem" key={template.id}>
                <div className={`templateMark tone${index % 4}`} />
                <div className="templateMeta">{template.industry} · {template.size} · {template.quality}</div>
                <h2>{template.scene}{template.custom ? <em className="customBadge">自定义</em> : null}</h2>
                <p>{template.prompt}</p>
                <div className="tagRow">
                  {template.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="buttonRow">
                  <button className="secondaryButton" onClick={() => onPreview(template)}>
                    <Eye size={15} />
                    查看
                  </button>
                  <button className="secondaryButton" onClick={() => onCopy(`${template.prompt}\n避免内容：${template.avoid}`, "模板提示词")}>
                    <Copy size={15} />
                    复制
                  </button>
                  <button className="secondaryButton" onClick={() => onEdit(template)}>编辑</button>
                  <button className="primaryButton" onClick={() => onUse(template)}>使用</button>
                </div>
              </section>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function AssetPage({
  assets,
  onOpenFolder,
  onCopy,
  onPreview,
  onOpenLocation,
  onUpload,
  onBatchExport,
  onPack,
  onEdit,
  onRetouch,
  onDetail
}: {
  assets: Asset[];
  onOpenFolder: () => void;
  onCopy: (text: string, label: string) => void;
  onPreview: (asset: Asset) => void;
  onOpenLocation: (asset: Asset) => void;
  onUpload: (asset: Asset) => void;
  onBatchExport: () => void;
  onPack: () => void;
  onEdit: (asset: Asset) => void;
  onRetouch: (asset: Asset) => void;
  onDetail: (asset: Asset) => void;
}) {
  const [query, setQuery] = useState("");
  const [project, setProject] = useState("全部");
  const [cloudState, setCloudState] = useState("全部");
  const projects = ["全部", ...Array.from(new Set(assets.map((asset) => asset.project).filter(Boolean)))];
  const filteredAssets = assets.filter((asset) => {
    const text = `${asset.name} ${asset.project} ${asset.source} ${asset.prompt} ${asset.cloudUrl}`.toLowerCase();
    const hitQuery = !query.trim() || text.includes(query.trim().toLowerCase());
    const hitProject = project === "全部" || asset.project === project;
    const uploaded = asset.cloudUrl && asset.cloudUrl !== "未上传";
    const hitCloud = cloudState === "全部" || (cloudState === "已上传" ? uploaded : !uploaded);
    return hitQuery && hitProject && hitCloud;
  });

  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2>作品素材库</h2>
          <p>按项目、标签、云端状态和迭代链路管理作品。</p>
        </div>
        <div className="buttonRow">
          <button className="secondaryButton" onClick={onBatchExport}>
            <Copy size={16} />
            导出 URL 清单
          </button>
          <button className="secondaryButton" onClick={onPack}>
            <Download size={16} />
            打包压缩
          </button>
          <button className="secondaryButton" onClick={onOpenFolder}>
            <FolderOpen size={16} />
            打开本地目录
          </button>
        </div>
      </div>
      <div className="assetFilters">
        <div className="globalSearch localSearch">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索作品、项目、提示词、URL" />
        </div>
        <select value={project} onChange={(event) => setProject(event.target.value)}>
          {projects.map((item) => <option value={item} key={item}>{item}</option>)}
        </select>
        <select value={cloudState} onChange={(event) => setCloudState(event.target.value)}>
          <option>全部</option>
          <option>已上传</option>
          <option>未上传</option>
        </select>
        <span>{filteredAssets.length} / {assets.length}</span>
      </div>
      {assets.length === 0 ? (
        <div className="emptyBox">暂无作品。完成文生图、图生图或批量生产后，作品会自动进入素材库。</div>
      ) : (
        <DataTable
          className="assetTable"
          columns={["预览", "作品", "项目", "来源", "云端 URL", "操作"]}
          rows={filteredAssets.map((asset) => [
            <button className="assetThumb" key={`${asset.id}-thumb`} onClick={() => onPreview(asset)}>
              {asset.previewUrl ? <img src={asset.previewUrl} alt={asset.name} /> : <ImagePlus size={18} />}
            </button>,
            asset.name,
            asset.project,
            asset.source,
            asset.cloudUrl,
            <div className="actionCell" key={asset.id}>
              <button onClick={() => onPreview(asset)}>预览</button>
              <button onClick={() => onDetail(asset)}>详情</button>
              <button onClick={() => onCopy(asset.prompt, "作品提示词")}>复制词</button>
              <button onClick={() => onUpload(asset)}>上传</button>
              <button onClick={() => onOpenLocation(asset)}>位置</button>
              <button onClick={() => onEdit(asset)}>继续编辑</button>
              <button onClick={() => onRetouch(asset)}>修图</button>
            </div>
          ])}
        />
      )}
    </section>
  );
}

function SettingsPage({
  apiKey,
  apiBaseUrl,
  apiDiagnostic,
  storages,
  storageDraft,
  saveDirectory,
  requestTimeoutSeconds,
  autoCheckUpdates,
  skippedUpdateVersion,
  onApiKeyChange,
  onTestApi,
  onRequestTimeoutChange,
  onAutoCheckUpdatesChange,
  onClearSkippedUpdateVersion,
  onSaveApiKey,
  onSaveRequestTimeout,
  onChooseSaveDirectory,
  onOpenSaveDirectory,
  onStorageDraftChange,
  onStorageTypeChange,
  onAddStorage,
  onTestDraft,
  onTestStorage,
  onTestStorageUpload,
  onSetDefault
}: {
  apiKey: string;
  apiBaseUrl: string;
  apiDiagnostic: ApiDiagnostic | null;
  storages: StorageProfile[];
  storageDraft: StorageDraft;
  saveDirectory: string;
  requestTimeoutSeconds: number;
  autoCheckUpdates: boolean;
  skippedUpdateVersion: string;
  onApiKeyChange: (value: string) => void;
  onTestApi: () => void;
  onRequestTimeoutChange: (value: number) => void;
  onAutoCheckUpdatesChange: (enabled: boolean) => void;
  onClearSkippedUpdateVersion: () => void;
  onSaveApiKey: () => void;
  onSaveRequestTimeout: () => void;
  onChooseSaveDirectory: () => void;
  onOpenSaveDirectory: () => void;
  onStorageDraftChange: (patch: Partial<StorageDraft>) => void;
  onStorageTypeChange: (type: string) => void;
  onAddStorage: () => void;
  onTestDraft: () => void;
  onTestStorage: (profile: StorageProfile) => void;
  onTestStorageUpload: (profile: StorageProfile) => void;
  onSetDefault: (profile: StorageProfile) => void;
}) {
  const isFtp = storageDraft.type === "FTP" || storageDraft.type === "SFTP";
  const storageHint = isFtp
    ? `${storageDraft.type} 使用服务器、端口、账号和远程目录生成公网 URL。`
    : `${storageDraft.type} 使用 Endpoint、Bucket、AccessKey 和 SecretKey 上传对象。`;

  return (
    <div className="settingsLayout">
      <section className="panel apiSettingsPanel">
        <div className="panelHeader">
          <div>
            <h2>API 设置</h2>
            <p>服务地址固定为 0029.org。请先到 0029.org 购买套餐并生成秘钥；Key 只保存在本机安全存储中。</p>
          </div>
          <Database size={18} />
        </div>
        <label>
          固定 API Base URL
          <input value={apiBaseUrl} readOnly />
        </label>
        <label>
          API Key
          <input type="password" value={apiKey} onChange={(event) => onApiKeyChange(event.target.value)} placeholder="输入测试或客户专属 Key" />
        </label>
        <div className="buttonRow">
          <button className="primaryButton" onClick={onSaveApiKey}>
            <TestTube2 size={16} />
            保存 API Key
          </button>
          <button className="secondaryButton" onClick={onTestApi}>
            <CloudCog size={16} />
            测试 API
          </button>
        </div>
        {apiDiagnostic && (
          <div className={`diagnosticBox ${apiDiagnostic.ok ? "success" : "warning"}`}>
            <strong>{apiDiagnostic.ok ? "API 连接正常" : "API 连接异常"}</strong>
            <span>{apiDiagnostic.endpoint ?? apiBaseUrl} · {apiDiagnostic.status ? `HTTP ${apiDiagnostic.status}` : "无状态码"} · {formatDuration(apiDiagnostic.durationMs)} · {formatTime(apiDiagnostic.testedAt)}</span>
            <code>{apiDiagnostic.error ?? apiDiagnostic.bodyPreview ?? apiDiagnostic.statusText ?? "无返回详情"}</code>
          </div>
        )}
        <label>
          请求超时时间（秒）
          <input
            type="number"
            min={1}
            max={600}
            value={requestTimeoutSeconds}
            onChange={(event) => onRequestTimeoutChange(clampRequestTimeoutSeconds(event.target.value))}
          />
        </label>
        <button className="secondaryButton" onClick={onSaveRequestTimeout}>
          <TimerReset size={16} />
          保存超时设置
        </button>
        <label className="checkRow">
          <input
            type="checkbox"
            checked={autoCheckUpdates}
            onChange={(event) => onAutoCheckUpdatesChange(event.target.checked)}
          />
          <span>
            <strong>启动时检查新版本</strong>
            <small>{autoCheckUpdates ? "开启后会在后台检查，并在发现新版本时提示。" : "关闭后只在点击顶部下载按钮时手动检查。"}</small>
          </span>
        </label>
        {skippedUpdateVersion && (
          <div className="inlineNotice">
            <span>已跳过版本 {skippedUpdateVersion}</span>
            <button className="secondaryButton" onClick={onClearSkippedUpdateVersion}>恢复提醒</button>
          </div>
        )}
        <div className="settingsDivider" />
        <label>
          默认保存路径
          <input value={saveDirectory || "未设置，默认使用系统图片目录/云桥Pro"} readOnly />
        </label>
        <div className="buttonRow">
          <button className="secondaryButton" onClick={onChooseSaveDirectory}>
            <FolderOpen size={16} />
            选择保存目录
          </button>
          <button className="secondaryButton" onClick={onOpenSaveDirectory}>
            <FolderOpen size={16} />
            打开保存目录
          </button>
        </div>
      </section>

      <section className="panel storageEditorPanel">
        <div className="panelHeader">
          <div>
            <h2>云端存储配置器</h2>
              <p>支持 OSS/COS/OBS/七牛/MinIO/FTP/SFTP 配置、默认通道和网络连通性测试。</p>
          </div>
          <Boxes size={18} />
        </div>
        <div className="storageTypeGrid">
          {storageTypeList.map((item) => (
            <button
              className={`storageType ${storageDraft.type === item ? "active" : ""}`}
              key={item}
              onClick={() => onStorageTypeChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="storageHint">
          <strong>{storageDraft.type}</strong>
          <span>{storageHint}</span>
        </div>
        <div className="formGrid">
          <label>
            存储备注名称
            <input value={storageDraft.name} onChange={(event) => onStorageDraftChange({ name: event.target.value })} />
          </label>
          <label>
            存储模式
            <select value={storageDraft.mode} onChange={(event) => onStorageDraftChange({ mode: event.target.value as StorageDraft["mode"] })}>
              <option>本地+云端</option>
              <option>仅本地</option>
              <option>仅云端</option>
            </select>
          </label>
          {isFtp ? (
            <>
              <label>
                服务器地址
                <input value={storageDraft.host} onChange={(event) => onStorageDraftChange({ host: event.target.value })} placeholder={storageDraft.type === "FTP" ? "例如 ftp.example.com" : "例如 sftp.example.com"} />
              </label>
              <label>
                端口
                <input value={storageDraft.port} onChange={(event) => onStorageDraftChange({ port: event.target.value })} placeholder="SFTP 默认 22，FTP 默认 21" />
              </label>
              <label>
                账号
                <input value={storageDraft.username} onChange={(event) => onStorageDraftChange({ username: event.target.value })} />
              </label>
              <label>
                密码 / 私钥口令
                <input type="password" value={storageDraft.password} onChange={(event) => onStorageDraftChange({ password: event.target.value })} />
              </label>
            </>
          ) : (
            <>
              <label>
                Endpoint
                <input value={storageDraft.endpoint} onChange={(event) => onStorageDraftChange({ endpoint: event.target.value })} placeholder={storagePresets[storageDraft.type]?.endpoint || "例如 oss-cn-hangzhou.aliyuncs.com"} />
              </label>
              <label>
                Bucket
                <input value={storageDraft.bucket} onChange={(event) => onStorageDraftChange({ bucket: event.target.value })} />
              </label>
              <label>
                AccessKey
                <input value={storageDraft.accessKey} onChange={(event) => onStorageDraftChange({ accessKey: event.target.value })} placeholder="用于连通性/上传适配，不写入日志" />
              </label>
              <label>
                SecretKey
                <input type="password" value={storageDraft.secretKey} onChange={(event) => onStorageDraftChange({ secretKey: event.target.value })} placeholder="保存通道时默认脱敏展示" />
              </label>
            </>
          )}
          <label>
            根目录变量
            <input value={storageDraft.root} onChange={(event) => onStorageDraftChange({ root: event.target.value })} />
          </label>
          <label>
            公网 URL 前缀 / CDN 域名
            <input value={storageDraft.publicUrl} onChange={(event) => onStorageDraftChange({ publicUrl: event.target.value })} />
          </label>
        </div>
        <div className="variableHelp">
          <strong>可用路径变量</strong>
          <span>{`{industry} {project} {year} {month} {day} {timestamp} {serial} {img_type} {size} {quality}`}</span>
        </div>
        <label className="toggleLine">
          <input
            type="checkbox"
            checked={storageDraft.autoUpload}
            onChange={(event) => onStorageDraftChange({ autoUpload: event.target.checked })}
          />
          生成完成后可手动上传，成功后自动写入公网 URL
        </label>
        <div className="buttonRow">
          <button className="secondaryButton" onClick={onTestDraft}>
            <TestTube2 size={16} />
            测试连通性
          </button>
          <button className="primaryButton" onClick={onAddStorage}>
            <Plus size={16} />
            保存为默认上传通道
          </button>
        </div>
        <div className="securityNote">
          <Lock size={15} />
          AccessKey、SecretKey、FTP 密码加密保存，不会出现在作品导出和运行日志中。
        </div>
      </section>

      <section className="panel storageListPanel">
        <div className="panelHeader">
          <div>
            <h2>已保存通道</h2>
            <p>可测试连通性、设为默认通道；作品上传成功后会回写公网 URL。</p>
          </div>
        </div>
        {storages.length === 0 ? (
          <div className="emptyBox">暂无存储配置。先在左侧填写配置并保存。</div>
        ) : (
          <div className="storageList">
            {storages.map((profile) => (
              <div className="storageCard" key={profile.id}>
                <div>
                  <strong>{profile.name}</strong>
                  <span>{profile.type} · {profile.bucket || "未填 Bucket"} · {profile.mode}</span>
                  <span>目录：{profile.root}</span>
                  <span>URL：{profile.publicUrl || "未填公网前缀"}</span>
                </div>
                <em>{profile.status} · {profile.autoUpload ? "自动上传" : "手动上传"}</em>
                <div className="buttonRow">
                  <button onClick={() => onTestStorage(profile)}>测试</button>
                  <button onClick={() => onTestStorageUpload(profile)}>上传测试</button>
                  <button onClick={() => onSetDefault(profile)}>默认</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TemplateModal({ template, onClose, onUse, onCopy }: { template: Template; onClose: () => void; onUse: (template: Template) => void; onCopy: (text: string, label: string) => void }) {
  return (
    <ModalShell title={`${template.industry} / ${template.scene}`} onClose={onClose}>
      <div className="templateDetail">
        <div className="detailMeta">{template.size} · {template.quality} · {template.format}</div>
        <h3>提示词</h3>
        <pre>{template.prompt}</pre>
        <h3>避免内容</h3>
        <pre>{template.avoid}</pre>
      </div>
      <div className="modalActions">
        <button className="secondaryButton" onClick={() => onCopy(`${template.prompt}\n避免内容：${template.avoid}`, "模板提示词")}>复制提示词</button>
        <button className="primaryButton" onClick={() => { onUse(template); onClose(); }}>载入创作页</button>
      </div>
    </ModalShell>
  );
}

function TemplateEditorModal({
  template,
  onClose,
  onSave
}: {
  template?: Template;
  onClose: () => void;
  onSave: (template: Template) => void;
}) {
  const [draft, setDraft] = useState<Template>(() => ({
    id: template?.id ?? `custom-${Date.now()}`,
    industry: template?.industry ?? "自定义行业",
    scene: template?.scene ?? "",
    size: template?.size ?? "1024x1536",
    quality: template?.quality ?? "medium",
    format: template?.format ?? "png",
    prompt: template?.prompt ?? "生成一张适合 {platform} 使用的商业图片。主体为 {product_name}，核心卖点为 {selling_points}，场景为 {scene}，风格 {style}，色彩 {color_palette}。画面主体清晰，构图专业，留出必要的文案排版空间。",
    avoid: template?.avoid ?? "避免文字乱码、水印、主体变形、低清晰度、杂乱背景、夸张不真实效果。",
    tags: template?.tags ?? ["自定义"],
    custom: template?.custom ?? false
  }));

  function updateDraft(patch: Partial<Template>) {
    setDraft((value) => ({ ...value, ...patch }));
  }

  function saveDraft() {
    const validation = validateGptImage2Size(draft.size);
    if (!validation.ok) {
      window.alert(`模板尺寸不符合 gpt-image-2 要求：${validation.message}`);
      return;
    }
    onSave({ ...draft, size: validation.value });
  }

  return (
    <ModalShell title={template ? "编辑模板" : "新增模板"} onClose={onClose}>
      <div className="modalGrid templateEditorGrid">
        <label>
          行业分类
          <input value={draft.industry} onChange={(event) => updateDraft({ industry: event.target.value })} />
        </label>
        <label>
          场景名称
          <input value={draft.scene} onChange={(event) => updateDraft({ scene: event.target.value })} placeholder="例如 夏季新品详情页首图" />
        </label>
        <label>
          尺寸
          <ImageSizeControl value={draft.size} onChange={(size) => updateDraft({ size })} />
        </label>
        <label>
          质量
          <select value={draft.quality} onChange={(event) => updateDraft({ quality: event.target.value as ImageQuality })}>
            <option>auto</option>
            <option>low</option>
            <option>medium</option>
            <option>high</option>
          </select>
        </label>
        <label>
          格式
          <select value={draft.format} onChange={(event) => updateDraft({ format: event.target.value as ImageFormat })}>
            <option>png</option>
            <option>jpeg</option>
            <option>webp</option>
          </select>
        </label>
        <label>
          标签
          <input value={draft.tags.join("、")} onChange={(event) => updateDraft({ tags: event.target.value.split(/[、,，\s]+/).filter(Boolean) })} />
        </label>
      </div>
      <label>
        提示词
        <textarea value={draft.prompt} onChange={(event) => updateDraft({ prompt: event.target.value })} />
      </label>
      <label>
        避免内容
        <textarea className="compactTextarea" value={draft.avoid} onChange={(event) => updateDraft({ avoid: event.target.value })} />
      </label>
      <div className="variableHelp">
        <strong>可用变量</strong>
        <span>{`{product_name} {selling_points} {scene} {style} {audience} {subject} {brand} {season} {color_palette} {platform} {camera} {material} {price_tier} {region} {promotion} {character} {action}`}</span>
      </div>
      <div className="modalActions">
        <button className="secondaryButton" onClick={onClose}>取消</button>
        <button className="primaryButton" onClick={saveDraft}>
          <Plus size={15} />
          保存模板
        </button>
      </div>
    </ModalShell>
  );
}

function HistoryModal({ assets, results, onClose }: { assets: Asset[]; results: GenerationResult[]; onClose: () => void }) {
  const recentResults = results.filter((item) => item.dataUrl || item.error || item.localPath).slice(-8).reverse();
  const recentAssets = assets.slice(0, 8);
  return (
    <ModalShell title="历史记录" onClose={onClose}>
      <div className="historyGrid">
        <section>
          <h3>当前会话</h3>
          {recentResults.length === 0 ? (
            <div className="emptyBox">暂无当前会话记录。</div>
          ) : (
            <div className="historyList">
              {recentResults.map((item) => (
                <div className="historyItem" key={item.id}>
                  {item.dataUrl ? <img src={item.dataUrl} alt={item.label} /> : <div className="chainThumb"><ImagePlus size={16} /></div>}
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.source ?? "未知来源"} · {item.status} · {formatDuration(item.durationMs)}</span>
                    <small>{item.localPath ?? item.error ?? item.upload?.url ?? "暂无路径"}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        <section>
          <h3>作品库最近记录</h3>
          {recentAssets.length === 0 ? (
            <div className="emptyBox">暂无作品库记录。</div>
          ) : (
            <div className="historyList">
              {recentAssets.map((asset) => (
                <div className="historyItem" key={asset.id}>
                  {asset.previewUrl ? <img src={asset.previewUrl} alt={asset.name} /> : <div className="chainThumb"><ImagePlus size={16} /></div>}
                  <div>
                    <strong>{asset.name}</strong>
                    <span>{asset.project} · {asset.source} · {asset.status}</span>
                    <small>{asset.cloudUrl || asset.localPath || "未上传"}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </ModalShell>
  );
}

function AssetModal({ asset, onClose, onCopy }: { asset: Asset; onClose: () => void; onCopy: (text: string, label: string) => void }) {
  return (
    <ModalShell title={asset.name} onClose={onClose}>
      <div className="templateDetail">
        <div className="detailMeta">{asset.project} · {asset.source} · {asset.status}</div>
        <h3>云端 URL</h3>
        <pre>{asset.cloudUrl}</pre>
        <h3>提示词</h3>
        <pre>{asset.prompt}</pre>
      </div>
      <div className="modalActions">
        <button className="secondaryButton" onClick={() => onCopy(asset.prompt, "作品提示词")}>复制提示词</button>
        <button className="primaryButton" onClick={onClose}>完成</button>
      </div>
    </ModalShell>
  );
}

function ImagePreviewModal({ result, onClose, onCopy }: { result: GenerationResult; onClose: () => void; onCopy: (text: string, label: string) => void }) {
  return (
    <ModalShell title={result.label} onClose={onClose} className="imagePreviewPanel">
      <div className="imagePreviewStage">
        {result.dataUrl ? <img src={result.dataUrl} alt={result.label} /> : <ImagePlus size={32} />}
      </div>
      <div className="modalActions">
        {result.dataUrl && <button className="secondaryButton" onClick={() => onCopy(result.dataUrl!, "当前图片数据")}>复制图片</button>}
        <button className="primaryButton" onClick={onClose}>完成</button>
      </div>
    </ModalShell>
  );
}

function UpdateModal({
  result,
  automatic,
  onClose,
  onOpen,
  onOpenRelease,
  onCopy,
  onSkip
}: {
  result: UpdateCheckResult;
  automatic: boolean;
  onClose: () => void;
  onOpen: () => void;
  onOpenRelease: () => void;
  onCopy: (text: string, label: string) => void;
  onSkip: () => void;
}) {
  const sourceLabel = result.source === "website" ? "主更新服务" : "备用更新服务";
  const checksum = result.downloadSha256 || "未提供";
  return (
    <ModalShell title="发现新版本" onClose={onClose}>
      <div className="updateDetail">
        <div className="updateVersion">
          <span>当前版本</span>
          <strong>{result.currentVersion}</strong>
          <span>最新版本</span>
          <strong>{result.latestVersion}</strong>
        </div>
        <InfoList
          items={[
            `来源：${sourceLabel}`,
            `安装包：${result.downloadName || "未匹配到当前系统安装包"}`,
            `大小：${formatBytes(result.downloadSize)}`,
            `检查时间：${formatTime(result.checkedAt)}`,
            automatic ? "本次由启动检查发现" : "本次由手动检查发现"
          ]}
        />
        <div className="checksumBox">
          <span>SHA256</span>
          <code>{checksum}</code>
        </div>
      </div>
      <div className="modalActions">
        {result.downloadSha256 && <button className="secondaryButton" onClick={() => onCopy(result.downloadSha256!, "SHA256")}>复制校验</button>}
        <button className="secondaryButton" onClick={onSkip}>跳过此版本</button>
        <button className="secondaryButton" onClick={onOpenRelease} disabled={!result.releaseUrl}>
          <ExternalLink size={15} />
          发布页
        </button>
        <button className="primaryButton" onClick={onOpen} disabled={!result.downloadUrl && !result.releaseUrl}>
          <Download size={15} />
          下载更新
        </button>
      </div>
    </ModalShell>
  );
}

function MaskEditorModal({
  result,
  onClose,
  onSave
}: {
  result: GenerationResult;
  onClose: () => void;
  onSave: (maskDataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [brushSize, setBrushSize] = useState(56);
  const [drawing, setDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !result.dataUrl) return;
    const image = new Image();
    image.onload = () => {
      const maxWidth = 920;
      const scale = Math.min(1, maxWidth / image.naturalWidth);
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "rgba(0,0,0,0)";
      context.fillRect(0, 0, canvas.width, canvas.height);
      imageRef.current = image;
      setHistory([context.getImageData(0, 0, canvas.width, canvas.height)]);
      setRedoStack([]);
    };
    image.src = result.dataUrl;
  }, [result.dataUrl]);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height
    };
  }

  function pushHistory() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const snapshot = context.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((items) => [...items.slice(-19), snapshot]);
    setRedoStack([]);
  }

  function drawAt(x: number, y: number) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.save();
    context.globalCompositeOperation = "source-over";
    context.fillStyle = "rgba(255,255,255,1)";
    context.beginPath();
    context.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function restore(snapshot?: ImageData) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !snapshot) return;
    context.putImageData(snapshot, 0, 0);
  }

  function undo() {
    setHistory((items) => {
      if (items.length <= 1) return items;
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (canvas && context) {
        const current = context.getImageData(0, 0, canvas.width, canvas.height);
        setRedoStack((redo) => [current, ...redo]);
      }
      const next = items.slice(0, -1);
      restore(next[next.length - 1]);
      return next;
    });
  }

  function redo() {
    setRedoStack((items) => {
      const [first, ...rest] = items;
      if (!first) return items;
      restore(first);
      setHistory((historyItems) => [...historyItems, first]);
      return rest;
    });
  }

  function clearMask() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    pushHistory();
  }

  function saveMask() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL("image/png"));
  }

  return (
    <ModalShell title="局部遮罩编辑" onClose={onClose} className="maskEditorPanel">
      <div className="maskToolbar">
        <label>
          画笔大小
          <input type="range" min={12} max={160} value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} />
        </label>
        <div className="buttonRow">
          <button className="secondaryButton" onClick={undo} disabled={history.length <= 1}>
            <Undo2 size={15} />
            撤销
          </button>
          <button className="secondaryButton" onClick={redo} disabled={redoStack.length === 0}>
            <Redo2 size={15} />
            重做
          </button>
          <button className="secondaryButton" onClick={clearMask}>
            <Trash2 size={15} />
            清空
          </button>
        </div>
      </div>
      <div className="maskCanvasWrap">
        {result.dataUrl && <img src={result.dataUrl} alt={result.label} />}
        <canvas
          ref={canvasRef}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            pushHistory();
            setDrawing(true);
            const next = point(event);
            drawAt(next.x, next.y);
          }}
          onPointerMove={(event) => {
            if (!drawing) return;
            const next = point(event);
            drawAt(next.x, next.y);
          }}
          onPointerUp={() => setDrawing(false)}
          onPointerLeave={() => setDrawing(false)}
        />
      </div>
      <div className="modalActions">
        <button className="secondaryButton" onClick={onClose}>取消</button>
        <button className="primaryButton" onClick={saveMask}>
          <Brush size={15} />
          使用遮罩
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, children, onClose, className = "" }: { title: string; children: ReactNode; onClose: () => void; className?: string }) {
  return (
    <div className="modalBackdrop">
      <section className={`modalPanel ${className}`}>
        <div className="modalHeader">
          <h2>{title}</h2>
          <button className="iconButton" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toastStack">
      {toasts.map((toast) => (
        <div className={`toast ${toast.type}`} key={toast.id}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}

function DataTable({ columns, rows, className = "" }: { columns: string[]; rows: ReactNode[][]; className?: string }) {
  const style = { "--cols": columns.length } as CSSProperties;
  return (
    <div className={`dataTable ${className}`}>
      <div className="tableRow tableHead" style={style}>
        {columns.map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>
      {rows.map((row, rowIndex) => (
        <div className="tableRow" style={style} key={rowIndex}>
          {row.map((cell, cellIndex) => (
            <span key={cellIndex}>{cell}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

function InfoList({ items }: { items: string[] }) {
  return (
    <div className="infoList">
      {items.map((item) => (
        <div className="infoRow" key={item}>
          <span />
          {item}
        </div>
      ))}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
