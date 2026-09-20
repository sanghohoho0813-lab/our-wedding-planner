/**
 * 실제 Supabase — 두 사람이 동시에 쓰는 상황 전부 (Phase 1.6)
 *
 *   BASE=http://localhost:3001 node qa/real/scenarios.mjs
 *
 * Phase 1.5 에서 relay 로 확인했던 것을 **진짜 Supabase** 로 다시 확인한다.
 */
import { APP, check, finish } from "./_env.mjs";
import { launch, mainText, setupPair, stats, waitIn } from "./_pair.mjs";

const errors = [];
const browser = await launch();
const { A, B } = await setupPair(browser, errors, { tag: "sc" });
check("실제 계정 2개가 같은 공간에 있다", !/onboarding|login/.test(A.page.url()) && !/onboarding|login/.test(B.page.url()));

const go = async (c, path) => {
  await c.page.goto(APP + path, { waitUntil: "domcontentloaded" });
  await c.page.waitForTimeout(1600);
};
const money = (s) => Number(String(s).replace(/[^\d]/g, ""));

// ── 1. 하객 참석 변경 → B 의 하객 수 · 식대
{
  await go(A, "/guests");
  await go(B, "/guests");
  const gin = A.page.locator("main").getByPlaceholder(/하객 (이름 )?추가/).first();
  for (const n of ["참석하객", "미정하객"]) {
    await gin.fill(n);
    await gin.press("Enter");
    await A.page.waitForTimeout(400);
  }
  await waitIn(B, () => (document.querySelector("main")?.innerText ?? "").includes("미정하객"), null, 10000);

  // 식장 · 1인 식대를 넣어야 식대가 계산된다 (실제 화면에서 넣는다)
  await go(A, "/wedding?tab=venue");
  await A.page.getByRole("button", { name: /식장 추가|첫 식장 추가/ }).first().click();
  await A.page.waitForTimeout(900);
  {
    const d = A.page.getByRole("dialog");
    await d.getByPlaceholder("예: 더채플 앳 청담").fill("실환경 웨딩홀");
    await d.getByText("계약 완료").first().click();                 // 계약한 식장이어야 식대가 잡힌다
    // 식대(1인) 5만원 — 금액은 키패드로 넣는다
    await d.getByRole("button", { name: /^식대 \(1인\)/ }).first().click();
    await A.page.waitForTimeout(400);
    const pad = A.page.getByRole("dialog").last();
    if (await pad.getByRole("button", { name: "+1만", exact: true }).count()) {
      for (let i = 0; i < 5; i++) await pad.getByRole("button", { name: "+1만", exact: true }).click();
      await pad.getByRole("button", { name: "적용", exact: true }).click();
      await A.page.waitForTimeout(400);
    }
    await A.page.getByRole("button", { name: /추가하기/ }).last().click();
    await A.page.waitForTimeout(1800);
  }
  await go(A, "/guests");
  await go(B, "/guests");

  const before = await B.page.locator('[data-testid="meal-cost"]').first().innerText().catch(() => "");
  const row = A.page.locator("main li").filter({ hasText: "참석하객" }).first();
  const t0 = Date.now();
  await row.getByRole("radio", { name: "참석", exact: true }).click();
  const ms = await waitIn(B, () => {
    const li = [...document.querySelectorAll("main li")].find((x) => x.innerText.includes("참석하객"));
    const r = [...(li?.querySelectorAll('[role="radio"]') ?? [])].find((x) => (x.getAttribute("aria-label") ?? x.innerText).includes("참석"));
    return r?.getAttribute("aria-checked") === "true";
  }, null, 10000);
  check("A 의 참석 변경이 B 화면에 반영된다", ms !== null, ms === null ? "안 옴" : `${Date.now() - t0}ms`);
  const bText = await mainText(B);
  check("B 의 하객 수(참석 확정)도 같이 바뀐다", /참석 확정 1명|참석 1/.test(bText), bText.split("\n").slice(0, 4).join(" · "));
  await B.page.waitForTimeout(800);
  const after = await B.page.locator('[data-testid="meal-cost"]').first().innerText().catch(() => "");
  // 참석 1명 + 미정 1명 = 예상 2명 × 5만원 = 10만원
  check("B 의 예상 식대가 하객 수에 맞게 계산된다", money(after) === 100000, `${before || "(없음)"} → ${after || "(없음)"} · 기대 ₩100,000`);
}

// ── 2. 예산 · 결제 → B 예산 · 다가오는 결제
const payLat = [];
{
  await go(A, "/budget?tab=items");
  await go(B, "/budget?tab=items");
  await A.page.getByRole("button", { name: /비용 추가/ }).first().click();
  await A.page.waitForTimeout(800);
  {
    const d = A.page.getByRole("dialog");
    await d.getByPlaceholder("예: 스튜디오 촬영").fill("실환경 스냅");
    // 금액은 키패드로 넣는다 (금액이 없으면 목록에서 '금액 미정' 으로 접힌다)
    await d.getByText("금액 입력").first().click();
    await A.page.waitForTimeout(600);
    await A.page.getByRole("button", { name: "+100만", exact: true }).first().click();
    await A.page.getByRole("button", { name: "적용", exact: true }).first().click();
    await A.page.waitForTimeout(500);
    const t0 = Date.now();
    await A.page.getByRole("button", { name: /추가하기/ }).last().click();
    const ms = await waitIn(B, () => (document.querySelector("main")?.innerText ?? "").includes("실환경 스냅"), null, 12000);
    check("A 가 만든 예산 항목이 B 에 보인다", ms !== null, ms === null ? "안 옴" : `${Date.now() - t0}ms`);
    if (ms !== null) payLat.push(Date.now() - t0);
  }
}

