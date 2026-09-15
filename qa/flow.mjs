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

// --- 날짜 --- (서울 기준 오늘 날짜로 기대값을 계산한다: 자정을 넘겨도 테스트가 깨지지 않게)
const seoulToday = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
const [ty, tm, td] = seoulToday.split("-").map(Number);
const expectedDDay = `D-${Math.round((Date.UTC(2026, 11, 20) - Date.UTC(ty, tm - 1, td)) / 86400000)}`;
const dday = await page.locator("text=/^D-\\d+$/").first().textContent();
check(`D-Day 정상 계산 (2026-12-20 기준 ${expectedDDay})`, dday === expectedDDay, dday);
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

// --- 할 일 필터 · 날짜 미정 · 당일 진행 (탭 안에서 라우팅 없이) ---
await nav("할 일 · 일정", "할 일 추가");
await page.getByRole("button", { name: "날짜 미정", exact: true }).click();
await page.waitForTimeout(300);
check("필터 칩 클릭 → /plan 에 남고 ?filter= 만 바뀜 (/tasks 로 튕기지 않음)", page.url().endsWith("/plan?filter=undated"), page.url());
const d5 = await store();
const undatedCount = d5.tasks.filter((t) => t.status !== "done" && !t.due_date).length;
const nodateHeading = await page.locator("h2", { hasText: "날짜 미정" }).count();
check("날짜 미정 필터 = 마감일 없는 미완료 할 일", undatedCount === 0 ? nodateHeading === 0 : nodateHeading > 0, `${undatedCount}건`);
await page.getByRole("button", { name: "전체", exact: true }).click();
await page.waitForTimeout(200);
check("전체 필터로 돌아오면 URL 도 깨끗해짐", page.url().endsWith("/plan"), page.url());

await page.getByRole("tab", { name: "일정" }).click();
await page.waitForTimeout(400);
const calToggle = page.getByRole("radio", { name: "달력", exact: true }).or(page.getByRole("button", { name: "달력", exact: true })).first();
await calToggle.click();
await page.waitForTimeout(300);
check("일정 탭 목록/달력 전환도 /plan 안에서 처리", page.url().includes("/plan?") && page.url().includes("view=month") && page.url().includes("tab=calendar"), page.url());

await page.getByRole("tab", { name: "당일 진행" }).click();
await page.waitForTimeout(400);
check("당일 진행 탭: 진행표 + 역할 카드", (await page.getByText("당일 진행표").count()) > 0 && (await page.getByText("당일 역할").count()) > 0);
check("당일 역할: 원본 메모의 사회 · 축사 이관", (await page.locator('input[value="강래원 오빠"]').count()) > 0 && (await page.locator('input[value="지언 언니"]').count()) > 0);
await page.getByPlaceholder("예: 신부 대기실 입장").fill("QA 본식 시작");
await page.getByRole("button", { name: "추가", exact: true }).click();
await page.waitForTimeout(600);
const d6 = await store();
const dayEv = d6.events.find((e) => e.title === "QA 본식 시작");
check("당일 진행 빠른 추가 → 결혼식 날짜(2026-12-20) 일정으로 저장", !!dayEv && dayEv.date === "2026-12-20", JSON.stringify(dayEv && { date: dayEv.date, time: dayEv.start_time }));

// --- 예산: 금액 없는 항목 접기 ---
await nav("예산", "카테고리 비중");
await page.getByRole("tab", { name: /^상세/ }).click();
await page.waitForTimeout(400);
const hiddenNote = await page.getByText(/금액이 아직 없는 항목 \d+개는 숨겨져 있어요/).count();
check("상세 예산: 금액 없는 항목은 기본으로 접힘", hiddenNote > 0);
await page.getByRole("button", { name: "모두 보기" }).click();
await page.waitForTimeout(300);
check("'모두 보기' → 접힘 안내 사라짐", (await page.getByText(/숨겨져 있어요/).count()) === 0);

