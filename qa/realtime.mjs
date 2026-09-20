/**
 * 두 사람이 동시에 쓸 때 (Phase 1.5)
 *
 *   node qa/relay.mjs 4100 &
 *   BASE=http://localhost:3001 RELAY=http://localhost:4100 node qa/realtime.mjs
 *
 * 신랑(A) · 신부(B) 를 각각 **별도 브라우저 컨텍스트**로 띄우고 같은 백엔드에 붙인다.
 * 쿠키 · 저장소가 분리되므로 실제로 다른 기기 두 대와 같다.
 *
 * 운영 Supabase 는 건드리지 않는다. 데이터는 relay 의 메모리에만 있다.
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const base = process.env.BASE ?? "http://localhost:3001";
const relay = process.env.RELAY ?? "http://localhost:4100";
const WID = "11111111-1111-4111-8111-111111111111";

// 안전장치 — 검사는 로컬 relay 에만 붙는다. 운영 Supabase 주소로는 절대 돌지 않는다.
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(relay) || /supabase/i.test(relay)) {
  console.error(`검사용 relay 가 아니다: ${relay}`);
  process.exit(1);
}

const results = [];
const check = (name, ok, info = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m"} ${name}${info ? "\n       " + info : ""}`);
};

// ---------------------------------------------------------------- 씨앗 데이터
const now = new Date().toISOString();
const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
const row = (extra) => ({ id: extra.id, wedding_id: WID, created_at: now, updated_at: now, ...extra });
const TABLES = [
  "tasks", "events", "budget_categories", "budget_items", "payments", "guests", "invitation_meetings",
  "gifts", "vendors", "venues", "outfit_items", "music_picks", "honeymoon", "honeymoon_items",
  "memos", "activity_logs", "checklist_templates", "documents", "day_schedule", "day_roles", "wedding_members",
];
function seedData(guestCount = 6) {
  const d = { wedding: row({ id: WID, name: "동시 사용 검사", wedding_date: "2026-12-20", wedding_time: "13:00",
    groom_name: "신랑", bride_name: "신부", total_budget: 15000000,
    details: { members: { "user-a": { name: "상호", side: "groom" }, "user-b": { name: "지윤", side: "bride" } } },
    invite_code: "TEST", created_by: null }) };
  for (const t of TABLES) d[t] = [];
  d.tasks.push(row({ id: "t-1", title: "청첩장 주문", category: "청첩장", status: "todo", priority: "high",
    assignee: "both", due_date: today, memo: null, is_favorite: false, sort_order: 0, completed_at: null }));
  d.tasks.push(row({ id: "t-2", title: "예복 피팅 예약", category: "예복", status: "todo", priority: "normal",
    assignee: "both", due_date: null, memo: "메모 원본", is_favorite: false, sort_order: 1, completed_at: null }));
  d.venues.push(row({ id: "v-1", name: "검사 예식장", address: null, event_date: "2026-12-20", event_time: "13:00",
    is_contracted: true, deposit: 0, balance: 0, hall_fee: 5000000, meal_cost: 50000, guaranteed_guests: 0,
    expected_guests: 0, parking: null, transport: null, notes: null, contact_name: null, phone: null, url: null,
    memo: null, is_favorite: false }));
  d.budget_items.push(row({ id: "b-1", category_id: null, name: "스냅 촬영", vendor_name: null,
    estimated_amount: 1000000, actual_amount: 900000, is_favorite: false, memo: null }));
  d.payments.push(row({ id: "p-1", budget_item_id: "b-1", title: "잔금", amount: 500000,
    due_date: today, paid: false, paid_at: null, method: null, memo: null }));
  for (let i = 0; i < guestCount; i++)
    d.guests.push(row({ id: `g-${i}`, name: `하객${i}`, side: i % 2 ? "bride" : "groom", relation: "친구",
      rsvp: "maybe", companions: 0, meal: "unknown", contacted: false, invitation_sent: false,
      invitation_method: null, memo: null }));
  d.wedding_members.push(row({ id: "m-1", user_id: "user-a", side: "groom", display_name: "상호" }));
  d.wedding_members.push(row({ id: "m-2", user_id: "user-b", side: "bride", display_name: "지윤" }));
  return d;
}

const api = (path, body) =>
  fetch(`${relay}${path}`, body === undefined ? undefined : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
    .then((r) => r.json());
const dump = () => fetch(`${relay}/__dump?wedding=${WID}`).then((r) => r.json());
const netDown = (down) => api("/__net", { down });

await api("/__seed", seedData());

// ---------------------------------------------------------------- 브라우저
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const adapterSrc = readFileSync(new URL("./test-adapter.js", import.meta.url), "utf8");

async function openClient(userId, label) {
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 900 },
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  });
  await ctx.addInitScript(
    ({ src, relay, wid, userId }) => {
      window.__owpRelay = relay;
      window.__owpWedding = wid;
      window.__owpUser = userId;
      // mode 는 local 로 둔다 — 실제 Supabase 클라이언트를 만들려 들지 않게 한다.
      // 실시간 동작은 주입한 어댑터가 담당하므로 두 사람 동기화 검증에는 영향이 없다.
      window.__owpTestWorkspace = { weddingId: wid, userId, email: null, name: userId === "user-a" ? "상호" : "지윤", mode: "local" };
      // eslint-disable-next-line no-new-func
      new Function(src)();
    },
    { src: adapterSrc, relay, wid: WID, userId },
  );
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
  return { ctx, page, errors, label };
}

const A = await openClient("user-a", "신랑");
const B = await openClient("user-b", "신부");
const allErrors = [];

const go = async (c, path) => {
  await c.page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 60000 });
  await c.page.waitForTimeout(1400);
};
const text = (c) => c.page.locator("main").innerText();
/** 화면에 조건이 나타날 때까지 기다린 시간(ms). 안 나타나면 null */
async function waitFor(c, fn, timeout = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await c.page.evaluate(fn).catch(() => false)) return Date.now() - t0;
    await c.page.waitForTimeout(80);
  }
  return null;
}

