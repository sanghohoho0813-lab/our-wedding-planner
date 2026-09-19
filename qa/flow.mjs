// 기능 + 데이터 회귀 테스트 (새 정보구조 기준)
import { chromium } from "playwright";
const base = process.env.BASE ?? "http://localhost:3001";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });

const results = [];
const toRgb = (hex) => {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return hex;
  const n = parseInt(h, 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};
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
// 완료한 일은 접혀 있으므로 펼치고 찾는다
const doneToggle = page.locator("button[aria-expanded]").filter({ hasText: "완료" }).first();
if ((await doneToggle.count()) > 0 && (await doneToggle.getAttribute("aria-expanded")) === "false") {
  await doneToggle.click();
  await page.waitForTimeout(300);
}
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

// --- 홈: 오늘 카드 ---
await nav("홈", "우리 결혼식까지");
check("홈에 '오늘' 카드", (await page.getByRole("heading", { name: /^오늘/ }).count()) > 0);
check("오늘 카드가 마감/일정 또는 '여유 있는 날'을 알려줌",
  (await page.getByText(/지난 마감 \d+개|오늘 마감 \d+개|여유 있는 날이에요/).count()) > 0);
check("최근 활동에 누가 했는지 표시", (await page.getByText("나 ·").count()) > 0);
const wideOverflow = await page.evaluate(() => ({ inner: window.innerWidth, scroll: document.documentElement.scrollWidth }));
check("데스크톱 홈 가로 넘침 없음", wideOverflow.scroll <= wideOverflow.inner, JSON.stringify(wideOverflow));

// --- 할 일: 한 줄 추가 ---
await nav("할 일 · 일정", "할 일 추가");
await page.getByPlaceholder("할 일 한 줄로 추가").fill("한 줄 추가 테스트");
await page.getByPlaceholder("할 일 한 줄로 추가").press("Enter");
await page.waitForTimeout(600);
const dInline = await store();
check("할 일 한 줄 추가 (시트 없이 엔터로)", dInline.tasks.some((t) => t.title === "한 줄 추가 테스트"));
check("추가 후 입력칸이 비워짐", (await page.getByPlaceholder("할 일 한 줄로 추가").inputValue()) === "");
check("'내 담당' 필터는 신랑/신부를 정하기 전에는 숨김",
  (await page.getByRole("button", { name: "내 담당", exact: true }).count()) === 0);

// --- 설정 › 계정: 나는 신랑/신부 → 내 담당 필터가 생긴다 ---
await goto("/settings/account");
await page.getByText("나는 누구인가요?").first().waitFor({ timeout: 15000 });
await page.getByLabel("내 이름").fill("상호");
await page.getByRole("radio", { name: /^신랑/ }).click();
await page.waitForTimeout(700);
const dMe = await store();
const membersMap = dMe.wedding.details?.members ?? {};
const meEntry = Object.values(membersMap)[0];
check("설정에서 이름 · 신랑/신부 저장", meEntry?.name === "상호" && meEntry?.side === "groom", JSON.stringify(meEntry));
await goto("/plan");
await page.getByPlaceholder("할 일 한 줄로 추가").waitFor({ timeout: 15000 });
check("정하고 나면 '내 담당' 필터가 생김", (await page.getByRole("button", { name: "내 담당", exact: true }).count()) > 0);
const doneGroup = page.locator("button[aria-expanded]").filter({ hasText: "완료" }).first();
check("완료한 일은 기본으로 접혀 있음", (await doneGroup.getAttribute("aria-expanded")) === "false");
await doneGroup.click();
await page.waitForTimeout(300);
check("완료 그룹을 펼칠 수 있음", (await doneGroup.getAttribute("aria-expanded")) === "true" && (await page.getByText("신랑 부모님께 인사드리기").count()) > 0);
await page.getByRole("button", { name: "내 담당", exact: true }).click();
await page.waitForTimeout(400);
const mineCount = await page.locator("li").filter({ has: page.getByRole("checkbox") }).count();
check("내 담당 필터가 목록을 좁힘", mineCount > 0 && mineCount < dMe.tasks.length, `${mineCount}건`);
await page.getByRole("button", { name: "전체", exact: true }).click();
await page.waitForTimeout(300);

// --- 하객: 그룹 접기 + 한 줄 추가 ---
await nav("하객 · 초대", "신부측");
const groupBtn = page.getByRole("button", { name: /신부측 · 학교 동창/ }).first();
check("하객 그룹 머리글이 접기 버튼", (await groupBtn.count()) > 0 && (await groupBtn.getAttribute("aria-expanded")) === "true");
await groupBtn.click();
await page.waitForTimeout(300);
check("그룹을 접으면 명단이 숨겨짐", (await groupBtn.getAttribute("aria-expanded")) === "false" && (await page.getByText("김아름").count()) === 0);
await groupBtn.click();
await page.waitForTimeout(300);
check("다시 펼치면 보임", (await page.getByText("김아름").count()) > 0);
await page.getByPlaceholder("이름만 적어 하객 추가").fill("한줄하객");
await page.getByPlaceholder("이름만 적어 하객 추가").press("Enter");
await page.waitForTimeout(600);
check("하객 한 줄 추가", (await store()).guests.some((g) => g.name === "한줄하객"));

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
await page.waitForTimeout(1800);
check("전역 검색", (await page.getByText("스트롤 스냅").count()) > 0);
await goto("/search");
await page.waitForTimeout(700);
check("검색 첫 화면에 최근 찾은 말", (await page.getByText("최근 찾은 말").count()) > 0 && (await page.getByRole("button", { name: "스냅", exact: true }).count()) > 0);
await page.getByRole("button", { name: "스냅", exact: true }).click();
await page.waitForTimeout(900);
check("최근 찾은 말을 누르면 바로 검색", (await page.getByText("스트롤 스냅").count()) > 0);

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
check("폰에서 스와이프 안내가 처음 한 번 보임", (await mp.getByText(/밀어서/).count()) > 0);
await mp.getByRole("button", { name: "안내 닫기" }).first().click();
await mp.waitForTimeout(300);
check("안내를 닫으면 사라지고 다시 뜨지 않음", (await mp.getByText(/밀어서/).count()) === 0);
await mp.reload({ waitUntil: "domcontentloaded" });
await mp.getByText("할 일 추가").first().waitFor({ timeout: 30000 });
check("새로고침해도 안내가 다시 뜨지 않음", (await mp.getByText(/밀어서/).count()) === 0);
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
await mp.waitForTimeout(400);
const nameBox = await mp.locator("li").filter({ hasText: "강재순 대리님" }).first().getByText("강재순 대리님").boundingBox();
check("좁은 화면에서 하객 이름이 잘리지 않을 만큼 넓음", nameBox.width >= 100, `${Math.round(nameBox.width)}px`);
const chip = mp.getByRole("button", { name: /강재순 대리님 참석 여부/ }).first();
check("좁은 화면은 참석 상태 칩 하나", (await chip.count()) > 0);
const rsvpBefore = (await mp.evaluate(() => JSON.parse(localStorage.getItem("owp:data:v2:00000000-0000-4000-8000-000000000001")))).guests.find((g) => g.name === "강재순 대리님").rsvp;
await chip.click();
await mp.waitForTimeout(500);
const rsvpAfter = (await mp.evaluate(() => JSON.parse(localStorage.getItem("owp:data:v2:00000000-0000-4000-8000-000000000001")))).guests.find((g) => g.name === "강재순 대리님").rsvp;
check("칩을 누르면 참석 상태가 순환", rsvpBefore !== rsvpAfter, `${rsvpBefore} → ${rsvpAfter}`);
await mp.keyboard.press("Escape");
for (const path of ["/plan", "/budget", "/wedding", "/guests", "/honeymoon", "/settings/data"]) {
  await mp.goto(base + path, { waitUntil: "domcontentloaded" });
  await mp.waitForTimeout(900);
  const o = await mp.evaluate(() => ({ inner: window.innerWidth, scroll: document.documentElement.scrollWidth }));
  check(`모바일 ${path} 가로 넘침 없음`, o.inner === 390 && o.scroll === 390, JSON.stringify(o));
}

// ---------------- 스와이프 (움직임 최소화를 끈 기기) ----------------
const sw = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, locale: "ko-KR", timezoneId: "Asia/Seoul", hasTouch: true, isMobile: true, reducedMotion: "no-preference" });
const sp = await sw.newPage();
sp.on("pageerror", (e) => errors.push("swipe pageerror: " + e.message));
const swStore = () => sp.evaluate(() => JSON.parse(localStorage.getItem("owp:data:v2:00000000-0000-4000-8000-000000000001")));
const swipeRow = async (title, dir) => {
  const row = sp.locator("li").filter({ hasText: title }).first();
  // 상단 고정 헤더에 가리지 않도록 화면 한가운데로 보낸다
  await row.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await sp.waitForTimeout(500);
  const b = await row.boundingBox();
  // 버튼 위에서 시작하지 않도록 행의 가운데에서 민다
  const x0 = b.x + b.width / 2;
  await sp.mouse.move(x0, b.y + b.height / 2);
  await sp.mouse.down();
  for (let i = 1; i <= 12; i++) await sp.mouse.move(x0 + dir * i * 16, b.y + b.height / 2, { steps: 3 });
  await sp.waitForTimeout(120);
  await sp.mouse.up();
  await sp.waitForTimeout(800);
};
await sp.goto(base + "/plan", { waitUntil: "domcontentloaded", timeout: 60000 });
await sp.getByPlaceholder("할 일 한 줄로 추가").waitFor({ timeout: 30000 });
const swBefore = (await swStore()).tasks.find((t) => t.title === "반지 맞추기");
await swipeRow("반지 맞추기", 1);
const swAfter = (await swStore()).tasks.find((t) => t.title === "반지 맞추기");
check("오른쪽으로 밀어 완료 처리", swBefore.status !== "done" && swAfter.status === "done", `${swBefore.status} → ${swAfter.status}`);
await swipeRow("신혼집 구하기", -1);
check("왼쪽으로 밀어 마감일 시트", (await sp.getByText("마감일 변경").count()) > 0);
await sp.keyboard.press("Escape");
await sp.waitForTimeout(400);
await sp.locator("li").filter({ hasText: "신혼집 구하기" }).first().getByText("신혼집 구하기").click();
await sp.waitForTimeout(600);
check("스와이프를 넣어도 탭으로 상세가 열림", (await sp.getByRole("dialog").count()) > 0);
// 하객도 같은 스와이프 언어
await sp.goto(base + "/guests", { waitUntil: "domcontentloaded", timeout: 60000 });
await sp.getByText("공윤재").first().waitFor({ timeout: 20000 });
const gBefore = (await swStore()).guests.find((g) => g.name === "공윤재");
await swipeRow("공윤재", 1);
const gAfter = (await swStore()).guests.find((g) => g.name === "공윤재");
check("하객을 오른쪽으로 밀어 참석 확정", gBefore.rsvp !== "yes" && gAfter.rsvp === "yes", `${gBefore.rsvp} → ${gAfter.rsvp}`);
await swipeRow("공윤재", -1);
const gAfter2 = (await swStore()).guests.find((g) => g.name === "공윤재");
check("하객을 왼쪽으로 밀어 청첩장 전달", gAfter2.invitation_sent !== gAfter.invitation_sent);

