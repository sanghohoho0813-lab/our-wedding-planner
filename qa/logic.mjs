// 날짜 추천 · 결제 일정 계산 검사 (브라우저 없이 돈다)
// src/lib/compute/plan-dates.ts · cashflow.ts 를 그대로 가져와 돌린다. 가져오는 줄만 바꿔치기한다.
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const dir = mkdtempSync(join(tmpdir(), "owp-logic-"));
const DATE_SHIM = `
const addDays = (iso: string, n: number) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const daysUntil = (t: string, today: string) => Math.round((Date.parse(t + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86400000);
`;
const plan = readFileSync("src/lib/compute/plan-dates.ts", "utf8")
  .replace('import type { Task } from "@/lib/db/types";', 'type Task = { id: string; title: string; category: string | null; due_date: string | null; status: string };')
  .replace('import { addDays, daysUntil } from "@/lib/date";', DATE_SHIM);
const cash = readFileSync("src/lib/compute/cashflow.ts", "utf8")
  .replace('import type { BudgetCategory, BudgetItem, Payment } from "@/lib/db/types";',
    'type BudgetCategory = { id: string; name: string }; type BudgetItem = { id: string; name: string; category_id: string | null; estimated_amount: number; actual_amount: number }; type Payment = { id: string; budget_item_id: string; title: string; amount: number; due_date: string | null; paid: boolean; paid_at: string | null };')
  .replace('import { addDays } from "@/lib/date";', DATE_SHIM);
writeFileSync(join(dir, "plan.ts"), plan);
writeFileSync(join(dir, "cash.ts"), cash);
execFileSync("npx", ["tsc", join(dir, "plan.ts"), join(dir, "cash.ts"), "--target", "es2022", "--module", "esnext", "--moduleResolution", "bundler", "--outDir", dir], { stdio: "pipe" });
const P = await import(join(dir, "plan.js"));
const C = await import(join(dir, "cash.js"));