await go(A, "/plan");
await go(B, "/plan");
await A.page.getByText("청첩장 주문").first().waitFor({ timeout: 30000 });
await B.page.getByText("청첩장 주문").first().waitFor({ timeout: 30000 });
check("두 사람이 같은 데이터를 본다", (await text(A)).includes("청첩장 주문") && (await text(B)).includes("청첩장 주문"));

// ================================================================
// 1. A 가 할 일을 고치면 B 화면에 바로 반영된다
// ================================================================
{
  await A.page.locator("li").filter({ hasText: "청첩장 주문" }).first().getByRole("checkbox").first().click();
  const ms = await waitFor(B, () => {
    const d = JSON.parse(localStorage.getItem("__owpMirror") ?? "{}");
    return d?.tasks?.find((t) => t.id === "t-1")?.status === "done";
  });
  check("A 가 할 일을 완료하면 B 에 반영된다", ms !== null, ms === null ? "6초 안에 안 옴" : `${ms}ms`);
  const shown = await waitFor(B, () => !/청첩장 주문/.test(document.querySelector("main")?.innerText ?? "") || /완료/.test(document.querySelector("main")?.innerText ?? ""));
  check("B 화면(목록)에도 반영된다", shown !== null, shown === null ? "화면이 안 바뀜" : `${shown}ms`);
}

// ================================================================
// 2. A 가 참석 상태를 바꾸면 B 의 하객 수 · 식대도 같이 바뀐다
// ================================================================
{
  await go(A, "/guests");
  await go(B, "/guests");
  const before = await B.page.locator('[data-testid="meal-cost"]').first().innerText().catch(() => "");
  await A.page.locator("main li").filter({ hasText: "하객0" }).first().getByRole("radio", { name: "불참", exact: true }).click();
  await A.page.waitForTimeout(400);
  const ms = await waitFor(B, () => {
    const d = JSON.parse(localStorage.getItem("__owpMirror") ?? "{}");
    return d?.guests?.find((g) => g.id === "g-0")?.rsvp !== "maybe";
  });
  check("A 가 참석 상태를 바꾸면 B 에 반영된다", ms !== null, ms === null ? "안 옴" : `${ms}ms`);

  // 불참으로 바뀌면 예상 인원이 하나 줄고 식대도 줄어야 한다
  const rsvp = (await dump()).guests.find((g) => g.id === "g-0").rsvp;
  await B.page.waitForTimeout(600);
  const after = await B.page.locator('[data-testid="meal-cost"]').first().innerText().catch(() => "");
  check("B 의 예상 식대도 같이 바뀐다", rsvp === "no" ? before !== after : true, `${rsvp}: ${before} → ${after}`);
}

