import type { ImageSizeValue } from "./imageSize";

export type ImageQuality = "auto" | "low" | "medium" | "high";
export type ImageFormat = "png" | "jpeg" | "webp";
export type ImageBackground = "auto" | "opaque";
export type ImageModeration = "auto" | "low";
export type ImageProvider = "openai" | "gemini";
export type GeminiImageSize = "1K" | "2K";
export type GeminiAspectRatio =
  | "1:1"
  | "2:3"
  | "3:2"
  | "3:4"
  | "4:3"
  | "4:5"
  | "5:4"
  | "9:16"
  | "16:9"
  | "21:9"
  | "1:4"
  | "4:1";

export type ImageGenerationRequest = {
  profileId?: string;
  provider?: ImageProvider;
  model?: string;
  prompt: string;
  size?: ImageSizeValue;
  quality?: ImageQuality;
  output_format?: ImageFormat;
  output_compression?: number;
  background?: ImageBackground;
  moderation?: ImageModeration;
  geminiImageSize?: GeminiImageSize;
  geminiAspectRatio?: GeminiAspectRatio;
  user?: string;
};

export type ImageEditRequest = ImageGenerationRequest & {
  imagePaths: string[];
  maskPath?: string;
  experimentalInputFidelity?: "low" | "high";
};

export type ImageApiResult = {
  created?: number;
  provider?: ImageProvider;
  model?: string;
  data: Array<{
    b64_json?: string;
    url?: string;
    mime_type?: string;
    mimeType?: string;
    revised_prompt?: string;
  }>;
};
