// Screenshot a localhost page for design comparison.
// Usage: node screenshot.mjs http://localhost:3000 [label]
// Requires puppeteer installed in the project (npm install puppeteer --save-dev)
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const url = process.argv[2];
const label = process.argv[3];

if (!url) {
  console.error("Usage: node screenshot.mjs <url> [label]");
  process.exit(1);
}
if (!url.startsWith("http://localhost") && !url.startsWith("http://127.0.0.1")) {
  console.error("Refusing to screenshot a non-localhost URL. Serve the page locally first (see serve.mjs).");
  process.exit(1);
}

const outDir = path.join(process.cwd(), "temporary screenshots");
fs.mkdirSync(outDir, { recursive: true });

const existing = fs.readdirSync(outDir).filter((f) => f.startsWith("screenshot-"));
const nextN = existing.length
  ? Math.max(...existing.map((f) => parseInt(f.match(/screenshot-(\d+)/)?.[1] || "0", 10))) + 1
  : 1;

const fileName = `screenshot-${nextN}${label ? "-" + label : ""}.png`;
const outPath = path.join(outDir, fileName);

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: "networkidle0" });
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();

console.log(`Saved ${outPath}`);