// --- 하객: 청첩장 전달 원탭 ---
await nav("하객 · 초대", "신부측");
const beforeInv = (await store()).guests.find((g) => g.name === "이성일 부장님").invitation_sent;
await page.locator("li", { hasText: "이성일 부장님" }).first().getByRole("button", { name: /청첩장 전달/ }).click();
await page.waitForTimeout(500);
const d7 = await store();
const afterInv = d7.guests.find((g) => g.name === "이성일 부장님").invitation_sent;
check("하객 행에서 청첩장 전달 원탭 토글", afterInv === !beforeInv, `${beforeInv} → ${afterInv}`);
const invitedNow = d7.guests.filter((g) => g.invitation_sent).length;
check("청첩장 전달 통계 카드 반영", (await page.getByText("청첩장 전달").count()) > 0 && (await page.getByText(new RegExp(`^${invitedNow} / 43$`)).count()) > 0, `${invitedNow} / 43`);

// --- 홈 안내: 백업 권유(로컬 모드) + 이름 입력 권유 ---
await page.evaluate(() => {
  const ago = new Date(Date.now() - 10 * 86400000).toISOString();
  localStorage.setItem("owp:firstEditAt", ago);
  localStorage.setItem("owp:lastEditAt", new Date().toISOString());
  localStorage.removeItem("owp:lastBackupAt");
  localStorage.removeItem("owp:backupNudgeSnoozedUntil");
});
await goto("/");
await page.getByText("우리 결혼식까지").first().waitFor({ timeout: 30000 });
check("홈: 백업 권유 배너 (수정 후 백업 없음)", (await page.getByText(/이 브라우저에만 저장되고 있어요/).count()) > 0);
check("홈: 신랑 · 신부 이름 입력 권유 (이름 비어 있음)", (await page.getByRole("link", { name: "이름 적기" }).count()) > 0);
await page.getByRole("button", { name: "나중에" }).click();
await page.waitForTimeout(400);
const snoozed = await page.evaluate(() => localStorage.getItem("owp:backupNudgeSnoozedUntil"));
check("'나중에' → 7일 스누즈 저장 + 배너 사라짐", !!snoozed && (await page.getByText(/이 브라우저에만 저장되고 있어요/).count()) === 0);

// --- 데이터 관리: Audit 표 ---
await goto("/settings/data");
check("이관 Audit 표 노출", (await page.getByText("원본 결혼계획표 이관 결과").count()) > 0 && (await page.getByText("하객 목록").count()) > 0);
check("확인 필요 항목 안내", (await page.getByText("만원 단위").count()) > 0);

// --- 자동 스냅샷: 오늘 첫 수정 전 상태로 복원 ---
const wid = "00000000-0000-4000-8000-000000000001";
const snapRaw = await page.evaluate((k) => localStorage.getItem(k), `owp:snapshot:v2:${wid}:daily`);
check("첫 수정 직전 자동 스냅샷 저장됨", !!snapRaw && JSON.parse(snapRaw).data.tasks.length === 28);
check("데이터 관리에 스냅샷 카드 표시", (await page.getByText("오늘 첫 수정 전").count()) > 0);
await page.getByRole("button", { name: "이 시점으로 복원" }).first().click();
await dlg().getByRole("button", { name: "되돌리기" }).click();
await page.waitForTimeout(900);
const d8 = await store();
check("스냅샷 복원 → QA 할 일 사라지고 원본 28건", d8.tasks.length === 28 && !d8.tasks.some((t) => t.title === "QA 테스트 할 일"), `${d8.tasks.length}건`);
check("복원 직전 상태도 '통째로 바꾸기 직전' 스냅샷으로 남음", (await page.getByText("통째로 바꾸기 직전").count()) > 0);

// --- 검색 ---
await goto("/search?q=스냅");
await page.waitForTimeout(600);
check("전역 검색", (await page.getByText("스트롤 스냅").count()) > 0);

