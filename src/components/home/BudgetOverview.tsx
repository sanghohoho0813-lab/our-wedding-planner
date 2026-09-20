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
  // 사용률은 "얼마나 썼나(상태)" 라서 예산 영역색이 아니라 상태색을 쓴다.
  // 예산 페이지의 진행 막대와 같은 규칙이라, 두 화면에서 같은 색이 같은 뜻이 된다.
  const usedColor = b.health === "over" ? "var(--danger)" : b.health === "caution" ? "var(--warning)" : "var(--tint-budget)";
  return (
    <Card tint="budget">
      <CardHeader tint="budget" title="예산 현황" icon={<PieChart />} href="/budget" actionLabel="자세히 보기" action={undefined} />
      <div className="flex items-center gap-5 px-5 pb-5">
        <Donut size={140} thickness={18} segments={[{ value: used, color: usedColor }, { value: rest, color: "var(--surface-3)" }]}>
          <span className="text-[1.625rem] font-bold tabular leading-none text-fg">{Math.round(b.usedPct)}%</span>
          <span className="mt-1 text-[0.75rem] text-fg-3">사용률</span>
        </Donut>
        <dl className="min-w-0 flex-1 space-y-3">
          {/* 점은 도넛 조각에만 붙인다. '전체 예산'은 조각이 아니라 합계라 점이 없다 —
              점이 셋이면 색 셋이 각각 뭔가를 뜻하는 것처럼 보여서 오히려 읽기 어려워진다. */}
          {[
            ["전체 예산", b.totalBudget, null],
            ["사용 금액", b.totalActual, usedColor],
            ["남은 금액", b.remaining, "var(--surface-3)"],
          ].map(([label, v, c]) => (
            <div key={label as string} className="flex items-start gap-2">
              <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: (c as string | null) ?? "transparent" }} />
              <div className="min-w-0">
                <dt className="text-[0.8125rem] text-fg-3">{label}</dt>
                <dd className="truncate text-[1.0625rem] font-semibold tabular text-fg">{formatKRW(v as number)}</dd>
              </div>
            </div>
          ))}
          <div>
            <Badge tone={healthTone}>예산 {HEALTH_LABEL[b.health]}</Badge>
            <p className="mt-1 text-[0.8125rem] leading-snug text-fg-3">{b.healthReasons[0]}</p>
          </div>
        </dl>
      </div>
    </Card>
  );
}
