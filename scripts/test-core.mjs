import assert from "node:assert/strict";
import { buildGeminiRequestBodyForTest, buildImageRequestBodyForTest, createImageGeneration } from "../src/shared/imageApi.ts";
import { validateGptImage2Size } from "../src/shared/imageSize.ts";
import { composePrompt } from "../src/shared/promptComposer.ts";

const validSize = validateGptImage2Size("1024x1536");
assert.equal(validSize.ok, true);
assert.equal(validSize.value, "1024x1536");

const oversized = validateGptImage2Size("4096x4096");
assert.equal(oversized.ok, false);
assert.match(oversized.message ?? "", /2K|2048/);

const badRatio = validateGptImage2Size("2048x512");
assert.equal(badRatio.ok, false);
assert.match(badRatio.message ?? "", /3:1/);

const prompt = composePrompt(
  {
    id: "test",
    industry: "电商零售",
    scene: "商品主图",
    size: "1024x1024",
    quality: "medium",
    format: "png",
    prompt: "主体是 {product_name}，卖点是 {selling_points}。",
    avoid: "避免 {avoid_item}。"
  },
  {
    product_name: "旅行水杯",
    selling_points: "轻量保温",
    avoid_item: "水印"
  },
  "白底棚拍",
  "乱码文字"
);
assert.match(prompt, /旅行水杯/);
assert.match(prompt, /轻量保温/);
assert.match(prompt, /白底棚拍/);
assert.match(prompt, /水印/);

const body = buildImageRequestBodyForTest({
  prompt: "测试",
  size: "1024x1024",
  quality: "high",
  output_format: "png",
  background: "auto"
});
assert.equal(body.model, "gpt-image-2");
assert.equal(body.size, "1024x1024");
assert.equal(Object.hasOwn(body, "n"), false);

const geminiBody = await buildGeminiRequestBodyForTest({
  provider: "gemini",
  model: "gemini-3.1-flash-image",
  prompt: "测试 Gemini 生图",
  size: "1536x1024",
  geminiImageSize: "2K",
  geminiAspectRatio: "3:2",
  output_format: "png"
});
assert.equal(geminiBody.contents[0].role, "user");
assert.deepEqual(geminiBody.contents[0].parts[0], { text: "测试 Gemini 生图" });
assert.deepEqual(geminiBody.generationConfig.responseModalities, ["TEXT", "IMAGE"]);
assert.equal(geminiBody.generationConfig.imageConfig.aspectRatio, "3:2");
assert.equal(geminiBody.generationConfig.imageConfig.imageSize, "2K");

const geminiResult = await createImageGeneration(
  {
    provider: "gemini",
    model: "models/gemini-3.1-flash-image",
    prompt: "测试 Gemini 封装",
    size: "1024x1024",
    geminiImageSize: "1K",
    geminiAspectRatio: "1:1"
  },
  "test-key",
  "https://api.quya.org",
  1000,
  async (url, init) => {
    assert.equal(url, "https://api.quya.org/v1beta/models/gemini-3.1-flash-image:generateContent");
    assert.equal(init.headers.Authorization, "Bearer test-key");
    const requestBody = JSON.parse(init.body);
    assert.equal(requestBody.generationConfig.imageConfig.aspectRatio, "1:1");
    assert.equal(requestBody.generationConfig.imageConfig.imageSize, "1K");
    return new Response(JSON.stringify({
      candidates: [
        {
          content: {
            parts: [
              { inlineData: { mimeType: "image/png", data: "QUJD" } },
              { text: "ok" }
            ]
          }
        }
      ]
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
);
assert.equal(geminiResult.provider, "gemini");
assert.equal(geminiResult.model, "gemini-3.1-flash-image");
assert.equal(geminiResult.data[0].b64_json, "QUJD");
assert.equal(geminiResult.data[0].mime_type, "image/png");

console.log("core tests passed");
