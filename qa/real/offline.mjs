/**
 * 실제 Supabase — 끊김 · 재연결 · 브라우저 종료 (Phase 1.6)
 *
 *   BASE=http://localhost:3001 node qa/real/offline.mjs
 *
 * relay 가 아니라 실제 Supabase 에 붙은 상태에서 네트워크를 진짜로 끊는다
 * (Playwright context.setOffline). 그리고 브라우저를 닫았다 여는 것까지 본다.
 */
import { APP, check, finish } from "./_env.mjs";
import { launch, mainText, newClient, setupPair, waitIn } from "./_pair.mjs";

const errors = [];
const browser = await launch();
const { A, B } = await setupPair(browser, errors, { tag: "off" });
const go = async (c, path) => {
  await c.page.goto(APP + path, { waitUntil: "domcontentloaded" });
  await c.page.waitForTimeout(1600);
};

// 준비: 할 일 · 하객 · 예산 항목 하나씩
await go(A, "/plan");
const tin = A.page.locator("main").getByPlaceholder("할 일 한 줄로 추가");
await tin.fill("끊김 검사 할 일");
await tin.press("Enter");
await A.page.waitForTimeout(800);
await go(A, "/guests");
const gin = A.page.locator("main").getByPlaceholder(/하객 (이름 )?추가/).first();
await gin.fill("끊김하객");
await gin.press("Enter");
await A.page.waitForTimeout(1200);

// ── 1. 진짜로 끊고 여러 화면에서 수정한다
await A.ctx.setOffline(true);
await A.page.waitForTimeout(500);

await A.page.locator("main li").filter({ hasText: "끊김하객" }).first().getByRole("radio", { name: "참석", exact: true }).click();
await A.page.waitForTimeout(600);
{
  const screen = await mainText(A);
  check("끊겨도 보던 화면이 오류 화면으로 바뀌지 않는다", !/불러오지 못했어요/.test(screen) && /끊김하객/.test(screen), screen.slice(0, 60).replace(/\n+/g, " "));
  const kept = await A.page.locator("main li").filter({ hasText: "끊김하객" }).first().getByRole("radio", { name: "참석", exact: true }).getAttribute("aria-checked");
  check("끊겨도 내가 고친 값이 화면에 남는다", kept === "true", `aria-checked=${kept}`);
}

// 화면을 옮겨 다니며 더 고친다 (주소창 새로고침이 아니라 앱 안의 메뉴로 이동한다)
await A.page.getByRole("link", { name: /할 일/ }).first().click().catch(async () => {
  await A.page.getByRole("navigation").getByText("할 일").first().click();
});
await A.page.waitForTimeout(1800);
const movedOk = /끊김 검사 할 일/.test(await mainText(A).catch(() => ""));
check("끊긴 채로 화면을 옮겨도 내용이 보인다", movedOk, movedOk ? "" : "화면이 비었다");
if (movedOk) {
  await A.page.locator("main li").filter({ hasText: "끊김 검사 할 일" }).first().getByRole("checkbox").first().click();
  await A.page.waitForTimeout(500);
}

{
  const shown = await waitIn(A, () => /저장 대기|연결 끊김/.test(document.body.innerText), null, 8000);
  check("끊긴 것을 사용자에게 알려준다", shown !== null, shown === null ? "아무 표시 없음" : `${shown}ms`);
  const queued = await A.page.evaluate(() => JSON.parse(localStorage.getItem("owp:outbox") ?? "[]").length);
  check("못 보낸 수정이 기기에 쌓인다", queued >= 1, `${queued}건 대기`);
}

// ── 2. 브라우저를 닫았다 다시 연다 (대기 중인 수정이 살아남는가)
const state = await A.ctx.storageState();
await A.ctx.close();
const A2 = await newClient(browser, "신랑(다시 열기)", errors, { storageState: state });
await A2.page.goto(APP + "/guests", { waitUntil: "domcontentloaded" });
await A2.page.waitForTimeout(3000);
{
  const saved = await waitIn(A2, () => {
    const t = document.querySelector("main")?.innerText ?? "";
    return /끊김하객/.test(t);
  }, null, 15000);
  check("브라우저를 닫았다 열어도 로그인이 유지된다", !/login|onboarding/.test(A2.page.url()), A2.page.url());
  check("다시 열면 대기 중이던 수정이 저장된다", saved !== null, saved === null ? "화면이 안 뜸" : `${saved}ms`);
}
await A2.page.waitForTimeout(4000);

