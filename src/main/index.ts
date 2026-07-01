import { app, BrowserWindow, clipboard, dialog, ipcMain, nativeImage, safeStorage, shell } from "electron";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { deflateRawSync } from "node:zlib";
import ExcelJS from "exceljs";
import OSS from "ali-oss";
import COS from "cos-nodejs-sdk-v5";
import { Client as FtpClient } from "basic-ftp";
import Minio from "minio";
import qiniu from "qiniu";
import ObsClient from "esdk-obs-nodejs";
import SftpClient from "ssh2-sftp-client";

import { createImageEdit, createImageGeneration } from "../shared/imageApi";
import type { ImageEditRequest, ImageGenerationRequest } from "../shared/imageApiTypes";

let mainWindow: BrowserWindow | null = null;
let encryptedApiKey: Buffer | null = null;
const FIXED_API_BASE_URL = "https://api.0029.org";
const SUPPORTED_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const UPDATE_MANIFEST_URL = "https://down.haowucm.cn/yunqiao/latest.json";
const GITHUB_LATEST_RELEASE_API = "https://api.github.com/repos/jxb412/YunQiao-Image-Studio/releases/latest";

type UpdateDownload = {
  filename?: string;
  url?: string;
  githubUrl?: string;
  size?: number;
  sha256?: string;
};

type UpdateInfo = {
  version: string;
  tag?: string;
  releaseUrl?: string;
  publishedAt?: string;
  notes?: string;
  downloads: Record<string, UpdateDownload>;
  source: "website" | "github";
};

type PersistedStorageProfile = {
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
  mode: string;
  autoUpload: boolean;
  status: string;
};

type StorageSecret = {
  accessKey?: string;
  secretKey?: string;
  username?: string;
  password?: string;
};

type AppSettings = {
  saveDirectory: string;
  storageProfiles: PersistedStorageProfile[];
  requestTimeoutSeconds: number;
  apiBaseUrl: string;
};

function defaultSettings(): AppSettings {
  return {
    saveDirectory: path.join(app.getPath("pictures"), "云桥Pro"),
    storageProfiles: [],
    requestTimeoutSeconds: 300,
    apiBaseUrl: FIXED_API_BASE_URL
  };
}

function clampRequestTimeoutSeconds(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 300;
  return Math.min(600, Math.max(1, Math.round(numeric)));
}

function normalizeApiBaseUrl(_value?: unknown) {
  return FIXED_API_BASE_URL;
}

function settingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function secretsPath() {
  return path.join(app.getPath("userData"), "secrets.json");
}

function assetsPath() {
  return path.join(app.getPath("userData"), "asset-library.json");
}

function templatesPath() {
  return path.join(app.getPath("userData"), "custom-templates.json");
}

function storageSecretsPath() {
  return path.join(app.getPath("userData"), "storage-secrets.json");
}

async function readSettings(): Promise<AppSettings> {
  try {
    const text = await readFile(settingsPath(), "utf-8");
    const settings = { ...defaultSettings(), ...JSON.parse(text) };
    return {
      ...settings,
      requestTimeoutSeconds: clampRequestTimeoutSeconds(settings.requestTimeoutSeconds),
      apiBaseUrl: normalizeApiBaseUrl(settings.apiBaseUrl)
    };
  } catch {
    return defaultSettings();
  }
}

async function writeSettings(patch: Partial<AppSettings>) {
  const { apiBaseUrl: _apiBaseUrl, ...safePatch } = patch;
  const settings = { ...(await readSettings()), ...safePatch, apiBaseUrl: FIXED_API_BASE_URL };
  settings.requestTimeoutSeconds = clampRequestTimeoutSeconds(settings.requestTimeoutSeconds);
  settings.apiBaseUrl = FIXED_API_BASE_URL;
  await mkdir(app.getPath("userData"), { recursive: true });
  await writeFile(settingsPath(), JSON.stringify(settings, null, 2), "utf-8");
  return settings;
}

function sanitizeStorageProfile(profile: PersistedStorageProfile): PersistedStorageProfile {
  const { accessKey: _accessKey, secretKey: _secretKey, username: _username, password: _password, ...safeProfile } = profile;
  return safeProfile;
}

function sanitizeSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    storageProfiles: settings.storageProfiles.map(sanitizeStorageProfile)
  };
}

async function writeSettingsSecure(patch: Partial<AppSettings>) {
  if (patch.storageProfiles) {
    for (const profile of patch.storageProfiles) {
      if (profile.accessKey || profile.secretKey || profile.username || profile.password) {
        await writeStorageSecret(profile.id, {
          accessKey: profile.accessKey,
          secretKey: profile.secretKey,
          username: profile.username,
          password: profile.password
        });
      }
    }
    patch.storageProfiles = patch.storageProfiles.map(sanitizeStorageProfile);
  }
  return sanitizeSettings(await writeSettings(patch));
}

