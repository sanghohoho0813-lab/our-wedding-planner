/**
 * 실사용 마찰 감사 (PASS 1) + 데이터 정확성 감사 (PASS 2)
 *
 *   BASE=http://localhost:3001 node qa/audit.mjs
 *
 * 화면을 실제로 조작하면서 '사람이 몇 번 손대야 하는지' 를 센다.
 * 탭 · 타이핑을 세어 목표치와 비교하고, 넘은 것만 표시한다.
 * 데이터 쪽은 같은 값이 화면마다 같게 나오는지를 본다(단일 진실원천).
 *
 * 한 시나리오가 실패해도 나머지는 계속 돈다 — 못 끝낸 것 자체가 마찰이다.
 */
import { chromium } from "playwright";

const base = process.env.BASE ?? "http://localhost:3001";
const WID = "00000000-0000-4000-8000-000000000001";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });

const friction = [];
const data = [];
const errors = [];

const store = (page) => page.evaluate((w) => JSON.parse(localStorage.getItem(`owp:data:v2:${w}`)), WID);
const nums = (s) => (s.match(/[\d,]+/g) ?? []).map((x) => Number(x.replace(/,/g, "")));

async function newCtx(w = 390, h = 844) {
  const c = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: w, height: h },
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    hasTouch: w < 768,
  });
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  p.on("console", (e) => {
    if (e.type() === "error" && !/ERR_|Failed to load resource/.test(e.text())) errors.push("console: " + e.text());
  });
  return { c, p };
}

/** 한 시나리오의 손동작을 센다 */
function meter(page) {
  const m = { tap: 0, type: 0, nav: 0 };
  return {
    m,
    async tap(locator) {
      m.tap++;
      const before = page.url();
      await locator.click({ timeout: 15000 });
      await page.waitForTimeout(300);
      if (page.url() !== before) m.nav++;
    },
    async type(locator, text) {
      m.type++;
      await locator.fill(text, { timeout: 15000 });
      await page.waitForTimeout(150);
    },
    async goto(path) {
      m.nav++;
      await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(900);
    },
  };
}

async function scenario(page, name, goal, fn) {
  const t = meter(page);
  try {
    const note = (await fn(t)) ?? "";
    const total = t.m.tap + t.m.type;
    friction.push({ name, ...t.m, total, goal, ok: total <= goal && !note.startsWith("❌"), note });
  } catch (e) {
    friction.push({
      name,
      ...t.m,
      total: 99,
      goal,
      ok: false,
      note: "❌ 끝내지 못함: " + String(e.message).split("\n")[0].slice(0, 64),
    });
  }
}

