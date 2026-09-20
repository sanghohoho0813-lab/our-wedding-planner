/**
 * 실제 Supabase — 많은 데이터에서의 반응 속도 (Phase 1.6 / 17·18번)
 *
 * 하객 300 · 예산 100 · 할 일 150 · 일정 100 을 **실제 계정으로** 넣고
 * 검색 · 필터 · 참석 변경 · 식대 계산 · 스크롤 · 실시간 반영을 잰다.
 */
import { APP, check, finish, stamp } from "./_env.mjs";
import { launch, mainText, setupPair, stats, waitIn } from "./_pair.mjs";

const errors = [];
const browser = await launch();
const { A, B } = await setupPair(browser, errors, { tag: "ld" });
for (const c of [A, B]) {
  c.page.on("pageerror", (e) => console.log(`${c.label} PAGEERR: ${(e.stack ?? e.message).slice(0, 2600)}`));
}

const go = async (c, path) => {
  const t0 = Date.now();
  await c.page.goto(APP + path, { waitUntil: "domcontentloaded" });
  await c.page.waitForTimeout(200);
  return t0;
};
const money = (s) => Number(String(s).replace(/[^\d]/g, ""));

// ── 데이터 넣기: 브라우저 안에서 그 사람의 로그인 토큰으로 직접 넣는다 (화면 300번 누르는 대신)
const SEED = { guests: 300, budget: 100, tasks: 150, events: 100 };
const seeded = await A.page.evaluate(async ({ url, key, n }) => {
  const jar = Object.fromEntries(document.cookie.split(";").map((c) => c.trim().split(/=(.*)/s).slice(0, 2)));
  const base = Object.keys(jar).find((k) => /^sb-.*-auth-token(\.\d+)?$/.test(k) && !/verifier/.test(k));
  let raw = "";
  if (base && /\.\d+$/.test(base)) {
    const stem = base.replace(/\.\d+$/, "");
    for (let i = 0; jar[`${stem}.${i}`]; i++) raw += decodeURIComponent(jar[`${stem}.${i}`]);
  } else if (base) raw = decodeURIComponent(jar[base]);
  const token = JSON.parse(raw.startsWith("base64-") ? atob(raw.slice(7)) : raw).access_token;
  const wid = JSON.parse(localStorage.getItem("__owpWid") ?? "null") ?? (await (await fetch(`${url}/rest/v1/wedding_members?select=wedding_id`, { headers: { apikey: key, Authorization: `Bearer ${token}` } })).json())[0].wedding_id;
  const post = async (table, rows) => {
    for (let i = 0; i < rows.length; i += 100) {
      const res = await fetch(`${url}/rest/v1/${table}`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${token}`, "content-type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify(rows.slice(i, i + 100)),
      });
      if (!res.ok) return `${table}: ${res.status} ${(await res.text()).slice(0, 120)}`;
    }
    return null;
  };
  const SUR = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"];
  const REL = ["가족", "친척", "친구", "직장", "학교", "지인", "부모님 지인"];
  const guests = Array.from({ length: n.guests }, (_, i) => ({
    wedding_id: wid, name: `${SUR[i % 10]}하객${String(i).padStart(3, "0")}`,
    side: i % 5 === 0 ? "both" : i % 2 ? "bride" : "groom", relation: REL[i % REL.length],
    rsvp: i % 3 === 0 ? "yes" : i % 3 === 1 ? "maybe" : "no", companions: i % 7 === 0 ? 1 : i % 11 === 0 ? 2 : 0,
    meal: i % 3 === 0 ? "yes" : "unknown", contacted: i % 4 === 0, invitation_sent: i % 3 !== 2,
  }));
  const tasks = Array.from({ length: n.tasks }, (_, i) => ({
    wedding_id: wid, title: `부하 할 일 ${String(i).padStart(3, "0")}`, category: "기타",
    status: i % 4 === 0 ? "done" : "todo", priority: i % 5 === 0 ? "high" : "normal", assignee: "both",
  }));
  const budget = Array.from({ length: n.budget }, (_, i) => ({
    wedding_id: wid, name: `부하 예산 ${String(i).padStart(3, "0")}`, estimated_amount: (i + 1) * 10000, actual_amount: i % 2 ? (i + 1) * 9000 : 0,
  }));
  const events = Array.from({ length: n.events }, (_, i) => ({
    wedding_id: wid, title: `부하 일정 ${String(i).padStart(3, "0")}`, date: `2026-${String(1 + (i % 12)).padStart(2, "0")}-${String(1 + (i % 28)).padStart(2, "0")}`, type: "other",
  }));
  const venue = await post("venues", [{ wedding_id: wid, name: "부하 웨딩홀", is_contracted: true, meal_cost: 50000, guaranteed_guests: 0, hall_fee: 5000000 }]);
  const errs = [venue, await post("guests", guests), await post("tasks", tasks), await post("budget_items", budget), await post("events", events)].filter(Boolean);
  return { wid, errs };
}, { url: process.env.SUPABASE_URL ?? "http://127.0.0.1:54321", key: process.env.SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0", n: SEED });
check("실제 계정으로 큰 데이터를 넣는다 (하객 300 · 할 일 150 · 예산 100 · 일정 100)", seeded.errs.length === 0, seeded.errs.join(" | ") || "오류 없음");

// ── 1. 첫 진입 (이 정도 데이터에서 앱이 뜨는 시간)
{
  const t0 = Date.now();
  await A.page.goto(APP + "/guests", { waitUntil: "domcontentloaded" });
  await A.page.locator("main li").first().waitFor({ timeout: 60000 });
  const first = Date.now() - t0;
  check("하객 300명 화면이 5초 안에 뜬다", first < 5000, `${first}ms`);
  await A.page.waitForTimeout(800);
  const rows = await A.page.locator("main li").count();
  check("300명이 빠짐없이 그려진다", rows >= 300, `${rows}행`);
}

// ── 2. 검색 · 필터 · 참석 변경 · 식대
{
  await A.page.getByRole("button", { name: "이름 검색 열기" }).first().click();
  const box = A.page.getByPlaceholder("이름 · 관계 검색");
  const s0 = Date.now();
  await box.fill("김하객150");
  const found = await waitIn(A, () => {
    const li = [...document.querySelectorAll("main li")];
    return li.length > 0 && li.length <= 3;
  }, null, 8000);
  const searchMs = Date.now() - s0;
  check("검색이 300명에서도 0.3초 안에 걸러진다", found !== null && searchMs < 300, `${searchMs}ms`);
  await box.fill("");
  await A.page.waitForTimeout(500);

  const f0 = Date.now();
  await A.page.getByRole("button", { name: "참석", exact: true }).first().click();
  const filtered = await waitIn(A, () => document.querySelectorAll("main li").length === 100, null, 8000);
  check("'참석' 필터가 0.3초 안에 바뀐다", filtered !== null && Date.now() - f0 < 300, `${Date.now() - f0}ms · ${await A.page.locator("main li").count()}행`);
  await A.page.getByRole("button", { name: "모두", exact: true }).first().click();
  await A.page.waitForTimeout(400);

  const scroll = await A.page.evaluate(async () => {
    const gaps = []; let last = performance.now(); let stop = false;
    const tick = () => { const t = performance.now(); gaps.push(t - last); last = t; if (!stop) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    for (let i = 1; i <= 30; i++) { window.scrollTo(0, (max * i) / 30); await new Promise((r) => setTimeout(r, 50)); }
    stop = true; await new Promise((r) => setTimeout(r, 100)); gaps.shift();
    return { worst: Math.round(Math.max(...gaps)), long: gaps.filter((g) => g > 50).length, height: document.documentElement.scrollHeight };
  });
  check("스크롤이 끊기지 않는다", scroll.worst < 200 && scroll.long <= 3, `최악 ${scroll.worst}ms · 50ms 초과 ${scroll.long}회 · 높이 ${scroll.height}px`);
  await A.page.evaluate(() => window.scrollTo(0, 0));

  // 식대: 참석 100명(+동반) + 미정 100명(+동반) 기준
  const cost = await A.page.locator('[data-testid="meal-cost"]').first().innerText().catch(() => "");
  const expected = await A.page.evaluate(() => {
    const t = document.querySelector("main")?.innerText ?? "";
    const m = t.match(/예상 총 인원\s*([\d,]+)명/) ?? t.match(/예상 (\d+)명/);
    return m ? Number(m[1].replace(/,/g, "")) : null;
  });
  check("식대 = 예상 인원 × 1인 식대", expected !== null && money(cost) === expected * 50000, `${cost} · 예상 ${expected}명`);

  // 참석 변경 (300명 목록 위에서)
  await A.page.getByPlaceholder("이름 · 관계 검색").fill("박하객002");
  await A.page.waitForTimeout(500);
  const row = A.page.locator("main li").filter({ hasText: "박하객002" }).first();
  const r0 = Date.now();
  await row.getByRole("radio", { name: "참석", exact: true }).click();
  const marked = await waitIn(A, () => {
    const li = [...document.querySelectorAll("main li")].find((x) => x.innerText.includes("박하객002"));
    const r = [...(li?.querySelectorAll('[role="radio"]') ?? [])].find((x) => (x.getAttribute("aria-label") ?? x.innerText).includes("참석"));
    return r?.getAttribute("aria-checked") === "true";
  }, null, 8000);
  check("300명 목록에서도 참석 변경이 0.3초 안에 반영된다", marked !== null && Date.now() - r0 < 300, `${Date.now() - r0}ms`);
}

// ── 3. 큰 데이터에서도 상대에게 실시간으로 간다
{
  await B.page.goto(APP + "/guests", { waitUntil: "domcontentloaded" });
  await B.page.waitForTimeout(3000);
  const lat = [];
  for (let i = 0; i < 5; i++) {
    const name = `실시간검사${stamp}${i}`;
    const gin = A.page.locator("main").getByPlaceholder(/하객 (이름 )?추가/).first();
    await A.page.getByPlaceholder("이름 · 관계 검색").fill("");
    await gin.fill(name);
    const t0 = Date.now();
    await gin.press("Enter");
    const ms = await waitIn(B, (n) => (document.querySelector("main")?.innerText ?? "").includes(n), name, 10000);
    if (ms !== null) lat.push(Date.now() - t0);
    await A.page.waitForTimeout(300);
  }
  const s = stats(lat);
  check("하객 300명 상태에서도 실시간 반영이 1.5초 안", lat.length === 5 && s.p95 < 1500, `${lat.length}/5 · median ${s.median}ms · max ${s.max}ms`);
}

// ── 4. 다른 화면들도 무너지지 않는다
{
  const times = {};
  for (const [label, path] of [["할 일 150", "/plan"], ["예산 100", "/budget?tab=items"], ["일정 100", "/calendar"], ["홈", "/"]]) {
    const t0 = Date.now();
    await A.page.goto(APP + path, { waitUntil: "domcontentloaded" });
    await A.page.locator("main").first().waitFor({ timeout: 30000 });
    await A.page.waitForTimeout(600);
    times[label] = Date.now() - t0;
  }
  const slow = Object.entries(times).filter(([, ms]) => ms > 5000);
  check("할 일 · 예산 · 일정 · 홈도 5초 안에 뜬다", slow.length === 0, Object.entries(times).map(([k, v]) => `${k} ${v}ms`).join(" · "));
}

console.log(`\n콘솔 오류: ${errors.length ? errors.join("\n") : "없음"}`);
await browser.close();
finish();