async function readEncryptedApiKey() {
  if (encryptedApiKey) return encryptedApiKey;
  try {
    const text = await readFile(secretsPath(), "utf-8");
    const parsed = JSON.parse(text) as { apiKey?: string };
    encryptedApiKey = parsed.apiKey ? Buffer.from(parsed.apiKey, "base64") : null;
    return encryptedApiKey;
  } catch {
    return null;
  }
}

async function writeEncryptedApiKey(apiKey: string) {
  encryptedApiKey = safeStorage.encryptString(apiKey);
  await mkdir(app.getPath("userData"), { recursive: true });
  await writeFile(secretsPath(), JSON.stringify({ apiKey: encryptedApiKey.toString("base64") }, null, 2), "utf-8");
}

async function readStorageSecrets(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await readFile(storageSecretsPath(), "utf-8")) as Record<string, string>;
  } catch {
    return {};
  }
}

function encryptJson(value: unknown) {
  return safeStorage.encryptString(JSON.stringify(value)).toString("base64");
}

function decryptJson<T>(value?: string): T | null {
  if (!value) return null;
  try {
    return JSON.parse(safeStorage.decryptString(Buffer.from(value, "base64"))) as T;
  } catch {
    return null;
  }
}

async function writeStorageSecret(profileId: string, secret: StorageSecret) {
  const secrets = await readStorageSecrets();
  secrets[profileId] = encryptJson(secret);
  await mkdir(app.getPath("userData"), { recursive: true });
  await writeFile(storageSecretsPath(), JSON.stringify(secrets, null, 2), "utf-8");
}

async function readStorageSecret(profileId: string) {
  const secrets = await readStorageSecrets();
  return decryptJson<StorageSecret>(secrets[profileId]) ?? {};
}

async function hasSavedApiKey() {
  return Boolean(process.env.YUNQIAO_API_KEY || (await readEncryptedApiKey()));
}

function sanitizeName(name: string) {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").slice(0, 80) || "yunqiao";
}

function imageExtension(dataUrl: string) {
  const match = /^data:image\/([a-zA-Z0-9.+-]+);base64,/.exec(dataUrl);
  const ext = match?.[1]?.toLowerCase();
  return ext === "jpeg" ? "jpg" : ext || "png";
}

function imageExtensionFromContentType(contentType: string | null, fallbackUrl: string) {
  if (contentType?.includes("jpeg")) return "jpg";
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("png")) return "png";
  const ext = path.extname(new URL(fallbackUrl).pathname).replace(".", "").toLowerCase();
  return ext || "png";
}

function decodeDataUrl(dataUrl: string) {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex < 0) throw new Error("图片数据格式无效");
  return Buffer.from(dataUrl.slice(commaIndex + 1), "base64");
}

