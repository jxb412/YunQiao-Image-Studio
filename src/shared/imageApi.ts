import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ImageApiResult, ImageEditRequest, ImageGenerationRequest } from "./imageApiTypes";
import { normalizeImageSizeOrThrow } from "./imageSize";

const IMAGE_MODEL = "gpt-image-2";

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs?: number) {
  if (!timeoutMs || timeoutMs <= 0) {
    return fetch(url, init);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`图像接口请求超时（${Math.round(timeoutMs / 1000)} 秒）`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function cleanGenerationBody(request: ImageGenerationRequest) {
  const body: Record<string, unknown> = {
    model: IMAGE_MODEL,
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

export async function createImageGeneration(
  request: ImageGenerationRequest,
  apiKey: string,
  apiBaseUrl: string,
  timeoutMs?: number
): Promise<ImageApiResult> {
  const response = await fetchWithTimeout(`${normalizeApiBaseUrl(apiBaseUrl)}/v1/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(cleanGenerationBody(request))
  }, timeoutMs);

  return parseImageResponse(response);
}

export async function createImageEdit(
  request: ImageEditRequest,
  apiKey: string,
  apiBaseUrl: string,
  timeoutMs?: number
): Promise<ImageApiResult> {
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
  }, timeoutMs);

  return parseImageResponse(response);
}
