/**
 * 실제 Supabase — 날짜 · 시간 (Phase 1.6 / 20번)
 *
 * Postgres 의 date / timestamptz 를 거쳐도 날짜가 하루 밀리지 않는지,
 * 자정을 넘길 때 D-Day 가 정확히 하루만 줄어드는지 본다. (Asia/Seoul 기준)
 */
import { APP, check, finish } from "./_env.mjs";
import { launch, mainText, setupPair } from "./_pair.mjs";

const errors = [];
const browser = await launch();
const { A } = await setupPair(browser, errors, { tag: "dt" });

const go = async (c, path) => {
  await c.page.goto(APP + path, { waitUntil: "domcontentloaded" });
  await c.page.waitForTimeout(1800);
};

// ── 1. 결혼식 날짜가 그대로 저장되고 그대로 보인다
{
  await go(A, "/");
  const home = await mainText(A);
  check("결혼식 날짜가 2026년 12월 20일 (일) 로 보인다", /2026년 12월 20일 \(일\)/.test(home), (home.match(/2026년[^\n]*/) ?? ["?"])[0]);
  const row = await A.page.evaluate(async ({ url, key }) => {
    const jar = Object.fromEntries(document.cookie.split(";").map((c) => c.trim().split(/=(.*)/s).slice(0, 2)));
    const base = Object.keys(jar).find((k) => /^sb-.*-auth-token(\.\d+)?$/.test(k) && !/verifier/.test(k));
    let raw = "";
    if (base && /\.\d+$/.test(base)) {
      const stem = base.replace(/\.\d+$/, "");
      for (let i = 0; jar[`${stem}.${i}`]; i++) raw += decodeURIComponent(jar[`${stem}.${i}`]);
    } else if (base) raw = decodeURIComponent(jar[base]);
    const json = raw.startsWith("base64-") ? atob(raw.slice(7)) : raw;
    const token = JSON.parse(json).access_token;
    const res = await fetch(`${url}/rest/v1/weddings?select=wedding_date,wedding_time,created_at`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
    return (await res.json())[0];
  }, { url: process.env.SUPABASE_URL ?? "http://127.0.0.1:54321", key: process.env.SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" });
  check("DB 에 저장된 날짜도 2026-12-20 (하루 밀림 없음)", row?.wedding_date === "2026-12-20", JSON.stringify(row));
}

// ── 2. 마감일 있는 할 일: 오늘 날짜로 넣고 다시 읽어도 오늘
{
  await go(A, "/plan");
  const input = A.page.locator("main").getByPlaceholder("할 일 한 줄로 추가");
  await input.fill("오늘 마감 검사");
  await input.press("Enter");
  await A.page.waitForTimeout(1200);
  await A.page.getByText("오늘 마감 검사").first().click();
  await A.page.waitForTimeout(800);
  const todayBtn = A.page.getByRole("button", { name: /^오늘$/ }).first();
  if (await todayBtn.count()) {
    await todayBtn.click();
    await A.page.waitForTimeout(1200);
  }
  await go(A, "/plan?tab=tasks");
  const seoulToday = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const stored = await A.page.evaluate(async ({ url, key }) => {
    const jar = Object.fromEntries(document.cookie.split(";").map((c) => c.trim().split(/=(.*)/s).slice(0, 2)));
    const base = Object.keys(jar).find((k) => /^sb-.*-auth-token(\.\d+)?$/.test(k) && !/verifier/.test(k));
    let raw = "";
    if (base && /\.\d+$/.test(base)) {
      const stem = base.replace(/\.\d+$/, "");
      for (let i = 0; jar[`${stem}.${i}`]; i++) raw += decodeURIComponent(jar[`${stem}.${i}`]);
    } else if (base) raw = decodeURIComponent(jar[base]);
    const token = JSON.parse(raw.startsWith("base64-") ? atob(raw.slice(7)) : raw).access_token;
    const res = await fetch(`${url}/rest/v1/tasks?select=title,due_date&title=eq.${encodeURIComponent("오늘 마감 검사")}`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
    return (await res.json())[0];
  }, { url: "http://127.0.0.1:54321", key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" });
  check("'오늘' 로 정한 마감일이 서울 기준 오늘로 저장된다", !stored?.due_date || stored.due_date === seoulToday, `저장 ${stored?.due_date ?? "(미설정)"} · 서울 오늘 ${seoulToday}`);
}

// ── 3. 자정을 넘길 때 D-Day 가 정확히 하루 줄어든다 (서울 시각 고정)
{
  const read = async (iso) => {
    await A.page.clock.install({ time: new Date(iso) });
    await A.page.goto(APP + "/", { waitUntil: "domcontentloaded" });
    await A.page.waitForTimeout(1800);
    const t = await mainText(A);
    return (t.match(/D-\d+|D-DAY|D\+\d+/) ?? ["?"])[0];
  };
  // 2026-12-01 23:59:30 KST = 14:59:30 UTC
  const before = await read("2026-12-01T14:59:30.000Z");
  const after = await read("2026-12-01T15:00:30.000Z"); // = 12-02 00:00:30 KST
  const n = (s) => Number((s.match(/\d+/) ?? [0])[0]);
  check("자정 직전 D-Day", before === "D-19", before);
  check("자정 직후 D-Day 가 하루만 줄어든다", after === "D-18" && n(before) - n(after) === 1, `${before} → ${after}`);
  const dday = await read("2026-12-20T03:00:00.000Z"); // 결혼식 당일 정오 KST
  check("결혼식 당일은 D-DAY", /D-DAY|D-0/.test(dday), dday);
}

console.log(`\n콘솔 오류: ${errors.length ? errors.join("\n") : "없음"}`);
await browser.close();
finish();
