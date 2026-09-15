// usage: node shot.mjs <path> <name> [width height] [theme] [accent] [fontScale]
import { chromium } from "playwright";
const [,, path = "/", name = "home", w = "390", h = "844", theme = "light", accent = "rose", fs = "1"] = process.argv;
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1, locale: "ko-KR", timezoneId: "Asia/Seoul", hasTouch: Number(w) < 768, reducedMotion: process.env.REDUCE ? "reduce" : "no-preference" });
await ctx.addInitScript(({ theme, accent, fs }) => {
  localStorage.setItem("owp:settings", JSON.stringify({ state: { theme, accent, fontScale: Number(fs) }, version: 0 }));
}, { theme, accent, fs });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
await page.goto((process.env.BASE ?? "http://localhost:3000") + path, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForTimeout(1500);
const metrics = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  bodyScrollWidth: document.body.scrollWidth,
  title: document.title,
  theme: document.documentElement.dataset.theme,
  accent: document.documentElement.dataset.accent,
  fontSize: getComputedStyle(document.documentElement).fontSize,
}));
await page.screenshot({ path: `/home/user/our-wedding-planner/qa/${name}.png`, fullPage: true });
console.log(JSON.stringify({ name, ...metrics, horizontalOverflow: metrics.scrollWidth > metrics.clientWidth, errors: errors.slice(0, 10) }));
await browser.close();