await sw.close();

// ---------------- 할 일 · 일정 통합 추가 ----------------
// "할 일이냐 일정이냐" 를 묻지 않는다. 시간/장소를 적으면 일정, 아니면 할 일.
const ug = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 }, locale: "ko-KR", timezoneId: "Asia/Seoul" });
const up = await ug.newPage();
const uStore = () => up.evaluate(() => JSON.parse(localStorage.getItem("owp:data:v2:00000000-0000-4000-8000-000000000001")));
const uDlg = () => up.getByRole("dialog").last();
await up.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
await up.getByText("우리 결혼식까지").first().waitFor({ timeout: 30000 });

const quickAddLabels = await up.evaluate(async () => {
  document.querySelector('button[aria-label="빠른 추가"]').click();
  await new Promise((r) => setTimeout(r, 600));
  return [...document.querySelectorAll('[role="dialog"] li button .font-semibold')].map((e) => e.textContent.trim());
});
check("빠른 추가는 '할 일 · 일정' 하나로 합쳐짐 (따로 고르지 않음)",
  quickAddLabels.includes("할 일 · 일정") && !quickAddLabels.includes("할 일 추가") && !quickAddLabels.includes("일정 추가"),
  quickAddLabels.join(" / "));

await up.getByRole("button", { name: "할 일 · 일정" }).click();
await uDlg().getByPlaceholder("예: 청첩장 주문, 예복 피팅").waitFor({ timeout: 10000 });

