import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const DIR = "assets/products";
const CANVAS = 1000;
const AREA_FILL_RATIO = 0.5;
const MAX_SIDE_RATIO = 0.92;

const files = fs.readdirSync(DIR).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
console.log(`Processing ${files.length} images...`);

let done = 0, failed = [];

for (const file of files) {
  const filePath = path.join(DIR, file);
  try {
    const original = fs.readFileSync(filePath);
    const trimmed = await sharp(original).trim({ background: "#ffffff", threshold: 12 }).toBuffer();
    const meta = await sharp(trimmed).metadata();

    const targetArea = CANVAS * CANVAS * AREA_FILL_RATIO;
    const srcArea = meta.width * meta.height;
    let scale = Math.sqrt(targetArea / srcArea);
    const maxSide = Math.max(meta.width, meta.height) * scale;
    if (maxSide > CANVAS * MAX_SIDE_RATIO) {
      scale = (CANVAS * MAX_SIDE_RATIO) / Math.max(meta.width, meta.height);
    }
    const newW = Math.max(1, Math.round(meta.width * scale));
    const newH = Math.max(1, Math.round(meta.height * scale));

    const resized = await sharp(trimmed).resize(newW, newH).toBuffer();

    const outBuffer = await sharp({
      create: { width: CANVAS, height: CANVAS, channels: 3, background: "#ffffff" },
    })
      .composite([{ input: resized, gravity: "center" }])
      .jpeg({ quality: 90 })
      .toBuffer();

    fs.writeFileSync(filePath, outBuffer);
    done++;
    if (done % 200 === 0) console.log(`${done}/${files.length}`);
  } catch (e) {
    failed.push({ file, error: e.message });
  }
}

console.log(`Done: ${done}/${files.length}`);
if (failed.length) {
  console.log(`Failed (${failed.length}):`);
  failed.forEach((f) => console.log(`  ${f.file}: ${f.error}`));
  fs.writeFileSync("normalize-failed.json", JSON.stringify(failed, null, 2));
}
