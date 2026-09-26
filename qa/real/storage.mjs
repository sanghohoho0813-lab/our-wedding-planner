/**
 * 실제 Supabase — "내 기록이 어디에 저장되고 있나" (사용자 신고)
 *
 *   BASE=http://localhost:3001 node qa/real/storage.mjs
 *
 * 1) 서버 모드일 때 '서버 저장' 이라고 정확히 말하는가
 * 2) 예전에 브라우저에만 쌓인 기록이 있으면 알려주고, 서버로 올릴 수 있는가
 */
import { APP, check, finish } from "./_env.mjs";
import { launch, mainText, setupPair } from "./_pair.mjs";

const errors = [];
const browser = await launch();
const { A } = await setupPair(browser, errors, { tag: "st" });
const go = async (c, path) => {
  await c.page.goto(APP + path, { waitUntil: "domcontentloaded" });
  await c.page.waitForTimeout(2200);
};

// ── 1. 서버에 저장되고 있다고 분명히 말한다
await go(A, "/settings/data");
{
  const t = await mainText(A);
  check("'서버 저장' 이라고 알려준다", /서버 저장/.test(t) && /127\.0\.0\.1|supabase/i.test(t), (t.match(/지금 저장되는 곳[\s\S]{0,80}/) ?? [""])[0].replace(/\n+/g, " · "));
  check("로그인 계정과 실시간 연결 상태를 같이 보여준다", /로그인/.test(t) && /(연결됨|연결 중|끊김)/.test(t));
  check("이 기기에만 저장된다고 잘못 말하지 않는다", !/이 기기에만 저장(?!된)/.test(t.split("이 브라우저에만")[0]));
}

// ── 2. 브라우저에만 남은 옛 기록을 찾아내고 서버로 올린다
{
  const stranded = await A.page.evaluate(() => {
    const now = new Date().toISOString();
    const wid = "00000000-0000-4000-8000-000000000001";
    const uid = (n) => `11111111-2222-4333-8444-${String(n).padStart(12, "0")}`;
    const base = (id, extra) => ({ id, wedding_id: wid, created_at: now, updated_at: now, ...extra });
    const data = {
      wedding: base(wid, { name: "옛 기록", wedding_date: "2026-12-20", wedding_time: "13:00", groom_name: "상호", bride_name: "지윤", total_budget: 15000000, details: {}, invite_code: "LOCAL", created_by: null }),
      tasks: [
        base(uid(1), { title: "브라우저에만 있던 할 일 A", category: "기타", status: "todo", priority: "normal", assignee: "both", due_date: null, memo: null, is_favorite: false, sort_order: 0, completed_at: null }),
        base(uid(2), { title: "브라우저에만 있던 할 일 B", category: "기타", status: "done", priority: "normal", assignee: "both", due_date: null, memo: null, is_favorite: false, sort_order: 1, completed_at: now }),
      ],
      guests: [
        base(uid(3), { name: "브라우저 하객", side: "groom", relation: "친구", rsvp: "yes", companions: 1, meal: "yes", contacted: false, invitation_sent: false, invitation_method: null, memo: null }),
      ],
    };
    for (const t of ["events", "budget_categories", "budget_items", "payments", "vendors", "venues", "honeymoon", "honeymoon_items", "music_items", "outfit_items", "invitation_meetings", "gifts", "memos", "activity_logs", "attachments"]) data[t] = [];
    localStorage.setItem(`owp:data:v2:${wid}`, JSON.stringify(data));
    return true;
  });
  check("검사용 '옛 기록' 을 브라우저에 심었다", stranded);

  await go(A, "/settings/data");
  const t = await mainText(A);
  check("브라우저에만 남은 기록을 찾아서 알려준다", /이 브라우저에만 남아 있는 기록/.test(t) && /3건/.test(t), (t.match(/이 브라우저에만 남아 있는 기록[\s\S]{0,60}/) ?? [""])[0].replace(/\n+/g, " · "));
  check("상대는 볼 수 없다는 것을 알려준다", /상대는 볼 수 없/.test(t));

  await A.page.getByRole("button", { name: /서버로 올리기/ }).click();
  await A.page.waitForTimeout(6000);
  const after = await mainText(A);
  check("올리고 나면 올렸다고 알려준다", /서버로 올렸어요/.test(after), (after.match(/[^\n]*올렸어요[^\n]*/) ?? [""])[0]);

  await go(A, "/plan");
  const plan = await mainText(A);
  check("올린 할 일이 앱에 보인다", /브라우저에만 있던 할 일 A/.test(plan), plan.split("\n").slice(0, 3).join(" · "));

  const onServer = await A.page.evaluate(async ({ url, key }) => {
    const jar = Object.fromEntries(document.cookie.split(";").map((x) => x.trim().split(/=(.*)/s).slice(0, 2)));
    const b = Object.keys(jar).find((k) => /^sb-.*-auth-token(\.\d+)?$/.test(k) && !/verifier/.test(k));
    let raw = "";
    if (b && /\.\d+$/.test(b)) { const stem = b.replace(/\.\d+$/, ""); for (let i = 0; jar[`${stem}.${i}`]; i++) raw += decodeURIComponent(jar[`${stem}.${i}`]); }
    else if (b) raw = decodeURIComponent(jar[b]);
    const token = JSON.parse(raw.startsWith("base64-") ? atob(raw.slice(7)) : raw).access_token;
    const res = await fetch(`${url}/rest/v1/tasks?select=title`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
    return (await res.json()).map((r) => r.title);
  }, { url: "http://127.0.0.1:54321", key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" });
  check("서버(DB)에도 실제로 들어갔다", onServer.includes("브라우저에만 있던 할 일 A"), `서버 할 일 ${onServer.length}건`);
}

console.log(`\n콘솔 오류: ${errors.length ? errors.join("\n") : "없음"}`);
await browser.close();
finish();