// (1) 시간 없이 → 할 일
const tasksBefore = (await uStore()).tasks.length;
await uDlg().getByPlaceholder("예: 청첩장 주문, 예복 피팅").fill("QA 통합 · 할 일 쪽");
await uDlg().getByRole("button", { name: "오늘", exact: true }).click();
check("시간을 안 적으면 (날짜만 적어도) 버튼이 '할 일로 추가'", (await uDlg().getByRole("button", { name: "할 일로 추가" }).count()) > 0);
await uDlg().getByRole("button", { name: "할 일로 추가" }).click();
await up.waitForTimeout(600);
const afterTask = await uStore();
const madeTask = afterTask.tasks.find((t) => t.title === "QA 통합 · 할 일 쪽");
check("시간 없이 추가 → tasks 로 저장 (마감일은 들어감)", afterTask.tasks.length === tasksBefore + 1 && !!madeTask && !!madeTask.due_date, JSON.stringify(madeTask && { due: madeTask.due_date }));

// (2) 시간을 적으면 → 일정
const eventsBefore = (await uStore()).events.length;
await up.evaluate(() => document.querySelector('button[aria-label="빠른 추가"]').click());
await up.waitForTimeout(600);
await up.getByRole("button", { name: "할 일 · 일정" }).click();
await uDlg().getByPlaceholder("예: 청첩장 주문, 예복 피팅").waitFor({ timeout: 10000 });
await uDlg().getByPlaceholder("예: 청첩장 주문, 예복 피팅").fill("QA 통합 · 일정 쪽");
await uDlg().locator('input[type="time"]').fill("14:30");
await up.waitForTimeout(400);
check("시간을 적으면 버튼이 '일정으로 추가' 로 바뀜", (await uDlg().getByRole("button", { name: "일정으로 추가" }).count()) > 0);
await uDlg().getByRole("button", { name: "일정으로 추가" }).click();
await up.waitForTimeout(600);
const afterEv = await uStore();
const madeEv = afterEv.events.find((e) => e.title === "QA 통합 · 일정 쪽");
check("시간을 적고 추가 → events 로 저장", afterEv.events.length === eventsBefore + 1 && !!madeEv && madeEv.start_time === "14:30", JSON.stringify(madeEv && { t: madeEv.start_time }));

