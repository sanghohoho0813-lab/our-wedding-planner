"use client";
import { Plus, Settings2, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { computeBudget, HEALTH_LABEL } from "@/lib/compute";
import { formatKRW, formatSignedKRW, formatSignedPct } from "@/lib/money";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Donut } from "@/components/ui/Donut";
import { MoneyField } from "@/components/ui/MoneyField";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PageHeader } from "@/components/layout/PageHeader";
import { CATEGORY_COLORS } from "@/components/home/CategoryRatio";
import { UpcomingPayments } from "@/components/home/UpcomingPayments";
import { BudgetItemSheet } from "./BudgetItemSheet";
import { CategoryManagerSheet } from "./CategoryManagerSheet";

export function BudgetDashboard() {
  const data = useWeddingStore((s) => s.data!);
  const updateWedding = useWeddingStore((s) => s.updateWedding);
  const [catOpen, setCatOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const b = computeBudget(data.wedding, data.budget_categories, data.budget_items, data.payments);
  const healthTone = b.health === "over" ? "danger" : b.health === "caution" ? "warning" : "success";
  const cats = [...b.categories].sort((x, y) => y.effective - x.effective);
  const donutSegments = cats.filter((c) => c.effective > 0).map((c, i) => ({ value: c.effective, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length], label: c.name }));
  if (b.unallocated > 0) donutSegments.push({ value: b.unallocated, color: "var(--surface-3)", label: "미배정" });

  const stats: { label: string; value: number; sub?: string; tone?: string }[] = [
    { label: "총 예정 예산", value: b.totalBudget },
    { label: "총 견적", value: b.totalEstimated },
    { label: "총 실제 비용", value: b.totalActual, sub: `사용률 ${b.usedPct.toFixed(1)}%` },
    { label: "총 결제 금액", value: b.totalPaid },
    { label: "남은 결제액", value: b.totalUnpaid },
    { label: "남은 예산", value: b.remaining, tone: b.remaining < 0 ? "text-danger" : undefined },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="예산 대시보드"
        description="견적과 실제 비용, 결제 현황을 한눈에"
        actions={
          <>
            <Button variant="outline" onClick={() => setCatOpen(true)}>
              <Settings2 className="size-4" /> 카테고리
            </Button>
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> 비용 추가
            </Button>
          </>
        }
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[0.8125rem] text-fg-2">총 예산</p>
            <div className="mt-1 max-w-xs">
              <MoneyField size="lg" value={data.wedding.total_budget} onChange={(v) => updateWedding({ total_budget: v })} title="총 예산" placeholder="총 예산을 정해보세요" />
            </div>
            <p className="mt-1 text-[0.75rem] text-fg-3">
              {data.wedding.total_budget > 0 ? "탭해서 수정" : "카테고리 계획 금액이나 견적 합계로 자동 계산돼요"}
            </p>
          </div>
          <div className="text-right">
            <Badge tone={healthTone} className="text-[0.8125rem] px-3 py-1">
              예산 {HEALTH_LABEL[b.health]}
            </Badge>
            <p className="mt-2 text-[0.75rem] text-fg-3">예상 총 지출 {formatKRW(b.totalEffective)} · {b.projectedPct.toFixed(0)}%</p>
          </div>
        </div>
        <ProgressBar value={b.usedPct} className="mt-4" color={b.health === "over" ? "var(--danger)" : b.health === "caution" ? "var(--warning)" : "var(--sage)"} height="h-2.5" />
        <div className="mt-1 flex justify-between text-[0.75rem] text-fg-3">
          <span>사용 {formatKRW(b.totalActual)}</span>
          <span>{b.usedPct.toFixed(1)}%</span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-[0.75rem] text-fg-3">{s.label}</p>
            <p className={cn("mt-1 truncate text-[1.125rem] font-bold tabular text-fg", s.tone)}>
              <AnimatedNumber value={s.value} format={formatKRW} />
            </p>
            {s.sub && <p className="text-[0.6875rem] text-fg-3">{s.sub}</p>}
          </Card>
        ))}
        <Card className="p-4">
          <p className="text-[0.75rem] text-fg-3">예상 대비 증감</p>
          <p className={cn("mt-1 flex items-center gap-1 truncate text-[1.125rem] font-bold tabular", b.diff > 0 ? "text-warning" : b.diff < 0 ? "text-success" : "text-fg")}>
            {b.diff > 0 ? <TrendingUp className="size-4" /> : b.diff < 0 ? <TrendingDown className="size-4" /> : null}
            {formatSignedKRW(b.diff)}
          </p>
          <p className="text-[0.6875rem] text-fg-3">{formatSignedPct(b.diffPct)} · 실제 금액 입력 항목 기준</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card>
          <CardHeader title="카테고리 비중" />
          <div className="flex flex-col items-center gap-5 px-5 pb-5 sm:flex-row">
            <Donut size={170} thickness={22} segments={donutSegments.length ? donutSegments : [{ value: 1, color: "var(--surface-3)" }]}>
              <span className="text-[1.375rem] font-bold tabular text-fg">{Math.round(b.usedPct)}%</span>
              <span className="text-[0.6875rem] text-fg-3">사용률</span>
            </Donut>
            <ul className="w-full space-y-2 text-[0.8125rem]">
              {donutSegments.slice(0, 7).map((s) => (
                <li key={s.label} className="flex items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="min-w-0 flex-1 truncate text-fg">{s.label}</span>
                  <span className="tabular text-fg-2">{((s.value / Math.max(b.totalBudget, b.totalEffective, 1)) * 100).toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card>
          <CardHeader title="카테고리별 예산" href="/budget/items" actionLabel="상세 예산" />
          {cats.length === 0 ? (
            <p className="px-5 pb-5 text-[0.875rem] text-fg-3">카테고리를 추가해 보세요.</p>
          ) : (
            <ul className="divide-y divide-line">
              {cats.map((c, i) => {
                const over = c.planned > 0 && c.effective > c.planned;
                return (
                  <li key={c.id}>
                    <Link href={`/budget/items?category=${c.id}`} className="block px-5 py-3 hover:bg-surface-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="size-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                          <span className="truncate text-[0.9375rem] font-medium text-fg">{c.name}</span>
                          <span className="shrink-0 text-[0.75rem] text-fg-3">{c.itemCount}개</span>
                        </div>
                        <div className="text-right">
                          <span className="block tabular text-[0.9375rem] font-semibold text-fg">{formatKRW(c.effective)}</span>
                          <span className="block text-[0.6875rem] text-fg-3">전체의 {c.pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      {c.planned > 0 && (
                        <div className="mt-2">
                          <ProgressBar value={(c.effective / c.planned) * 100} color={over ? "var(--danger)" : CATEGORY_COLORS[i % CATEGORY_COLORS.length]} height="h-1.5" />
                          <div className="mt-1 flex justify-between text-[0.6875rem] text-fg-3">
                            <span>계획 {formatKRW(c.planned)}</span>
                            <span className={over ? "text-danger" : undefined}>{over ? `초과 ${formatKRW(c.effective - c.planned)}` : `여유 ${formatKRW(c.planned - c.effective)}`}</span>
                          </div>
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <UpcomingPayments limit={8} />

      <CategoryManagerSheet open={catOpen} onClose={() => setCatOpen(false)} />
      <BudgetItemSheet open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
