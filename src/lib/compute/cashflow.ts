import type { BudgetCategory, BudgetItem, Payment } from "@/lib/db/types";
import { addDays } from "@/lib/date";

/**
 * "앞으로 언제 얼마가 나가는가"
 *
 * 예산 화면은 '얼마 쓰기로 했는지(견적 · 실제)' 는 잘 보여주지만,
 * 남은 돈이 **언제** 나가는지는 결제 일정을 하나하나 넣어야만 보였다.
 * 실제 데이터에서는 남은 결제액 1,450만 원 중 날짜가 있는 건 11만 원뿐이었다.
 * 그래서 결혼 직전 한 달에 돈이 얼마나 몰리는지 알 수가 없었다.
 *
 * 여기서는
 *  1) 항목마다 '아직 결제일이 안 정해진 돈' 을 계산하고
 *  2) 언제 내면 되는지 기본값을 골라 주고
 *  3) 월별로 나갈 돈을 모아 보여준다.
 */

export interface Unscheduled {
  /** 목록 열쇠: 새로 만들 돈이면 항목 id, 날짜만 붙일 결제면 결제 id */
  key: string;
  item: BudgetItem;
  /** 이미 있는데 날짜만 없는 결제 (있으면 새로 만들지 않고 날짜만 붙인다) */
  payment: Payment | null;
  categoryName: string | null;
  /** 실제 금액이 있으면 실제, 없으면 견적 */
  effective: number;
  paid: number;
  /** 날짜가 잡힌(아직 안 낸) 결제 합계 */
  scheduled: number;
  /** 결제일이 안 정해진 돈 */
  open: number;
  /** 실제 금액 기준인가(견적만 있으면 false) */
  firm: boolean;
  /** 언제 내면 되는지 기본값 */
  suggest: PayWhen;
}

export type PayWhen = "month_end" | "next_month_end" | "two_weeks_before" | "wedding_day" | "paid";

export function payWhenDate(when: PayWhen, today: string, weddingDate: string): string {
  const [y, m] = today.split("-").map(Number);
  const lastOf = (yy: number, mm: number) => {
    const d = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
    return `${yy}-${String(mm).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };
  switch (when) {
    case "month_end":
      return lastOf(y, m);
    case "next_month_end":
      return m === 12 ? lastOf(y + 1, 1) : lastOf(y, m + 1);
    case "two_weeks_before": {
      const d = addDays(weddingDate, -14);
      return d > today ? d : today;
    }
    case "wedding_day":
      return weddingDate > today ? weddingDate : today;
    case "paid":
      return today;
  }
}

/**
 * 보통 언제 내는가 — 업체마다 다르니 '기본값' 일 뿐이다(한 번 눌러 바꾼다).
 * 식장 · 당일 촬영처럼 예식 날 정산하는 것은 당일, 여행은 미리, 나머지는 2주 전.
 */
function suggestWhen(item: BudgetItem, categoryName: string | null): PayWhen {
  const text = `${categoryName ?? ""} ${item.name}`;
  if (/웨딩홀|식장|대관|식대|본식|DVD|스냅\s*당일|축가|사회/.test(text)) return "wedding_day";
  if (/신혼여행|항공|숙소|호텔|여행/.test(text)) return "next_month_end";
  return "two_weeks_before";
}

export function unscheduledPayments(items: BudgetItem[], categories: BudgetCategory[], payments: Payment[]): Unscheduled[] {
  const cat = new Map(categories.map((c) => [c.id, c.name]));
  const paid = new Map<string, number>();
  const scheduled = new Map<string, number>();
  const undatedByItem = new Map<string, Payment[]>();
  for (const p of payments) {
    if (p.paid) paid.set(p.budget_item_id, (paid.get(p.budget_item_id) ?? 0) + p.amount);
    else if (p.due_date) scheduled.set(p.budget_item_id, (scheduled.get(p.budget_item_id) ?? 0) + p.amount);
    else undatedByItem.set(p.budget_item_id, [...(undatedByItem.get(p.budget_item_id) ?? []), p]);
  }
  const out: Unscheduled[] = [];
  for (const item of items) {
    const effective = item.actual_amount > 0 ? item.actual_amount : item.estimated_amount;
    const pd = paid.get(item.id) ?? 0;
    const sc = scheduled.get(item.id) ?? 0;
    const undated = undatedByItem.get(item.id) ?? [];
    const categoryName = item.category_id ? cat.get(item.category_id) ?? null : null;
    const base = { item, categoryName, effective, paid: pd, scheduled: sc, firm: item.actual_amount > 0, suggest: suggestWhen(item, categoryName) };
    // 1) 이미 적어 둔 결제인데 날짜가 없는 것 → 새로 만들지 않고 날짜만 붙인다
    //    (새로 만들면 같은 돈이 두 번 잡힌다)
    for (const p of undated) if (p.amount > 0) out.push({ ...base, key: p.id, payment: p, open: p.amount });
    // 2) 그러고도 남는 돈 → 결제를 새로 만든다
    const undatedSum = undated.reduce((n, p) => n + p.amount, 0);
    const open = effective - pd - sc - undatedSum;
    if (effective > 0 && open > 0) out.push({ ...base, key: item.id, payment: null, open });
  }
  // 큰돈부터 — 날짜를 정할 가치가 큰 순서
  return out.sort((a, b) => b.open - a.open);
}

export interface MonthOutflow {
  /** "2026-11" */
  key: string;
  label: string;
  amount: number;
  /** 이미 지난 결제일인데 아직 안 낸 돈이 포함됐나 */
  overdue: boolean;
}

/** 아직 안 낸 결제를 월별로 묶는다. 날짜 없는 것은 따로. */
export function monthlyOutflow(
  payments: Pick<Payment, "amount" | "due_date" | "paid">[],
  today: string,
): { months: MonthOutflow[]; undated: number; total: number } {
  const map = new Map<string, MonthOutflow>();
  let undated = 0;
  let total = 0;
  const thisMonth = today.slice(0, 7);
  for (const p of payments) {
    if (p.paid) continue;
    total += p.amount;
    if (!p.due_date) {
      undated += p.amount;
      continue;
    }
    // 지난 달에 내야 했던 돈은 '이번 달' 로 모은다 (지금 내야 하는 돈이다)
    const key = p.due_date.slice(0, 7) < thisMonth ? thisMonth : p.due_date.slice(0, 7);
    const m = map.get(key) ?? { key, label: `${Number(key.slice(5, 7))}월`, amount: 0, overdue: false };
    m.amount += p.amount;
    if (p.due_date < today) m.overdue = true;
    map.set(key, m);
  }
  const months = [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  // 해가 바뀌면 연도를 붙인다
  for (const m of months) if (m.key.slice(0, 4) !== today.slice(0, 4)) m.label = `${m.key.slice(2, 4)}년 ${m.label}`;
  return { months, undated, total };
}
