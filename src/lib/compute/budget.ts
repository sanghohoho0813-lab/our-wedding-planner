import type { BudgetCategory, BudgetItem, Payment, Wedding } from "@/lib/db/types";
import { todayISO } from "@/lib/date";

export type BudgetHealth = "safe" | "caution" | "over";

export interface ItemSummary {
  item: BudgetItem;
  effective: number; // 실제 금액이 있으면 실제, 없으면 견적
  paid: number;
  unpaid: number;
  diff: number; // 실제 - 견적 (실제가 입력된 경우만)
  diffPct: number;
  paymentStatus: "unpaid" | "partial" | "paid";
  pctOfTotal: number;
}

export interface CategorySummary {
  category: BudgetCategory | null;
  id: string;
  name: string;
  icon: string | null;
  estimated: number;
  actual: number;
  effective: number;
  paid: number;
  planned: number;
  pct: number;
  itemCount: number;
}

export interface BudgetSummary {
  totalBudget: number; // 총 예정 예산 (결혼 정보의 총 예산, 없으면 견적 합)
  totalEstimated: number;
  totalActual: number;
  totalEffective: number; // 예상 총 지출
  totalPaid: number;
  totalUnpaid: number;
  remaining: number; // 총 예산 - 사용(실제)
  usedPct: number;
  projectedPct: number;
  diff: number; // 실제 - 견적 (실제 입력 항목 기준)
  diffPct: number;
  health: BudgetHealth;
  items: ItemSummary[];
  categories: CategorySummary[];
  unallocated: number;
  thisMonthExpected: number;
  upcomingPayments: { payment: Payment; item: BudgetItem }[];
  overduePayments: { payment: Payment; item: BudgetItem }[];
}

export function computeBudget(
  wedding: Wedding,
  categories: BudgetCategory[],
  items: BudgetItem[],
  payments: Payment[],
  today = todayISO(),
): BudgetSummary {
  const paidByItem = new Map<string, number>();
  for (const p of payments) {
    if (!p.paid) continue;
    paidByItem.set(p.budget_item_id, (paidByItem.get(p.budget_item_id) ?? 0) + p.amount);
  }

  const totalEstimated = items.reduce((s, i) => s + i.estimated_amount, 0);
  const totalActual = items.reduce((s, i) => s + i.actual_amount, 0);
  const totalEffective = items.reduce((s, i) => s + (i.actual_amount > 0 ? i.actual_amount : i.estimated_amount), 0);
  const plannedFromCategories = categories.reduce((s, c) => s + c.planned_amount, 0);
  const totalBudget = wedding.total_budget > 0 ? wedding.total_budget : plannedFromCategories > 0 ? plannedFromCategories : totalEffective;
  const totalPaid = [...paidByItem.values()].reduce((s, v) => s + v, 0);

  const itemSummaries: ItemSummary[] = items.map((item) => {
    const effective = item.actual_amount > 0 ? item.actual_amount : item.estimated_amount;
    const paid = paidByItem.get(item.id) ?? 0;
    const unpaid = Math.max(0, effective - paid);
    const hasActual = item.actual_amount > 0;
    const diff = hasActual ? item.actual_amount - item.estimated_amount : 0;
    const diffPct = hasActual && item.estimated_amount > 0 ? (diff / item.estimated_amount) * 100 : 0;
    const paymentStatus: ItemSummary["paymentStatus"] = paid <= 0 ? "unpaid" : paid >= effective && effective > 0 ? "paid" : "partial";
    return {
      item,
      effective,
      paid,
      unpaid,
      diff,
      diffPct,
      paymentStatus,
      pctOfTotal: totalBudget > 0 ? (effective / totalBudget) * 100 : 0,
    };
  });

  const totalUnpaid = itemSummaries.reduce((s, i) => s + i.unpaid, 0);
  const withActual = itemSummaries.filter((i) => i.item.actual_amount > 0);
  const diff = withActual.reduce((s, i) => s + i.diff, 0);
  const estOfActual = withActual.reduce((s, i) => s + i.item.estimated_amount, 0);
  const diffPct = estOfActual > 0 ? (diff / estOfActual) * 100 : 0;

  const byCat = new Map<string, CategorySummary>();
  const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);
  for (const c of sorted) {
    byCat.set(c.id, {
      category: c,
      id: c.id,
      name: c.name,
      icon: c.icon,
      estimated: 0,
      actual: 0,
      effective: 0,
      paid: 0,
      planned: c.planned_amount,
      pct: 0,
      itemCount: 0,
    });
  }
  const uncategorized: CategorySummary = {
    category: null,
    id: "__none__",
    name: "미분류",
    icon: null,
    estimated: 0,
    actual: 0,
    effective: 0,
    paid: 0,
    planned: 0,
    pct: 0,
    itemCount: 0,
  };
  for (const s of itemSummaries) {
    const target = (s.item.category_id && byCat.get(s.item.category_id)) || uncategorized;
    target.estimated += s.item.estimated_amount;
    target.actual += s.item.actual_amount;
    target.effective += s.effective;
    target.paid += s.paid;
    target.itemCount += 1;
  }
  const catList = [...byCat.values()];
  if (uncategorized.itemCount > 0) catList.push(uncategorized);
  const base = Math.max(totalBudget, totalEffective);
  for (const c of catList) c.pct = base > 0 ? (c.effective / base) * 100 : 0;
  const unallocated = Math.max(0, totalBudget - totalEffective);

  const projectedPct = totalBudget > 0 ? (totalEffective / totalBudget) * 100 : 0;
  const usedPct = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
  const health: BudgetHealth = projectedPct > 100 ? "over" : projectedPct > 90 ? "caution" : "safe";

  const itemById = new Map(items.map((i) => [i.id, i]));
  const monthPrefix = today.slice(0, 7);
  const unpaidPayments = payments
    .filter((p) => !p.paid && itemById.has(p.budget_item_id))
    .map((p) => ({ payment: p, item: itemById.get(p.budget_item_id)! }))
    .sort((a, b) => (a.payment.due_date ?? "9999").localeCompare(b.payment.due_date ?? "9999"));
  const thisMonthExpected = unpaidPayments
    .filter((p) => p.payment.due_date?.startsWith(monthPrefix))
    .reduce((s, p) => s + p.payment.amount, 0);

  return {
    totalBudget,
    totalEstimated,
    totalActual,
    totalEffective,
    totalPaid,
    totalUnpaid,
    remaining: totalBudget - totalActual,
    usedPct,
    projectedPct,
    diff,
    diffPct,
    health,
    items: itemSummaries,
    categories: catList,
    unallocated,
    thisMonthExpected,
    upcomingPayments: unpaidPayments.filter((p) => !p.payment.due_date || p.payment.due_date >= today),
    overduePayments: unpaidPayments.filter((p) => p.payment.due_date && p.payment.due_date < today),
  };
}

export const HEALTH_LABEL: Record<BudgetHealth, string> = { safe: "안전", caution: "주의", over: "초과" };
