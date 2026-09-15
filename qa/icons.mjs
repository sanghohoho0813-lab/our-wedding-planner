import { chromium } from "playwright";
import { readFileSync } from "fs";
const svg = readFileSync("/home/user/our-wedding-planner/public/icons/icon.svg", "utf8");
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const [name, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["apple-touch-icon.png", 180]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:#F8F3EF">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: `/home/user/our-wedding-planner/public/icons/${name}`, omitBackground: false });
  await page.close();
}
await browser.close();
console.log("icons written");
