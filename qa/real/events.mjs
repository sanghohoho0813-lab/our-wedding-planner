/**
 * 실제 Supabase — 일정이 저장되고 사라지지 않는가 (사용자 신고)
 *
 *   BASE=http://localhost:3001 node qa/real/events.mjs
 *
 * "일정을 넣었는데 저장하면 없어지는 것 같다" 를 실제 환경에서 확인한다.
 * 화면 · 새로고침 · 서버 · 상대 화면 · 검색까지 본다.
 */
import { APP, check, finish } from "./_env.mjs";
import { launch, mainText, setupPair, waitIn } from "./_pair.mjs";

const errors = [];
const browser = await launch();
const { A, B } = await setupPair(browser, errors, { tag: "ev" });
const go = async (c, path) => {
  await c.page.goto(APP + path, { waitUntil: "domcontentloaded" });
  await c.page.waitForTimeout(1800);
};
const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
const dbEvents = (c) =>
  c.page.evaluate(async ({ url, key }) => {
    const jar = Object.fromEntries(document.cookie.split(";").map((x) => x.trim().split(/=(.*)/s).slice(0, 2)));
    const base = Object.keys(jar).find((k) => /^sb-.*-auth-token(\.\d+)?$/.test(k) && !/verifier/.test(k));
    let raw = "";
    if (base && /\.\d+$/.test(base)) { const stem = base.replace(/\.\d+$/, ""); for (let i = 0; jar[`${stem}.${i}`]; i++) raw += decodeURIComponent(jar[`${stem}.${i}`]); }
    else if (base) raw = decodeURIComponent(jar[base]);
    const token = JSON.parse(raw.startsWith("base64-") ? atob(raw.slice(7)) : raw).access_token;
    const res = await fetch(`${url}/rest/v1/events?select=title,date,start_time,location`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
    return res.json();
  }, { url: "http://127.0.0.1:54321", key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" });

// ── 1. 일정 화면에서 '추가' 를 누르면 처음부터 일정으로 맞춰져 있다
{
  await go(A, "/calendar");
  await A.page.getByRole("button", { name: /^추가$/ }).first().click();
  await A.page.waitForTimeout(700);
  const d = A.page.getByRole("dialog");
  const eventChosen = await d.getByRole("radio", { name: "일정", exact: true }).getAttribute("aria-checked");
  check("일정 화면의 '추가' 는 처음부터 '일정' 으로 열린다", eventChosen === "true", `일정 선택됨=${eventChosen}`);
  const label = await d.getByRole("button", { name: /추가$/ }).last().innerText();
  check("버튼도 '일정으로 추가' 라고 말한다", /일정으로 추가/.test(label), label.trim());

  // 제목만 적고 추가 (사용자가 겪은 그대로)
  await d.getByPlaceholder(/청첩장 주문/).fill("본식 리허설");
  await d.getByRole("button", { name: /일정으로 추가/ }).click();
  await A.page.waitForTimeout(2500);
}
{
  const t = await mainText(A);
  check("추가 직후 일정 목록에 보인다", /본식 리허설/.test(t), t.split("\n").slice(0, 4).join(" · "));
  const rows = await dbEvents(A);
  const saved = rows.find((r) => r.title === "본식 리허설");
  check("서버에도 일정으로 저장된다 (할 일이 아니라)", !!saved, saved ? `${saved.date}` : `events 테이블에 없음 (총 ${rows.length}건)`);
  check("날짜를 비워두면 오늘로 들어간다", saved?.date === today, `${saved?.date} vs 오늘 ${today}`);
}
{
  await go(A, "/calendar");
  const t = await mainText(A);
  check("새로고침해도 그대로 있다", /본식 리허설/.test(t), t.split("\n").slice(0, 4).join(" · "));
}
{
  await go(B, "/calendar");
  const t = await mainText(B);
  check("상대 화면에도 보인다", /본식 리허설/.test(t), t.split("\n").slice(0, 3).join(" · "));
}

// ── 2. 지난 날짜로 넣어도 '방금 넣은 것' 은 사라지지 않는다
{
  await go(A, "/calendar");
  await A.page.getByRole("button", { name: /^추가$/ }).first().click();
  await A.page.waitForTimeout(700);
  const d = A.page.getByRole("dialog");
  await d.getByPlaceholder(/청첩장 주문/).fill("지난주 상견례");
  // 날짜를 지난 날로 바꾼다
  await d.getByRole("button", { name: /날짜|선택/ }).first().click().catch(() => {});
  await A.page.waitForTimeout(500);
  const past = new Date(Date.now() - 7 * 864e5).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const dateInput = A.page.locator('input[type="date"]').first();
  if (await dateInput.count()) {
    await dateInput.fill(past);
    await A.page.waitForTimeout(400);
  }
  await A.page.getByRole("button", { name: /일정으로 추가/ }).click();
  await A.page.waitForTimeout(2500);
  const t = await mainText(A);
  check("지난 날짜로 넣어도 방금 넣은 일정은 목록에 보인다", /지난주 상견례/.test(t), t.split("\n").slice(0, 5).join(" · "));
}

// ── 3. 일정 검색
{
  await go(A, "/calendar");
  await A.page.getByRole("button", { name: /일정 검색 열기/ }).first().click();
  await A.page.waitForTimeout(400);
  await A.page.getByPlaceholder("일정 제목 · 장소 검색").fill("리허설");
  await A.page.waitForTimeout(600);
  const t = await mainText(A);
  check("일정 화면에서 제목으로 검색된다", /본식 리허설/.test(t) && !/지난주 상견례/.test(t), t.split("\n").slice(0, 6).join(" · "));
  await A.page.getByPlaceholder("일정 제목 · 장소 검색").fill("상견례");
  await A.page.waitForTimeout(600);
  const t2 = await mainText(A);
  check("검색하면 지난 일정도 함께 찾는다", /지난주 상견례/.test(t2), t2.split("\n").slice(0, 6).join(" · "));
}

// ── 4. 할 일로 넣고 싶을 때도 분명하게
{
  await go(A, "/calendar");
  await A.page.getByRole("button", { name: /^추가$/ }).first().click();
  await A.page.waitForTimeout(700);
  const d = A.page.getByRole("dialog");
  await d.getByRole("radio", { name: "할 일", exact: true }).click();
  await d.getByPlaceholder(/청첩장 주문/).fill("답례품 고르기");
  await d.getByRole("button", { name: /할 일로 추가/ }).click();
  await A.page.waitForTimeout(2000);
  await go(A, "/plan");
  const t = await mainText(A);
  check("'할 일' 을 골라서 넣으면 할 일 화면에 들어간다", /답례품 고르기/.test(t), t.split("\n").slice(0, 4).join(" · "));
}

console.log(`\n콘솔 오류: ${errors.length ? errors.join("\n") : "없음"}`);
await browser.close();
finish();