// ================================================================
// 3. A 가 결제를 완료하면 B 의 예산 · 다가오는 결제도 바뀐다
// ================================================================
{
  await go(A, "/budget");
  await go(B, "/budget");
  check("결제 전에는 B 에도 잔금이 보인다", (await text(B)).includes("잔금"));
  await A.page.locator("li").filter({ hasText: "잔금" }).first().getByRole("checkbox").first().click();
  const ms = await waitFor(B, () => {
    const d = JSON.parse(localStorage.getItem("__owpMirror") ?? "{}");
    return d?.payments?.find((p) => p.id === "p-1")?.paid === true;
  });
  check("A 가 결제 완료하면 B 에 반영된다", ms !== null, ms === null ? "안 옴" : `${ms}ms`);
  const gone = await waitFor(B, () => !/잔금/.test(document.querySelector("main")?.innerText ?? ""));
  check("B 의 '다가오는 결제' 에서도 사라진다", gone !== null, gone === null ? "아직 보임" : `${gone}ms`);
}

// ================================================================
// 4. 거의 동시에 서로 다른 칸을 고치면 둘 다 살아남는다
// ================================================================
{
  await go(A, "/plan");
  await go(B, "/plan");
  // A 는 제목을, B 는 메모를 거의 같은 순간에 고친다
  await Promise.all([
    A.page.evaluate(() => window.__owpAdapter.update("tasks", "t-2", { title: "예복 피팅 예약 (A가 고침)" })),
    B.page.evaluate(() => window.__owpAdapter.update("tasks", "t-2", { memo: "B가 쓴 메모" })),
  ]);
  await A.page.waitForTimeout(1500);
  const t2 = (await dump()).tasks.find((t) => t.id === "t-2");
  check(
    "서로 다른 칸을 동시에 고치면 둘 다 남는다",
    t2.title === "예복 피팅 예약 (A가 고침)" && t2.memo === "B가 쓴 메모",
    `제목="${t2.title}" 메모="${t2.memo}"`,
  );
  const aOk = await waitFor(A, () => JSON.parse(localStorage.getItem("__owpMirror") ?? "{}")?.tasks?.find((t) => t.id === "t-2")?.memo === "B가 쓴 메모");
  const bOk = await waitFor(B, () => JSON.parse(localStorage.getItem("__owpMirror") ?? "{}")?.tasks?.find((t) => t.id === "t-2")?.title === "예복 피팅 예약 (A가 고침)");
  check("두 사람 화면 모두 합쳐진 결과를 본다", aOk !== null && bOk !== null, `A:${aOk}ms B:${bOk}ms`);
}

// ================================================================
// 5. 같은 칸을 동시에 고치면 — 조용히 덮어쓰지 않는다
// ================================================================
{
  // 어댑터를 직접 부르면 스토어를 건너뛰어 실제 사용과 달라진다. 화면에서 누른다.
  await go(A, "/guests");
  await go(B, "/guests");
  const rowA = A.page.locator("main li").filter({ hasText: "하객2" }).first();
  const rowB = B.page.locator("main li").filter({ hasText: "하객2" }).first();
  await rowA.getByRole("radio", { name: "참석", exact: true }).click();
  await A.page.waitForTimeout(200);
  await rowB.getByRole("radio", { name: "불참", exact: true }).click();
  await A.page.waitForTimeout(1800);
  const g2 = (await dump()).guests.find((g) => g.id === "g-2");
  check("나중 것이 이긴다 (마지막 저장 우선)", g2.rsvp === "no", g2.rsvp);
  const told = await waitFor(A, () => /바꿨어요|되돌|내 값/.test(document.body.innerText), 6000);
  check("내가 쓴 값이 덮이면 A 에게 알려준다", told !== null, told === null ? "아무 안내도 없이 조용히 덮임" : `${told}ms 안에 안내`);
  if (told !== null) {
    const msg = await A.page.evaluate(() => {
      const m = document.body.innerText.match(/[^\n]*(바꿨어요)[^\n]*/);
      return m ? m[0].trim() : "";
    });
    check("안내가 '누가 · 무엇을' 을 말해 준다", /지윤/.test(msg) && /참석 여부/.test(msg), msg);
    check("안내에 'no' 같은 코드가 아니라 사람 말이 나온다", /불참/.test(msg) && !/'no'|'yes'|'maybe'/.test(msg), msg);
  }
}

