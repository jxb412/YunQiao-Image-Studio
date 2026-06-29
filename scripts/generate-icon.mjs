import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, "build");
const baseSize = 768;
const iconSizes = [16, 32, 48, 64, 128, 256];

function makeCanvas(size) {
  return {
    width: size,
    height: size,
    data: new Uint8ClampedArray(size * size * 4)
  };
}

function clamp(value, min = 0, max = 255) {
  return Math.min(max, Math.max(min, value));
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function blendPixel(canvas, x, y, rgba) {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
  const index = (y * canvas.width + x) * 4;
  const sourceAlpha = rgba[3] / 255;
  const targetAlpha = canvas.data[index + 3] / 255;
  const outAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);
  if (outAlpha <= 0) return;

  canvas.data[index] = clamp((rgba[0] * sourceAlpha + canvas.data[index] * targetAlpha * (1 - sourceAlpha)) / outAlpha);
  canvas.data[index + 1] = clamp((rgba[1] * sourceAlpha + canvas.data[index + 1] * targetAlpha * (1 - sourceAlpha)) / outAlpha);
  canvas.data[index + 2] = clamp((rgba[2] * sourceAlpha + canvas.data[index + 2] * targetAlpha * (1 - sourceAlpha)) / outAlpha);
  canvas.data[index + 3] = clamp(outAlpha * 255);
}

function roundedRectAlpha(x, y, left, top, right, bottom, radius) {
  const px = Math.abs(x - (left + right) / 2) - (right - left) / 2 + radius;
  const py = Math.abs(y - (top + bottom) / 2) - (bottom - top) / 2 + radius;
  const outside = Math.hypot(Math.max(px, 0), Math.max(py, 0));
  const inside = Math.min(Math.max(px, py), 0);
  const distance = outside + inside - radius;
  return clamp(0.5 - distance / 8, 0, 1);
}

function drawBackground(canvas) {
  const pad = 48;
  const radius = 166;
  const left = pad;
  const top = pad;
  const right = canvas.width - pad;
  const bottom = canvas.height - pad;

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const alpha = roundedRectAlpha(x, y, left, top, right, bottom, radius);
      if (alpha <= 0) continue;

      const diagonal = (x + y) / (canvas.width + canvas.height);
      const radial = Math.max(0, 1 - Math.hypot(x - canvas.width * 0.28, y - canvas.height * 0.18) / (canvas.width * 0.72));
      const r = mix(91, 130, radial * 0.5) + mix(6, -18, diagonal);
      const g = mix(33, 71, radial * 0.42) + mix(8, -10, diagonal);
      const b = mix(182, 237, radial * 0.36) + mix(35, -14, diagonal);
      blendPixel(canvas, x, y, [r, g, b, alpha * 255]);
    }
  }

  drawLine(canvas, 166, 130, 526, 130, 26, [255, 255, 255, 22]);
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(px - ax, py - ay);
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / lengthSquared, 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function drawLine(canvas, ax, ay, bx, by, width, color) {
  const radius = width / 2;
  const minX = Math.floor(Math.min(ax, bx) - radius - 4);
  const maxX = Math.ceil(Math.max(ax, bx) + radius + 4);
  const minY = Math.floor(Math.min(ay, by) - radius - 4);
  const maxY = Math.ceil(Math.max(ay, by) + radius + 4);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const distance = distanceToSegment(x + 0.5, y + 0.5, ax, ay, bx, by);
      const alpha = clamp(radius + 1.4 - distance, 0, 1) * color[3];
      if (alpha > 0) blendPixel(canvas, x, y, [color[0], color[1], color[2], alpha]);
    }
  }
}

function drawPolyline(canvas, points, width, color) {
  for (let index = 0; index < points.length - 1; index += 1) {
    drawLine(canvas, points[index][0], points[index][1], points[index + 1][0], points[index + 1][1], width, color);
  }
}

