/**
 * 실제 Supabase — 주소로 바로 들어가기 · 다른 결혼 id 조작 (Phase 1.6 / 9번)
 */
import { APP, ANON_KEY, SUPABASE_URL, check, finish, PASSWORD, testEmail } from "./_env.mjs";
import { createClient } from "@supabase/supabase-js";
import { launch, newClient, setupPair } from "./_pair.mjs";

const errors = [];
const browser = await launch();

// ── 1. 로그인하지 않고 주소를 직접 친다
{
  const c = await newClient(browser, "손님", errors);
  const guarded = [];
  for (const path of ["/", "/plan", "/budget", "/guests", "/wedding", "/settings", "/settings/account", "/honeymoon", "/activity", "/search?q=하객"]) {
    await c.page.goto(APP + path, { waitUntil: "domcontentloaded" });
    await c.page.waitForTimeout(400);
    const url = c.page.url();
    const body = await c.page.locator("body").innerText();
    const blocked = /\/login/.test(url);
    const leaked = /하객|예산 항목|총 예산|D-\d/.test(body) && !blocked;
    if (!blocked || leaked) guarded.push(`${path}→${url.replace(APP, "")}${leaked ? "(내용 노출)" : ""}`);
  }
  check("로그인 없이 주소를 쳐도 모두 로그인 화면으로 간다", guarded.length === 0, guarded.join(", ") || "10개 주소 모두 막힘");
  await c.ctx.close();
}

// ── 2. 로그인은 했지만 남의 결혼 공간 id 를 알아냈을 때
{
  const { A } = await setupPair(browser, errors, { tag: "url" });
  // 남(C)의 공간을 하나 만든다
  const sbC = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const emailC = testEmail("c-url");
  await sbC.auth.signUp({ email: emailC, password: PASSWORD, options: { data: { display_name: "남남" } } });
  const { data: sess } = await sbC.auth.getSession();
  if (!sess.session) await sbC.auth.signInWithPassword({ email: emailC, password: PASSWORD });
  const { data: widC } = await sbC.rpc("create_wedding", { p_name: "남의 공간", p_wedding_date: "2027-03-03", p_groom_name: "남", p_bride_name: "남", p_total_budget: 7777 });
  await sbC.from("guests").insert({ wedding_id: widC, name: "남의 하객 비밀", side: "groom", rsvp: "yes", companions: 0, meal: "yes" });
  await sbC.from("tasks").insert({ wedding_id: widC, title: "남의 할 일 비밀", category: "기타", status: "todo", priority: "normal", assignee: "both" });

  // A 가 그 id 로 직접 조회를 시도한다 (브라우저가 가진 진짜 로그인 토큰으로)
  const leak = await A.page.evaluate(async ({ url, key, wid }) => {
    // @supabase/ssr 은 세션을 쿠키에 담는다 (base64- 접두사 + JSON, 길면 .0 .1 로 쪼갠다)
    const jar = Object.fromEntries(document.cookie.split(";").map((c) => c.trim().split(/=(.*)/s).slice(0, 2)));
    const base = Object.keys(jar).find((k) => /^sb-.*-auth-token(\.\d+)?$/.test(k) && !/verifier/.test(k));
    let raw = "";
    if (base && /\.\d+$/.test(base)) {
      const stem = base.replace(/\.\d+$/, "");
      for (let i = 0; jar[`${stem}.${i}`]; i++) raw += decodeURIComponent(jar[`${stem}.${i}`]);
    } else if (base) raw = decodeURIComponent(jar[base]);
    const json = raw.startsWith("base64-") ? atob(raw.slice(7)) : raw;
    let token = null;
    try {
      const parsed = JSON.parse(json);
      token = parsed.access_token ?? parsed[0]?.access_token ?? null;
    } catch { /* 토큰을 못 읽으면 아래에서 표시된다 */ }
    if (!token) return { error: "토큰을 못 찾음", cookies: Object.keys(jar) };
    const out = {};
    for (const table of ["guests", "tasks", "weddings", "budget_items"]) {
      const q = table === "weddings" ? `id=eq.${wid}` : `wedding_id=eq.${wid}`;
      const res = await fetch(`${url}/rest/v1/${table}?${q}&select=*`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
      const rows = await res.json().catch(() => null);
      out[table] = Array.isArray(rows) ? rows.length : `HTTP ${res.status}`;
    }
    return out;
  }, { url: SUPABASE_URL, key: ANON_KEY, wid: widC });
  check("로그인한 사용자도 남의 결혼 id 로 조회하면 0건", !leak.error && Object.values(leak).every((n) => n === 0), JSON.stringify(leak));

  // 주소에 남의 wedding id 를 끼워 넣어도 (쿼리스트링 조작)
  await A.page.goto(`${APP}/guests?wedding=${widC}`, { waitUntil: "domcontentloaded" });
  await A.page.waitForTimeout(2500);
  const body = await A.page.locator("body").innerText();
  check("주소에 남의 결혼 id 를 붙여도 남의 데이터가 안 보인다", !/남의 하객 비밀/.test(body), body.slice(0, 80).replace(/\n+/g, " "));
}

console.log(`\n콘솔 오류: ${errors.length ? errors.join("\n") : "없음"}`);
await browser.close();
finish();