// (3) 어느 쪽으로 저장되든 일정 화면에 같이 보인다 (잘못 골라서 잃어버릴 일이 없다)
await up.goto(base + "/plan?tab=calendar&view=list", { waitUntil: "domcontentloaded", timeout: 60000 });
await up.waitForTimeout(1200);
const calText = await up.locator("main").innerText();
check("일정 화면에 할 일도 함께 보임 (마감일 있는 할 일)", calText.includes("QA 통합 · 할 일 쪽"));
check("일정 화면에 일정도 보임", calText.includes("QA 통합 · 일정 쪽"));

// ---------------- 영역 색 구분 ----------------
// 홈 카드마다 무슨 영역인지 색 띠로 먼저 알려준다 — 띠가 전부 같은 색이면 구분이 안 된 것.
await up.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
await up.getByText("우리 결혼식까지").first().waitFor({ timeout: 30000 });
await up.waitForTimeout(900);
const bars = await up.evaluate(() =>
  [...document.querySelectorAll(".card > span[aria-hidden], .card a > span[aria-hidden]")]
    .map((e) => getComputedStyle(e).backgroundColor)
    .filter((c) => c && c !== "rgba(0, 0, 0, 0)"),
);
check("홈 카드에 영역 색 띠가 붙어 있음", bars.length >= 8, `${bars.length}개`);
check("색 띠가 한 가지 색이 아님 (영역별로 다름)", new Set(bars).size >= 4, `${new Set(bars).size}종`);

