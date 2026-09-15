// 메뉴 전환 체감 속도 측정: 클릭 → 새 화면 콘텐츠 등장까지
import { chromium } from "playwright";

const base = process.env.BASE ?? "http://localhost:3001";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 }, locale: "ko-KR", timezoneId: "Asia/Seoul" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

// 네트워크 요청 추적 (전환 때 서버에 다시 묻는지 확인)
let requests = [];
page.on("request", (r) => requests.push(r.url()));

await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.getByText("우리 결혼식까지").first().waitFor({ timeout: 30000 });
await page.waitForTimeout(1200);

const STEPS = [
  { menu: "할 일 · 일정", expect: "할 일 추가" },
  { menu: "예산", expect: "카테고리 비중" },
  { menu: "웨딩 준비", expect: "코디네이션" },
  { menu: "하객 · 초대", expect: "신부측" },
  { menu: "신혼여행", expect: "여행 정보" },
  { menu: "홈", expect: "우리 결혼식까지" },
];

const results = [];
for (let round = 0; round < 2; round++) {
  for (const step of STEPS) {
    requests = [];
    const t0 = Date.now();
    await page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", { name: step.menu, exact: true }).click();
    await page.getByText(step.expect).first().waitFor({ state: "visible", timeout: 10000 });
    const ms = Date.now() - t0;
    const rsc = requests.filter((u) => !u.includes("/_next/static") && !u.startsWith("data:")).length;
    if (round === 1) results.push({ menu: step.menu, ms, rsc });
    await page.waitForTimeout(250);
  }
}

// 탭 전환 (라우팅 없음)
const tabTimes = [];
await page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", { name: "할 일 · 일정", exact: true }).click();
await page.getByText("할 일 추가").first().waitFor();
for (let i = 0; i < 4; i++) {
  for (const [label, kind, expect] of [["일정", "text", "지난 일정 보기"], ["할 일", "placeholder", "할 일 검색"]]) {
    const t0 = Date.now();
    await page.getByRole("tab", { name: new RegExp("^" + label) }).click();
    const loc = kind === "placeholder" ? page.getByPlaceholder(expect) : page.getByText(expect);
    await loc.first().waitFor({ state: "visible", timeout: 8000 });
    tabTimes.push({ tab: `${label} #${i + 1}`, ms: Date.now() - t0 });
    await page.waitForTimeout(200);
  }
}

console.log("=== 메뉴 전환 (클릭 → 콘텐츠 표시) ===");
for (const r of results) console.log(`${r.menu.padEnd(14)} ${String(r.ms).padStart(5)}ms   추가 네트워크 요청 ${r.rsc}건`);
console.log("\n=== 화면 안 탭 전환 ===");
for (const t of tabTimes) console.log(`${t.tab.padEnd(14)} ${String(t.ms).padStart(5)}ms`);
const worst = Math.max(...results.map((r) => r.ms), ...tabTimes.map((t) => t.ms));
console.log(`\n최대 ${worst}ms`);
console.log("ERRORS:", errors.length ? errors.slice(0, 5) : "none");
await browser.close();
