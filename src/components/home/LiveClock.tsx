"use client";
import { formatClock, formatKoreanDate, todayISO } from "@/lib/date";
import { useNow } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export function LiveClock({ className, stacked }: { className?: string; stacked?: boolean }) {
  // 초까지 보여주면 1초마다 홈 전체가 다시 그려진다. 결혼 준비에 초는 필요 없다.
  const now = useNow(30000);
  const dateText = now ? formatKoreanDate(todayISO(now)) : "0000년 00월 00일 (일)";
  const timeText = now ? formatClock(now, false) : "오전 00:00";
  return (
    <div className={cn("tabular", !now && "invisible", stacked ? "flex flex-col items-center gap-0.5" : "inline-flex flex-wrap items-baseline gap-x-2", className)} aria-live="off">
      <span className="text-fg-2">{dateText}</span>
      <span className="font-semibold text-fg">{timeText}</span>
    </div>
  );
}
