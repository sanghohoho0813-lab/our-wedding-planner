"use client";
import { BarChart3, ChevronDown, PieChart, Plus, Settings2, TrendingDown, TrendingUp } from "lucide-react";
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
import { categoryColor, CATEGORY_MAX } from "@/lib/tint";
import { wasJustAdded } from "@/lib/fresh";
import { UpcomingPayments } from "@/components/home/UpcomingPayments";
import { MealEstimateCard } from "@/components/guests/MealEstimateCard";
import { BudgetItemSheet } from "./BudgetItemSheet";
import { CategoryManagerSheet } from "./CategoryManagerSheet";

export function BudgetDashboard({ embedded }: { embedded?: boolean } = {}) {
  const data = useWeddingStore((s) => s.data!);
  const updateWedding = useWeddingStore((s) => s.updateWedding);
  const [catOpen, setCatOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const b = computeBudget(data.wedding, data.budget_categories, data.budget_items, data.payments);
  const healthTone = b.health === "over" ? "danger" : b.health === "caution" ? "warning" : "success";
  const allCats = [...b.categories].sort((x, y) => y.effective - x.effective);
  // 금액이 0원인 카테고리는 기본으로 접는다 — 상세 탭의 "금액 없는 항목" 규칙과 같다.
  // 안 그러면 0원 줄이 목록을 덮어서, 정작 돈이 어디로 갔는지가 안 보인다.
  const emptyCats = allCats.filter((c) => c.effective === 0 && c.planned === 0 && !wasJustAdded(c.id));
  const cats = showEmpty ? allCats : allCats.filter((c) => !emptyCats.includes(c));
  // 도넛은 조각이 많아지면 색으로 구분이 안 된다. 큰 3개만 색을 주고 나머지는 '그 외' 하나로 접는다.
  // (색약에서 구분되는 한계가 3종이다 — src/lib/tint.ts 의 CATEGORY_COLORS 주석 참고)
  const spend = cats.filter((c) => c.effective > 0);
  const donutSegments = spend.slice(0, CATEGORY_MAX).map((c, i) => ({ value: c.effective, color: categoryColor(i), label: c.name }));
  const restTotal = spend.slice(CATEGORY_MAX).reduce((n, c) => n + c.effective, 0);
  if (restTotal > 0) donutSegments.push({ value: restTotal, color: "var(--text-3)", label: `그 외 ${spend.length - CATEGORY_MAX}개` });
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
        compact={embedded}
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[0.875rem] text-fg-2">총 예산</p>
            <div className="mt-1 max-w-xs">
              <MoneyField size="lg" value={data.wedding.total_budget} onChange={(v) => updateWedding({ total_budget: v })} title="총 예산" placeholder="총 예산을 정해보세요" />
            </div>
            <p className="mt-1 text-[0.8125rem] text-fg-3">
              {data.wedding.total_budget > 0 ? "탭해서 수정" : "카테고리 계획 금액이나 견적 합계로 자동 계산돼요"}
            </p>
          </div>
          <div className="sm:text-right">
            <Badge tone={healthTone} className="text-[0.875rem] px-3 py-1">
              예산 {HEALTH_LABEL[b.health]}
            </Badge>
            <p className="mt-2 text-[0.8125rem] text-fg-3">예상 총 지출 {formatKRW(b.totalEffective)} · {b.projectedPct.toFixed(0)}%</p>
            {/* 퍼센트만 보여주면 "그래서 어쩌라고" 가 된다. 왜 그런지를 같이 말한다. */}
            <ul className="mt-1 space-y-0.5 text-[0.8125rem] leading-relaxed text-fg-2 sm:max-w-[22rem]">
              {b.healthReasons.map((r) => (
                <li key={r}>· {r}</li>
              ))}
            </ul>
          </div>
        </div>
        <ProgressBar value={b.usedPct} className="mt-4" color={b.health === "over" ? "var(--danger)" : b.health === "caution" ? "var(--warning)" : "var(--sage)"} height="h-2.5" />
        <div className="mt-1 flex justify-between text-[0.8125rem] text-fg-3">
          <span>사용 {formatKRW(b.totalActual)}</span>
          <span>{b.usedPct.toFixed(1)}%</span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-[0.8125rem] text-fg-3">{s.label}</p>
            {/* 돈은 반올림해서 보여주지 않는다("1,041만" 은 편하지만 정확하지 않다).
                좁은 화면에서 '₩15,000,…' 으로 잘리던 문제는 글자 크기로 푼다. */}
            <p className={cn("mt-1 text-[1.0625rem] font-bold tabular text-fg sm:text-[1.25rem]", s.tone)} title={formatKRW(s.value)}>
              <AnimatedNumber value={s.value} format={formatKRW} />
            </p>
            {s.sub && <p className="text-[0.75rem] text-fg-3">{s.sub}</p>}
          </Card>
        ))}
        <Card className="p-4">
          <p className="text-[0.8125rem] text-fg-3">예상 대비 증감</p>
          <p className={cn("mt-1 flex items-center gap-1 truncate text-[1.25rem] font-bold tabular", b.diff > 0 ? "text-warning" : b.diff < 0 ? "text-success" : "text-fg")}>
            {b.diff > 0 ? <TrendingUp className="size-4" /> : b.diff < 0 ? <TrendingDown className="size-4" /> : null}
            {formatSignedKRW(b.diff)}
          </p>
          <p className="text-[0.75rem] text-fg-3">{formatSignedPct(b.diffPct)} · 실제 금액 기준</p>
        </Card>
      </div>

      {/* 큰 화면에서는 오른쪽 카테고리 목록이 길어서 왼쪽이 통째로 비어 보인다.
          결제 카드를 왼쪽 열에 같이 쌓아 그 빈자리를 채운다.
          폰에서는 도넛 → 결제 → 카테고리 목록 순으로, '어디에 썼나 → 다음에 낼 것 → 자세히' 가 된다. */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="space-y-4">
        <Card tint="budget">
          <CardHeader tint="budget" title="카테고리 비중" icon={<PieChart />} />
          <div className="flex flex-col items-center gap-5 px-5 pb-5 sm:flex-row">
            <Donut size={170} thickness={22} segments={donutSegments.length ? donutSegments : [{ value: 1, color: "var(--surface-3)" }]}>
              <span className="text-[1.5rem] font-bold tabular text-fg">{Math.round(b.usedPct)}%</span>
              <span className="text-[0.75rem] text-fg-3">사용률</span>
            </Donut>
            <ul data-testid="donut-legend" className="w-full space-y-2 text-[0.875rem]">
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
          <MealEstimateCard />
          <UpcomingPayments limit={8} />
        </div>

        <Card tint="budget">
          <CardHeader tint="budget" title="카테고리별 예산" icon={<BarChart3 />} href="/budget?tab=items" actionLabel="상세 예산" />
          {cats.length === 0 ? (
            <p className="px-5 pb-5 text-[0.9375rem] text-fg-3">카테고리를 추가해 보세요.</p>
          ) : (
            <ul data-testid="category-list" className="divide-y divide-line">
              {cats.map((c, i) => {
                const over = c.planned > 0 && c.effective > c.planned;
                return (
                  <li key={c.id}>
                    <Link href={`/budget/items?category=${c.id}`} className="block px-5 py-3 hover:bg-surface-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="size-2.5 shrink-0 rounded-full" style={{ background: categoryColor(i) }} />
                          <span className="truncate text-[1rem] font-medium text-fg">{c.name}</span>
                          <span className="shrink-0 text-[0.8125rem] text-fg-3">{c.itemCount}개</span>
                        </div>
                        <div className="text-right">
                          <span className="block tabular text-[1rem] font-semibold text-fg">{formatKRW(c.effective)}</span>
                          <span className="block text-[0.75rem] text-fg-3">전체의 {c.pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      {c.planned > 0 && (
                        <div className="mt-2">
                          <ProgressBar value={(c.effective / c.planned) * 100} color={over ? "var(--danger)" : "var(--tint-budget)"} height="h-1.5" />
                          <div className="mt-1 flex justify-between text-[0.75rem] text-fg-3">
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
          {emptyCats.length > 0 && (
            <button
              type="button"
              onClick={() => setShowEmpty((v) => !v)}
              aria-expanded={showEmpty}
              className="flex w-full items-center justify-center gap-1.5 border-t border-line px-5 py-3 text-[0.875rem] text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg-2"
            >
              {showEmpty ? "금액 없는 카테고리 접기" : `금액 없는 카테고리 ${emptyCats.length}개 보기`}
              <ChevronDown className={cn("size-4 transition-transform", showEmpty && "rotate-180")} />
            </button>
          )}
        </Card>
      </div>


      <CategoryManagerSheet open={catOpen} onClose={() => setCatOpen(false)} />
      <BudgetItemSheet open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
