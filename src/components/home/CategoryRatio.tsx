"use client";
import { BarChart3 } from "lucide-react";
import Link from "next/link";
import { computeBudget } from "@/lib/compute";
import { formatKRW } from "@/lib/money";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";

export const CATEGORY_COLORS = ["var(--accent)", "var(--sage)", "var(--gold)", "var(--blue)", "var(--terracotta)", "var(--rose)"];

export function CategoryRatio({ limit = 6, showAmount = false }: { limit?: number; showAmount?: boolean }) {
  const data = useWeddingStore((s) => s.data!);
  const b = computeBudget(data.wedding, data.budget_categories, data.budget_items, data.payments);
  const cats = [...b.categories].filter((c) => c.effective > 0).sort((a, c) => c.effective - a.effective);
  const shown = cats.slice(0, limit);
  const others = cats.slice(limit);
  const otherSum = others.reduce((s, c) => s + c.effective, 0);
  const otherPct = others.reduce((s, c) => s + c.pct, 0);
  const max = Math.max(1, ...cats.map((c) => c.pct), b.totalBudget > 0 ? (b.unallocated / Math.max(b.totalBudget, b.totalEffective)) * 100 : 0);
  return (
    <Card>
      <CardHeader title="카테고리별 예산 비율" icon={<BarChart3 />} href="/budget" actionLabel="자세히 보기" />
      {cats.length === 0 ? (
        <EmptyState compact title="아직 예산 항목이 없어요" description="비용을 추가하면 카테고리별 비중이 자동으로 계산돼요." />
      ) : (
        <ul className="space-y-3 px-5 pb-5">
          {shown.map((c, i) => (
            <li key={c.id}>
              <Link href="/budget/items" className="block group">
                <div className="mb-1 flex items-center justify-between gap-3 text-[0.8125rem]">
                  <span className="truncate font-medium text-fg group-hover:text-accent-text">{c.name}</span>
                  <span className="shrink-0 tabular text-fg-2">
                    {showAmount && <span className="mr-2 text-fg-3">{formatKRW(c.effective)}</span>}
                    {c.pct.toFixed(1)}%
                  </span>
                </div>
                <ProgressBar value={(c.pct / max) * 100} color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} height="h-2" label={`${c.name} ${c.pct.toFixed(1)}%`} />
              </Link>
            </li>
          ))}
          {otherSum > 0 && (
            <li>
              <div className="mb-1 flex items-center justify-between text-[0.8125rem]">
                <span className="text-fg-2">그 외 {others.length}개</span>
                <span className="tabular text-fg-2">{otherPct.toFixed(1)}%</span>
              </div>
              <ProgressBar value={(otherPct / max) * 100} color="var(--text-3)" />
            </li>
          )}
          {b.unallocated > 0 && (
            <li>
              <div className="mb-1 flex items-center justify-between text-[0.8125rem]">
                <span className="text-fg-3">미배정 (여유)</span>
                <span className="tabular text-fg-3">{((b.unallocated / Math.max(b.totalBudget, b.totalEffective)) * 100).toFixed(1)}%</span>
              </div>
              <ProgressBar value={((b.unallocated / Math.max(b.totalBudget, b.totalEffective)) * 100 / max) * 100} color="var(--border-strong)" />
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}
