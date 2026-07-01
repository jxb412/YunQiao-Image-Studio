import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import path from "node:path";

function readArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function normalizeVersion(value) {
  return String(value || "").trim().replace(/^v/i, "");
}

function assetKeyFromName(name) {
  if (/win-x64-portable\.exe$/i.test(name) || /-x64\.exe$/i.test(name)) return "windows-x64";
  if (/mac-arm64\.dmg$/i.test(name) || /arm64\.dmg$/i.test(name)) return "macos-arm64";
  if (/mac-x64\.dmg$/i.test(name) || /x64\.dmg$/i.test(name)) return "macos-x64";
  return "";
}

function joinUrl(...parts) {
  return parts
    .map((part, index) => {
      const value = String(part);
      if (index === 0) return value.replace(/\/+$/, "");
      return value.replace(/^\/+|\/+$/g, "");
    })
    .filter(Boolean)
    .join("/");
}

function encodeFilename(name) {
  return encodeURIComponent(name).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

const version = normalizeVersion(readArg("--version", process.env.RELEASE_VERSION || process.env.npm_package_version));
const tag = readArg("--tag", version ? `v${version}` : process.env.GITHUB_REF_NAME || "");
const assetDir = readArg("--asset-dir", "release-assets");
const publicBaseUrl = readArg("--public-base-url", process.env.UPDATE_PUBLIC_BASE_URL || "https://down.haowucm.cn");
const repo = readArg("--repo", process.env.GITHUB_REPOSITORY || "jxb412/YunQiao-Image-Studio");
const output = readArg("--output", path.join(assetDir, "latest.json"));

if (!version) {
  throw new Error("Missing --version");
}

const downloads = {};
const files = await readdir(assetDir);

for (const file of files) {
  const key = assetKeyFromName(file);
  if (!key) continue;
  const filePath = path.join(assetDir, file);
  const info = await stat(filePath);
  downloads[key] = {
    filename: file,
    url: joinUrl(publicBaseUrl, "releases", tag, encodeFilename(file)),
    githubUrl: `https://github.com/${repo}/releases/download/${tag}/${encodeFilename(file)}`,
    size: info.size,
    sha256: await sha256File(filePath)
  };
}

const required = ["windows-x64", "macos-x64", "macos-arm64"];
const missing = required.filter((key) => !downloads[key]);
if (missing.length > 0) {
  throw new Error(`Missing release assets for: ${missing.join(", ")}`);
}

const manifest = {
  schema: 1,
  name: "YunQiao Image Studio",
  version,
  tag,
  publishedAt: new Date().toISOString(),
  releaseUrl: `https://github.com/${repo}/releases/tag/${tag}`,
  notesUrl: `https://github.com/${repo}/releases/tag/${tag}`,
  downloads
};

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
console.log(`Update manifest written: ${output}`);
