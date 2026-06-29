export type ImageSizeValue = "auto" | `${number}x${number}`;

export type ParsedImageSize = {
  width: number;
  height: number;
};

export type ImageSizeValidation = {
  ok: boolean;
  value: ImageSizeValue;
  parsed?: ParsedImageSize;
  message?: string;
};

export const MAX_CUSTOM_IMAGE_EDGE = 2048;
export const MAX_CUSTOM_IMAGE_PIXELS = MAX_CUSTOM_IMAGE_EDGE * MAX_CUSTOM_IMAGE_EDGE;
export const MIN_GPT_IMAGE_PIXELS = 655_360;
export const MAX_GPT_IMAGE_RATIO = 3;

export const COMMON_IMAGE_SIZES: ImageSizeValue[] = [
  "auto",
  "1024x1024",
  "1024x1536",
  "1536x1024",
  "2048x2048",
  "2048x1152",
  "1152x2048"
];

export function parseImageSize(value: string): ParsedImageSize | null {
  const match = /^(\d+)x(\d+)$/.exec(value.trim());
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isInteger(width) || !Number.isInteger(height)) return null;
  return { width, height };
}

export function makeImageSize(width: number, height: number): ImageSizeValue {
  return `${Math.round(width)}x${Math.round(height)}` as ImageSizeValue;
}

export function validateGptImage2Size(value: string): ImageSizeValidation {
  const trimmed = value.trim();
  if (trimmed === "auto") {
    return { ok: true, value: "auto" };
  }

  const parsed = parseImageSize(trimmed);
  if (!parsed) {
    return {
      ok: false,
      value: "auto",
      message: "尺寸格式应为 宽x高，例如 1024x1024。"
    };
  }

  const { width, height } = parsed;
  const normalized = makeImageSize(width, height);

  if (width <= 0 || height <= 0) {
    return { ok: false, value: normalized, parsed, message: "宽高必须大于 0。" };
  }

  if (width % 16 !== 0 || height % 16 !== 0) {
    return { ok: false, value: normalized, parsed, message: "gpt-image-2 要求宽高都必须是 16 的倍数。" };
  }

  if (Math.max(width, height) > MAX_CUSTOM_IMAGE_EDGE) {
    return { ok: false, value: normalized, parsed, message: `自定义尺寸最高支持 2K，最大边不能超过 ${MAX_CUSTOM_IMAGE_EDGE}px。` };
  }

  const pixels = width * height;
  if (pixels > MAX_CUSTOM_IMAGE_PIXELS) {
    return { ok: false, value: normalized, parsed, message: "自定义尺寸总像素不能超过 2048x2048。" };
  }

  if (pixels < MIN_GPT_IMAGE_PIXELS) {
    return { ok: false, value: normalized, parsed, message: "gpt-image-2 要求总像素至少 655,360。" };
  }

  const ratio = Math.max(width, height) / Math.min(width, height);
  if (ratio > MAX_GPT_IMAGE_RATIO) {
    return { ok: false, value: normalized, parsed, message: "gpt-image-2 要求长宽比不能超过 3:1。" };
  }

  return { ok: true, value: normalized, parsed };
}

export function normalizeImageSizeOrThrow(value: string): ImageSizeValue {
  const result = validateGptImage2Size(value);
  if (!result.ok) {
    throw new Error(result.message ?? "图片尺寸不符合 gpt-image-2 要求");
  }
  return result.value;
}
