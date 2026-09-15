"use client";
import { formatClock, formatKoreanDate, todayISO } from "@/lib/date";
import { useNow } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export function LiveClock({ className, stacked }: { className?: string; stacked?: boolean }) {
  const now = useNow(1000);
  const dateText = now ? formatKoreanDate(todayISO(now)) : "0000년 00월 00일 (일)";
  const timeText = now ? formatClock(now) : "오전 00:00:00";
  return (
    <div className={cn("tabular", !now && "invisible", stacked ? "flex flex-col items-center gap-0.5" : "inline-flex flex-wrap items-baseline gap-x-2", className)} aria-live="off">
      <span className="text-fg-2">{dateText}</span>
      <span className="font-semibold text-fg">{timeText}</span>
    </div>
  );
}
