import type { ImageSizeValue } from "./imageSize";

export type ImageQuality = "auto" | "low" | "medium" | "high";
export type ImageFormat = "png" | "jpeg" | "webp";
export type ImageBackground = "auto" | "opaque";
export type ImageModeration = "auto" | "low";

export type ImageGenerationRequest = {
  prompt: string;
  size?: ImageSizeValue;
  quality?: ImageQuality;
  output_format?: ImageFormat;
  output_compression?: number;
  background?: ImageBackground;
  moderation?: ImageModeration;
  user?: string;
};

export type ImageEditRequest = ImageGenerationRequest & {
  imagePaths: string[];
  maskPath?: string;
  experimentalInputFidelity?: "low" | "high";
};

export type ImageApiResult = {
  created?: number;
  data: Array<{
    b64_json?: string;
    url?: string;
    revised_prompt?: string;
  }>;
};
