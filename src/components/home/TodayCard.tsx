"use client";
import { AlertCircle, CalendarDays, CheckSquare, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { collectEvents } from "@/lib/compute";
import { addDays, formatTime, todayISO, weekdayKo } from "@/lib/date";
import { useNow } from "@/lib/hooks";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { cn } from "@/lib/utils";
import { EventTypeIcon } from "@/components/calendar/EventTypeIcon";

/**
 * "오늘 뭐 해야 하지?" 한 장으로 답한다.
 * 홈에서 가장 위에 두는 카드라 짧아야 하고, 없으면 없다고 분명히 말해준다.
 */
export function TodayCard() {
  const data = useWeddingStore((s) => s.data!);
  const now = useNow(60_000);
  const today = todayISO(now ?? new Date());
  const tomorrow = addDays(today, 1);

  const { overdue, dueToday, todayEvents, tomorrowEvents } = useMemo(() => {
    const open = data.tasks.filter((t) => t.status !== "done" && t.due_date);
    const events = collectEvents(data);
    return {
      overdue: open.filter((t) => t.due_date! < today),
      dueToday: open.filter((t) => t.due_date === today),
      todayEvents: events.filter((e) => e.date === today),
      tomorrowEvents: events.filter((e) => e.date === tomorrow),
    };
  }, [data, today, tomorrow]);

  const nothing = overdue.length === 0 && dueToday.length === 0 && todayEvents.length === 0 && tomorrowEvents.length === 0;
  const dateLabel = `${Number(today.slice(5, 7))}월 ${Number(today.slice(8, 10))}일 (${weekdayKo(today)})`;

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
        <h2 className="flex items-center gap-2 text-[1.0625rem] font-semibold text-fg">
          <CalendarDays className="size-[1.125rem] text-accent" />
          오늘
          <span className="text-[0.875rem] font-normal text-fg-3">{dateLabel}</span>
        </h2>
        {!nothing && (
          <Link href="/plan" className="text-[0.875rem] text-fg-3 hover:text-accent">
            할 일 보기
          </Link>
        )}
      </div>

      {nothing ? (
        <p className="flex items-center gap-2 px-5 py-4 text-[0.9375rem] text-fg-2">
          <Sparkles className="size-4 shrink-0 text-accent" />
          오늘 마감이나 일정이 없어요. 여유 있는 날이에요.
        </p>
      ) : (
        <div className="divide-y divide-line">
          {(overdue.length > 0 || dueToday.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 px-5 py-3">
              {overdue.length > 0 && (
                <Link
                  href="/plan?filter=today"
                  className="inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-3 py-1.5 text-[0.875rem] font-medium text-danger"
                >
                  <AlertCircle className="size-4" />
                  지난 마감 {overdue.length}개
                </Link>
              )}
              {dueToday.length > 0 && (
                <Link
                  href="/plan?filter=today"
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-[0.875rem] font-medium text-accent-text"
                >
                  <CheckSquare className="size-4" />
                  오늘 마감 {dueToday.length}개
                </Link>
              )}
              <span className="w-full truncate text-[0.875rem] text-fg-2">
                {[...overdue, ...dueToday][0]?.title}
                {overdue.length + dueToday.length > 1 && ` 외 ${overdue.length + dueToday.length - 1}건`}
              </span>
            </div>
          )}

          {[
            { label: "오늘", list: todayEvents },
            { label: "내일", list: tomorrowEvents },
          ]
            .filter((g) => g.list.length > 0)
            .map((g) => (
              <ul key={g.label} className="px-5 py-2">
                {g.list.slice(0, 3).map((e) => (
                  <li key={e.key}>
                    <Link href="/plan?tab=calendar" className="flex items-center gap-2.5 rounded-[10px] py-1.5 hover:bg-surface-2">
                    <span
                      className={cn(
                        "inline-flex size-7 shrink-0 items-center justify-center rounded-[9px]",
                        e.type === "wedding" ? "bg-accent-soft text-accent-text" : "bg-surface-2 text-fg-2",
                      )}
                    >
                      <EventTypeIcon type={e.type} className="size-3.5" />
                    </span>
                    <span className="shrink-0 text-[0.8125rem] font-medium text-fg-3">
                      {g.label}
                      {e.start_time ? ` ${formatTime(e.start_time)}` : ""}
                    </span>
                      <span className="min-w-0 flex-1 truncate text-[0.9375rem] text-fg">{e.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
        </div>
      )}
    </section>
  );
}