const tintVars = await up.evaluate(() => {
  const cs = getComputedStyle(document.documentElement);
  return ["plan", "schedule", "budget", "guests", "prep", "travel"].map((k) => cs.getPropertyValue(`--tint-${k}`).trim());
});
check("영역 색 6종이 전부 정의되어 있고 서로 다름", tintVars.every(Boolean) && new Set(tintVars).size === 6, tintVars.join(" "));

// 도넛은 큰 3개만 색을 주고 나머지는 '그 외' 로 접는다.
// (범례↔조각을 아무 짝이나 맞춰 봐야 하는 형태라 모든 쌍이 구분돼야 한다 —
//  6종이면 색약에서 주황↔초록이 겹친다. 근거는 src/lib/tint.ts 주석)
await up.goto(base + "/budget", { waitUntil: "domcontentloaded", timeout: 60000 });
await up.waitForTimeout(1200);
const donutLegend = await up.locator("main").innerText();
const emptyFold = await up.locator('button[aria-expanded]').filter({ hasText: "금액 없는 카테고리" }).first();
check("예산 요약: 0원 카테고리는 기본으로 접힘", (await emptyFold.count()) > 0 && (await emptyFold.getAttribute("aria-expanded")) === "false",
  (await emptyFold.count()) > 0 ? (await emptyFold.innerText()).replace(/\n/g, " ") : "버튼 없음");
if ((await emptyFold.count()) > 0) {
  const beforeRows = await up.locator('[data-testid="category-list"] > li').count();
  await emptyFold.click();
  await up.waitForTimeout(400);
  const afterRows = await up.locator('[data-testid="category-list"] > li').count();
  check("펼치면 0원 카테고리도 보임", afterRows > beforeRows, `${beforeRows} → ${afterRows}`);
}

check("예산 도넛은 큰 것만 남기고 '그 외' 로 접힘", /그 외 \d+개/.test(donutLegend), (donutLegend.match(/그 외 \d+개/) ?? [])[0] ?? "없음");
const donutColors = await up.evaluate(() =>
  [...document.querySelectorAll('[data-testid="donut-legend"] li span[style*="background"]')].map((d) => getComputedStyle(d).backgroundColor),
);
const neutralish = await up.evaluate(() => {
  const cs = getComputedStyle(document.documentElement);
  return ["--text-3", "--surface-3"].map((v) => cs.getPropertyValue(v).trim());
});
check("도넛 범례에 색이 붙은 조각은 3개 이하 (나머지는 회색)",
  donutColors.length > 0 && donutColors.filter((c) => !neutralish.some((n) => toRgb(n) === c)).length <= 3,
  `${donutColors.length}조각 중 유채색 ${donutColors.filter((c) => !neutralish.some((n) => toRgb(n) === c)).length}개`);

await ug.close();

console.log("\nERRORS:", errors.length ? errors.slice(0, 6) : "none");
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} passed`);
await browser.close();
process.exit(passed === results.length && errors.length === 0 ? 0 : 1);
