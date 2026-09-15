// Functional QA: create/edit/delete, persistence after reload, computed numbers, settings, D-Day & clock
import { chromium } from "playwright";
const base = process.env.BASE ?? "http://localhost:3000";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, locale: "ko-KR", timezoneId: "Asia/Seoul", hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !/ERR_TOO_MANY_RETRIES|ERR_CERT/.test(m.text())) errors.push("console: " + m.text()); });
const results = [];
const check = (name, ok, info = "") => { results.push({ name, ok, info }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${info ? " — " + info : ""}`); };
const dlg = () => page.getByRole("dialog").last();
const goto = async (p) => { await page.goto(base + p, { waitUntil: "networkidle" }); await page.waitForTimeout(600); };
const typeMoney = async (amount) => {
  // MoneySheet is open: press digits then 적용
  for (const d of String(amount)) await page.getByRole("dialog").last().getByRole("button", { name: d, exact: true }).click();
  await page.getByRole("dialog").last().getByRole("button", { name: /^적용$/ }).click();
};

// ---- D-Day & clock ----
await goto("/");
const dday = await page.locator("text=/^D-\\d+$/").first().textContent();
check("D-Day 표시", dday === "D-97", dday);
const t1 = await page.locator("text=/오[전후] \\d{2}:\\d{2}:\\d{2}/").first().textContent();
await page.waitForTimeout(1500);
const t2 = await page.locator("text=/오[전후] \\d{2}:\\d{2}:\\d{2}/").first().textContent();
check("실시간 시계 초 단위 갱신", t1 !== t2, `${t1} → ${t2}`);

// ---- Task create ----
await goto("/tasks");
await page.getByRole("button", { name: "할 일 추가" }).first().click();
await dlg().getByPlaceholder("예: 청첩장 주문").fill("QA 청첩장 주문");
await dlg().getByRole("radio", { name: "진행 중" }).click();
await dlg().getByRole("button", { name: "오늘", exact: true }).click();
await dlg().getByRole("button", { name: "중요", exact: true }).click();
await dlg().getByRole("button", { name: "추가하기" }).click();
await page.waitForTimeout(500);
check("할 일 생성", await page.getByText("QA 청첩장 주문").count() > 0);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(800);
check("할 일 새로고침 후 유지", await page.getByText("QA 청첩장 주문").count() > 0);
// complete via check circle
const row = page.locator("li", { hasText: "QA 청첩장 주문" }).first();
await row.getByRole("checkbox").click();
await page.waitForTimeout(600);
check("할 일 완료 토글", (await page.locator("h2", { hasText: "완료" }).count()) > 0);

// ---- Budget item with amounts & payment ----
await goto("/budget/items");
await page.getByRole("button", { name: "비용 추가" }).first().click();
await dlg().getByPlaceholder("예: 스튜디오 촬영").fill("QA 웨딩홀 대관");
await dlg().getByRole("button", { name: "웨딩홀" }).click();
await dlg().getByRole("button", { name: "금액 입력" }).nth(0).click();
await typeMoney(5000000);
await page.getByRole("dialog").first().getByRole("button", { name: "금액 입력" }).nth(0).click(); // second money field
await typeMoney(5500000);
await dlg().getByRole("button", { name: "추가하기" }).click();
await page.waitForTimeout(600);
check("예산 항목 생성", await page.getByText("QA 웨딩홀 대관").count() > 0);
check("예상/실제 차액 표시", await page.getByText("+₩500,000 (+10.0%)").count() > 0);
// open and add payment
await page.getByText("QA 웨딩홀 대관").first().click();
await dlg().getByRole("button", { name: "결제 기록 추가" }).click();
await dlg().getByRole("button", { name: "계약금" }).click();
await dlg().getByRole("button", { name: /^₩5,500,000$/ }).last().click(); // payment amount field prefilled with unpaid
await dlg().getByRole("button", { name: "지우기" }).first().click();
await typeMoney(1000000);
await page.getByRole("dialog").first().getByRole("button", { name: "결제 완료" }).click();
await page.getByRole("dialog").first().getByRole("button", { name: "결제 추가" }).click();
await page.waitForTimeout(400);
const dtext = await page.getByRole("dialog").first().innerText();
check("결제 기록 추가 · 미결제 계산", dtext.includes("₩1,000,000") && dtext.includes("₩4,500,000"), dtext.replace(/\s+/g, " ").slice(0, 200));
await page.getByRole("dialog").first().getByRole("button", { name: "닫기" }).last().click();

await goto("/budget");
const html = await page.content();
check("예산 대시보드 합계: 총 견적 ₩5,000,000", html.includes("₩5,000,000"));
check("예산 대시보드 합계: 실제 ₩5,500,000", html.includes("₩5,500,000"));
check("예산 대시보드: 결제 ₩1,000,000 / 남은 결제 ₩4,500,000", html.includes("₩1,000,000") && html.includes("₩4,500,000"));
check("예산 대시보드: 증감 +₩500,000", html.includes("+₩500,000"));
// set total budget 25,000,000 and check ratio 22.0%
await page.getByRole("button", { name: "총 예산을 정해보세요" }).click();
await typeMoney(25000000);
await page.waitForTimeout(600);
const html2 = await page.content();
check("총 예산 설정 후 사용률 22.0%", html2.includes("22.0%"), "");

// ---- Guests ----
await goto("/guests");
await page.getByRole("button", { name: "하객 추가" }).first().click();
await dlg().getByPlaceholder("이름").fill("QA 김하객");
await dlg().getByRole("radio", { name: "신부측" }).click();
await dlg().getByRole("radio", { name: "참석", exact: true }).click();
await dlg().getByRole("button", { name: "늘리기" }).click();
await dlg().getByRole("button", { name: "늘리기" }).click();
await dlg().getByRole("button", { name: "추가하기" }).click();
await page.waitForTimeout(500);
const gh = await page.content();
check("하객 생성 및 통계 (참석 확정 1명, 예상 총 3명)", gh.includes("QA 김하객") && gh.includes("참석 확정 1명") && gh.includes("예상 총 3명"));
// inline rsvp change
await page.locator("li", { hasText: "QA 김하객" }).getByRole("radio", { name: "불참" }).click();
await page.waitForTimeout(400);
check("하객 인라인 참석 변경", (await page.content()).includes("참석 확정 0명"));

// ---- Delete with undo ----
await page.getByText("QA 김하객").first().click();
await dlg().getByRole("button", { name: "삭제" }).click();
await page.waitForTimeout(300);
check("삭제 토스트 + 실행 취소", (await page.getByRole("button", { name: "실행 취소" }).count()) > 0);
await page.getByRole("button", { name: "실행 취소" }).click();
await page.waitForTimeout(400);
check("실행 취소로 복원", (await page.getByText("QA 김하객").count()) > 0);

// ---- Settings ----
await goto("/settings");
await page.getByRole("radio", { name: "다크" }).click();
await page.getByRole("radio", { name: "Sage" }).click();
await page.getByRole("radio", { name: "매우 크게" }).click();
await page.waitForTimeout(300);
let st = await page.evaluate(() => ({ t: document.documentElement.dataset.theme, a: document.documentElement.dataset.accent, f: getComputedStyle(document.documentElement).fontSize, accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() }));
check("설정 즉시 적용 (dark/sage/120%)", st.t === "dark" && st.a === "sage" && st.f === "19.2px", JSON.stringify(st));
await page.reload({ waitUntil: "networkidle" });
st = await page.evaluate(() => ({ t: document.documentElement.dataset.theme, a: document.documentElement.dataset.accent, f: getComputedStyle(document.documentElement).fontSize }));
check("설정 새로고침 후 유지", st.t === "dark" && st.a === "sage" && st.f === "19.2px", JSON.stringify(st));
await page.getByRole("radio", { name: "라이트" }).click();
await page.getByRole("radio", { name: "Rose" }).click();
await page.getByRole("radio", { name: "보통" }).click();

// ---- Activity + search ----
await goto("/activity");
check("최근 활동 기록", (await page.content()).includes("QA 웨딩홀 대관"));
await goto("/search?q=QA");
await page.waitForTimeout(500);
check("전역 검색", (await page.getByText("QA 청첩장 주문").count()) > 0 && (await page.getByText("QA 웨딩홀 대관").count()) > 0);

// ---- Drawer & quick add ----
await goto("/");
await page.getByRole("button", { name: "전체 메뉴" }).first().click();
await page.waitForTimeout(400);
check("햄버거 메뉴 열림", (await page.getByRole("dialog", { name: "전체 메뉴" }).count()) > 0);
await dlg().getByRole("button", { name: "닫기" }).first().click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: "빠른 추가" }).click();
await page.waitForTimeout(400);
check("빠른 추가 메뉴", (await page.getByText("메모 추가").count()) > 0);
await page.getByText("메모 추가").click();
await page.waitForTimeout(400);
await dlg().getByPlaceholder(/스냅 작가님/).fill("QA 메모 테스트");
await dlg().getByRole("button", { name: "저장하기" }).click();
await page.waitForTimeout(500);
check("빠른 메모 저장 → 홈 메모함 표시", (await page.getByText("QA 메모 테스트").count()) > 0);

console.log("\nERRORS:", errors.length ? errors : "none");
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`);
await browser.close();
process.exit(results.every((r) => r.ok) && errors.length === 0 ? 0 : 1);