// ================================================================
// 6. A 가 지우는 동안 B 가 고치면
// ================================================================
{
  await go(A, "/plan");
  await go(B, "/plan");
  // A 는 그 할 일을 열어 둔다 (지우기 직전)
  await A.page.getByText("예복 피팅 예약").first().click();
  await A.page.waitForTimeout(600);
  // B 가 그 사이에 같은 할 일을 고친다 (고치는 중이라는 뜻)
  await B.page.locator("main li").filter({ hasText: "예복 피팅 예약" }).first().getByRole("checkbox").first().click();
  await B.page.waitForTimeout(250);
  // A 가 지운다
  await A.page.getByRole("button", { name: "삭제" }).first().click();
  await A.page.waitForTimeout(1800);
  const d = await dump();
  check("지워진 항목은 되살아나지 않는다", !d.tasks.some((t) => t.id === "t-2"), `${d.tasks.length}건 남음`);
  const notice = await waitFor(B, () => /지웠어요|지워졌|삭제/.test(document.body.innerText), 6000);
  check("B 에게 '지워졌다' 고 알려준다", notice !== null, notice === null ? "조용히 사라짐 (수정한 내용도 그냥 없어짐)" : `${notice}ms`);
}

// ================================================================
// 7. 네트워크가 끊긴 동안 고치면 — 다시 붙었을 때 살아남는가
// ================================================================
{
  await go(A, "/guests");
  await netDown(true);
  await A.page.locator("main li").filter({ hasText: "하객3" }).first().getByRole("radio", { name: "참석", exact: true }).click();
  await A.page.waitForTimeout(1500);
  const screen = await A.page.evaluate(() => {
    const main = document.querySelector("main")?.innerText ?? "";
    return { hasList: /하객3/.test(main), errorCard: /불러오지 못했어요/.test(main), head: main.slice(0, 60).replace(/\n/g, " ") };
  });
  check("끊겨도 보던 화면이 사라지지 않는다", screen.hasList && !screen.errorCard, screen.hasList ? "" : `화면이 바뀜: "${screen.head}"`);
  const kept = await A.page
    .locator("main li").filter({ hasText: "하객3" }).first()
    .getByRole("radio", { name: "참석", exact: true })
    .getAttribute("aria-checked")
    .catch(() => null);
  check("끊겨도 내가 고친 값이 그대로 있다", kept === "true", `참석 aria-checked=${kept}`);
  const offlineShown = await waitFor(A, () => /저장 대기|연결 끊김/.test(document.body.innerText), 8000);
  check("끊긴 걸 사용자에게 알려준다", offlineShown !== null, offlineShown === null ? "아무 표시 없음" : `${offlineShown}ms`);

  await netDown(false);
  const saved = await (async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 20000) {
      const g = (await dump()).guests.find((x) => x.id === "g-3");
      if (g?.rsvp === "yes") return Date.now() - t0;
      await new Promise((r) => setTimeout(r, 300));
    }
    return null;
  })();
  check("다시 붙으면 끊긴 동안의 수정이 저장된다", saved !== null, saved === null ? "저장 안 됨" : `${saved}ms 만에 자동 저장`);
  const cleared = await waitFor(A, () => !/저장 대기/.test(document.body.innerText), 8000);
  check("저장되면 '저장 대기' 표시가 사라진다", cleared !== null);
}