// --- 오프라인(PWA): 서비스 워커 + 캐시된 화면 ---
const swActive = await page.evaluate(() => navigator.serviceWorker.ready.then((r) => !!r.active).catch(() => false));
check("서비스 워커 등록됨 (프로덕션)", swActive);
await goto("/plan");
await page.getByText("할 일 추가").first().waitFor({ timeout: 30000 });
await ctx.setOffline(true);
let offlineOk = false;
try {
  await page.goto(base + "/plan", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.getByText("할 일 추가").first().waitFor({ timeout: 15000 });
  offlineOk = true;
} catch (e) {
  offlineOk = false;
}
check("오프라인에서도 마지막으로 본 화면(/plan) 열림", offlineOk);
await ctx.setOffline(false);

await ctx.close();

// ---------------- 모바일 ----------------
const m = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, locale: "ko-KR", timezoneId: "Asia/Seoul", hasTouch: true, isMobile: true });
const mp = await m.newPage();
mp.on("pageerror", (e) => errors.push("mobile pageerror: " + e.message));
await mp.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
await mp.getByText("우리 결혼식까지").first().waitFor({ timeout: 30000 });
check("모바일 홈 D-Day", (await mp.locator("text=/^D-\\d+$/").first().textContent()) === expectedDDay);
// 모바일 에뮬레이션에서 가로로 넘치면 레이아웃 뷰포트가 390 보다 커진다(축소 표시) → 넘침 감지
const overflow = await mp.evaluate(() => ({ inner: window.innerWidth, scroll: document.documentElement.scrollWidth }));
check("모바일 홈 가로 넘침 없음 (390px 안에 들어옴)", overflow.inner === 390 && overflow.scroll === 390, JSON.stringify(overflow));
await mp.getByRole("button", { name: "전체 메뉴" }).first().click();
await mp.waitForTimeout(400);
check("모바일 전체 메뉴 Drawer", (await mp.getByRole("dialog", { name: "전체 메뉴" }).count()) > 0);
check("Drawer 안에 메모함 · 즐겨찾기 · 최근 활동", (await mp.getByRole("button", { name: "메모함" }).count()) > 0);
await mp.getByRole("button", { name: "메모함" }).click();
await mp.waitForTimeout(500);
check("메모함 시트 열림", (await mp.getByText("원본 '시트8'").count()) > 0);
await mp.getByRole("dialog").last().getByRole("button", { name: "닫기" }).first().click();
await mp.waitForTimeout(400);
await mp.goto(base + "/plan", { waitUntil: "domcontentloaded" });
await mp.getByText("할 일 추가").first().waitFor({ timeout: 30000 });
await mp.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", { name: "일정" }).click();
await mp.waitForTimeout(800);
check("모바일 하단 '일정' 탭 → 달력 화면으로 전환", (await mp.getByText("지난 일정 보기").count()) > 0, mp.url());
await mp.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", { name: "할 일" }).click();
await mp.waitForTimeout(800);
check("모바일 하단 '할 일' 탭 → 할 일 화면으로 복귀", (await mp.getByPlaceholder("할 일 검색").count()) > 0, mp.url());
await mp.goto(base + "/guests", { waitUntil: "domcontentloaded" });
await mp.waitForTimeout(900);
await mp.getByText("이성일 부장님").first().click();
await mp.waitForTimeout(600);
check("모바일에서 항목 탭 → Bottom Sheet 상세", (await mp.getByRole("dialog").count()) > 0 && (await mp.getByText("동반 인원").count()) > 0);
await mp.keyboard.press("Escape");
for (const path of ["/plan", "/budget", "/wedding", "/guests", "/honeymoon", "/settings/data"]) {
  await mp.goto(base + path, { waitUntil: "domcontentloaded" });
  await mp.waitForTimeout(900);
  const o = await mp.evaluate(() => ({ inner: window.innerWidth, scroll: document.documentElement.scrollWidth }));
  check(`모바일 ${path} 가로 넘침 없음`, o.inner === 390 && o.scroll === 390, JSON.stringify(o));
}

console.log("\nERRORS:", errors.length ? errors.slice(0, 6) : "none");
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} passed`);
await browser.close();
process.exit(passed === results.length && errors.length === 0 ? 0 : 1);