const results = [];
const check = (name, ok, info = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${info ? "  — " + info : ""}`);
};

// ── 날짜 추천
const TODAY = "2026-10-06";
const WED = "2026-12-20";
const t = (id, title, extra = {}) => ({ id, title, category: null, due_date: null, status: "todo", ...extra });
{
  const s = P.suggestTaskDates([t("a", "청첩장 만들기 (모바일)")], WED, TODAY);
  check("모바일 청첩장 → 결혼식 45일 전", s[0]?.date === "2026-11-05" && s[0].before === 45, s[0]?.date);
}
{
  const s = P.suggestTaskDates([t("a", "상견례하기")], WED, TODAY);
  check("시기가 지난 일(상견례 D-120) → 늦어짐, 내일로", s[0]?.late && s[0].date === "2026-10-07", JSON.stringify({ late: s[0]?.late, date: s[0]?.date }));
}
{
  const s = P.suggestTaskDates([t("a", "청첩장 A"), t("b", "청첩장 B"), t("c", "청첩장 C")], WED, TODAY);
  const days = s.map((x) => x.date);
  const max = Math.max(...Object.values(days.reduce((m, d) => ((m[d] = (m[d] ?? 0) + 1), m), {})));
  check("같은 날 2개까지만 몰아준다", max <= 2, days.join(", "));
}
{
  const s = P.suggestTaskDates(
    [t("done", "청첩장", { status: "done" }), t("future", "답례품", { due_date: "2026-11-30" }), t("old", "웨딩플래너 정하기", { due_date: "2026-02-15", status: "doing" })],
    WED, TODAY,
  );
  check("끝난 일 · 날짜가 앞에 있는 일은 건드리지 않는다", s.length === 1 && s[0].task.id === "old");
  check("지난 마감은 '마감 지남' 으로 표시하고 내일 이후로", s[0].overdue && s[0].date >= "2026-10-07");
}
{
  const s = P.suggestTaskDates([t("a", "부케 구하기"), t("b", "답례품 준비")], "2026-10-09", TODAY);
  check("결혼식이 코앞이면 결혼식 전날을 넘지 않는다", s.every((x) => x.date <= "2026-10-08"), s.map((x) => x.date).join(", "));
}
{
  const s = P.suggestTaskDates([t("a", "혼인신고")], WED, TODAY);
  check("혼인신고는 결혼식 뒤로", s[0]?.date === "2027-01-03", s[0]?.date);
}
{
  const s = P.suggestTaskDates([t("a", "뭔지 모를 일", { category: "예복" })], WED, TODAY);
  check("제목으로 모르면 분류로 (예복 D-45)", s[0]?.before === 45);
  const d = P.suggestTaskDates([t("a", "뭔지 모를 일")], WED, TODAY);
  check("아무것도 모르면 D-30", d[0]?.before === 30);
}
check("설명: 60일 → 2달 전", P.typicalLabel(60) === "보통 결혼식 2달\u00a0전");
check("설명: 21일 → 3주 전", P.typicalLabel(21) === "보통 결혼식 3주\u00a0전");
check("설명: 45일 → D-45", P.typicalLabel(45) === "보통 결혼식 D-45");
check("설명: -14 → 14일 뒤", P.typicalLabel(-14) === "보통 결혼식 14일\u00a0뒤");
check("할 일이 없으면 빈 목록", P.suggestTaskDates([], WED, TODAY).length === 0);

// ── 결제 일정
const item = (id, name, est, act, cat = null) => ({ id, name, category_id: cat, estimated_amount: est, actual_amount: act });
const pay = (id, item_id, amount, due, paid = false) => ({ id, budget_item_id: item_id, title: "결제", amount, due_date: due, paid, paid_at: paid ? TODAY : null });
{
  const u = C.unscheduledPayments([item("i1", "스드메", 0, 1000000)], [], [pay("p1", "i1", 300000, TODAY, true)]);
  check("낸 돈을 빼고 남은 돈만 잡는다", u.length === 1 && u[0].open === 700000 && u[0].payment === null, JSON.stringify(u.map((x) => x.open)));
}
{
  // 야외스냅: 실제 31만, 20만 냄, '당일 결제' 11만 날짜 없음 → 새로 만들지 않고 그 11만에 날짜만
  const u = C.unscheduledPayments([item("i2", "야외스냅", 500000, 310000)], [], [pay("p1", "i2", 200000, "2026-09-01", true), pay("p2", "i2", 110000, null)]);
  check("날짜 없는 결제가 있으면 두 번 잡지 않는다", u.length === 1 && u[0].payment?.id === "p2" && u[0].open === 110000, JSON.stringify(u.map((x) => [x.key, x.open])));
}
{
  const u = C.unscheduledPayments([item("i3", "반지", 800000, 0)], [], [pay("p1", "i3", 800000, "2026-11-01")]);
  check("이미 날짜가 잡힌 돈은 다시 묻지 않는다", u.length === 0);
}
{
  const u = C.unscheduledPayments([item("i4", "부케", 0, 0)], [], []);
  check("금액이 없는 항목은 건너뛴다", u.length === 0);
}
{
  const u = C.unscheduledPayments([item("a", "작은 것", 100000, 0), item("b", "큰 것", 0, 5000000)], [], []);
  check("큰돈부터 보여준다", u[0].item.id === "b");
}
{
  const u = C.unscheduledPayments([item("h", "장소 대관료", 0, 5000000, "c1"), item("f", "비행기", 0, 1500000, "c2")], [{ id: "c1", name: "웨딩홀" }, { id: "c2", name: "신혼여행" }], []);
  check("식장은 당일, 여행은 미리 내는 것을 기본으로", u.find((x) => x.item.id === "h").suggest === "wedding_day" && u.find((x) => x.item.id === "f").suggest === "next_month_end");
}
check("이번 달 말", C.payWhenDate("month_end", TODAY, WED) === "2026-10-31");
check("다음 달 말", C.payWhenDate("next_month_end", TODAY, WED) === "2026-11-30");
check("12월의 다음 달 말은 이듬해 1월", C.payWhenDate("next_month_end", "2026-12-03", WED) === "2027-01-31");
check("결혼식 2주 전", C.payWhenDate("two_weeks_before", TODAY, WED) === "2026-12-06");
check("2주 전이 이미 지났으면 오늘", C.payWhenDate("two_weeks_before", "2026-12-10", WED) === "2026-12-10");
{
  const f = C.monthlyOutflow([pay("a", "x", 100, "2026-09-20"), pay("b", "x", 200, "2026-10-30"), pay("c", "x", 300, "2026-12-20"), pay("d", "x", 400, null), pay("e", "x", 999, "2026-11-01", true)], TODAY);
  const oct = f.months.find((m) => m.key === "2026-10");
  check("지난 달에 냈어야 할 돈은 이번 달로 모은다", oct?.amount === 300 && oct.overdue, JSON.stringify(oct));
  check("날짜 없는 돈은 따로 · 낸 돈은 빼고 합계", f.undated === 400 && f.total === 1000, JSON.stringify({ undated: f.undated, total: f.total }));
  check("달 순서대로", f.months.map((m) => m.key).join() === "2026-10,2026-12");
}
{
  const f = C.monthlyOutflow([pay("a", "x", 100, "2027-01-15")], TODAY);
  check("해가 바뀌면 연도를 붙인다", f.months[0].label === "27년 1월", f.months[0].label);
}

const ok = results.filter(Boolean).length;
console.log(`\n${ok}/${results.length} passed`);
process.exit(ok === results.length ? 0 : 1);
