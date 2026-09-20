"use client";
import { UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { computeGuestStats, computeMealEstimate } from "@/lib/compute";
import { formatKRW } from "@/lib/money";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/**
 * 예상 식대.
 *
 * 결혼 예산에서 가장 큰 덩어리인데 손으로 세면 늘 틀린다.
 * 인원은 하객 명단에서 세고, 보증 인원에 못 미치면 그 사실을 먼저 말해 준다
 * (빈자리 값도 그대로 내야 하기 때문이다).
 */
export function MealEstimateCard({ className, compact }: { className?: string; compact?: boolean } = {}) {
  const data = useWeddingStore((s) => s.data!);
  const stats = computeGuestStats(data.guests);
  const m = computeMealEstimate(data.venues, stats);

  if (!m.venue) return null;

  if (!m.hasCost) {
    return (
      <Card tint="guests" className={className}>
        <CardHeader tint="guests" title="예상 식대" icon={<UtensilsCrossed />} />
        <div className="px-5 pb-5">
          <p className="text-[0.9375rem] leading-relaxed text-fg-2">
            <Link href="/wedding?tab=venue" className="font-semibold text-accent-text underline underline-offset-2">
              식장에 1인 식대
            </Link>
            를 적어두면 하객 수에 맞춰 예상 식대를 계산해 드려요.
          </p>
          <p className="mt-1 text-[0.8125rem] text-fg-3">지금 예상 인원 {m.expected}명 · 보증 {m.guaranteed || "미정"}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card tint="guests" className={className}>
      <CardHeader
        tint="guests"
        title="예상 식대"
        icon={<UtensilsCrossed />}
        subtitle={`1인 ${formatKRW(m.perPerson)} · ${m.fromGuestList ? "하객 명단 기준" : "식장에 적어둔 예상 인원 기준"}`}
        href="/wedding?tab=venue"
        actionLabel="식장"
      />
      <div className="px-5 pb-5">
        <p className="tabular text-[1.75rem] font-bold leading-tight text-fg">{formatKRW(m.cost)}</p>
        <p className="mt-0.5 text-[0.875rem] text-fg-2">
          청구 인원 <b className="tabular text-fg">{m.billable}명</b>
          {m.guaranteed > 0 && <span className="text-fg-3"> (보증 {m.guaranteed} · 예상 {m.expected})</span>}
        </p>

        {/* 보증에 못 미치면 빈자리 값을 낸다 — 미리 알아야 하객을 더 부를지 정할 수 있다 */}
        {m.shortfall > 0 && (
          <p className="mt-2 rounded-[10px] bg-warning-soft px-3 py-2 text-[0.8125rem] leading-relaxed text-warning">
            보증 인원보다 <b>{m.shortfall}명</b> 적어요. 안 와도 {formatKRW(m.shortfall * m.perPerson)}은 그대로 나가요.
          </p>
        )}
        {m.over > 0 && m.guaranteed > 0 && (
          <p className="mt-2 rounded-[10px] bg-surface-2 px-3 py-2 text-[0.8125rem] leading-relaxed text-fg-2">
            보증 인원을 <b className="text-fg">{m.over}명</b> 넘어서 {formatKRW(m.over * m.perPerson)}이 더 들어요.
          </p>
        )}

        {!compact && (
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3 text-[0.8125rem]">
            <div>
              <dt className="text-fg-3">참석 확정만</dt>
              <dd className={cn("mt-0.5 tabular font-semibold", m.confirmed > 0 ? "text-fg" : "text-fg-3")}>
                {m.confirmed > 0 ? formatKRW(m.confirmedCost) : "아직 없음"}
              </dd>
            </div>
            <div>
              <dt className="text-fg-3">대관료까지</dt>
              <dd className="mt-0.5 tabular font-semibold text-fg">{formatKRW(m.total)}</dd>
            </div>
          </dl>
        )}
      </div>
    </Card>
  );
}
