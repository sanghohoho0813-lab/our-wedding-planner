"use client";
import { PieChart } from "lucide-react";
import { computeBudget, HEALTH_LABEL } from "@/lib/compute";
import { formatKRW } from "@/lib/money";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { Donut } from "@/components/ui/Donut";

export function BudgetOverview() {
  const data = useWeddingStore((s) => s.data!);
  const b = computeBudget(data.wedding, data.budget_categories, data.budget_items, data.payments);
  const used = Math.min(b.totalActual, b.totalBudget);
  const rest = Math.max(0, b.totalBudget - b.totalActual);
  const healthTone = b.health === "over" ? "danger" : b.health === "caution" ? "warning" : "success";
  return (
    <Card>
      <CardHeader title="예산 현황" icon={<PieChart />} href="/budget" actionLabel="자세히 보기" action={undefined} />
      <div className="flex items-center gap-5 px-5 pb-5">
        <Donut
          size={140}
          thickness={18}
          segments={[
            { value: used, color: "var(--sage)" },
            { value: rest, color: "var(--surface-3)" },
          ]}
        >
          <span className="text-[1.625rem] font-bold tabular leading-none text-fg">{Math.round(b.usedPct)}%</span>
          <span className="mt-1 text-[0.75rem] text-fg-3">사용률</span>
        </Donut>
        <dl className="min-w-0 flex-1 space-y-3">
          {[
            ["전체 예산", b.totalBudget, "var(--accent)"],
            ["사용 금액", b.totalActual, "var(--sage)"],
            ["남은 금액", b.remaining, "var(--gold)"],
          ].map(([label, v, c]) => (
            <div key={label as string} className="flex items-start gap-2">
              <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: c as string }} />
              <div className="min-w-0">
                <dt className="text-[0.8125rem] text-fg-3">{label}</dt>
                <dd className="truncate text-[1.0625rem] font-semibold tabular text-fg">{formatKRW(v as number)}</dd>
              </div>
            </div>
          ))}
          <Badge tone={healthTone}>예산 {HEALTH_LABEL[b.health]}</Badge>
        </dl>
      </div>
    </Card>
  );
}
