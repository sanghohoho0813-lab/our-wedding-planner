/**
 * 하객이 많아졌을 때 (Phase 1.5)
 *
 *   node qa/relay.mjs 4100 &
 *   BASE=http://localhost:3001 RELAY=http://localhost:4100 node qa/load.mjs
 *
 * 150명 · 300명으로 채워 놓고 검색 · 필터 · 스크롤 · 참석 변경 · 식대 계산이
 * 느려지거나 틀리지 않는지 본다.
 *
 * 데이터는 relay 메모리 안에만 있고, 운영과 다른 wedding id 를 쓴다.
 * 운영 Supabase 에는 어떤 것도 쓰지 않는다.
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const base = process.env.BASE ?? "http://localhost:3001";
const relay = process.env.RELAY ?? "http://localhost:4100";
// 운영(그리고 동시사용 검사)과 겹치지 않는 별도 공간
const WID = "22222222-2222-4222-8222-222222222222";

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

const TABLES = [
  "tasks", "events", "budget_categories", "budget_items", "payments", "guests", "invitation_meetings",
  "gifts", "vendors", "venues", "outfit_items", "music_picks", "honeymoon", "honeymoon_items",
  "memos", "activity_logs", "checklist_templates", "documents", "day_schedule", "day_roles", "wedding_members",
];
const RELATIONS = ["가족", "친척", "친구", "직장", "학교", "지인", "부모님 지인"];
const SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"];
const MEAL_COST = 50000;

const now = new Date().toISOString();
const row = (extra) => ({ id: extra.id, wedding_id: WID, created_at: now, updated_at: now, ...extra });

/** 실제 명단처럼 만든다: 측 · 관계 · 참석 여부 · 동반 인원이 고루 섞이게 */
function seed(n) {
  const d = {
    wedding: row({ id: WID, name: `하객 ${n}명 부하 검사`, wedding_date: "2026-12-20", wedding_time: "13:00",
      groom_name: "신랑", bride_name: "신부", total_budget: 60000000,
      details: { members: { "user-a": { name: "상호", side: "groom" }, "user-b": { name: "지윤", side: "bride" } } },
      invite_code: "LOAD", created_by: null }),
  };
  for (const t of TABLES) d[t] = [];
  d.venues.push(row({ id: "v-1", name: "부하 검사 예식장", address: null, event_date: "2026-12-20", event_time: "13:00",
    is_contracted: true, deposit: 0, balance: 0, hall_fee: 5000000, meal_cost: MEAL_COST, guaranteed_guests: 0,
    expected_guests: 0, parking: null, transport: null, notes: null, contact_name: null, phone: null, url: null,
    memo: null, is_favorite: false }));
  const guests = [];
  for (let i = 0; i < n; i++) {
    const side = i % 5 === 0 ? "both" : i % 2 ? "bride" : "groom";
    const rsvp = i % 3 === 0 ? "yes" : i % 3 === 1 ? "maybe" : "no";
    const companions = i % 7 === 0 ? 1 : i % 11 === 0 ? 2 : 0;
    const sur = SURNAMES[i % SURNAMES.length];
    const name = companions === 1 && i % 14 === 0 ? `${sur}동반${String(i).padStart(3, "0")} 부부` : `${sur}하객${String(i).padStart(3, "0")}`;
    guests.push(row({ id: `g-${i}`, name, side, relation: RELATIONS[i % RELATIONS.length], rsvp, companions,
      meal: rsvp === "yes" ? "yes" : "unknown", contacted: i % 4 === 0, invitation_sent: i % 3 !== 2,
      invitation_method: i % 3 === 0 ? "mobile" : null, memo: null }));
  }
  d.guests = guests;
  return d;
}

/** 검사 스크립트가 기대하는 값 (앱과 따로 계산해서 대조한다) */
function expectedNumbers(guests) {
  let expectedPeople = 0, confirmedPeople = 0, confirmed = 0, declined = 0, maybe = 0;
  for (const g of guests) {
    const people = 1 + (g.companions ?? 0);
    if (g.rsvp === "yes") { confirmed++; confirmedPeople += people; expectedPeople += people; }
    else if (g.rsvp === "maybe") { maybe++; expectedPeople += people; }
    else declined++;
  }
  return { expectedPeople, confirmedPeople, confirmed, maybe, declined, cost: MEAL_COST * expectedPeople };
}

const api = (path, body) =>
  fetch(`${relay}${path}`, body === undefined ? undefined : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
    .then((r) => r.json());
const dump = () => fetch(`${relay}/__dump?wedding=${WID}`).then((r) => r.json());

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const adapterSrc = readFileSync(new URL("./test-adapter.js", import.meta.url), "utf8");

/** 조건이 참이 될 때까지 걸린 시간(ms). 안 되면 null */
async function until(page, fn, arg, timeout = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await page.evaluate(fn, arg).catch(() => false)) return Date.now() - t0;
    await page.waitForTimeout(25);
  }
  return null;
}

