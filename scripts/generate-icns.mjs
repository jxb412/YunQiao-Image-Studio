import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const pngPath = join(root, "build", "icon.png");
const icnsPath = join(root, "build", "icon.icns");

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const sizeBuffer = Buffer.alloc(4);
  sizeBuffer.writeUInt32BE(typeBuffer.length + sizeBuffer.length + data.length, 0);
  return Buffer.concat([typeBuffer, sizeBuffer, data]);
}

const png = await readFile(pngPath);
const payload = chunk("ic10", png);
const header = Buffer.alloc(8);
header.write("icns", 0, "ascii");
header.writeUInt32BE(8 + payload.length, 4);

await writeFile(icnsPath, Buffer.concat([header, payload]));
console.log(`Generated ${icnsPath}`);
