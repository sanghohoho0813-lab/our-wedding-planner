import { chromium } from "playwright";
const base = "http://localhost:3001";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: "ko-KR", timezoneId: "Asia/Seoul", reducedMotion: "no-preference" });
const page = await ctx.newPage();
const store = () => page.evaluate(() => JSON.parse(localStorage.getItem("owp:data:v2:00000000-0000-4000-8000-000000000001")));

await page.goto(base + "/plan", { waitUntil: "domcontentloaded" });
await page.getByPlaceholder("할 일 한 줄로 추가").waitFor({ timeout: 30000 });

// 1) 한 줄 추가
await page.getByPlaceholder("할 일 한 줄로 추가").fill("스와이프 테스트 할 일");
await page.getByPlaceholder("할 일 한 줄로 추가").press("Enter");
await page.waitForTimeout(700);
let d = await store();
const made = d.tasks.find((t) => t.title === "스와이프 테스트 할 일");
console.log("한 줄 추가:", made ? "성공" : "실패");

// 2) 오른쪽으로 밀어 완료
const row = page.locator("li", { hasText: "스와이프 테스트 할 일" }).first();
const box = await row.boundingBox();
await page.mouse.move(box.x + 40, box.y + box.height / 2);
await page.mouse.down();
for (let i = 1; i <= 12; i++) await page.mouse.move(box.x + 40 + i * 12, box.y + box.height / 2, { steps: 2 });
await page.mouse.up();
await page.waitForTimeout(900);
d = await store();
const after = d.tasks.find((t) => t.title === "스와이프 테스트 할 일");
console.log("오른쪽 스와이프 → 완료:", after?.status === "done" ? "성공" : `실패 (${after?.status})`);

// 3) 왼쪽으로 밀어 마감일 시트
const row2 = page.locator("li", { hasText: "스와이프 테스트 할 일" }).first();
const b2 = await row2.boundingBox();
await page.mouse.move(b2.x + 300, b2.y + b2.height / 2);
await page.mouse.down();
for (let i = 1; i <= 12; i++) await page.mouse.move(b2.x + 300 - i * 12, b2.y + b2.height / 2, { steps: 2 });
await page.mouse.up();
await page.waitForTimeout(900);
console.log("왼쪽 스와이프 → 마감일 시트:", (await page.getByText("마감일 변경").count()) > 0 ? "성공" : "실패");
await page.keyboard.press("Escape");
await page.waitForTimeout(400);

// 4) 탭해서 상세 열기(스와이프가 클릭을 막지 않는지)
await page.locator("li", { hasText: "스와이프 테스트 할 일" }).first().getByText("스와이프 테스트 할 일").click();
await page.waitForTimeout(700);
console.log("탭 → 상세 시트:", (await page.getByRole("dialog").count()) > 0 ? "성공" : "실패");
await browser.close();
