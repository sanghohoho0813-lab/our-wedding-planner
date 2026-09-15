// 이미 2026-12-21 로 저장돼 있던 기존 사용자 데이터가 한 번만 자동 보정되는지 확인
import { chromium } from "playwright";
const base = process.env.BASE ?? "http://localhost:3001";
const KEY = "owp:data:v2:00000000-0000-4000-8000-000000000001";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 }, locale: "ko-KR", timezoneId: "Asia/Seoul" });
const page = await ctx.newPage();

// 1) 옛 날짜 + 사용자가 고친 흔적이 있는 데이터를 심는다
await page.goto(base + "/", { waitUntil: "domcontentloaded" });
await page.getByText("우리 결혼식까지").first().waitFor({ timeout: 30000 });
await page.evaluate((key) => {
  const d = JSON.parse(localStorage.getItem(key));
  d.wedding.wedding_date = "2026-12-21";
  delete d.wedding.details.data_version;
  d.venues = d.venues.map((v) => (v.is_contracted ? { ...v, event_date: "2026-12-21" } : v));
  d.tasks[0].title = "내가 직접 고친 할 일";
  localStorage.setItem(key, JSON.stringify(d));
}, KEY);

await page.reload({ waitUntil: "domcontentloaded" });
await page.getByText("우리 결혼식까지").first().waitFor({ timeout: 30000 });
await page.waitForTimeout(1200);
const after = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), KEY);
const dday = await page.locator("text=/^D-\\d+$/").first().textContent();

console.log("결혼식 날짜:", after.wedding.wedding_date, "| 시간:", after.wedding.wedding_time);
console.log("계약 식장 예식일:", after.venues.find((v) => v.is_contracted)?.event_date);
console.log("data_version:", after.wedding.details.data_version);
console.log("사용자가 고친 할 일 보존:", after.tasks[0].title);
console.log("화면 D-Day:", dday);
const ok = after.wedding.wedding_date === "2026-12-20" && after.venues.find((v) => v.is_contracted)?.event_date === "2026-12-20" && after.tasks[0].title === "내가 직접 고친 할 일" && dday === "D-96";
console.log(ok ? "PASS 기존 데이터 자동 보정 + 사용자 수정 보존" : "FAIL");
await browser.close();
process.exit(ok ? 0 : 1);
