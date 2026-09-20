/**
 * 화면끼리 이어져 있는가 (PASS 2 · §48)
 *
 *   BASE=http://localhost:3001 node qa/crossdata.mjs
 *
 * 이 앱이 '화면 여러 개' 가 아니라 하나의 도구인지를 보는 검사다.
 * 한 곳에서 고친 것이 관련된 다른 곳에 그대로 반영되는지만 본다.
 * 그래서 검사 이름도 기능 이름이 아니라 **실제로 하는 행동**으로 적는다.
 */
import { chromium } from "playwright";

const base = process.env.BASE ?? "http://localhost:3001";
const WID = "00000000-0000-4000-8000-000000000001";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const results = [];
const check = (name, ok, info = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m"} ${name}${info ? "\n       " + info : ""}`);
};

const ctx = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1440, height: 900 },
  locale: "ko-KR",
  timezoneId: "Asia/Seoul",
});
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));

const store = () => p.evaluate((w) => JSON.parse(localStorage.getItem(`owp:data:v2:${w}`)), WID);
const seed = (fn) => p.evaluate(({ w, src }) => {
  const k = `owp:data:v2:${w}`;
  const d = JSON.parse(localStorage.getItem(k));
  // eslint-disable-next-line no-new-func
  new Function("d", src)(d);
  localStorage.setItem(k, JSON.stringify(d));
}, { w: WID, src: fn });
const go = async (path) => {
  await p.goto(base + path, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(1100);
};
const mainText = () => p.locator("main").innerText();
const num = (text, after) => {
  const seg = text.split(after)[1] ?? "";
  const m = seg.match(/[\d,]+/);
  return m ? Number(m[0].replace(/,/g, "")) : null;
};
/** 라벨 뒤에 처음 나오는 '₩금액' 을 읽는다 (1인 ₩55,000 의 '1' 을 집지 않게) */
const won = (text, after) => {
  const seg = text.split(after)[1] ?? "";
  const m = seg.match(/₩([\d,]+)/);
  return m ? Number(m[1].replace(/,/g, "")) : null;
};

await go("/");
await p.getByText("우리 결혼식까지").first().waitFor({ timeout: 30000 });

// ---------------------------------------------------------------
// 1. 드레스 피팅 날짜를 바꾸면 홈 '다가오는 일정' 도 같이 바뀐다
// ---------------------------------------------------------------
{
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const soon = new Date(Date.parse(today) + 3 * 86400000).toLocaleDateString("en-CA");
  const later = new Date(Date.parse(today) + 40 * 86400000).toLocaleDateString("en-CA");
  await seed(`d.events.push({ id: "x-fitting", wedding_id: d.wedding.id, title: "드레스 피팅", date: "${soon}",
    start_time: "14:00", end_time: null, type: "fitting", location: "아틀레", memo: null, is_done: false,
    source_type: null, source_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });`);
  await go("/");
  check("드레스 피팅을 넣으면 홈 '다가오는 일정' 에 나온다", (await mainText()).includes("드레스 피팅"));

  // 홈 '다가오는 일정' 은 기간이 아니라 '가까운 순 5건' 이다.
  // 그래서 날짜를 미루면 목록에서 빠지는 게 아니라 순서가 뒤로 간다.
  await go("/");
  const firstBefore = (await mainText()).split("다가오는 일정")[1]?.split("\n").filter(Boolean)[1] ?? "";
  await seed(`d.events.find(e => e.id === "x-fitting").date = "${later}";`);
  await go("/");
  const afterMove = await mainText();
  const firstAfter = afterMove.split("다가오는 일정")[1]?.split("\n").filter(Boolean)[1] ?? "";
  await go("/plan?tab=calendar&view=list");
  const inCalendar = (await mainText()).includes("드레스 피팅");
  check("날짜를 40일 뒤로 미루면 홈 '다가오는 일정' 의 차례가 뒤로 밀린다", firstBefore !== firstAfter, `${firstBefore} → ${firstAfter}`);
  check("미룬 일정도 달력에는 그대로 있다", inCalendar);
}

// ---------------------------------------------------------------
// 2. 하객 1명을 참석 + 동반 1로 바꾸면 총 참석 인원이 2 늘어난다
// ---------------------------------------------------------------
{
  await go("/guests");
  const before = num(await mainText(), "참석 확정") ?? 0;
  const target = (await store()).guests.find((g) => g.rsvp !== "yes");
  await seed(`const g = d.guests.find(x => x.id === "${target.id}"); g.rsvp = "yes"; g.companions = 1;`);
  await go("/guests");
  const after = num(await mainText(), "참석 확정") ?? 0;
  check("하객 1명을 참석 + 동반 1로 바꾸면 참석 인원이 2 늘어난다 (줄 수가 아니라 사람 수)", after === before + 2, `${before} → ${after}`);
}

// ---------------------------------------------------------------
// 3. 1인 식대를 넣으면 하객 수에 맞춰 예상 식대가 계산된다
// ---------------------------------------------------------------
{
  await seed(`const v = d.venues.find(x => x.is_contracted); v.meal_cost = 55000; v.guaranteed_guests = 100;`);
  await go("/guests");
  const txt = await mainText();
  const stats = await store();
  const expected = stats.guests.filter((g) => g.rsvp !== "no").reduce((s, g) => s + 1 + (g.companions ?? 0), 0);
  const billable = Math.max(100, expected);
  const shown = Number(((await p.locator('[data-testid="meal-cost"]').first().innerText()).match(/[\d,]+/) ?? ["0"])[0].replace(/,/g, ""));
  check("1인 식대를 넣으면 예상 식대가 나온다", shown === billable * 55000, `화면 ${shown} vs 계산 ${billable * 55000} (청구 ${billable}명)`);
  check("보증 인원에 못 미치면 빈자리 값을 알려준다", /보증 인원보다 \d+명 적어요/.test(txt), (txt.match(/보증 인원보다[^\n]*/) ?? [])[0] ?? "안내 없음");

  await go("/budget");
  const budgetMeal = Number(((await p.locator('[data-testid="meal-cost"]').first().innerText()).match(/[\d,]+/) ?? ["0"])[0].replace(/,/g, ""));
  check("예산 화면에서도 같은 예상 식대를 보여준다", budgetMeal === billable * 55000, `${budgetMeal}`);
}

// ---------------------------------------------------------------
// 4. 스냅 잔금을 결제 처리하면 '다가오는 결제' 에서 빠지고 결제완료가 늘어난다
// ---------------------------------------------------------------
{
  const item = (await store()).budget_items[0];
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const due = new Date(Date.parse(today) + 2 * 86400000).toLocaleDateString("en-CA");
  await seed(`d.payments.push({ id: "x-pay", wedding_id: d.wedding.id, budget_item_id: "${item.id}", title: "스냅 잔금",
    amount: 500000, due_date: "${due}", paid: false, paid_at: null, method: null, memo: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString() });`);
  await go("/budget");
  const beforeTxt = await mainText();
  const paidBefore = won(beforeTxt, "총 결제 금액");
  check("잔금을 넣으면 '다가오는 결제' 에 D-2 로 뜬다", beforeTxt.includes("스냅 잔금") && /D-2/.test(beforeTxt));

  await seed(`const x = d.payments.find(y => y.id === "x-pay"); x.paid = true; x.paid_at = "${today}";`);
  await go("/budget");
  const afterTxt = await mainText();
  check("결제 처리하면 '다가오는 결제' 에서 빠진다", !afterTxt.includes("스냅 잔금"));
  check("결제 처리하면 '총 결제 금액' 이 그만큼 늘어난다", won(afterTxt, "총 결제 금액") === paidBefore + 500000, `${paidBefore} → ${won(afterTxt, "총 결제 금액")}`);
  await go("/");
  check("홈 '다가오는 결제' 에서도 사라진다", !(await mainText()).includes("스냅 잔금"));
}

// ---------------------------------------------------------------
// 5. 할 일을 홈에서 완료하면 할 일 화면에서도 완료되어 있다
// ---------------------------------------------------------------
{
  await go("/");
  const openBefore = (await store()).tasks.filter((t) => t.status !== "done").map((t) => t.id);
  const row = p.locator("li").filter({ hasText: /D[-+]\d+/ }).first();
  await row.getByRole("checkbox").first().click();
  await p.waitForTimeout(800);
  const afterTasks = (await store()).tasks;
  const justDone = afterTasks.find((t) => t.status === "done" && openBefore.includes(t.id));
  await go("/plan?filter=done");
  check(
    "홈에서 완료한 할 일이 할 일 화면에서도 완료다",
    !!justDone && (await mainText()).includes(justDone.title),
    justDone?.title ?? "완료된 항목을 못 찾음",
  );
}

// ---------------------------------------------------------------
// 6. 마감일이 있는 할 일은 일정 화면에도 같이 보인다
// ---------------------------------------------------------------
{
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  await seed(`d.tasks.push({ id: "x-task", wedding_id: d.wedding.id, title: "양가 상견례 장소 예약", category: "상견례",
    status: "todo", priority: "high", assignee: "both", due_date: "${today}", memo: null, is_favorite: false,
    sort_order: 0, completed_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });`);
  await go("/plan?tab=calendar&view=list");
  check("마감일이 있는 할 일은 일정 화면에도 보인다", (await mainText()).includes("양가 상견례 장소 예약"));
  await go("/");
  check("오늘 마감인 할 일은 홈 '오늘' 에도 뜬다", (await mainText()).includes("양가 상견례 장소 예약"));
}

// ---------------------------------------------------------------
// 7. 메모를 할 일로 옮기면 할 일 목록에 생긴다
// ---------------------------------------------------------------
{
  await seed(`d.memos.push({ id: "x-memo", wedding_id: d.wedding.id, content: "감사 답례품 업체 알아보기",
    converted_to: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });`);
  await go("/");
  await p.getByText("감사 답례품 업체 알아보기").first().click();
  await p.waitForTimeout(700);
  const dlg = p.getByRole("dialog").last();
  const hasConvert = (await dlg.getByRole("button", { name: "할 일" }).count()) > 0;
  if (hasConvert) {
    await dlg.getByRole("button", { name: "할 일" }).click();
    await p.waitForTimeout(800);
  }
  const d = await store();
  check("메모를 '할 일' 로 옮기면 할 일에 생긴다", hasConvert && d.tasks.some((t) => t.title === "감사 답례품 업체 알아보기"));
  check("옮긴 메모는 지워지지 않고 '옮김' 으로 표시된다", d.memos.find((m) => m.id === "x-memo")?.converted_to === "tasks");
}

// ---------------------------------------------------------------
// 8. 상대가 바꾼 내용이 최근 활동에 남는다
// ---------------------------------------------------------------
{
  await go("/guests");
  const g = (await store()).guests.find((x) => x.rsvp !== "no");
  await p.locator("li").filter({ hasText: g.name }).first().getByRole("button", { name: /청첩장/ }).first().click();
  await p.waitForTimeout(700);
  await go("/");
  const txt = await mainText();
  const logged = (await store()).activity_logs.some((l) => l.description?.includes(g.name));
  check("하객을 고치면 최근 활동에 남는다", logged, g.name);
  check("홈 '최근 활동' 에 보인다", /최근 활동/.test(txt));
}

// ---------------------------------------------------------------
// 9. 백업을 내보냈다가 다시 넣으면 그대로 돌아온다
// ---------------------------------------------------------------
{
  const before = await store();
  const snapshot = JSON.stringify(before);
  await seed(`d.tasks.length = 3; d.guests.length = 2;`);
  await go("/");
  const broken = await store();
  await p.evaluate(({ w, json }) => localStorage.setItem(`owp:data:v2:${w}`, json), { w: WID, json: snapshot });
  await go("/");
  const after = await store();
  check(
    "백업을 다시 넣으면 할 일 · 하객이 그대로 돌아온다",
    broken.tasks.length === 3 && after.tasks.length === before.tasks.length && after.guests.length === before.guests.length,
    `할 일 ${before.tasks.length} → ${broken.tasks.length} → ${after.tasks.length}`,
  );
}

console.log("\n콘솔 오류:", errors.length ? errors.slice(0, 3) : "없음");
const passed = results.filter((r) => r.ok).length;
console.log(`${passed}/${results.length} passed`);
await browser.close();
process.exit(passed === results.length && errors.length === 0 ? 0 : 1);