async function readImagePayload(dataUrlOrUrl: string) {
  if (/^https?:\/\//i.test(dataUrlOrUrl)) {
    const response = await fetch(dataUrlOrUrl);
    if (!response.ok) throw new Error(`图片下载失败：${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    return {
      data: bytes,
      ext: imageExtensionFromContentType(response.headers.get("content-type"), dataUrlOrUrl)
    };
  }
  return {
    data: decodeDataUrl(dataUrlOrUrl),
    ext: imageExtension(dataUrlOrUrl)
  };
}

function mimeFromPath(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

async function readImageFile(filePath: string) {
  const data = await readFile(filePath);
  return {
    path: filePath,
    name: path.basename(filePath),
    dataUrl: `data:${mimeFromPath(filePath)};base64,${data.toString("base64")}`
  };
}

async function listImagesInDirectory(directory: string) {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && SUPPORTED_IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => ({
      path: path.join(directory, entry.name),
      name: entry.name
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function createZip(files: Array<{ name: string; data: Buffer }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  const { dosTime, dosDate } = dosDateTime();

  for (const file of files) {
    const name = Buffer.from(file.name, "utf-8");
    const compressed = deflateRawSync(file.data);
    const checksum = crc32(file.data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(file.data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);

    localParts.push(localHeader, name, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(file.data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);

    offset += localHeader.length + name.length + compressed.length;
  }

  const centralStart = offset;
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(centralStart, 16);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function normalizeEndpoint(endpoint: string) {
  const trimmed = endpoint.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function normalizeObjectKey(key: string) {
  return key.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/{2,}/g, "/");
}

function renderStoragePath(profile: PersistedStorageProfile, asset: { name: string; project?: string; source?: string; localPath?: string }) {
  const now = new Date();
  const ext = path.extname(asset.localPath || "").replace(".", "") || "png";
  const values: Record<string, string> = {
    industry: sanitizeName(asset.project || "通用"),
    project: sanitizeName(asset.project || "默认项目"),
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1).padStart(2, "0"),
    day: String(now.getDate()).padStart(2, "0"),
    timestamp: String(now.getTime()),
    serial: `${now.getHours()}${now.getMinutes()}${now.getSeconds()}`,
    img_type: ext,
    size: "auto",
    quality: "auto"
  };
  const renderedRoot = (profile.root || "{industry}/{project}/{year}{month}{day}").replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key) => values[key] ?? key);
  const filename = `${sanitizeName(asset.name)}-${now.getTime()}.${ext}`;
  return normalizeObjectKey(`${renderedRoot}/${filename}`);
}

function publicUrl(profile: PersistedStorageProfile, objectKey: string) {
  if (!profile.publicUrl) throw new Error("公网 URL 前缀未配置");
  return `${profile.publicUrl.replace(/\/$/, "")}/${objectKey}`;
}

function requireField(value: string | undefined, label: string) {
  if (!value?.trim()) throw new Error(`缺少${label}`);
  return value.trim();
}

function cosRegion(endpoint: string) {
  const match = endpoint.match(/cos\.([a-z0-9-]+)\.myqcloud\.com/i);
  return match?.[1] || endpoint.replace(/^https?:\/\//, "").split(".")[1] || "";
}

function minioClient(endpoint: string, accessKey: string, secretKey: string) {
  const normalized = normalizeEndpoint(endpoint);
  const parsed = new URL(normalized);
  return new Minio.Client({
    endPoint: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : parsed.protocol === "https:" ? 443 : 80,
    useSSL: parsed.protocol === "https:",
    accessKey,
    secretKey
  });
}

async function uploadWithStorage(profile: PersistedStorageProfile, asset: { name: string; project?: string; source?: string; localPath?: string }) {
  const localPath = requireField(asset.localPath, "本地图片路径");
  const objectKey = renderStoragePath(profile, asset);
  const secret = await readStorageSecret(profile.id);
  const accessKey = secret.accessKey || profile.accessKey;
  const secretKey = secret.secretKey || profile.secretKey;
  const username = secret.username || profile.username;
  const password = secret.password || profile.password;

  if (profile.type === "FTP") {
    const client = new FtpClient(12000);
    try {
      await client.access({
        host: requireField(profile.host || profile.endpoint.split(":")[0], "FTP 服务器"),
        port: Number(profile.port || profile.endpoint.split(":")[1] || 21),
        user: requireField(username, "FTP 账号"),
        password: requireField(password, "FTP 密码"),
        secure: false
      });
      await client.ensureDir(path.posix.dirname(objectKey));
      await client.uploadFrom(localPath, path.posix.basename(objectKey));
    } finally {
      client.close();
    }
    return { objectKey, url: publicUrl(profile, objectKey) };
  }

  if (profile.type === "SFTP") {
    const client = new SftpClient();
    try {
      await client.connect({
        host: requireField(profile.host || profile.endpoint.split(":")[0], "SFTP 服务器"),
        port: Number(profile.port || profile.endpoint.split(":")[1] || 22),
        username: requireField(username, "SFTP 账号"),
        password: requireField(password, "SFTP 密码")
      });
      const remotePath = `/${objectKey}`;
      await client.mkdir(path.posix.dirname(remotePath), true);
      await client.fastPut(localPath, remotePath);
    } finally {
      await client.end();
    }
    return { objectKey, url: publicUrl(profile, objectKey) };
  }

  if (profile.type === "阿里云 OSS") {
    const client = new OSS({
      endpoint: requireField(profile.endpoint, "OSS Endpoint"),
      bucket: requireField(profile.bucket, "OSS Bucket"),
      accessKeyId: requireField(accessKey, "AccessKey"),
      accessKeySecret: requireField(secretKey, "SecretKey")
    });
    await client.put(objectKey, localPath);
    return { objectKey, url: publicUrl(profile, objectKey) };
  }

  if (profile.type === "腾讯云 COS") {
    const cos = new COS({
      SecretId: requireField(accessKey, "SecretId"),
      SecretKey: requireField(secretKey, "SecretKey")
    });
    await new Promise<void>((resolve, reject) => {
      cos.uploadFile(
        {
          Bucket: requireField(profile.bucket, "COS Bucket"),
          Region: requireField(cosRegion(profile.endpoint), "COS Region"),
          Key: objectKey,
          FilePath: localPath
        },
        (error: unknown) => {
          if (error) reject(error);
          else resolve();
        }
      );
    });
    return { objectKey, url: publicUrl(profile, objectKey) };
  }

  if (profile.type === "华为 OBS") {
    const client = new ObsClient({
      access_key_id: requireField(accessKey, "AccessKey"),
      secret_access_key: requireField(secretKey, "SecretKey"),
      server: normalizeEndpoint(requireField(profile.endpoint, "OBS Endpoint"))
    });
    await new Promise<void>((resolve, reject) => {
      client.putObject(
        {
          Bucket: requireField(profile.bucket, "OBS Bucket"),
          Key: objectKey,
          SourceFile: localPath
        },
        (error: Error | null, result: { CommonMsg?: { Status?: number } }) => {
          if (error) reject(error);
          else if ((result.CommonMsg?.Status ?? 500) >= 300) reject(new Error(`OBS 上传失败，状态 ${result.CommonMsg?.Status}`));
          else resolve();
        }
      );
    });
    return { objectKey, url: publicUrl(profile, objectKey) };
  }

  if (profile.type === "七牛云") {
    const mac = new qiniu.auth.digest.Mac(requireField(accessKey, "AccessKey"), requireField(secretKey, "SecretKey"));
    const putPolicy = new qiniu.rs.PutPolicy({ scope: `${requireField(profile.bucket, "七牛 Bucket")}:${objectKey}` });
    const uploadToken = putPolicy.uploadToken(mac);
    const config = new qiniu.conf.Config();
    const formUploader = new qiniu.form_up.FormUploader(config);
    const putExtra = new qiniu.form_up.PutExtra();
    await new Promise<void>((resolve, reject) => {
      formUploader.putFile(uploadToken, objectKey, localPath, putExtra, (error: Error | undefined, _body: unknown, info: { statusCode: number }) => {
        if (error) reject(error);
        else if (info.statusCode >= 300) reject(new Error(`七牛上传失败，状态 ${info.statusCode}`));
        else resolve();
      });
    });
    return { objectKey, url: publicUrl(profile, objectKey) };
  }

  if (profile.type === "MinIO") {
    const client = minioClient(requireField(profile.endpoint, "MinIO Endpoint"), requireField(accessKey, "AccessKey"), requireField(secretKey, "SecretKey"));
    await client.fPutObject(requireField(profile.bucket, "MinIO Bucket"), objectKey, localPath);
    return { objectKey, url: publicUrl(profile, objectKey) };
  }

  throw new Error(`暂不支持的存储类型：${profile.type}`);
}

function testTcp(host: string, port: number) {
  return new Promise<{ ok: boolean; message: string }>((resolve) => {
    const socket = net.connect({ host, port });
    const timer = windowlessTimeout(() => {
      socket.destroy();
      resolve({ ok: false, message: `连接超时：${host}:${port}` });
    }, 5000);

    socket.once("connect", () => {
      clearTimeout(timer);
      socket.end();
      resolve({ ok: true, message: `网络可达：${host}:${port}` });
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      resolve({ ok: false, message: `连接失败：${error.message}` });
    });
  });
}

function windowlessTimeout(callback: () => void, timeout: number) {
  return setTimeout(callback, timeout);
}

function normalizeVersionText(version?: string) {
  return String(version || "0.0.0").trim().replace(/^v/i, "");
}

function compareVersions(left: string, right: string) {
  const leftParts = normalizeVersionText(left).split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = normalizeVersionText(right).split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(leftParts.length, rightParts.length, 3);
  for (let index = 0; index < length; index += 1) {
    const diff = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function currentUpdateTarget() {
  if (process.platform === "win32") return "windows-x64";
  if (process.platform === "darwin" && process.arch === "arm64") return "macos-arm64";
  if (process.platform === "darwin") return "macos-x64";
  return `${process.platform}-${process.arch}`;
}

function downloadKeyFromAssetName(name: string) {
  if (/win-x64-portable\.exe$/i.test(name) || /-x64\.exe$/i.test(name)) return "windows-x64";
  if (/mac-arm64\.dmg$/i.test(name) || /arm64\.dmg$/i.test(name)) return "macos-arm64";
  if (/mac-x64\.dmg$/i.test(name) || /x64\.dmg$/i.test(name)) return "macos-x64";
  return "";
}

function normalizeUpdateDownload(value: unknown): UpdateDownload {
  const item = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    filename: typeof item.filename === "string" ? item.filename : undefined,
    url: typeof item.url === "string" ? item.url : undefined,
    githubUrl: typeof item.githubUrl === "string" ? item.githubUrl : undefined,
    size: typeof item.size === "number" ? item.size : undefined,
    sha256: typeof item.sha256 === "string" ? item.sha256 : undefined
  };
}

function normalizeManifest(value: unknown): UpdateInfo | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const version = normalizeVersionText(typeof data.version === "string" ? data.version : typeof data.tag === "string" ? data.tag : "");
  const rawDownloads = data.downloads && typeof data.downloads === "object" ? data.downloads as Record<string, unknown> : {};
  const downloads = Object.fromEntries(Object.entries(rawDownloads).map(([key, download]) => [key, normalizeUpdateDownload(download)]));
  if (!version || Object.keys(downloads).length === 0) return null;
  return {
    version,
    tag: typeof data.tag === "string" ? data.tag : `v${version}`,
    releaseUrl: typeof data.releaseUrl === "string" ? data.releaseUrl : undefined,
    publishedAt: typeof data.publishedAt === "string" ? data.publishedAt : undefined,
    notes: typeof data.notes === "string" ? data.notes : undefined,
    downloads,
    source: "website"
  };
}

async function fetchWebsiteUpdateInfo() {
  const response = await fetchWithTimeoutForMain(UPDATE_MANIFEST_URL, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
      "User-Agent": "YunQiao-Image-Studio"
    }
  }, 12000);
  if (!response.ok) throw new Error(`网站更新清单 HTTP ${response.status}`);
  const manifest = normalizeManifest(await response.json());
  if (!manifest) throw new Error("网站更新清单格式无效");
  return manifest;
}

async function fetchGithubUpdateInfo() {
  const response = await fetchWithTimeoutForMain(GITHUB_LATEST_RELEASE_API, {
    method: "GET",
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "YunQiao-Image-Studio"
    }
  }, 12000);
  if (!response.ok) throw new Error(`GitHub 更新检查 HTTP ${response.status}`);
  const latest = await response.json() as {
    tag_name?: string;
    name?: string;
    html_url?: string;
    published_at?: string;
    body?: string;
    assets?: Array<{ name?: string; browser_download_url?: string; size?: number }>;
  };
  const downloads: Record<string, UpdateDownload> = {};
  for (const asset of latest.assets ?? []) {
    const name = asset.name || "";
    const key = downloadKeyFromAssetName(name);
    if (!key) continue;
    downloads[key] = {
      filename: name,
      url: asset.browser_download_url,
      githubUrl: asset.browser_download_url,
      size: asset.size
    };
  }
  return {
    version: normalizeVersionText(latest.tag_name || latest.name || ""),
    tag: latest.tag_name,
    releaseUrl: latest.html_url,
    publishedAt: latest.published_at,
    notes: latest.body,
    downloads,
    source: "github" as const
  };
}

async function resolveUpdateInfo() {
  const [websiteResult, githubResult] = await Promise.allSettled([
    fetchWebsiteUpdateInfo(),
    fetchGithubUpdateInfo()
  ]);

  const website = websiteResult.status === "fulfilled" ? websiteResult.value : null;
  const github = githubResult.status === "fulfilled" ? githubResult.value : null;

  if (website && github) {
    if (compareVersions(github.version, website.version) > 0) return github;
    if (compareVersions(github.version, website.version) === 0) {
      return {
        ...website,
        releaseUrl: website.releaseUrl || github.releaseUrl,
        publishedAt: website.publishedAt || github.publishedAt,
        notes: website.notes || github.notes,
        downloads: Object.fromEntries(Object.entries(website.downloads).map(([key, download]) => {
          const fallback = github.downloads[key];
          return [key, {
            ...download,
            githubUrl: download.githubUrl || fallback?.githubUrl || fallback?.url
          }];
        }))
      };
    }
    return website;
  }
  if (website) return website;
  if (github) return github;

  const websiteError = websiteResult.status === "rejected" && websiteResult.reason instanceof Error
    ? websiteResult.reason.message
    : "网站更新清单读取失败";
  const githubError = githubResult.status === "rejected" && githubResult.reason instanceof Error
    ? githubResult.reason.message
    : "GitHub 更新检查失败";
  throw new Error(`${websiteError}；备用 GitHub 也不可用：${githubError}`);
}

async function testHttpEndpoint(endpoint: string) {
  const url = normalizeEndpoint(endpoint);
  if (!url) return { ok: false, message: "Endpoint 为空" };
  const controller = new AbortController();
  const timer = windowlessTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, { method: "HEAD", signal: controller.signal });
    return {
      ok: true,
      message: `网络可达，HTTP 状态 ${response.status}`
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知网络错误";
    return { ok: false, message: `连接失败：${message}` };
  } finally {
    clearTimeout(timer);
  }
}

async function testApiConnection(timeoutSeconds: number) {
  const startedAt = Date.now();
  const url = `${FIXED_API_BASE_URL}/v1/models`;
  const response = await fetchWithTimeoutForMain(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${await getApiKey()}`,
      Accept: "application/json"
    }
  }, timeoutSeconds * 1000);
  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    endpoint: url,
    durationMs: Date.now() - startedAt,
    bodyPreview: text.slice(0, 800)
  };
}

