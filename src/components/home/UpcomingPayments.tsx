"use client";
import { CreditCard } from "lucide-react";
import { useState } from "react";
import { computeBudget } from "@/lib/compute";
import { formatShortDate, todayISO } from "@/lib/date";
import { formatKRW } from "@/lib/money";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { Card, CardHeader } from "@/components/ui/Card";
import { CheckCircle } from "@/components/ui/CheckCircle";
import { EmptyState } from "@/components/ui/EmptyState";
import { BudgetItemSheet } from "@/components/budget/BudgetItemSheet";

export function UpcomingPayments({ limit = 5 }: { limit?: number }) {
  const data = useWeddingStore((s) => s.data!);
  const patch = useWeddingStore((s) => s.patch);
  const [itemId, setItemId] = useState<string | null>(null);
  const b = computeBudget(data.wedding, data.budget_categories, data.budget_items, data.payments);
  const list = [...b.overduePayments, ...b.upcomingPayments].slice(0, limit);
  const total = b.totalUnpaid;
  return (
    <Card>
      <CardHeader title="다가오는 결제" icon={<CreditCard />} href="/budget/items" subtitle={total > 0 ? `남은 결제액 ${formatKRW(total)}` : undefined} />
      {list.length === 0 ? (
        <EmptyState compact title="예정된 결제가 없어요" description="예산 항목에서 결제 예정일을 등록하면 여기에 보여요." />
      ) : (
        <ul className="px-2 pb-2">
          {list.map(({ payment, item }) => {
            const overdue = !!payment.due_date && payment.due_date < todayISO();
            return (
              <li key={payment.id} className="flex items-center gap-3 rounded-[12px] px-3 py-2 hover:bg-surface-2">
                <CheckCircle checked={false} onChange={() => patch("payments", payment.id, { paid: true, paid_at: todayISO() })} label="결제 완료로 표시" />
                <button type="button" onClick={() => setItemId(item.id)} className="min-w-0 flex-1 text-left">
                  <span className="flex items-center gap-2">
                    <span className={overdue ? "shrink-0 text-[0.8125rem] font-semibold tabular text-danger" : "shrink-0 text-[0.8125rem] font-semibold tabular text-accent-text"}>
                      {payment.due_date ? formatShortDate(payment.due_date) : "미정"}
                    </span>
                    <span className="truncate text-[0.9375rem] font-medium text-fg">{item.name}</span>
                  </span>
                  <span className="block text-[0.75rem] text-fg-3">{payment.title}{overdue ? " · 지났어요" : ""}</span>
                </button>
                <span className="shrink-0 tabular text-[0.9375rem] font-semibold text-fg">{formatKRW(payment.amount)}</span>
              </li>
            );
          })}
        </ul>
      )}
      <BudgetItemSheet open={!!itemId} onClose={() => setItemId(null)} itemId={itemId} />
    </Card>
  );
}
