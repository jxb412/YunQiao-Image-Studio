import { readFile } from "node:fs/promises";
import path from "node:path";

import type { GeminiAspectRatio, GeminiImageSize, ImageApiResult, ImageEditRequest, ImageGenerationRequest } from "./imageApiTypes";
import { normalizeImageSizeOrThrow, parseImageSize } from "./imageSize";

const IMAGE_MODEL = "gpt-image-2";
const GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image";
const GEMINI_ASPECT_RATIOS: GeminiAspectRatio[] = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9", "1:4", "4:1"];

export type ImageApiFetch = (url: string, init: RequestInit) => Promise<Response>;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs?: number, fetchImpl: ImageApiFetch = fetch) {
  if (!timeoutMs || timeoutMs <= 0) {
    return fetchImpl(url, init);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`图像接口请求超时（${Math.round(timeoutMs / 1000)} 秒）`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function buildImageRequestBodyForTest(request: ImageGenerationRequest) {
  const body: Record<string, unknown> = {
    model: request.model || IMAGE_MODEL,
    prompt: request.prompt,
    size: normalizeImageSizeOrThrow(request.size ?? "auto"),
    quality: request.quality ?? "auto",
    output_format: request.output_format ?? "png",
    background: request.background ?? "auto",
    moderation: request.moderation ?? "auto"
  };

  // The current relay rejects the image count parameter, so generation/editing
  // are temporarily forced to the API default of one image.

  if (request.output_compression !== undefined) {
    body.output_compression = request.output_compression;
  }

  if (request.user) {
    body.user = request.user;
  }

  return body;
}

function cleanGenerationBody(request: ImageGenerationRequest) {
  return buildImageRequestBodyForTest(request);
}

async function parseImageResponse(response: Response): Promise<ImageApiResult> {
  if (response.ok) {
    return response.json() as Promise<ImageApiResult>;
  }

  const text = await response.text();
  throw new Error(`图像接口请求失败: ${response.status} ${text}`);
}

function toBlobPart(bytes: Buffer) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function mimeFromPath(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

function normalizeApiBaseUrl(apiBaseUrl: string) {
  const trimmed = apiBaseUrl.trim().replace(/\/+$/, "");
  const parsed = new URL(trimmed);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("API Base URL 仅支持 http 或 https");
  }
  return parsed.toString().replace(/\/+$/, "");
}

function gcd(left: number, right: number): number {
  return right === 0 ? Math.abs(left) : gcd(right, left % right);
}

function closestGeminiAspectRatio(width: number, height: number): GeminiAspectRatio {
  const exactGcd = gcd(width, height);
  const exact = `${width / exactGcd}:${height / exactGcd}`;
  if (GEMINI_ASPECT_RATIOS.includes(exact as GeminiAspectRatio)) return exact as GeminiAspectRatio;

  const target = width / height;
  return GEMINI_ASPECT_RATIOS
    .map((ratio) => {
      const [ratioWidth, ratioHeight] = ratio.split(":").map(Number);
      return { ratio, diff: Math.abs(ratioWidth / ratioHeight - target) };
    })
    .sort((left, right) => left.diff - right.diff)[0].ratio;
}

function geminiAspectRatioFromRequest(request: ImageGenerationRequest): GeminiAspectRatio | undefined {
  if (request.geminiAspectRatio) return request.geminiAspectRatio;
  if (!request.size || request.size === "auto") return undefined;
  const parsed = parseImageSize(request.size);
  if (!parsed) return undefined;
  return closestGeminiAspectRatio(parsed.width, parsed.height);
}

function geminiImageSizeFromRequest(request: ImageGenerationRequest): GeminiImageSize | undefined {
  if (request.geminiImageSize) return request.geminiImageSize;
  if (!request.size || request.size === "auto") return undefined;
  const parsed = parseImageSize(request.size);
  if (!parsed) return undefined;
  return Math.max(parsed.width, parsed.height) > 1024 ? "2K" : "1K";
}

function normalizeGeminiModel(model?: string) {
  const normalized = model?.replace(/^models\//, "").trim();
  return normalized || GEMINI_IMAGE_MODEL;
}

function normalizeGeminiApiBaseUrl(apiBaseUrl: string) {
  const base = normalizeApiBaseUrl(apiBaseUrl);
  if (/\/v1beta\/models$/i.test(base)) return base.replace(/\/models$/i, "");
  if (/\/v1beta$/i.test(base)) return base;
  return `${base}/v1beta`;
}

function buildGeminiGenerationConfig(request: ImageGenerationRequest) {
  const imageConfig: Record<string, unknown> = {};
  const aspectRatio = geminiAspectRatioFromRequest(request);
  const imageSize = geminiImageSizeFromRequest(request);
  if (aspectRatio) imageConfig.aspectRatio = aspectRatio;
  if (imageSize) imageConfig.imageSize = imageSize;

  return {
    responseModalities: ["TEXT", "IMAGE"],
    ...(Object.keys(imageConfig).length ? { imageConfig } : {})
  };
}

function base64FromBuffer(bytes: Buffer) {
  return bytes.toString("base64");
}

function geminiImagePart(bytes: Buffer, mimeType: string) {
  return {
    inlineData: {
      mimeType,
      data: base64FromBuffer(bytes)
    }
  };
}

async function buildGeminiParts(request: ImageEditRequest | ImageGenerationRequest) {
  const parts: Array<Record<string, unknown>> = [{ text: request.prompt }];
  if ("imagePaths" in request) {
    if (request.maskPath) {
      parts.unshift({
        text: "请将最后一张输入图视为局部重绘遮罩，优先修改遮罩覆盖区域，未覆盖区域尽量保持不变。"
      });
    }
    for (const imagePath of request.imagePaths) {
      const bytes = await readFile(imagePath);
      parts.push(geminiImagePart(bytes, mimeFromPath(imagePath)));
    }
    if (request.maskPath) {
      const bytes = await readFile(request.maskPath);
      parts.push(geminiImagePart(bytes, mimeFromPath(request.maskPath)));
    }
  }
  return parts;
}

export async function buildGeminiRequestBodyForTest(request: ImageEditRequest | ImageGenerationRequest) {
  return {
    contents: [
      {
        role: "user",
        parts: await buildGeminiParts(request)
      }
    ],
    generationConfig: buildGeminiGenerationConfig(request)
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function geminiInlineData(part: Record<string, unknown>) {
  const value = isRecord(part.inlineData) ? part.inlineData : isRecord(part.inline_data) ? part.inline_data : null;
  if (!value) return null;
  const mimeType = typeof value.mimeType === "string"
    ? value.mimeType
    : typeof value.mime_type === "string"
      ? value.mime_type
      : undefined;
  const data = typeof value.data === "string" ? value.data : undefined;
  if (!data || !mimeType?.toLowerCase().startsWith("image/")) return null;
  return { data, mimeType };
}

function collectGeminiImages(value: unknown) {
  const results: Array<{ data: string; mimeType: string }> = [];
  if (!isRecord(value) || !Array.isArray(value.candidates)) return results;

  for (const candidate of value.candidates) {
    if (!isRecord(candidate) || !isRecord(candidate.content) || !Array.isArray(candidate.content.parts)) continue;
    for (const part of candidate.content.parts) {
      if (!isRecord(part)) continue;
      const image = geminiInlineData(part);
      if (image) results.push(image);
    }
  }

  return results;
}

function collectGeminiText(value: unknown): string | undefined {
  if (!isRecord(value) || !Array.isArray(value.candidates)) return undefined;
  const texts: string[] = [];
  for (const candidate of value.candidates) {
    if (!isRecord(candidate) || !isRecord(candidate.content) || !Array.isArray(candidate.content.parts)) continue;
    for (const part of candidate.content.parts) {
      if (isRecord(part) && typeof part.text === "string" && part.text.trim()) {
        texts.push(part.text.trim());
      }
    }
  }
  return texts.join("\n") || undefined;
}

async function createGeminiImage(
  request: ImageGenerationRequest | ImageEditRequest,
  apiKey: string,
  apiBaseUrl: string,
  timeoutMs?: number,
  fetchImpl?: ImageApiFetch
): Promise<ImageApiResult> {
  const model = normalizeGeminiModel(request.model);
  const body = await buildGeminiRequestBodyForTest(request);

  const response = await fetchWithTimeout(`${normalizeGeminiApiBaseUrl(apiBaseUrl)}/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  }, timeoutMs, fetchImpl);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini 图像接口请求失败: ${response.status} ${text}`);
  }

  const json = await response.json() as unknown;
  const revisedPrompt = collectGeminiText(json);
  const images = collectGeminiImages(json);
  if (images.length === 0) {
    const textPreview = revisedPrompt ? `，文本返回：${revisedPrompt.slice(0, 300)}` : "";
    throw new Error(`Gemini 图像接口没有返回图片数据${textPreview}`);
  }
  return {
    created: Math.floor(Date.now() / 1000),
    provider: "gemini",
    model,
    data: images.map((image) => ({
      b64_json: image.data,
      mime_type: image.mimeType,
      revised_prompt: revisedPrompt
    }))
  };
}

export async function createImageGeneration(
  request: ImageGenerationRequest,
  apiKey: string,
  apiBaseUrl: string,
  timeoutMs?: number,
  fetchImpl?: ImageApiFetch
): Promise<ImageApiResult> {
  if (request.provider === "gemini") {
    return createGeminiImage(request, apiKey, apiBaseUrl, timeoutMs, fetchImpl);
  }

  const response = await fetchWithTimeout(`${normalizeApiBaseUrl(apiBaseUrl)}/v1/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(cleanGenerationBody(request))
  }, timeoutMs, fetchImpl);

  const result = await parseImageResponse(response);
  return { ...result, provider: "openai", model: request.model || IMAGE_MODEL };
}

export async function createImageEdit(
  request: ImageEditRequest,
  apiKey: string,
  apiBaseUrl: string,
  timeoutMs?: number,
  fetchImpl?: ImageApiFetch
): Promise<ImageApiResult> {
  if (request.provider === "gemini") {
    return createGeminiImage(request, apiKey, apiBaseUrl, timeoutMs, fetchImpl);
  }

  const form = new FormData();
  const body = cleanGenerationBody(request);

  for (const [key, value] of Object.entries(body)) {
    form.append(key, String(value));
  }

  for (const imagePath of request.imagePaths) {
    const bytes = await readFile(imagePath);
    form.append("image", new Blob([toBlobPart(bytes)], { type: mimeFromPath(imagePath) }), path.basename(imagePath));
  }

  if (request.maskPath) {
    const maskBytes = await readFile(request.maskPath);
    form.append("mask", new Blob([toBlobPart(maskBytes)], { type: mimeFromPath(request.maskPath) }), path.basename(request.maskPath));
  }

  if (request.experimentalInputFidelity) {
    form.append("input_fidelity", request.experimentalInputFidelity);
  }

  const response = await fetchWithTimeout(`${normalizeApiBaseUrl(apiBaseUrl)}/v1/images/edits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: form
  }, timeoutMs, fetchImpl);

  const result = await parseImageResponse(response);
  return { ...result, provider: "openai", model: request.model || IMAGE_MODEL };
}