async function fetchWithTimeoutForMain(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = windowlessTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`请求超时（${Math.round(timeoutMs / 1000)} 秒）`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 800,
    backgroundColor: "#0F1118",
    title: "云桥Pro AI绘图",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.setMenuBarVisibility(false);

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

async function getApiKey() {
  const envKey = process.env.YUNQIAO_API_KEY;
  if (envKey) return envKey;
  const stored = await readEncryptedApiKey();
  if (!stored) throw new Error("API Key 未配置");
  return safeStorage.decryptString(stored);
}

function normalizeExternalUrl(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("仅支持打开 http 或 https 链接");
  }
  return parsed.toString();
}

ipcMain.handle("settings:set-api-key", async (_event, apiKey: string) => {
  await writeEncryptedApiKey(apiKey);
  return { ok: true };
});

ipcMain.handle("shell:open-external", async (_event, url: string) => {
  const target = normalizeExternalUrl(url);
  await shell.openExternal(target);
  return { ok: true, url: target };
});

ipcMain.handle("app:get-settings", async () => ({
  ...sanitizeSettings(await readSettings()),
  hasApiKey: await hasSavedApiKey()
}));

ipcMain.handle("app:check-update", async () => {
  const latest = await resolveUpdateInfo();
  const currentVersion = app.getVersion();
  const target = currentUpdateTarget();
  const download = latest.downloads[target];
  return {
    currentVersion,
    latestVersion: latest.version || "未知版本",
    updateAvailable: latest.version ? compareVersions(latest.version, currentVersion) > 0 : false,
    source: latest.source,
    platformKey: target,
    releaseUrl: latest.releaseUrl,
    downloadUrl: download?.url || latest.releaseUrl,
    fallbackDownloadUrl: download?.githubUrl || latest.releaseUrl,
    downloadName: download?.filename,
    downloadSize: download?.size,
    downloadSha256: download?.sha256,
    publishedAt: latest.publishedAt,
    notes: latest.notes
  };
});

