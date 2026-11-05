export const DEFAULT_OPENAI_MODEL = "gpt-image-2";

export const OPENAI_IMAGE_MODELS = [
  DEFAULT_OPENAI_MODEL,
  "gpt-image-2.5-flare",
  "gpt-image-2.5-sunburst",
  "gpt-image-2.6-flare",
  "gpt-image-2.6-sunburst"
] as const;

export const SUPPORTED_INPUT_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"] as const;
