"use client";
import { motion, useReducedMotion } from "framer-motion";
import { Calendar, CheckSquare, ChevronDown, ClipboardCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { collectEvents, computeBudget, computeProgress, eventsThisWeek, HEALTH_LABEL, nearestEventDays } from "@/lib/compute";
import { formatDDay } from "@/lib/date";
import { formatCompactKRW, formatKRW } from "@/lib/money";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";

function Stat({
  icon,
  label,
  value,
  sub,
  href,
  children,
  tone,
  bar,
  index,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  href: string;
  children?: React.ReactNode;
  tone: string;
  bar: string;
  index: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href={href} className="card card-hover relative block h-full overflow-hidden p-4 sm:p-5">
        <span aria-hidden className={cn("absolute inset-x-0 top-0 h-[3px]", bar)} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
          <div className="flex items-center gap-2 sm:block">
            <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-full [&>svg]:size-4 sm:size-10 sm:[&>svg]:size-5", tone)}>{icon}</span>
            <p className="text-[0.875rem] text-fg-2 sm:hidden">{label}</p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="hidden text-[0.875rem] text-fg-2 sm:block">{label}</p>
            <p className="truncate text-[1.25rem] font-bold tabular leading-tight text-fg sm:mt-0.5 sm:text-[1.5rem]">{value}</p>
            {sub && <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-snug text-fg-3">{sub}</p>}
          </div>
        </div>
        {children}
      </Link>
    </motion.div>
  );
}

export function StatCards() {
  const data = useWeddingStore((s) => s.data!);
  const [more, setMore] = useState(false);
  const progress = computeProgress(data.tasks);
  const budget = computeBudget(data.wedding, data.budget_categories, data.budget_items, data.payments);
  const events = collectEvents(data);
  const weekEvents = eventsThisWeek(events);
  const nearest = nearestEventDays(events);
  const healthTone = budget.health === "over" ? "danger" : budget.health === "caution" ? "warning" : "success";

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat index={0} bar="bg-tint-plan" icon={<ClipboardCheck />} label="준비 진행률" tone="bg-tint-plan-soft text-tint-plan" href="/plan" value={<><AnimatedNumber value={progress.percent} />%</>}>
          <ProgressBar value={progress.percent} className="mt-3" />
        </Stat>
        <Stat
          index={1}
          bar="bg-tint-plan"
          icon={<CheckSquare />}
          label="전체 할 일"
          tone="bg-tint-plan-soft text-tint-plan"
          href="/plan"
          value={<><AnimatedNumber value={progress.total} />개</>}
          sub={`완료 ${progress.done} · 진행 ${progress.doing} · 남은 ${progress.remaining}`}
        />
        <Stat
          index={2}
          bar="bg-tint-budget"
          icon={<Wallet />}
          label="총 예산"
          tone="bg-tint-budget-soft text-tint-budget"
          href="/budget"
          value={<AnimatedNumber value={budget.totalBudget} format={(n) => (n >= 10000000 ? formatCompactKRW(n) : formatKRW(n))} />}
          sub={budget.totalBudget > 0 ? `사용 ${formatKRW(budget.totalActual)} · ${Math.round(budget.usedPct)}%` : "총 예산을 정해보세요"}
        />
        <Stat
          index={3}
          bar="bg-tint-schedule"
          icon={<Calendar />}
          label="이번 주 일정"
          tone="bg-tint-schedule-soft text-tint-schedule"
          href="/plan?tab=calendar"
          value={<><AnimatedNumber value={weekEvents.length} />개</>}
          sub={nearest !== null ? `가장 가까운 일정 ${formatDDay(nearest)}` : "예정된 일정이 없어요"}
        />
      </div>

      <div className="card overflow-hidden">
        <button
          type="button"
          onClick={() => setMore((v) => !v)}
          aria-expanded={more}
          className="flex w-full items-center justify-between px-5 py-3 text-[0.9375rem] text-fg-2 hover:bg-surface-2"
        >
          <span className="inline-flex items-center gap-2">
            자세히 보기
            <Badge tone={healthTone}>예산 {HEALTH_LABEL[budget.health]}</Badge>
          </span>
          <ChevronDown className={cn("size-4 transition-transform", more && "rotate-180")} />
        </button>
        {more && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line px-5 py-4 text-[0.875rem] sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["총 견적", formatKRW(budget.totalEstimated)],
              ["실제 지출", formatKRW(budget.totalActual)],
              ["남은 예산", formatKRW(budget.remaining)],
              ["결제 완료", formatKRW(budget.totalPaid)],
              ["남은 결제액", formatKRW(budget.totalUnpaid)],
              ["이번 달 예상 지출", formatKRW(budget.thisMonthExpected)],
              ["예산 사용률", `${budget.usedPct.toFixed(1)}%`],
              ["예상 총 지출", formatKRW(budget.totalEffective)],
              ["대기 중인 일", `${progress.waiting}개`],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-fg-3">{k}</dt>
                <dd className="mt-0.5 font-semibold tabular text-fg">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