ipcMain.handle("settings:update", async (_event, patch: Partial<AppSettings>) => writeSettingsSecure(patch));

ipcMain.handle("api:test", async () => {
  const settings = await readSettings();
  return testApiConnection(settings.requestTimeoutSeconds);
});

ipcMain.handle("dialog:choose-directory", async () => {
  if (!mainWindow) throw new Error("主窗口未就绪");
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory", "createDirectory"],
    title: "选择云桥Pro保存目录"
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return writeSettings({ saveDirectory: result.filePaths[0] });
});

ipcMain.handle("dialog:choose-images", async () => {
  if (!mainWindow) throw new Error("主窗口未就绪");
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile", "multiSelections"],
    title: "选择图生图底图",
    filters: [
      { name: "图片文件", extensions: ["png", "jpg", "jpeg", "webp"] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return [];
  return Promise.all(result.filePaths.map(readImageFile));
});

ipcMain.handle("dialog:choose-image-folder", async () => {
  if (!mainWindow) throw new Error("主窗口未就绪");
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    title: "选择批量图生图底图文件夹"
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const directory = result.filePaths[0];
  return {
    directory,
    images: await listImagesInDirectory(directory)
  };
});

ipcMain.handle("file:open-directory", async (_event, directory?: string) => {
  const settings = await readSettings();
  const target = directory || settings.saveDirectory;
  await mkdir(target, { recursive: true });
  await shell.openPath(target);
  return { ok: true, path: target };
});

ipcMain.handle("file:open-location", async (_event, filePath: string) => {
  if (!filePath) throw new Error("文件路径为空");
  shell.showItemInFolder(filePath);
  return { ok: true, path: filePath };
});

ipcMain.handle("clipboard:copy-image", async (_event, dataUrl: string) => {
  const image = nativeImage.createFromDataURL(dataUrl);
  if (image.isEmpty()) throw new Error("图片数据无效，无法复制到剪贴板");
  clipboard.writeImage(image);
  return { ok: true };
});

ipcMain.handle("assets:save-image", async (_event, payload: { dataUrl: string; name: string }) => {
  const settings = await readSettings();
  await mkdir(settings.saveDirectory, { recursive: true });
  const image = await readImagePayload(payload.dataUrl);
  const filename = `${sanitizeName(payload.name)}-${Date.now()}.${image.ext}`;
  const filePath = path.join(settings.saveDirectory, filename);
  await writeFile(filePath, image.data);
  return { path: filePath };
});

ipcMain.handle("assets:save-temp-image", async (_event, payload: { dataUrl: string; name: string }) => {
  const directory = path.join(app.getPath("userData"), "temp-images");
  await mkdir(directory, { recursive: true });
  const image = await readImagePayload(payload.dataUrl);
  const filename = `${sanitizeName(payload.name)}-${Date.now()}.${image.ext}`;
  const filePath = path.join(directory, filename);
  await writeFile(filePath, image.data);
  return { path: filePath };
});

ipcMain.handle("assets:get-library", async () => {
  try {
    return JSON.parse(await readFile(assetsPath(), "utf-8"));
  } catch {
    return [];
  }
});

ipcMain.handle("assets:save-library", async (_event, assets: unknown[]) => {
  await mkdir(app.getPath("userData"), { recursive: true });
  await writeFile(assetsPath(), JSON.stringify(assets, null, 2), "utf-8");
  return { ok: true };
});

ipcMain.handle("templates:get-custom", async () => {
  try {
    return JSON.parse(await readFile(templatesPath(), "utf-8"));
  } catch {
    return [];
  }
});

ipcMain.handle("templates:save-custom", async (_event, templates: unknown[]) => {
  await mkdir(app.getPath("userData"), { recursive: true });
  await writeFile(templatesPath(), JSON.stringify(templates, null, 2), "utf-8");
  return { ok: true };
});

ipcMain.handle("assets:export-url-list", async (_event, assets: Array<{ name: string; cloudUrl: string }>) => {
  const settings = await readSettings();
  await mkdir(settings.saveDirectory, { recursive: true });
  const content = assets.map((asset) => `${asset.name}\t${asset.cloudUrl || "未上传"}`).join("\n");
  const filePath = path.join(settings.saveDirectory, `云桥Pro-URL清单-${Date.now()}.txt`);
  await writeFile(filePath, content, "utf-8");
  return { path: filePath };
});

ipcMain.handle("batch:export-log", async (_event, tasks: Array<{ project: string; industry: string; template: string; count: number; completedCount?: number; status: string; prompt: string; error?: string; imageName?: string; size?: string }>) => {
  const settings = await readSettings();
  await mkdir(settings.saveDirectory, { recursive: true });
  const rows = [
    ["项目", "行业", "模板", "模式/底图", "数量", "已完成", "状态", "尺寸", "提示词", "错误"].join("\t"),
    ...tasks.map((task) => [
      task.project,
      task.industry,
      task.template,
      task.imageName ? `图生图:${task.imageName}` : "文生图",
      String(task.count),
      String(task.completedCount ?? 0),
      task.status,
      task.size || "",
      task.prompt,
      task.error || ""
    ].join("\t"))
  ];
  const filePath = path.join(settings.saveDirectory, `云桥Pro-批量任务日志-${Date.now()}.tsv`);
  await writeFile(filePath, rows.join("\n"), "utf-8");
  return { path: filePath };
});

ipcMain.handle("batch:export-template", async () => {
  const settings = await readSettings();
  await mkdir(settings.saveDirectory, { recursive: true });
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("批量生产模板");
  worksheet.columns = [
    { header: "项目", key: "project", width: 18 },
    { header: "行业", key: "industry", width: 16 },
    { header: "模板", key: "template", width: 20 },
    { header: "数量", key: "count", width: 10 },
    { header: "提示词", key: "prompt", width: 60 },
    { header: "尺寸", key: "size", width: 16 }
  ];
  worksheet.addRows([
    {
      project: "夏季上新",
      industry: "电商零售",
      template: "商品场景种草图",
      count: 2,
      prompt: "生成夏季新品种草图，突出清爽、轻量、高质感，留出标题区域。",
      size: "1024x1536"
    },
    {
      project: "短剧封面 A 组",
      industry: "短剧影视",
      template: "竖版短剧封面",
      count: 1,
      prompt: "雨夜街头，人物表情紧张，电影级布光，保留标题留白。",
      size: "1024x1536"
    }
  ]);
  const filePath = path.join(settings.saveDirectory, `云桥Pro-批量生产导入模板-${Date.now()}.xlsx`);
  await workbook.xlsx.writeFile(filePath);
  return { path: filePath };
});

ipcMain.handle("templates:export", async (_event, templates: unknown[]) => {
  if (!mainWindow) throw new Error("主窗口未就绪");
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "导出云桥Pro模板包",
    defaultPath: `云桥Pro-模板包-${Date.now()}.json`,
    filters: [{ name: "JSON 模板包", extensions: ["json"] }]
  });
  if (result.canceled || !result.filePath) return null;
  await writeFile(result.filePath, JSON.stringify({ version: 1, templates }, null, 2), "utf-8");
  return { path: result.filePath };
});

