// 모바일 Drawer / Bottom Sheet 화면 캡처
import { chromium } from "playwright";
const base = process.env.BASE ?? "http://localhost:3001";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, locale: "ko-KR", timezoneId: "Asia/Seoul", hasTouch: true, isMobile: true });
const page = await ctx.newPage();

await page.goto(base + "/", { waitUntil: "domcontentloaded" });
await page.getByText("우리 결혼식까지").first().waitFor({ timeout: 30000 });
await page.getByRole("button", { name: "전체 메뉴" }).first().click();
await page.waitForTimeout(700);
await page.screenshot({ path: "qa/mobile-drawer.png" });
await page.getByRole("button", { name: "닫기" }).first().click();
await page.waitForTimeout(500);

await page.goto(base + "/guests", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
await page.getByText("이성일 부장님").first().click();
await page.waitForTimeout(800);
await page.screenshot({ path: "qa/mobile-sheet-guest.png" });
await page.keyboard.press("Escape");
await page.waitForTimeout(400);

await page.goto(base + "/budget", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1000);
await page.getByRole("tab", { name: /^상세/ }).click();
await page.waitForTimeout(500);
await page.getByText("장소 대관료 (기부금)").first().click();
await page.waitForTimeout(800);
await page.screenshot({ path: "qa/mobile-sheet-budget.png" });
await page.getByRole("dialog").getByRole("button", { name: /^₩/ }).first().click();
await page.waitForTimeout(700);
await page.screenshot({ path: "qa/mobile-keypad.png" });

console.log("captured");
await browser.close();
