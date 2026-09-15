"use client";
import { ChevronLeft, ChevronRight, ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { collectEvents, type UnifiedEvent } from "@/lib/compute";
import { formatKoreanDate, formatTime, fromISO, monthGrid, monthLabel, todayISO, weekdayKo, daysUntil, formatDDay } from "@/lib/date";
import { EVENT_TYPE_LABEL } from "@/lib/labels";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { PageHeader } from "@/components/layout/PageHeader";
import { EventSheet } from "./EventSheet";
import { EventTypeIcon } from "./EventTypeIcon";

type View = "list" | "month";

function EventRow({ e, onOpen }: { e: UnifiedEvent; onOpen: (e: UnifiedEvent) => void }) {
  return (
    <li>
      <button type="button" onClick={() => onOpen(e)} className={cn("flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2", e.is_done && "opacity-60")}>
        <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-[10px]", e.type === "wedding" ? "bg-accent-soft text-accent-text" : "bg-surface-2 text-fg-2")}>
          <EventTypeIcon type={e.type} className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-[0.9375rem] font-medium text-fg", e.is_done && "line-through")}>{e.title}</span>
          <span className="block truncate text-[0.75rem] text-fg-3">
            {[e.start_time ? `${formatTime(e.start_time)}${e.end_time ? ` - ${formatTime(e.end_time)}` : ""}` : null, e.location, e.memo && e.type === "payment" ? e.memo : null, EVENT_TYPE_LABEL[e.type]]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
        {!e.editable && <ExternalLink className="size-3.5 shrink-0 text-fg-3" />}
      </button>
    </li>
  );
}

export function CalendarView() {
  const params = useSearchParams();
  const router = useRouter();
  const data = useWeddingStore((s) => s.data!);
  const today = todayISO();
  const initialDate = params.get("date") && /^\d{4}-\d{2}-\d{2}$/.test(params.get("date")!) ? params.get("date")! : today;
  const [view, setView] = useState<View>((params.get("view") as View) || "list");
  const [selected, setSelected] = useState(initialDate);
  const [ym, setYm] = useState({ y: Number(initialDate.slice(0, 4)), m: Number(initialDate.slice(5, 7)) });
  const [showPast, setShowPast] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [info, setInfo] = useState<UnifiedEvent | null>(null);

  const events = useMemo(() => collectEvents(data), [data]);
  const byDate = useMemo(() => {
    const m = new Map<string, UnifiedEvent[]>();
    for (const e of events) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return m;
  }, [events]);

  const open = (e: UnifiedEvent) => {
    if (e.editable && e.id) setEditId(e.id);
    else setInfo(e);
  };

  const changeView = (v: View) => {
    setView(v);
    router.replace(`/calendar?view=${v}`, { scroll: false });
  };

  const upcomingGroups = useMemo(() => {
    const list = events.filter((e) => (showPast ? true : e.date >= today));
    const groups: { date: string; items: UnifiedEvent[] }[] = [];
    for (const e of list) {
      const g = groups.at(-1);
      if (g && g.date === e.date) g.items.push(e);
      else groups.push({ date: e.date, items: [e] });
    }
    return groups;
  }, [events, showPast, today]);

  const grid = monthGrid(ym.y, ym.m);
  const selectedEvents = byDate.get(selected) ?? [];

  const prevMonth = () => setYm(({ y, m }) => (m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 }));
  const nextMonth = () => setYm(({ y, m }) => (m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 }));

  return (
    <div>
      <PageHeader
        title="일정"
        description="예복 피팅, 업체 방문, 결제일이 자동으로 모여요"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> 일정 추가
          </Button>
        }
      >
        <Segmented
          options={[
            { value: "list", label: "목록" },
            { value: "month", label: "달력" },
          ]}
          value={view}
          onChange={changeView}
          className="max-w-xs"
        />
      </PageHeader>

      {view === "list" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[0.8125rem] text-fg-3">{showPast ? "전체 일정" : "오늘 이후 일정"}</p>
            <Chip size="sm" tone="neutral" active={showPast} onClick={() => setShowPast((v) => !v)}>
              지난 일정 보기
            </Chip>
          </div>
          {upcomingGroups.length === 0 ? (
            <div className="card">
              <EmptyState title="예정된 일정이 없어요" description="첫 일정을 추가해 보세요." actionLabel="일정 추가" onAction={() => setCreating(true)} />
            </div>
          ) : (
            upcomingGroups.map((g) => {
              const d = daysUntil(g.date, today);
              return (
                <section key={g.date} className="card overflow-hidden">
                  <h2 className={cn("flex items-center justify-between border-b border-line px-4 py-2 text-[0.8125rem] font-semibold", g.date === today ? "bg-accent-softer text-accent-text" : "text-fg-2")}>
                    <span>{formatKoreanDate(g.date, { year: g.date.slice(0, 4) !== today.slice(0, 4) })}</span>
                    <span className="tabular text-fg-3">{formatDDay(d)}</span>
                  </h2>
                  <ul className="divide-y divide-line">
                    {g.items.map((e) => (
                      <EventRow key={e.key} e={e} onOpen={open} />
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <button type="button" aria-label="이전 달" onClick={prevMonth} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-surface-2">
                <ChevronLeft className="size-5" />
              </button>
              <div className="flex items-center gap-2">
                <h2 className="text-[1.0625rem] font-semibold tabular">{monthLabel(ym.y, ym.m)}</h2>
                <Chip
                  size="sm"
                  tone="neutral"
                  onClick={() => {
                    setYm({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) });
                    setSelected(today);
                  }}
                >
                  오늘
                </Chip>
              </div>
              <button type="button" aria-label="다음 달" onClick={nextMonth} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-surface-2">
                <ChevronRight className="size-5" />
              </button>
            </div>
            <div className="grid grid-cols-7 text-center text-[0.6875rem] font-medium text-fg-3">
              {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
                <div key={d} className={cn("py-1", i === 0 && "text-danger/80", i === 6 && "text-info")}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {grid.map((cell) => {
                const evs = byDate.get(cell.iso) ?? [];
                const isSel = cell.iso === selected;
                const isToday = cell.iso === today;
                const isWedding = cell.iso === data.wedding.wedding_date;
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => setSelected(cell.iso)}
                    aria-label={`${formatKoreanDate(cell.iso)} 일정 ${evs.length}개`}
                    aria-pressed={isSel}
                    className={cn("flex min-h-12 flex-col items-center rounded-[10px] py-1 transition-colors hover:bg-surface-2", !cell.inMonth && "opacity-35", isSel && "bg-accent-soft")}
                  >
                    <span
                      className={cn(
                        "inline-flex size-7 items-center justify-center rounded-full text-[0.8125rem] tabular",
                        isToday && "bg-accent text-accent-fg font-bold",
                        isWedding && !isToday && "ring-2 ring-accent font-bold text-accent-text",
                        fromISO(cell.iso).getDay() === 0 && !isToday && "text-danger/80",
                      )}
                    >
                      {cell.day}
                    </span>
                    <span className="mt-0.5 flex h-2 items-center gap-0.5">
                      {evs.slice(0, 3).map((e) => (
                        <span key={e.key} className={cn("size-1.5 rounded-full", e.type === "payment" ? "bg-warning" : e.type === "wedding" ? "bg-accent" : "bg-sage")} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
          <section className="card overflow-hidden">
            <h2 className="flex items-center justify-between border-b border-line px-4 py-3 text-[0.9375rem] font-semibold">
              <span>
                {formatKoreanDate(selected)} <span className="text-fg-3 font-normal">({weekdayKo(selected)})</span>
              </span>
              <Button size="sm" variant="soft" onClick={() => setCreating(true)}>
                <Plus className="size-3.5" /> 추가
              </Button>
            </h2>
            {selectedEvents.length === 0 ? (
              <EmptyState compact title="이 날은 일정이 없어요" description="이 날짜에 일정을 추가해 보세요." />
            ) : (
              <ul className="divide-y divide-line">
                {selectedEvents.map((e) => (
                  <EventRow key={e.key} e={e} onOpen={open} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <EventSheet open={!!editId || creating} onClose={() => { setEditId(null); setCreating(false); }} eventId={editId} initial={{ date: view === "month" ? selected : today }} />

      <Sheet open={!!info} onClose={() => setInfo(null)} title={info?.title} description={info ? `${formatKoreanDate(info.date)}${info.start_time ? ` · ${formatTime(info.start_time)}` : ""}` : undefined} size="sm">
        {info && (
          <div className="space-y-3 text-[0.9375rem]">
            {info.location && <p className="text-fg-2">{info.location}</p>}
            {info.memo && <p className="text-fg-2">{info.memo}</p>}
            <p className="text-[0.8125rem] text-fg-3">이 일정은 {info.source?.table === "wedding" ? "결혼 정보" : "다른 화면의 날짜"}에서 자동으로 가져왔어요. 수정하려면 원본 화면으로 이동하세요.</p>
            {info.source && (
              <Link href={info.source.href} className="inline-flex h-11 w-full items-center justify-center rounded-[12px] bg-accent-soft font-medium text-accent-text">
                원본 화면으로 이동
              </Link>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