ipcMain.handle("templates:import", async () => {
  if (!mainWindow) throw new Error("主窗口未就绪");
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    title: "导入云桥Pro模板包",
    filters: [{ name: "JSON 模板包", extensions: ["json"] }]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const parsed = JSON.parse(await readFile(result.filePaths[0], "utf-8")) as { templates?: unknown[] } | unknown[];
  const templates = Array.isArray(parsed) ? parsed : Array.isArray(parsed.templates) ? parsed.templates : [];
  return { path: result.filePaths[0], templates };
});

ipcMain.handle("assets:create-zip", async (_event, assets: Array<{ name: string; prompt: string; cloudUrl: string; localPath?: string }>) => {
  const settings = await readSettings();
  await mkdir(settings.saveDirectory, { recursive: true });
  if (assets.length === 0) throw new Error("作品素材库为空，无法打包");
  const files: Array<{ name: string; data: Buffer }> = [];
  for (const asset of assets) {
    files.push({
      name: `metadata/${sanitizeName(asset.name)}.txt`,
      data: Buffer.from(`作品: ${asset.name}\n云端URL: ${asset.cloudUrl || "未上传"}\n本地文件: ${asset.localPath || "未保存"}\n\n提示词:\n${asset.prompt}`, "utf-8")
    });
    if (asset.localPath) {
      try {
        files.push({
          name: `images/${sanitizeName(asset.name)}${path.extname(asset.localPath) || ".png"}`,
          data: await readFile(asset.localPath)
        });
      } catch {
        files.push({
          name: `metadata/${sanitizeName(asset.name)}-missing-image.txt`,
          data: Buffer.from(`本地图片不存在或无法读取：${asset.localPath}`, "utf-8")
        });
      }
    }
  }
  const filePath = path.join(settings.saveDirectory, `云桥Pro-素材包-${Date.now()}.zip`);
  await writeFile(filePath, createZip(files));
  return { path: filePath };
});