// ================================================================
// 7-2. 고칠 수 없는 오류가 난 수정이 큐 전체를 막지 않는가
// ================================================================
{
  await go(A, "/guests");
  // g-4 는 서버가 언제 보내도 거절한다 (제약조건 위반 흉내)
  await api("/__reject", { ids: ["g-4"] });
  await netDown(true);
  await A.page.locator("main li").filter({ hasText: "하객4" }).first().getByRole("radio", { name: "참석", exact: true }).click();
  await A.page.waitForTimeout(300);
  await A.page.locator("main li").filter({ hasText: "하객5" }).first().getByRole("radio", { name: "참석", exact: true }).click();
  await A.page.waitForTimeout(800);
  await netDown(false);

  // 막힌 한 건 때문에 뒤에 쌓인 것까지 못 나가면 안 된다
  const later = await (async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 25000) {
      const g = (await dump()).guests.find((x) => x.id === "g-5");
      if (g?.rsvp === "yes") return Date.now() - t0;
      await new Promise((r) => setTimeout(r, 300));
    }
    return null;
  })();
  check("안 되는 수정 하나가 뒤의 수정까지 막지 않는다", later !== null, later === null ? "뒤의 수정이 영영 안 나감" : `${later}ms 만에 저장`);
  const told = await waitFor(A, () => /저장하지 못한/.test(document.body.innerText), 8000);
  check("저장 못 한 수정이 있으면 알려준다", told !== null, told === null ? "조용히 사라짐" : `${told}ms`);
  const cleared = await waitFor(A, () => !/저장 대기/.test(document.body.innerText), 10000);
  check("큐가 비워진다 (영영 '저장 대기' 로 남지 않는다)", cleared !== null);
  await api("/__reject", { ids: [] });
}

// ================================================================
// 8. 같은 이벤트가 두 번 와도 문제가 없다
// ================================================================
{
  const before = (await dump()).guests.length;
  await A.page.evaluate(() => {
    const g = { id: "g-dup", wedding_id: window.__owpWedding, name: "중복검사", side: "groom", relation: null,
      rsvp: "maybe", companions: 0, meal: "unknown", contacted: false, invitation_sent: false,
      invitation_method: null, memo: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    return window.__owpAdapter.insert("guests", g).then(() => window.__owpAdapter.insert("guests", g));
  });
  await A.page.waitForTimeout(1500);
  const after = (await dump()).guests.length;
  const inB = await B.page.evaluate(() => (JSON.parse(localStorage.getItem("__owpMirror") ?? "{}")?.guests ?? []).filter((g) => g.id === "g-dup").length);
  check("같은 행이 두 번 들어와도 하나만 남는다", after === before + 1 && inB <= 1, `서버 ${before}→${after}, B 화면 ${inB}건`);
}

// ================================================================
// 9. 최근 활동에 누가 무엇을 했는지 남는가
// ================================================================
{
  // B 도 화면에서 직접 한 번 고친다 (어댑터를 직접 부르면 기록이 안 남는 게 정상이다)
  await go(B, "/guests");
  await B.page.locator("main li").filter({ hasText: "하객1" }).first().getByRole("radio", { name: "참석", exact: true }).click();
  await B.page.waitForTimeout(800);
  await go(A, "/");
  await go(B, "/");
  const logs = (await dump()).activity_logs;
  const byA = logs.filter((l) => l.user_id === "user-a").length;
  const byB = logs.filter((l) => l.user_id === "user-b").length;
  check("두 사람의 기록이 각각 남는다", byA > 0 && byB > 0, `신랑 ${byA}건 · 신부 ${byB}건`);
  const bSeesA = await B.page.evaluate(() => /상호|신랑/.test(document.querySelector("main")?.innerText ?? ""));
  check("B 화면 '최근 활동' 에 상대(A)의 이름이 보인다", bSeesA, bSeesA ? "" : "누가 했는지 안 보임");
}

// ---------------------------------------------------------------- 정리
allErrors.push(...A.errors, ...B.errors);
console.log("\n콘솔 오류:", allErrors.length ? allErrors.slice(0, 4) : "없음");
const passed = results.filter((r) => r.ok).length;
console.log(`${passed}/${results.length} passed`);
await browser.close();
process.exit(passed === results.length && allErrors.length === 0 ? 0 : 1);
