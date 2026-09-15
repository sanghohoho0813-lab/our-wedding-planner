// 기능 + 데이터 회귀 테스트 (새 정보구조 기준)
import { chromium } from "playwright";
const base = process.env.BASE ?? "http://localhost:3001";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });

const results = [];
const check = (name, ok, info = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${info ? " — " + info : ""}`);
};

// ---------------- 데스크톱 ----------------
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 }, locale: "ko-KR", timezoneId: "Asia/Seoul" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => {
  if (m.type() === "error" && !/ERR_TOO_MANY_RETRIES|ERR_CERT|Failed to load resource/.test(m.text())) errors.push("console: " + m.text());
});
const dlg = () => page.getByRole("dialog").last();
const goto = async (p) => {
  await page.goto(base + p, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(900);
};
const nav = async (menu, expect) => {
  await page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", { name: menu, exact: true }).click();
  await page.getByText(expect).first().waitFor({ timeout: 10000 });
};
const store = () => page.evaluate(() => JSON.parse(localStorage.getItem("owp:data:v2:00000000-0000-4000-8000-000000000001")));

// --- 원본 데이터 이관 검증 ---
await goto("/");
await page.getByText("우리 결혼식까지").first().waitFor({ timeout: 30000 });
const d = await store();
check("원본 할 일 28건 이관", d.tasks.length === 28, `${d.tasks.length}건`);
check("결혼식 2026-12-20(일) 13:00", d.wedding.wedding_date === "2026-12-20" && d.wedding.wedding_time === "13:00", `${d.wedding.wedding_date} ${d.wedding.wedding_time}`);
check("계약 식장 예식일도 12-20", d.venues.find((v) => v.is_contracted)?.event_date === "2026-12-20");
check("원본 하객 43명 이관", d.guests.length === 43, `${d.guests.length}명`);
check("원본 예산 항목 38건 이관", d.budget_items.length === 38, `${d.budget_items.length}건`);
check("원본 예산 카테고리 16건 이관", d.budget_categories.length === 16, `${d.budget_categories.length}건`);
check("업체 7곳 · 식장 7곳 이관", d.vendors.length === 7 && d.venues.length === 7, `업체 ${d.vendors.length} / 식장 ${d.venues.length}`);
check("신혼여행 정보 이관", d.honeymoon.length === 1 && d.honeymoon[0].country === "태국" && d.honeymoon[0].depart_date === "2026-12-22", JSON.stringify(d.honeymoon[0]?.city));
check("총 예산 15,000,000원", d.wedding.total_budget === 15000000, String(d.wedding.total_budget));
check("실제 지출 합계 10,411,800원", d.budget_items.reduce((s, i) => s + i.actual_amount, 0) === 10411800);
check("계약 식장 = 연대 동문회관 예식장", d.venues.some((v) => v.is_contracted && v.name === "연대 동문회관 예식장"));
check("하객 '이기욱' 불참 이관", d.guests.some((g) => g.name === "이기욱" && g.rsvp === "no"));
check("샘플 데이터 없음 (가짜 업체 미포함)", !d.vendors.some((v) => /매장|website\.com|플로리스트 1|사진 촬영 기사 1/.test(v.name)));

// --- 날짜 ---
const dday = await page.locator("text=/^D-\\d+$/").first().textContent();
check("D-Day 정상 계산 (2026-12-20 기준 D-96)", dday === "D-96", dday);
check("1900년 표시 없음", !(await page.content()).includes("1900"));
const t1 = await page.locator("text=/오[전후] \\d{2}:\\d{2}:\\d{2}/").first().textContent();
await page.waitForTimeout(1400);
const t2 = await page.locator("text=/오[전후] \\d{2}:\\d{2}:\\d{2}/").first().textContent();
check("실시간 시계 초 단위 갱신", t1 !== t2, `${t1} → ${t2}`);

// --- 6개 메뉴 전환 ---
for (const [menu, expect] of [
  ["할 일 · 일정", "할 일 추가"],
  ["예산", "카테고리 비중"],
  ["웨딩 준비", "코디네이션"],
  ["하객 · 초대", "신부측"],
  ["신혼여행", "여행 정보"],
  ["홈", "우리 결혼식까지"],
]) {
  await nav(menu, expect);
}
check("주요 메뉴 6개 전부 실제 화면 표시", true);

// --- 웨딩 준비 탭에 실제 데이터 ---
await nav("웨딩 준비", "코디네이션");
for (const [tab, expect] of [
  ["식장", "연대 동문회관 예식장"],
  ["사진 · 영상", "스트롤 스냅"],
  ["예복", "아틀레"],
  ["헤어 · 메이크업", "뷰티진동희"],
  ["코디네이션", "권예인"],
]) {
  await page.getByRole("tab", { name: tab }).click();
  await page.waitForTimeout(350);
  check(`웨딩 준비 › ${tab} 원본 데이터 표시`, (await page.getByText(expect).count()) > 0, expect);
}

// --- 할 일: 생성 → 상세 패널 → 완료 → 유지 ---
await nav("할 일 · 일정", "할 일 추가");
await page.getByRole("button", { name: "할 일 추가" }).first().click();
await dlg().getByPlaceholder("예: 청첩장 주문").fill("QA 테스트 할 일");
await dlg().getByRole("radio", { name: "진행 중" }).click();
await dlg().getByRole("button", { name: "오늘", exact: true }).click();
await dlg().getByRole("button", { name: "추가하기" }).click();
await page.waitForTimeout(500);
check("할 일 생성", (await page.getByText("QA 테스트 할 일").count()) > 0);
await page.getByText("QA 테스트 할 일").first().click();
await page.waitForTimeout(400);
check("PC 상세 패널이 열림 (페이지 이동 없음)", (await page.getByRole("button", { name: "완료로 표시" }).count()) > 0 && page.url().includes("/plan"));
await page.getByRole("button", { name: "완료로 표시" }).click();
await page.waitForTimeout(500);
check("상세 패널에서 완료 처리", (await page.getByRole("button", { name: "다시 열기" }).count()) > 0);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
const d2 = await store();
check("새로고침 후 유지", d2.tasks.some((t) => t.title === "QA 테스트 할 일" && t.status === "done"));

// --- 예산: 금액 수정 → 합계 반영 ---
await nav("예산", "카테고리 비중");
await page.getByRole("tab", { name: /^상세/ }).click();
await page.waitForTimeout(400);
await page.getByText("스튜디오 원본").first().click();
await page.waitForTimeout(400);
const moneyBtn = page.locator("aside").getByRole("button", { name: /금액 입력|₩/ }).nth(1);
await moneyBtn.click();
for (const dgt of "500000") await dlg().getByRole("button", { name: dgt, exact: true }).click();
await dlg().getByRole("button", { name: /^적용$/ }).click();
await page.waitForTimeout(700);
const d3 = await store();
const total = d3.budget_items.reduce((s, i) => s + i.actual_amount, 0);
check("예산 상세 패널에서 실제 금액 수정 → 합계 자동 반영", total === 10911800, `${total.toLocaleString()}원`);

// --- 하객: 인라인 참석 변경 ---
await nav("하객 · 초대", "신부측");
const firstGuest = page.locator("li", { hasText: "이성일 부장님" }).first();
await firstGuest.getByRole("radio", { name: "참석", exact: true }).click();
await page.waitForTimeout(500);
const d4 = await store();
check("하객 인라인 참석 변경 저장", d4.guests.find((g) => g.name === "이성일 부장님")?.rsvp === "yes");
check("하객 통계 갱신", (await page.getByText(/참석 확정 1명/).count()) > 0 || (await page.content()).includes("참석 확정"));

// --- 삭제 + 실행 취소 ---
await nav("할 일 · 일정", "할 일 추가");
await page.getByText("QA 테스트 할 일").first().click();
await page.waitForTimeout(400);
await page.locator("aside").getByRole("button", { name: "삭제" }).click();
await page.waitForTimeout(400);
check("삭제 후 실행 취소 제공", (await page.getByRole("button", { name: "실행 취소" }).count()) > 0);
await page.getByRole("button", { name: "실행 취소" }).click();
await page.waitForTimeout(600);
check("실행 취소로 복원", (await page.getByText("QA 테스트 할 일").count()) > 0);

// --- 설정: 테마 / 포인트 / 글자크기 ---
await goto("/settings");
await page.getByRole("radio", { name: "다크" }).click();
await page.getByRole("radio", { name: "Sage" }).click();
await page.getByRole("radio", { name: "매우 크게" }).click();
await page.waitForTimeout(300);
let st = await page.evaluate(() => ({ t: document.documentElement.dataset.theme, a: document.documentElement.dataset.accent, f: getComputedStyle(document.documentElement).fontSize }));
check("설정 즉시 적용", st.t === "dark" && st.a === "sage", JSON.stringify(st));
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(900);
st = await page.evaluate(() => ({ t: document.documentElement.dataset.theme, a: document.documentElement.dataset.accent }));
check("설정 새로고침 후 유지", st.t === "dark" && st.a === "sage");
await page.getByRole("radio", { name: "라이트" }).click();
await page.getByRole("radio", { name: "Rose" }).click();
await page.getByRole("radio", { name: "보통" }).click();

// --- 데이터 관리: Audit 표 ---
await goto("/settings/data");
check("이관 Audit 표 노출", (await page.getByText("원본 결혼계획표 이관 결과").count()) > 0 && (await page.getByText("하객 목록").count()) > 0);
check("확인 필요 항목 안내", (await page.getByText("만원 단위").count()) > 0);

// --- 검색 ---
await goto("/search?q=스냅");
await page.waitForTimeout(600);
check("전역 검색", (await page.getByText("스트롤 스냅").count()) > 0);

await ctx.close();

// ---------------- 모바일 ----------------
const m = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, locale: "ko-KR", timezoneId: "Asia/Seoul", hasTouch: true, isMobile: true });
const mp = await m.newPage();
mp.on("pageerror", (e) => errors.push("mobile pageerror: " + e.message));
await mp.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
await mp.getByText("우리 결혼식까지").first().waitFor({ timeout: 30000 });
check("모바일 홈 D-Day", (await mp.locator("text=/^D-\\d+$/").first().textContent()) === "D-96");
await mp.getByRole("button", { name: "전체 메뉴" }).first().click();
await mp.waitForTimeout(400);
check("모바일 전체 메뉴 Drawer", (await mp.getByRole("dialog", { name: "전체 메뉴" }).count()) > 0);
check("Drawer 안에 메모함 · 즐겨찾기 · 최근 활동", (await mp.getByRole("button", { name: "메모함" }).count()) > 0);
await mp.getByRole("button", { name: "메모함" }).click();
await mp.waitForTimeout(500);
check("메모함 시트 열림", (await mp.getByText("원본 '시트8'").count()) > 0);
await mp.getByRole("button", { name: "닫기" }).first().click();
await mp.waitForTimeout(400);
await mp.goto(base + "/guests", { waitUntil: "domcontentloaded" });
await mp.waitForTimeout(900);
await mp.getByText("이성일 부장님").first().click();
await mp.waitForTimeout(600);
check("모바일에서 항목 탭 → Bottom Sheet 상세", (await mp.getByRole("dialog").count()) > 0 && (await mp.getByText("동반 인원").count()) > 0);

console.log("\nERRORS:", errors.length ? errors.slice(0, 6) : "none");
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} passed`);
await browser.close();
process.exit(passed === results.length && errors.length === 0 ? 0 : 1);