const money = (s) => Number(String(s).replace(/[^\d]/g, ""));
const allErrors = [];

async function runFor(n, viewport) {
  console.log(`\n\x1b[1m━━ 하객 ${n}명 · ${viewport.width}px ━━\x1b[0m`);
  const data = seed(n);
  await api("/__seed", data);
  const want = expectedNumbers(data.guests);

  const ctx = await browser.newContext({ viewport, locale: "ko-KR", timezoneId: "Asia/Seoul" });
  await ctx.addInitScript(
    ({ src, relay, wid }) => {
      window.__owpRelay = relay;
      window.__owpWedding = wid;
      window.__owpUser = "user-a";
      window.__owpTestWorkspace = { weddingId: wid, userId: "user-a", email: null, name: "상호", mode: "local" };
      // eslint-disable-next-line no-new-func
      new Function(src)();
    },
    { src: adapterSrc, relay, wid: WID },
  );
  const page = await ctx.newPage();
  page.on("pageerror", (e) => allErrors.push(`${n}명: ${e.message}`));

  // ── 1. 명단이 뜨기까지
  const t0 = Date.now();
  await page.goto(base + "/guests", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator("main li").first().waitFor({ timeout: 30000 });
  const firstPaint = Date.now() - t0;
  check(`${n}명 명단이 3초 안에 뜬다`, firstPaint < 3000, `${firstPaint}ms`);

  await page.waitForTimeout(500);
  const rows = await page.locator("main li").count();
  check(`${n}명이 빠짐없이 그려진다`, rows >= n, `${rows}행`);

  // ── 2. 검색
  const target = data.guests[Math.floor(n / 2)].name;
  // 검색칸은 접혀 있다 — 한 번 열어 둔다
  await page.getByRole("button", { name: "이름 검색 열기" }).first().click();
  const box = page.getByPlaceholder("이름 · 관계 검색");
  await box.click();
  const s0 = Date.now();
  await box.fill(target);
  const searched = await until(page, (name) => {
    const items = [...document.querySelectorAll("main li")];
    return items.length > 0 && items.length <= 3 && items.some((li) => li.innerText.includes(name));
  }, target, 8000);
  const searchMs = searched === null ? null : Date.now() - s0;
  check(`검색이 0.5초 안에 걸러진다`, searchMs !== null && searchMs < 500, searchMs === null ? "8초 안에 안 걸러짐" : `"${target}" → ${searchMs}ms`);

  // 한 글자씩 지울 때도 버벅이지 않아야 한다 (실제로는 이렇게 쓴다)
  const typeStart = Date.now();
  await box.fill("");
  await box.type("하객", { delay: 30 });
  const typed = Date.now() - typeStart;
  const partial = await page.locator("main li").count();
  check(`글자를 지우고 다시 쳐도 1초 안에 따라온다`, typed < 1000 && partial > 0, `${typed}ms · ${partial}행`);
  await box.fill("");
  await page.waitForTimeout(300);

  // ── 3. 필터
  const f0 = Date.now();
  await page.getByRole("button", { name: "참석", exact: true }).first().click();
  const filtered = await until(page, (c) => {
    const items = document.querySelectorAll("main li").length;
    return items > 0 && items === c;
  }, want.confirmed, 8000);
  const filterMs = filtered === null ? null : Date.now() - f0;
  const shown = await page.locator("main li").count();
  check(`'참석' 필터가 0.5초 안에 바뀐다`, filterMs !== null && filterMs < 500, filterMs === null ? `${shown}행 (기대 ${want.confirmed}행)` : `${shown}행 · ${filterMs}ms`);
  check(`'참석' 필터가 정확히 참석자만 보여준다`, shown === want.confirmed, `${shown} / 기대 ${want.confirmed}`);
  await page.getByRole("button", { name: "모두", exact: true }).first().click();
  await page.waitForTimeout(400);

  // ── 4. 스크롤 (프레임 간격을 재서 끊김을 본다)
  const scroll = await page.evaluate(async () => {
    const gaps = [];
    let last = performance.now();
    let stop = false;
    const tick = () => {
      const t = performance.now();
      gaps.push(t - last);
      last = t;
      if (!stop) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const steps = 30;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    for (let i = 1; i <= steps; i++) {
      window.scrollTo(0, (max * i) / steps);
      await new Promise((r) => setTimeout(r, 50));
    }
    stop = true;
    await new Promise((r) => setTimeout(r, 100));
    gaps.shift();
    const worst = Math.max(...gaps);
    const long = gaps.filter((g) => g > 50).length;
    return { worst: Math.round(worst), long, frames: gaps.length, height: document.documentElement.scrollHeight };
  });
  check(`스크롤이 끊기지 않는다`, scroll.worst < 200 && scroll.long <= 3,
    `최악 프레임 ${scroll.worst}ms · 50ms 넘는 프레임 ${scroll.long}/${scroll.frames} · 문서 높이 ${scroll.height}px`);
  await page.evaluate(() => window.scrollTo(0, 0));

  // ── 5. 식대 계산이 맞는가
  const costText = await page.locator('[data-testid="meal-cost"]').first().innerText();
  check(`${n}명 식대가 정확하다`, money(costText) === want.cost,
    `화면 ${costText} · 기대 ₩${want.cost.toLocaleString()} (예상 ${want.expectedPeople}명 × ${MEAL_COST.toLocaleString()}원)`);

  // ── 6. 참석 변경 → 화면 · 식대가 바로 따라오는가
  const flip = data.guests.find((g) => g.rsvp === "no");
  await page.getByPlaceholder("이름 · 관계 검색").fill(flip.name);
  await page.waitForTimeout(400);
  const rowEl = page.locator("main li").filter({ hasText: flip.name }).first();
  // 좁은 화면은 상태 칩 한 번 누르기(불참 → 참석), 넓은 화면은 참석 버튼
  const narrow = viewport.width < 640;
  const control = narrow
    ? rowEl.getByRole("button", { name: new RegExp(`${flip.name} 참석 여부`) }).first()
    : rowEl.getByRole("radio", { name: "참석", exact: true });
  const r0 = Date.now();
  await control.click();
  const marked = await until(page, ({ name, narrow }) => {
    const li = [...document.querySelectorAll("main li")].find((x) => x.innerText.includes(name));
    if (!li) return false;
    if (narrow) {
      const chip = [...li.querySelectorAll("button")].find((x) => (x.getAttribute("aria-label") ?? "").includes("참석 여부"));
      return (chip?.textContent ?? "").trim() === "참석";
    }
    const r = [...li.querySelectorAll('[role="radio"]')].find((x) => (x.getAttribute("aria-label") ?? x.innerText).includes("참석"));
    return r?.getAttribute("aria-checked") === "true";
  }, { name: flip.name, narrow }, 8000);
  check(`참석으로 바꾸면 0.5초 안에 화면이 바뀐다`, marked !== null && Date.now() - r0 < 500, marked === null ? "안 바뀜" : `${Date.now() - r0}ms`);

  const nextCost = want.cost + MEAL_COST * (1 + (flip.companions ?? 0));
  const costMs = await until(page, (v) => {
    const el = document.querySelector('[data-testid="meal-cost"]');
    return !!el && Number(el.textContent.replace(/[^\d]/g, "")) === v;
  }, nextCost, 8000);
  check(`식대도 같이 0.5초 안에 다시 계산된다`, costMs !== null && costMs < 500,
    costMs === null ? `기대 ₩${nextCost.toLocaleString()} 이 안 나옴 (화면 ${await page.locator('[data-testid="meal-cost"]').first().innerText()})` : `₩${nextCost.toLocaleString()} · ${costMs}ms`);

  // 서버에도 제대로 저장됐는가
  await page.waitForTimeout(600);
  const saved = (await dump()).guests.find((g) => g.id === flip.id)?.rsvp;
  check(`바꾼 참석 여부가 서버에도 저장된다`, saved === "yes", `서버: ${saved}`);

  await ctx.close();
  return { firstPaint, searchMs, filterMs, scroll };
}

const small = { width: 390, height: 844 }; // 아이폰
const big = { width: 1280, height: 900 };

const r150 = await runFor(150, small);
const r300 = await runFor(300, small);
const r300d = await runFor(300, big);

console.log(`\n\x1b[1m━━ 요약 ━━\x1b[0m`);
console.log(`150명(모바일): 첫 화면 ${r150.firstPaint}ms · 검색 ${r150.searchMs}ms · 필터 ${r150.filterMs}ms · 최악 프레임 ${r150.scroll.worst}ms`);
console.log(`300명(모바일): 첫 화면 ${r300.firstPaint}ms · 검색 ${r300.searchMs}ms · 필터 ${r300.filterMs}ms · 최악 프레임 ${r300.scroll.worst}ms`);
console.log(`300명(데스크톱): 첫 화면 ${r300d.firstPaint}ms · 검색 ${r300d.searchMs}ms · 필터 ${r300d.filterMs}ms · 최악 프레임 ${r300d.scroll.worst}ms`);
console.log(`\n콘솔 오류: ${allErrors.length ? allErrors.join("\n") : "없음"}`);

await browser.close();
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} passed`);
process.exit(passed === results.length && allErrors.length === 0 ? 0 : 1);