// ── 3. 서버에 실제로 반영됐는가 + B 에게도 갔는가
{
  await go(B, "/guests");
  const bText = await mainText(B);
  check("끊긴 동안의 하객 참석 변경이 상대 화면까지 간다", /끊김하객/.test(bText) && /참석 확정 1명|참석 1/.test(bText), bText.split("\n").slice(1, 3).join(" · "));
  await go(B, "/plan");
  const bPlan = await mainText(B);
  check("끊긴 동안의 할 일 완료도 상대 화면에 반영된다", /완료 1|완료 1\/1/.test(bPlan), bPlan.split("\n").slice(1, 3).join(" · "));
}
{
  const left = await A2.page.evaluate(() => JSON.parse(localStorage.getItem("owp:outbox") ?? "[]").length);
  check("대기 큐가 비워진다", left === 0, `${left}건 남음`);
  const dup = await A2.page.evaluate(() => (document.querySelector("main")?.innerText.match(/끊김하객/g) ?? []).length);
  check("중복 저장이 생기지 않는다", dup <= 1, `화면에 ${dup}개`);
}

// ── 4. 고칠 수 없는 오류(제약조건 · 권한)는 격리하고 알려준다
{
  await A2.page.goto(APP + "/guests", { waitUntil: "domcontentloaded" });
  await A2.page.waitForTimeout(1800);
  const gin2 = A2.page.locator("main").getByPlaceholder(/하객 (이름 )?추가/).first();
  await gin2.fill("막힘검사1");
  await gin2.press("Enter");
  await A2.page.waitForTimeout(800);

  // (4-1) 연결된 상태에서 저장이 영구 실패하면 바로 알려준다
  let blocked = 0;
  await A2.page.route("**/rest/v1/guests*", async (route) => {
    if (route.request().method() === "PATCH" && blocked === 0) {
      blocked++;
      return route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ code: "23514", message: 'new row violates check constraint "guests_side_check"' }) });
    }
    return route.continue();
  });
  await A2.page.locator("main li").filter({ hasText: "막힘검사1" }).first().getByRole("radio", { name: "참석", exact: true }).click();
  const shown = await waitIn(A2, () => /저장|실패|규칙|권한|다시/.test(document.body.innerText), null, 15000);
  check("연결된 상태의 영구 실패는 바로 알려준다", blocked === 1 && shown !== null, `가로챔 ${blocked}건 · ${shown === null ? "안내 없음" : shown + "ms"}`);
  await A2.page.unroute("**/rest/v1/guests*");
  await A2.page.waitForTimeout(1000);

  // (4-2) 큐에 쌓인 것 중 하나가 영구 실패면 그 건만 버리고 나머지는 보낸다
  await A2.ctx.setOffline(true);
  await A2.page.waitForTimeout(300);
  await A2.page.locator("main li").filter({ hasText: "막힘검사1" }).first().getByRole("radio", { name: "불참", exact: true }).click();
  await A2.page.waitForTimeout(400);
  await A2.page.locator("main li").filter({ hasText: "끊김하객" }).first().getByRole("radio", { name: "불참", exact: true }).click();
  await A2.page.waitForTimeout(600);
  const queuedBefore = await A2.page.evaluate(() => JSON.parse(localStorage.getItem("owp:outbox") ?? "[]").length);

  let blocked2 = 0;
  await A2.page.route("**/rest/v1/guests*", async (route) => {
    if (route.request().method() === "PATCH" && blocked2 === 0) {
      blocked2++;
      return route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ code: "23514", message: 'new row violates check constraint "guests_side_check"' }) });
    }
    return route.continue();
  });
  await A2.ctx.setOffline(false);

  const told = await waitIn(A2, () => /저장하지 못한/.test(document.body.innerText), null, 25000);
  check("큐 안의 영구 실패를 사용자에게 알려준다", told !== null, `대기 ${queuedBefore}건 · 가로챔 ${blocked2}건 · ${told === null ? "안내 없음" : told + "ms"}`);
  const cleared = await waitIn(A2, () => JSON.parse(localStorage.getItem("owp:outbox") ?? "[]").length === 0, null, 25000);
  check("막힌 한 건 때문에 큐가 영영 막히지 않는다", cleared !== null, cleared === null ? "큐가 안 비워짐" : `${cleared}ms`);
  await A2.page.unroute("**/rest/v1/guests*");

  await go(B, "/guests");
  const bNow = await mainText(B);
  check("뒤에 있던 수정은 상대에게 정상 반영된다", /끊김하객/.test(bNow) && /불참 1|명단 2팀/.test(bNow), bNow.split("\n").slice(1, 3).join(" · "));
}

console.log(`\n콘솔 오류: ${errors.length ? errors.join("\n") : "없음"}`);
await browser.close();
finish();
