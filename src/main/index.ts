import { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
    apiBaseUrl: "https://api.0029.org"
  };
}

function clampRequestTimeoutSeconds(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 300;
  return Math.min(600, Math.max(1, Math.round(numeric)));
}

function normalizeApiBaseUrl(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return defaultSettings().apiBaseUrl;
  const parsed = new URL(raw);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("API Base URL 仅支持 http 或 https");
  }
  return parsed.toString().replace(/\/+$/, "");
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
  const settings = { ...(await readSettings()), ...patch };
  settings.requestTimeoutSeconds = clampRequestTimeoutSeconds(settings.requestTimeoutSeconds);
  settings.apiBaseUrl = normalizeApiBaseUrl(settings.apiBaseUrl);
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

ipcMain.handle("settings:update", async (_event, patch: Partial<AppSettings>) => writeSettingsSecure(patch));

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
  return Promise.all(
    result.filePaths.map(async (filePath) => {
      const data = await readFile(filePath);
      return {
        path: filePath,
        name: path.basename(filePath),
        dataUrl: `data:${mimeFromPath(filePath)};base64,${data.toString("base64")}`
      };
    })
  );
});

ipcMain.handle("file:open-directory", async (_event, directory?: string) => {
  const settings = await readSettings();
  const target = directory || settings.saveDirectory;
  await mkdir(target, { recursive: true });
  await shell.openPath(target);
  return { ok: true, path: target };
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