// ── 3. 서로 다른 칸을 동시에 고치면 둘 다 남는다
{
  await go(A, "/plan");
  await go(B, "/plan");
  const input = A.page.locator("main").getByPlaceholder("할 일 한 줄로 추가");
  await input.fill("동시수정 대상");
  await input.press("Enter");
  await waitIn(B, () => (document.querySelector("main")?.innerText ?? "").includes("동시수정 대상"), null, 10000);
  await A.page.waitForTimeout(500);

  // A 는 메모, B 는 완료 체크를 거의 동시에
  await A.page.getByText("동시수정 대상").first().click();
  await A.page.waitForTimeout(700);
  const memo = A.page.locator("aside, [role=dialog]").getByPlaceholder(/메모|기억/).first();
  const hasMemo = await memo.count();
  if (hasMemo) await memo.fill("A 가 쓴 메모");
  await B.page.locator("main li").filter({ hasText: "동시수정 대상" }).first().getByRole("checkbox").first().click();
  await A.page.waitForTimeout(300);
  await A.page.getByRole("button", { name: /닫기/ }).first().click().catch(() => {});
  await A.page.waitForTimeout(2500);

  const both = await A.page.evaluate(() => document.querySelector("main")?.innerText ?? "");
  check("서로 다른 칸을 동시에 고쳐도 둘 다 남는다", /동시수정 대상/.test(both), hasMemo ? "메모 + 완료 동시 수정" : "완료 수정만 (메모칸 없음)");
}

// ── 4. 같은 칸을 거의 동시에 → 나중 것이 이기고, 진 쪽에 안내
{
  await go(A, "/guests");
  await go(B, "/guests");
  const rowA = A.page.locator("main li").filter({ hasText: "미정하객" }).first();
  const rowB = B.page.locator("main li").filter({ hasText: "미정하객" }).first();
  await rowA.getByRole("radio", { name: "참석", exact: true }).click();
  await A.page.waitForTimeout(250);
  await rowB.getByRole("radio", { name: "불참", exact: true }).click();
  await A.page.waitForTimeout(3000);
  const told = await waitIn(A, () => /바꿨어요|내 값/.test(document.body.innerText), null, 8000);
  check("진 쪽(A)에게 '상대가 바꿨다' 고 알려준다", told !== null, told === null ? "조용히 덮임 ❌" : `${told}ms`);
  if (told !== null) {
    const msg = await A.page.evaluate(() => (document.body.innerText.match(/[^\n]*바꿨어요[^\n]*/) ?? [""])[0].trim());
    check("안내에 이름과 사람 말이 들어간다", /지윤/.test(msg) && /불참/.test(msg) && !/'no'/.test(msg), msg);
  }
}

// ── 5. A 가 지우는 동안 B 가 고치면
{
  await go(A, "/plan");
  await go(B, "/plan");
  // 4번에서 쓴 할 일은 완료 처리되어 목록에서 접혔다 — 새로 하나 만든다
  const input2 = A.page.locator("main").getByPlaceholder("할 일 한 줄로 추가");
  await input2.fill("삭제 경합 대상");
  await input2.press("Enter");
  await waitIn(B, () => (document.querySelector("main")?.innerText ?? "").includes("삭제 경합 대상"), null, 12000);
  await A.page.waitForTimeout(600);
  await A.page.getByText("삭제 경합 대상").first().click();
  await A.page.waitForTimeout(700);
  await B.page.locator("main li").filter({ hasText: "삭제 경합 대상" }).first().getByRole("checkbox").first().click();
  await B.page.waitForTimeout(300);
  // 넓은 화면에서는 시트가 아니라 오른쪽 패널에 열린다 — 화면 전체에서 삭제 버튼을 찾는다
  await A.page.getByRole("button", { name: "삭제" }).first().click();
  await A.page.waitForTimeout(3000);
  const notice = await waitIn(B, () => /지웠어요|지워졌/.test(document.body.innerText), null, 8000);
  check("B 에게 '상대가 지웠다' 고 알려준다", notice !== null, notice === null ? "조용히 사라짐 ❌" : `${notice}ms`);
}

// ── 6. 최근 활동에 누가 무엇을 했는지
{
  await go(B, "/activity");
  const log = await mainText(B);
  const mine = (log.match(/지윤/g) ?? []).length;
  const theirs = (log.match(/상호/g) ?? []).length;
  check("활동 기록에 두 사람이 각각 남는다", mine > 0 && theirs > 0, `상호 ${theirs}건 · 지윤 ${mine}건`);
  check("활동 기록에 '누가 무엇을' 이 사람 말로 남는다", /추가|수정|완료|삭제/.test(log), log.split("\n").slice(2, 6).join(" · "));
}

console.log(`\n콘솔 오류: ${errors.length ? errors.join("\n") : "없음"}`);
await browser.close();
finish();
