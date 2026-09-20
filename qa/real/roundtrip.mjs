/**
 * 실제 Supabase — 백업 → 전체 비우기 → 복원 (Phase 1.6 / 10·11번)
 *
 * 원본 결혼계획표(151건)로 시작해서, JSON 백업을 내려받고,
 * **실제로 전체를 비운 다음** 그 파일로 복원해서 원본과 한 줄씩 비교한다.
 * 우리 운영 데이터가 아니라 검사 전용 계정 · 공간에서만 한다.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { APP, check, finish } from "./_env.mjs";
import { launch, mainText, setupPair } from "./_pair.mjs";

const errors = [];
const browser = await launch();
const { A } = await setupPair(browser, errors, { tag: "rt", seed: "original" });

const go = async (c, path) => {
  await c.page.goto(APP + path, { waitUntil: "domcontentloaded" });
  await c.page.waitForTimeout(2200);
};

/** 비교용으로 정규화 — id · 시각처럼 새로 만들어지는 값은 뺀다 */
const VOLATILE = new Set(["id", "wedding_id", "created_at", "updated_at", "user_id", "created_by", "invite_code", "budget_item_id", "category_id", "vendor_id", "entity_id"]);
function normalize(data) {
  const out = {};
  for (const [table, rows] of Object.entries(data)) {
    if (table === "wedding") {
      out.wedding = Object.fromEntries(Object.entries(rows).filter(([k]) => !VOLATILE.has(k)).sort());
      continue;
    }
    if (!Array.isArray(rows)) continue;
    if (table === "activity_logs") continue; // 기록은 복원 과정에서도 쌓인다
    out[table] = rows
      .map((r) => JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k]) => !VOLATILE.has(k)).sort())))
      .sort();
  }
  return out;
}
const hash = (o) => createHash("sha256").update(JSON.stringify(o)).digest("hex").slice(0, 16);
const counts = (n) => Object.fromEntries(Object.entries(n).filter(([k]) => k !== "wedding").map(([k, v]) => [k, v.length]));

// ── 1. 백업 내려받기
await go(A, "/settings/data");
const before = await mainText(A);
const [dl] = await Promise.all([
  A.page.waitForEvent("download", { timeout: 30000 }),
  A.page.getByRole("button", { name: /JSON 백업 내려받기/ }).click(),
]);
const path = await dl.path();
const backup = JSON.parse(readFileSync(path, "utf8"));
const src = normalize(backup.data ?? backup);
check("JSON 백업을 내려받는다", Object.keys(src).length > 3, `${dl.suggestedFilename()} · ${JSON.stringify(counts(src))}`);
const total = Object.values(counts(src)).reduce((a, b) => a + b, 0);
check("원본 결혼계획표가 통째로 들어 있다", total >= 140, `${total}건`);

// ── 2. 전체 비우기 (진짜로 지운다)
await A.page.getByRole("button", { name: /전체 비우기/ }).last().click();
await A.page.waitForTimeout(600);
await A.page.getByRole("button", { name: /^비우기$/ }).last().click();
await A.page.waitForTimeout(5000);
await go(A, "/plan");
const emptied = await mainText(A);
check("전체 비우기가 실제로 동작한다", /아직 등록된 할 일이 없어요|남은 일 0개/.test(emptied), emptied.split("\n").slice(0, 3).join(" · "));

// ── 3. 백업 파일로 복원
await go(A, "/settings/data");
await A.page.setInputFiles('input[type="file"][accept*="json"]', path);
await A.page.waitForTimeout(3000);
const confirmBtn = A.page.getByRole("button", { name: /복원|덮어쓰기|확인/ }).last();
if (await confirmBtn.count()) await confirmBtn.click().catch(() => {});
await A.page.waitForTimeout(12000);

// ── 4. 복원 결과를 다시 내려받아 원본과 비교
await go(A, "/settings/data");
const [dl2] = await Promise.all([
  A.page.waitForEvent("download", { timeout: 30000 }),
  A.page.getByRole("button", { name: /JSON 백업 내려받기/ }).click(),
]);
const after = JSON.parse(readFileSync(await dl2.path(), "utf8"));
const dst = normalize(after.data ?? after);

const cs = counts(src), cd = counts(dst);
const diffs = Object.keys(cs).filter((k) => cs[k] !== cd[k]).map((k) => `${k} ${cs[k]}→${cd[k]}`);
check("복원 후 표별 건수가 같다", diffs.length === 0, diffs.join(", ") || JSON.stringify(cd));
check("복원 후 내용이 한 글자도 다르지 않다", hash(src) === hash(dst), `${hash(src)} vs ${hash(dst)}`);

// 날짜가 하루 밀리지 않았는지 따로 본다
{
  const dates = (n) => (n.tasks ?? []).map((s) => (JSON.parse(s).due_date ?? "")).filter(Boolean).sort();
  const a = dates(src), b = dates(dst);
  check("복원 후 마감일이 하루도 밀리지 않는다", JSON.stringify(a) === JSON.stringify(b), `${a.length}건 중 다른 것 ${a.filter((x, i) => x !== b[i]).length}건`);
}
{
  const money = (n) => (n.budget_items ?? []).reduce((sum, s) => sum + (JSON.parse(s).estimated_amount ?? 0), 0);
  check("복원 후 예산 합계가 같다", money(src) === money(dst), `₩${money(src).toLocaleString()} vs ₩${money(dst).toLocaleString()}`);
}
{
  const people = (n) => (n.guests ?? []).reduce((sum, s) => sum + 1 + (JSON.parse(s).companions ?? 0), 0);
  check("복원 후 하객 · 동반 인원이 같다", people(src) === people(dst), `${people(src)}명 vs ${people(dst)}명`);
}

console.log(`\n콘솔 오류: ${errors.length ? errors.join("\n") : "없음"}`);
await browser.close();
finish();
