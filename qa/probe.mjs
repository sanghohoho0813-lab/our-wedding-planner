import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 } });
await page.goto((process.env.BASE ?? "http://localhost:3001") + "/guests", { waitUntil: "networkidle" });
const info = await page.evaluate(() => {
  const pick = (label) => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === label);
  const desc = (b) => { if (!b) return null; const cs = getComputedStyle(b); return { color: cs.color, bg: cs.backgroundColor, fontSize: cs.fontSize, height: b.getBoundingClientRect().height }; };
  return { neutralChip: desc(pick("모두")), primaryButton: desc(pick("하객 추가")), accentChip: desc(pick("전체")) };
});
console.log(JSON.stringify(info));
await browser.close();