// =====================================================================
// PASS 1 — 마찰 (모바일 390px, 실제 주 사용 환경)
// =====================================================================
{
  const { c, p } = await newCtx();
  await p.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.getByText("우리 결혼식까지").first().waitFor({ timeout: 30000 });
  const fab = () => p.locator('button[aria-label="빠른 추가"]');
  const dlg = () => p.getByRole("dialog").last();

  await scenario(p, "A. 오늘 할 일 확인", 0, async () => {
    const home = await p.locator("main").innerText();
    return /오늘|지난 마감|여유 있는 날/.test(home) ? "홈 첫 화면에 보임" : "❌ 홈에서 안 보임";
  });

  await scenario(p, "B. 할 일 추가 (홈 FAB)", 4, async (t) => {
    await t.tap(fab());
    await t.tap(p.getByRole("button", { name: "할 일 · 일정" }));
    await t.type(p.getByPlaceholder("예: 청첩장 주문, 예복 피팅"), "감사A 할일");
    await t.tap(p.getByRole("button", { name: "할 일로 추가" }));
    const d = await store(p);
    return d.tasks.some((x) => x.title === "감사A 할일") ? "" : "❌ 저장 안 됨";
  });

  await scenario(p, "B2. 할 일 추가 (목록에서)", 2, async (t) => {
    await t.goto("/plan");
    const box = p.getByPlaceholder("할 일 한 줄로 추가").first();
    await box.waitFor({ timeout: 20000 });
    await t.type(box, "감사B 할일");
    t.m.tap++;
    await box.press("Enter");
    await p.waitForTimeout(600);
    const d = await store(p);
    return d.tasks.some((x) => x.title === "감사B 할일") ? "제목만 치고 엔터" : "❌ 저장 안 됨";
  });

  await scenario(p, "C. 할 일 완료", 1, async (t) => {
    const row = p.locator("li").filter({ hasText: "감사B 할일" }).first();
    await t.tap(row.getByRole("checkbox").first());
    await p.waitForTimeout(500);
    const d = await store(p);
    return d.tasks.find((x) => x.title === "감사B 할일")?.status === "done" ? "목록에서 원탭" : "❌ 안 바뀜";
  });

  await scenario(p, "D. 일정 추가 (시간 포함)", 5, async (t) => {
    await t.tap(fab());
    await t.tap(p.getByRole("button", { name: "할 일 · 일정" }));
    await t.type(p.getByPlaceholder("예: 청첩장 주문, 예복 피팅"), "감사 일정");
    await t.type(dlg().locator('input[type="time"]'), "14:00");
    await t.tap(p.getByRole("button", { name: "일정으로 추가" }));
    const d = await store(p);
    return d.events.some((x) => x.title === "감사 일정") ? "" : "❌ 저장 안 됨";
  });

  await scenario(p, "E. 비용 추가", 5, async (t) => {
    await t.tap(fab());
    await t.tap(p.getByRole("button", { name: "비용" }));
    const box = dlg().getByRole("textbox").first();
    await t.type(box, "감사 비용");
    await t.tap(dlg().getByRole("button", { name: /추가하기/ }).first());
    await p.waitForTimeout(600);
    const d = await store(p);
    return d.budget_items.some((x) => x.name === "감사 비용") ? "" : "❌ 저장 안 됨";
  });

  await scenario(p, "F. 금액 수정", 3, async (t) => {
    await t.goto("/budget?tab=items");
    const row = p.locator("main li").filter({ hasText: "감사 비용" }).first();
    const btn = row.getByRole("button", { name: /실제 금액 고치기/ }).first();
    if ((await btn.count()) === 0) return "❌ 목록에서 금액을 못 누름";
    await t.tap(btn);
    const pad = p.getByRole("dialog").last();
    for (const k of ["7", "0", "0", "0", "0", "0"]) await pad.getByRole("button", { name: k, exact: true }).first().click();
    t.m.type++;
    await t.tap(pad.getByRole("button", { name: /확인|적용|저장/ }).first());
    await p.waitForTimeout(700);
    const v = (await store(p)).budget_items.find((x) => x.name === "감사 비용");
    return v && v.actual_amount === 700000 ? "목록에서 금액 탭 → 숫자패드 → 확인" : `❌ 저장 안 됨 (${v?.actual_amount})`;
  });

  await scenario(p, "G. 결제 완료 (홈에서)", 1, async (t) => {
    await t.goto("/");
    const box = p.locator("li").filter({ hasText: /결제|잔금|당일/ }).first().getByRole("checkbox").first();
    if ((await box.count()) === 0) return "❌ 홈 '다가오는 결제' 에 체크가 없음";
    const before = (await store(p)).payments.filter((x) => x.paid).length;
    await t.tap(box);
    await p.waitForTimeout(600);
    const after = (await store(p)).payments.filter((x) => x.paid).length;
    return after > before ? "홈에서 원탭" : "❌ 눌러도 결제완료가 안 됨";
  });

  await scenario(p, "H. 하객 추가", 2, async (t) => {
    await t.goto("/guests");
    const box = p.getByPlaceholder(/하객 이름 추가|이름만 적어 하객 추가/).first();
    await box.waitFor({ timeout: 20000 });
    await t.type(box, "감사하객");
    t.m.tap++;
    await box.press("Enter");
    await p.waitForTimeout(700);
    return (await store(p)).guests.some((x) => x.name === "감사하객") ? "이름만 치고 엔터" : "❌ 저장 안 됨";
  });

  await scenario(p, "I. 참석 상태 변경", 1, async (t) => {
    const row = p.locator("li").filter({ hasText: "감사하객" }).first();
    const chip = row.getByRole("button").filter({ hasText: /미정|참석|불참/ }).first();
    if ((await chip.count()) === 0) return "❌ 목록에서 못 바꿈 (상세를 열어야 함)";
    const before = (await store(p)).guests.find((x) => x.name === "감사하객").rsvp;
    await t.tap(chip);
    await p.waitForTimeout(500);
    const after = (await store(p)).guests.find((x) => x.name === "감사하객").rsvp;
    return after !== before ? `목록에서 원탭 (${before}→${after})` : "❌ 안 바뀜";
  });

  await scenario(p, "J. 청첩장 전달", 1, async (t) => {
    const row = p.locator("li").filter({ hasText: "감사하객" }).first();
    const env = row.getByRole("button", { name: /청첩장/ }).first();
    if ((await env.count()) === 0) return "❌ 목록에서 못 바꿈";
    await t.tap(env);
    await p.waitForTimeout(500);
    return (await store(p)).guests.find((x) => x.name === "감사하객").invitation_sent ? "목록에서 원탭" : "❌ 안 바뀜";
  });

  await scenario(p, "K. 업체 확인 → 수정", 3, async (t) => {
    await t.goto("/wedding");
    await p.getByText("코디네이션").first().waitFor({ timeout: 20000 });
    await t.tap(p.getByRole("tab", { name: "식장" }));
    const tabText = await p.locator("main").innerText();
    const money = /₩[\d,]+/.test(tabText);
    await t.tap(p.getByText("연대 동문회관 예식장").first());
    const opened = (await dlg().count()) > 0;
    return `${money ? "탭에서 금액 보임" : "❌ 탭에 금액이 안 보임"} · ${opened ? "탭하면 상세" : "❌ 상세 안 열림"}`;
  });

  await scenario(p, "L. 신혼여행 확인", 1, async (t) => {
    await t.goto("/honeymoon");
    const txt = await p.locator("main").innerText();
    return /12\.2\d|12월 2\d|출발/.test(txt) ? "첫 화면에 출발 정보" : "❌ 출발일이 안 보임";
  });

  await scenario(p, "M. 메모 기록", 4, async (t) => {
    await t.tap(fab());
    await t.tap(p.getByRole("button", { name: "메모" }));
    await t.type(dlg().locator("textarea").first(), "감사 메모");
    await t.tap(dlg().getByRole("button", { name: /저장/ }).first());
    await p.waitForTimeout(600);
    return (await store(p)).memos.some((x) => x.content === "감사 메모") ? "" : "❌ 저장 안 됨";
  });

  await scenario(p, "N. 삭제 → 실행 취소", 3, async (t) => {
    await t.goto("/plan");
    await p.getByPlaceholder("할 일 한 줄로 추가").first().waitFor({ timeout: 20000 });
    await t.tap(p.getByText("감사A 할일").first());
    await t.tap(p.getByRole("button", { name: "삭제" }).first());
    await p.waitForTimeout(500);
    const undo = p.getByRole("button", { name: "실행 취소" });
    if ((await undo.count()) === 0) return "❌ 실행 취소가 안 뜸";
    await t.tap(undo.first());
    await p.waitForTimeout(600);
    return (await store(p)).tasks.some((x) => x.title === "감사A 할일") ? "6초 안에 되살림" : "❌ 못 되살림";
  });

  await scenario(p, "O. 누가 바꿨는지", 1, async (t) => {
    await t.goto("/");
    const txt = await p.locator("main").innerText();
    return /최근 활동/.test(txt) ? "홈에 최근 활동" : "❌ 홈에서 안 보임";
  });

  await c.close();
}

