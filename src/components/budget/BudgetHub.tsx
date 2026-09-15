"use client";
import { computeBudget } from "@/lib/compute";
import { useTabs } from "@/lib/hooks";
import { formatKRW } from "@/lib/money";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { TabBar } from "@/components/layout/TabBar";
import { UpcomingPayments } from "@/components/home/UpcomingPayments";
import { BudgetDashboard } from "./BudgetDashboard";
import { BudgetItemsView } from "./BudgetItemsView";

const TABS = ["summary", "items", "payments"] as const;
type Tab = (typeof TABS)[number];

export function BudgetHub() {
  const [tab, setTab] = useTabs<Tab>(TABS, "summary");
  const data = useWeddingStore((s) => s.data!);
  const b = computeBudget(data.wedding, data.budget_categories, data.budget_items, data.payments);
  const duePayments = b.upcomingPayments.length + b.overduePayments.length;

  return (
    <div>
      <div className="mb-4">
        <h1 className="hidden text-[1.75rem] font-bold tracking-tight text-fg lg:block">예산</h1>
        <p className="text-[0.9375rem] text-fg-3">
          총 {formatKRW(b.totalBudget)} · 실제 지출 {formatKRW(b.totalActual)} · 남은 예산 {formatKRW(b.remaining)}
        </p>
      </div>
      <TabBar
        className="mb-4 max-w-md"
        tabs={[
          { value: "summary", label: "요약" },
          { value: "items", label: "상세", badge: data.budget_items.length },
          { value: "payments", label: "결제 예정", badge: duePayments },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "summary" && <BudgetDashboard embedded />}
      {tab === "items" && <BudgetItemsView embedded />}
      {tab === "payments" && <UpcomingPayments limit={50} />}
    </div>
  );
}
