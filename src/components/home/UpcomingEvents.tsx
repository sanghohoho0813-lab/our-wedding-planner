"use client";
import { CalendarDays } from "lucide-react";
import { collectEvents, upcomingEvents } from "@/lib/compute";
import { formatShortDate, formatTime } from "@/lib/date";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListRow } from "@/components/ui/ListRow";
import { EventTypeChip } from "@/components/calendar/EventTypeIcon";

export function UpcomingEvents({ limit = 5 }: { limit?: number }) {
  const data = useWeddingStore((s) => s.data!);
  const events = upcomingEvents(collectEvents(data), limit);
  return (
    <Card tint="schedule">
      <CardHeader tint="schedule" title="다가오는 일정" icon={<CalendarDays />} href="/plan?tab=calendar" />
      {events.length === 0 ? (
        <EmptyState compact title="다가오는 일정이 없어요" description="피팅, 방문, 촬영 일정을 등록해 보세요." />
      ) : (
        <ul className="pb-2">
          {events.map((e) => (
            <li key={e.key}>
              <ListRow
                href={e.editable ? `/calendar?date=${e.date}` : e.source?.href ?? `/calendar?date=${e.date}`}
                chevron={false}
                className="py-2.5 min-h-[3rem]"
                left={<EventTypeChip type={e.type} done={e.is_done} />}
                title={
                  <span className="flex items-center gap-2">
                    <span className="shrink-0 tabular text-[0.875rem] font-semibold text-accent-text">{formatShortDate(e.date)}</span>
                    <span className="truncate">{e.title}</span>
                  </span>
                }
                subtitle={[e.start_time ? formatTime(e.start_time) : null, e.location].filter(Boolean).join(" · ") || undefined}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