ipcMain.handle("assets:upload", async (_event, asset: { name: string; project?: string; source?: string; localPath?: string }) => {
  const settings = await readSettings();
  const profile = settings.storageProfiles.find((item) => item.status === "默认通道") ?? settings.storageProfiles[0];
  if (!profile) throw new Error("没有可用的云端存储通道");
  const result = await uploadWithStorage(profile, asset);
  return {
    storageName: profile.name,
    storageType: profile.type,
    objectKey: result.objectKey,
    url: result.url
  };
});

ipcMain.handle("storage:test-upload", async (_event, profile: PersistedStorageProfile) => {
  const settings = await readSettings();
  await mkdir(settings.saveDirectory, { recursive: true });
  const testFile = path.join(settings.saveDirectory, `云桥Pro-上传测试-${Date.now()}.png`);
  const onePixelPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/ax2kQAAAABJRU5ErkJggg==", "base64");
  await writeFile(testFile, onePixelPng);
  const startedAt = Date.now();
  const result = await uploadWithStorage(profile, {
    name: "云桥Pro上传测试",
    project: "系统测试",
    source: "存储设置",
    localPath: testFile
  });
  return {
    ok: true,
    storageName: profile.name,
    storageType: profile.type,
    objectKey: result.objectKey,
    url: result.url,
    durationMs: Date.now() - startedAt
  };
});

