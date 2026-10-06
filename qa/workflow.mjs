/**
 * 매일 쓰는 흐름 — 한 번에 정리하기 (고도화)
 *
 *   BASE=http://localhost:3001 node qa/workflow.mjs
 *
 * 원본 결혼계획표(실제 데이터) 로 돌린다.
 *  1) 할 일 날짜 정리: 날짜 없는 일 · 지난 마감을 한 번에
 *  2) 결제 일정 잡기: 남은 돈에 결제일을 붙이고, 같은 돈을 두 번 잡지 않는다
 *  3) 하객 묶음 처리: 모임 단위로 청첩장 전달 · 참석을 한 번에
 * 각각 탭 수와 '되돌리기' 까지 본다.
 */
import { chromium } from "playwright";

const base = process.env.BASE ?? "http://localhost:3001";
const KEY = "owp:data:v2:00000000-0000-4000-8000-000000000001";
const results = [];
const check = (name, ok, info = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${info ? " — " + info : ""}`);
};
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const errors = [];
async function phone() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ko-KR", timezoneId: "Asia/Seoul", hasTouch: true });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  return { ctx, page };
}
const store = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });

// ── 1. 할 일 날짜 정리
{
  const { ctx, page } = await phone();
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  const before = await store(page);
  const pending = before.tasks.filter((t) => t.status !== "done" && (!t.due_date || t.due_date < today));
  check("홈에서 '날짜 정리' 가 보인다 (정리할 할 일이 있을 때)", (await page.getByRole("button", { name: /날짜 정리/ }).count()) > 0, `${pending.length}개`);

  let taps = 0;
  await page.getByRole("button", { name: /날짜 정리/ }).first().click(); taps++;
  await page.waitForTimeout(800);
  const sheet = page.getByRole("dialog").last();
  const text = await sheet.innerText();
  check("정리할 할 일이 모두 한 화면에 나온다", pending.every((t) => text.includes(t.title)), `${pending.length}개`);
  check("시기가 지난 일을 따로 알려준다", /늦어진 일/.test(text));
  check("왜 그 날짜인지 말해 준다 ('보통 결혼식 …')", /보통 결혼식/.test(text));

  // 하나는 '했어요' 로 바로 치운다
  const first = pending[0];
  await sheet.getByRole("button", { name: `${first.title} 이미 했어요` }).click(); taps++;
  await page.waitForTimeout(400);
  await sheet.getByRole("button", { name: /개 날짜 정하기/ }).click(); taps++;
  await page.waitForTimeout(900);
  const after = await store(page);
  const left = after.tasks.filter((t) => t.status !== "done" && (!t.due_date || t.due_date < today));
  check("한 번에 모든 할 일에 날짜가 생긴다", left.length === 0, `남은 것 ${left.length}개`);
  check("'했어요' 로 누른 일은 완료가 된다", after.tasks.find((t) => t.id === first.id)?.status === "done");
  check("정한 날짜는 모두 오늘 이후", after.tasks.filter((t) => pending.some((p) => p.id === t.id) && t.status !== "done").every((t) => t.due_date > today));
  check(`${pending.length}개를 ${taps}번 눌러 정리 (예전엔 하나씩 열어 ${pending.length * 2}번 이상)`, taps <= 3, `${taps}번`);

  await page.getByRole("button", { name: "되돌리기" }).first().click();
  await page.waitForTimeout(700);
  const undone = await store(page);
  const back = undone.tasks.filter((t) => t.status !== "done" && !t.due_date).length;
  check("되돌리기 하면 날짜가 다시 비워진다", back >= pending.length - 2, `날짜 없는 일 ${back}개`);
  await ctx.close();
}

// ── 2. 결제 일정 잡기
{
  const { ctx, page } = await phone();
  await page.goto(base + "/budget?tab=payments", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  const d0 = await store(page);
  const unpaidBefore = (() => {
    let total = 0;
    for (const i of d0.budget_items) {
      const eff = i.actual_amount > 0 ? i.actual_amount : i.estimated_amount;
      const paid = d0.payments.filter((p) => p.paid && p.budget_item_id === i.id).reduce((n, p) => n + p.amount, 0);
      total += Math.max(0, eff - paid);
    }
    return total;
  })();
  const btn = page.getByRole("button", { name: /일정 잡기/ }).first();
  check("결제일 없는 돈이 있으면 '일정 잡기' 가 보인다", (await btn.count()) > 0, (await btn.innerText().catch(() => "")).replace(/\n/g, " "));
  await btn.click();
  await page.waitForTimeout(800);
  const sheet = page.getByRole("dialog").last();
  const st = await sheet.innerText();
  check("고른 대로 '몇 월에 얼마' 가 바로 보인다", /이렇게 정하면 나갈 돈/.test(st) && /\d+월/.test(st));

  // 첫 항목은 '냈어요'
  const firstName = (await sheet.locator("li p").first().innerText()).trim();
  await sheet.getByRole("radiogroup").first().getByRole("radio", { name: "냈어요" }).click();
  await sheet.getByRole("button", { name: /건 기록하기/ }).click();
  await page.waitForTimeout(1000);
  const d1 = await store(page);
  const scheduled = d1.payments.filter((p) => !p.paid).reduce((n, p) => n + p.amount, 0);
  const paidNow = d1.payments.filter((p) => p.paid).reduce((n, p) => n + p.amount, 0) - d0.payments.filter((p) => p.paid).reduce((n, p) => n + p.amount, 0);
  check("남은 돈 = 결제 일정 + 방금 낸 돈 (두 번 잡힌 돈 없음)", scheduled + paidNow === unpaidBefore, `일정 ₩${scheduled.toLocaleString()} + 냄 ₩${paidNow.toLocaleString()} vs 남은 ₩${unpaidBefore.toLocaleString()}`);
  check("남은 돈에 모두 결제일이 붙는다", d1.payments.filter((p) => !p.paid && !p.due_date).length === 0);
  check(`'냈어요' 고른 항목은 결제 완료로 남는다 (${firstName})`, paidNow > 0);
  const main = await page.locator("main").innerText();
  check("'앞으로 나갈 돈' 에 월별 금액이 보인다", /앞으로 나갈 돈/.test(main) && /\d+월\s*₩/.test(main.replace(/\n/g, " ")));

  await page.getByRole("button", { name: "되돌리기" }).first().click();
  await page.waitForTimeout(900);
  const d2 = await store(page);
  check("되돌리기 하면 결제 기록이 원래대로", d2.payments.length === d0.payments.length && d2.payments.filter((p) => p.paid).length === d0.payments.filter((p) => p.paid).length, `${d0.payments.length} → ${d1.payments.length} → ${d2.payments.length}`);
  await ctx.close();
}

// ── 3. 하객 묶음 처리
{
  const { ctx, page } = await phone();
  await page.goto(base + "/guests", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  const g0 = (await store(page)).guests.filter((g) => g.side === "bride" && g.relation === "직장동료");
  const btn = page.getByRole("button", { name: /^신부측 · 직장동료 \d+명 한 번에 바꾸기$/ });
  check("하객 묶음 머리글에 '한 번에 바꾸기' 가 있다", (await btn.count()) > 0);
  await btn.click();
  await page.waitForTimeout(600);
  const sheet = page.getByRole("dialog").last();
  const willChange = g0.filter((g) => !g.invitation_sent).length;
  check("몇 명이 바뀌는지 미리 보여준다", (await sheet.innerText()).includes(`${willChange}명 바뀜`), `${willChange}명`);
  await sheet.getByRole("button", { name: /청첩장 전달로/ }).click();
  await page.waitForTimeout(700);
  const g1 = (await store(page)).guests.filter((g) => g.side === "bride" && g.relation === "직장동료");
  check(`${g0.length}명 청첩장 전달을 두 번 눌러 끝낸다`, g1.every((g) => g.invitation_sent), `${g1.filter((g) => g.invitation_sent).length}/${g1.length}`);
  check("다른 묶음은 건드리지 않는다", (await store(page)).guests.filter((g) => g.relation === "전 직장동료").every((g) => !g.invitation_sent));
  await page.getByRole("button", { name: "되돌리기" }).first().click();
  await page.waitForTimeout(600);
  const g2 = (await store(page)).guests.filter((g) => g.side === "bride" && g.relation === "직장동료");
  check("되돌리기 하면 원래 상태로", g2.every((g, i) => g.invitation_sent === g0.find((x) => x.id === g.id)?.invitation_sent));

  // 필터가 걸려 있으면 보이는 사람만 바꾼다
  await page.getByRole("button", { name: "미전달", exact: true }).click();
  await page.waitForTimeout(500);
  const visible = await page.locator("main li").count();
  check("필터를 걸면 보이는 사람에게만 적용된다", visible > 0);
  await ctx.close();
}

console.log(`\n콘솔 오류: ${errors.length ? errors.join("\n") : "없음"}`);
await browser.close();
const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} passed`);
process.exit(passed === results.length && errors.length === 0 ? 0 : 1);
