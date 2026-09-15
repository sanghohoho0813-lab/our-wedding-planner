"use client";
import { BarChart3 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { computeBudget } from "@/lib/compute";
import { formatKRW } from "@/lib/money";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";

export const CATEGORY_COLORS = ["var(--accent)", "var(--sage)", "var(--gold)", "var(--blue)", "var(--terracotta)", "var(--rose)"];

type Basis = "actual" | "planned";

export function CategoryRatio({ limit = 6, showAmount = false }: { limit?: number; showAmount?: boolean }) {
  const data = useWeddingStore((s) => s.data!);
  const [basis, setBasis] = useState<Basis>("actual");
  const b = computeBudget(data.wedding, data.budget_categories, data.budget_items, data.payments);
  const totalFor = basis === "actual" ? b.totalActual : Math.max(b.totalBudget, b.totalEffective);
  const valueOf = (c: (typeof b.categories)[number]) => (basis === "actual" ? c.actual : c.effective);
  const pctOf = (c: (typeof b.categories)[number]) => (totalFor > 0 ? (valueOf(c) / totalFor) * 100 : 0);
  const cats = [...b.categories].filter((c) => valueOf(c) > 0).sort((a, c) => valueOf(c) - valueOf(a));
  const shown = cats.slice(0, limit);
  const others = cats.slice(limit);
  const otherSum = others.reduce((s, c) => s + valueOf(c), 0);
  const otherPct = others.reduce((s, c) => s + pctOf(c), 0);
  const unallocatedPct = basis === "planned" && b.totalBudget > 0 ? (b.unallocated / Math.max(b.totalBudget, b.totalEffective)) * 100 : 0;
  const max = Math.max(1, ...cats.map(pctOf), unallocatedPct);
  return (
    <Card>
      <CardHeader
        title="카테고리별 예산 비율"
        icon={<BarChart3 />}
        subtitle={basis === "actual" ? "실제 지출 기준" : "예상 포함 기준 (실제 없으면 견적)"}
        action={
          <button
            type="button"
            onClick={() => setBasis(basis === "actual" ? "planned" : "actual")}
            className="rounded-full border border-line px-3 py-1.5 text-[0.8125rem] font-medium text-fg-2 transition-colors hover:border-line-strong hover:text-fg"
          >
            {basis === "actual" ? "예상 포함" : "실제 지출"}
          </button>
        }
      />
      {cats.length === 0 ? (
        <EmptyState compact title={basis === "actual" ? "아직 실제 지출이 없어요" : "아직 예산 항목이 없어요"} description={basis === "actual" ? "'예상 포함'으로 바꾸면 견적 기준 비중을 볼 수 있어요." : "비용을 추가하면 카테고리별 비중이 자동으로 계산돼요."} />
      ) : (
        <ul className="space-y-3 px-5 pb-5">
          {shown.map((c, i) => (
            <li key={c.id}>
              <Link href="/budget?tab=items" className="block group">
                <div className="mb-1 flex items-center justify-between gap-3 text-[0.875rem]">
                  <span className="truncate font-medium text-fg group-hover:text-accent-text">{c.name}</span>
                  <span className="shrink-0 tabular text-fg-2">
                    {showAmount && <span className="mr-2 text-fg-3">{formatKRW(valueOf(c))}</span>}
                    {pctOf(c).toFixed(1)}%
                  </span>
                </div>
                <ProgressBar value={(pctOf(c) / max) * 100} color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} height="h-2" label={`${c.name} ${pctOf(c).toFixed(1)}%`} />
              </Link>
            </li>
          ))}
          {otherSum > 0 && (
            <li>
              <div className="mb-1 flex items-center justify-between text-[0.875rem]">
                <span className="text-fg-2">그 외 {others.length}개</span>
                <span className="tabular text-fg-2">{otherPct.toFixed(1)}%</span>
              </div>
              <ProgressBar value={(otherPct / max) * 100} color="var(--text-3)" />
            </li>
          )}
          {unallocatedPct > 0 && (
            <li>
              <div className="mb-1 flex items-center justify-between text-[0.875rem]">
                <span className="text-fg-3">미배정 (여유)</span>
                <span className="tabular text-fg-3">{unallocatedPct.toFixed(1)}%</span>
              </div>
              <ProgressBar value={(unallocatedPct / max) * 100} color="var(--border-strong)" />
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}