// =====================================================================
// PASS 2 — 데이터 정확성
// =====================================================================
{
  const { c, p } = await newCtx(1440, 900);
  await p.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.getByText("우리 결혼식까지").first().waitFor({ timeout: 30000 });
  const d = await store(p);
  const check = (name, ok, info = "") => data.push({ name, ok, info });

  // 원장부에서 직접 센 값 (앱을 거치지 않은 정답)
  const rawActual = d.budget_items.reduce((s, i) => s + i.actual_amount, 0);
  const rawPaid = d.payments.filter((x) => x.paid).reduce((s, x) => s + x.amount, 0);
  const rawExpected = d.guests.filter((g) => g.rsvp !== "no").reduce((s, g) => s + 1 + (g.companions ?? 0), 0);
  const rawConfirmed = d.guests.filter((g) => g.rsvp === "yes").reduce((s, g) => s + 1 + (g.companions ?? 0), 0);
  const doneTasks = d.tasks.filter((t) => t.status === "done").length;
  const rawPct = Math.round((doneTasks / d.tasks.length) * 100);

  const homeTxt = await p.locator("main").innerText();
  const homeUsed = nums(homeTxt.split("사용 금액")[1] ?? "")[0];
  const homePct = nums(homeTxt.split("준비 진행률")[1] ?? "")[0];
  check("홈 '사용 금액' = 실제금액 합계", homeUsed === rawActual, `${homeUsed} vs ${rawActual}`);
  check("홈 '준비 진행률' = 완료/전체", homePct === rawPct, `${homePct}% vs ${rawPct}%`);

  await p.goto(base + "/budget", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1300);
  const budTxt = await p.locator("main").innerText();
  const budActual = nums(budTxt.split("총 실제 비용")[1] ?? "")[0];
  const budPaid = nums(budTxt.split("총 결제 금액")[1] ?? "")[0];
  check("예산 '총 실제 비용' = 실제금액 합계", budActual === rawActual, `${budActual} vs ${rawActual}`);
  check("예산 '총 결제 금액' = 결제완료 합계", budPaid === rawPaid, `${budPaid} vs ${rawPaid}`);
  check("홈과 예산이 같은 '사용 금액'", homeUsed === budActual, `홈 ${homeUsed} vs 예산 ${budActual}`);

  await p.goto(base + "/guests", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1300);
  const gTxt = await p.locator("main").innerText();
  const gExpected = nums(gTxt.split("예상 총 인원")[1] ?? "")[0];
  const sideSum = ["groom", "bride", "both"].reduce((s, k) => s + d.guests.filter((g) => g.side === k).length, 0);
  check("하객 '예상 총 인원' = 불참 뺀 (본인+동반)", gExpected === rawExpected, `${gExpected} vs ${rawExpected}`);
  check("신랑 + 신부 + 공통 = 전체", sideSum === d.guests.length, `${sideSum} vs ${d.guests.length}`);
  check("참석확정 ≤ 예상 인원", rawConfirmed <= rawExpected, `${rawConfirmed} ≤ ${rawExpected}`);

  const seoul = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const [y, mo, dd] = seoul.split("-").map(Number);
  const want = Math.round((Date.UTC(2026, 11, 20) - Date.UTC(y, mo - 1, dd)) / 86400000);
  await p.goto(base + "/", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(900);
  const dday = await p.locator("text=/^D-\\d+$/").first().textContent();
  check(`D-Day = D-${want}`, dday === `D-${want}`, dday ?? "없음");
  check("결혼식 날짜 2026-12-20", d.wedding.wedding_date === "2026-12-20", d.wedding.wedding_date);
  check("음수 금액 없음", !d.budget_items.some((i) => i.actual_amount < 0 || i.estimated_amount < 0));
  check("음수 동반인원 없음", !d.guests.some((g) => (g.companions ?? 0) < 0));
  check("1900년대 날짜 없음", !JSON.stringify(d).includes('"19'), "");

  await c.close();
}

// =====================================================================
const W = 26;
console.log("\n\x1b[1m=== PASS 1. 마찰 감사 (사람이 손대는 횟수) ===\x1b[0m");
console.log("  " + "시나리오".padEnd(W - 4) + " 탭  입력  이동  합계 목표");
for (const f of friction) {
  const mark = f.ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
  const t = f.total === 99 ? " - " : String(f.total).padStart(3);
  console.log(`${mark} ${f.name.padEnd(W)}${String(f.tap).padStart(2)} ${String(f.type).padStart(4)} ${String(f.nav).padStart(5)} ${t} ${String(f.goal).padStart(4)}  ${f.note}`);
}

console.log("\n\x1b[1m=== PASS 2. 데이터 정확성 ===\x1b[0m");
for (const c of data) console.log(`${c.ok ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m"} ${c.name}${c.info ? " — " + c.info : ""}`);

const over = friction.filter((f) => !f.ok);
const bad = data.filter((c) => !c.ok);
console.log(`\n\x1b[1m고쳐야 할 마찰 ${over.length}개 / ${friction.length}\x1b[0m`);
for (const f of over) console.log(`   · ${f.name}: ${f.note || `${f.total}번 (목표 ${f.goal})`}`);
console.log(`\x1b[1m데이터 불일치 ${bad.length}개 / ${data.length}\x1b[0m`);
for (const c of bad) console.log(`   · ${c.name}: ${c.info}`);
console.log("콘솔 오류:", errors.length ? errors.slice(0, 5) : "없음");

await browser.close();
process.exit(bad.length === 0 && errors.length === 0 ? 0 : 1);