function drawGlyph(canvas, offsetX, offsetY, color, shadow = false) {
  const scale = baseSize / 256;
  const s = (value) => value * scale;
  const ox = s(offsetX);
  const oy = s(offsetY);
  const stroke = shadow ? 31 * scale : 27 * scale;
  const softStroke = shadow ? 42 * scale : 0;

  if (shadow) {
    drawLine(canvas, ox + s(82), oy + s(76), ox + s(174), oy + s(76), softStroke, color);
    drawLine(canvas, ox + s(58), oy + s(118), ox + s(198), oy + s(118), softStroke, color);
    drawLine(canvas, ox + s(128), oy + s(119), ox + s(82), oy + s(178), softStroke, color);
    drawPolyline(canvas, [[ox + s(82), oy + s(178)], [ox + s(153), oy + s(178)], [ox + s(190), oy + s(146)]], softStroke, color);
    return;
  }

  drawLine(canvas, ox + s(82), oy + s(76), ox + s(174), oy + s(76), stroke, color);
  drawLine(canvas, ox + s(58), oy + s(118), ox + s(198), oy + s(118), stroke, color);
  drawLine(canvas, ox + s(128), oy + s(119), ox + s(82), oy + s(178), stroke, color);
  drawPolyline(canvas, [[ox + s(82), oy + s(178)], [ox + s(153), oy + s(178)], [ox + s(190), oy + s(146)]], stroke, color);
}

function drawIconBase() {
  const canvas = makeCanvas(baseSize);
  drawBackground(canvas);
  drawGlyph(canvas, 5, 9, [16, 22, 45, 70], true);
  drawGlyph(canvas, 0, 0, [255, 255, 255, 247]);
  return canvas;
}

function downsample(source, size) {
  const ratio = source.width / size;
  const canvas = makeCanvas(size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      const samples = ratio * ratio;
      for (let yy = 0; yy < ratio; yy += 1) {
        for (let xx = 0; xx < ratio; xx += 1) {
          const index = ((y * ratio + yy) * source.width + (x * ratio + xx)) * 4;
          r += source.data[index];
          g += source.data[index + 1];
          b += source.data[index + 2];
          a += source.data[index + 3];
        }
      }
      const out = (y * size + x) * 4;
      canvas.data[out] = Math.round(r / samples);
      canvas.data[out + 1] = Math.round(g / samples);
      canvas.data[out + 2] = Math.round(b / samples);
      canvas.data[out + 3] = Math.round(a / samples);
    }
  }
  return canvas;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function encodePng(canvas) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(canvas.width, 0);
  header.writeUInt32BE(canvas.height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const stride = canvas.width * 4;
  const raw = Buffer.alloc((stride + 1) * canvas.height);
  for (let y = 0; y < canvas.height; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(canvas.data.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function encodeIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  const directory = Buffer.alloc(entries.length * 16);
  let offset = header.length + directory.length;
  entries.forEach((entry, index) => {
    const base = index * 16;
    directory[base] = entry.size >= 256 ? 0 : entry.size;
    directory[base + 1] = entry.size >= 256 ? 0 : entry.size;
    directory[base + 2] = 0;
    directory[base + 3] = 0;
    directory.writeUInt16LE(1, base + 4);
    directory.writeUInt16LE(32, base + 6);
    directory.writeUInt32LE(entry.png.length, base + 8);
    directory.writeUInt32LE(offset, base + 12);
    offset += entry.png.length;
  });

  return Buffer.concat([header, directory, ...entries.map((entry) => entry.png)]);
}

await mkdir(outDir, { recursive: true });

const base = drawIconBase();
const png256 = encodePng(downsample(base, 256));
const icoEntries = iconSizes.map((size) => ({
  size,
  png: encodePng(downsample(base, size))
}));

await writeFile(join(outDir, "icon.png"), png256);
await writeFile(join(outDir, "icon.ico"), encodeIco(icoEntries));

console.log(`Generated ${join(outDir, "icon.ico")}`);