ipcMain.handle("batch:import-excel", async () => {
  if (!mainWindow) throw new Error("主窗口未就绪");
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    title: "导入批量生产 Excel",
    filters: [{ name: "Excel 文件", extensions: ["xlsx"] }]
  });
  if (result.canceled || !result.filePaths[0]) return null;

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(result.filePaths[0]);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("Excel 中没有工作表");

  const rows: string[][] = [];
  worksheet.eachRow((row, rowNumber) => {
    const values = Array.isArray(row.values)
      ? row.values.slice(1).map((value) => String(value ?? "").trim())
      : [];
    if (!values.some(Boolean)) return;
    if (rowNumber === 1 && values.join(" ").match(/项目|行业|模板|数量|关键词|提示词|尺寸|分辨率/i)) return;

    const [project, industry, template, count, prompt, size] = values;
    const normalizedCount = Math.min(10, Math.max(1, Number(count) || 1));
    rows.push([
      project || `批量任务${rows.length + 1}`,
      industry || "电商零售",
      template || "自定义提示词",
      String(normalizedCount),
      prompt || "",
      size || "",
      "已导入"
    ]);
  });

  return { filePath: result.filePaths[0], rows };
});

ipcMain.handle("storage:test", async (_event, payload: { type: string; endpoint?: string; host?: string; port?: string }) => {
  if (payload.type === "FTP" || payload.type === "SFTP") {
    if (!payload.host || !payload.port) return { ok: false, message: "请填写服务器地址和端口" };
    return testTcp(payload.host, Number(payload.port));
  }
  return testHttpEndpoint(payload.endpoint || "");
});

ipcMain.handle("image:generate", async (_event, request: ImageGenerationRequest) => {
  const settings = await readSettings();
  return createImageGeneration(request, await getApiKey(), settings.apiBaseUrl, settings.requestTimeoutSeconds * 1000);
});

ipcMain.handle("image:edit", async (_event, request: ImageEditRequest) => {
  const settings = await readSettings();
  return createImageEdit(request, await getApiKey(), settings.apiBaseUrl, settings.requestTimeoutSeconds * 1000);
});

void app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
