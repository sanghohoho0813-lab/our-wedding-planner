import type { DataTable } from "@/lib/db/defaults";
import type { EventType, WeddingData } from "@/lib/db/types";
import { daysUntil, thisWeekRange, todayISO } from "@/lib/date";
import { formatKRW } from "@/lib/money";
import { VENDOR_CATEGORY_LABEL } from "@/lib/labels";

export interface UnifiedEvent {
  key: string;
  id: string | null; // events 테이블 row id (직접 편집 가능한 경우)
  title: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  type: EventType;
  location: string | null;
  memo: string | null;
  source: { table: DataTable | "wedding"; id: string; href: string } | null;
  editable: boolean;
  is_done: boolean;
}

/**
 * 날짜가 붙은 모든 것을 한 줄로 모은다.
 * includeTasks 를 켜면 마감일이 있는 할 일도 함께 나온다 — 일정 화면에서는
 * "할 일이냐 일정이냐" 를 따질 필요 없이 그 날 할 것이 전부 보여야 하기 때문이다.
 */
export function collectEvents(data: WeddingData, opts: { includeTasks?: boolean } = {}): UnifiedEvent[] {
  const out: UnifiedEvent[] = [];
  const push = (e: Omit<UnifiedEvent, "key">) => out.push({ ...e, key: e.id ? `ev:${e.id}` : `${e.source?.table}:${e.source?.id}:${e.title}:${e.date}` });

  for (const ev of data.events) {
    push({
      id: ev.id,
      title: ev.title,
      date: ev.date,
      start_time: ev.start_time,
      end_time: ev.end_time,
      type: ev.type,
      location: ev.location,
      memo: ev.memo,
      source: ev.source_type && ev.source_id ? { table: ev.source_type as DataTable, id: ev.source_id, href: hrefFor(ev.source_type) } : null,
      editable: true,
      is_done: ev.is_done,
    });
  }

  const w = data.wedding;
  push({
    id: null,
    title: "우리 결혼식",
    date: w.wedding_date,
    start_time: w.wedding_time,
    end_time: null,
    type: "wedding",
    location: data.venues.find((v) => v.is_contracted)?.name ?? null,
    memo: null,
    source: { table: "wedding", id: w.id, href: "/wedding?tab=venue" },
    editable: false,
    is_done: false,
  });

  for (const o of data.outfit_items) {
    const src = { table: "outfit_items" as const, id: o.id, href: "/wedding?tab=outfit" };
    if (o.reserve_date) push({ id: null, title: `${o.kind} 예약`, date: o.reserve_date, start_time: null, end_time: null, type: "appointment", location: o.vendor_name, memo: null, source: src, editable: false, is_done: false });
    if (o.fitting_date) push({ id: null, title: `${o.kind} 피팅`, date: o.fitting_date, start_time: null, end_time: null, type: "fitting", location: o.vendor_name, memo: null, source: src, editable: false, is_done: false });
    if (o.pickup_date) push({ id: null, title: `${o.kind} 수령`, date: o.pickup_date, start_time: null, end_time: null, type: "visit", location: o.vendor_name, memo: null, source: src, editable: false, is_done: false });
  }

  for (const v of data.vendors) {
    const src = { table: "vendors" as const, id: v.id, href: `/wedding?tab=${v.category}` };
    const cat = VENDOR_CATEGORY_LABEL[v.category];
    if (v.visit_date) push({ id: null, title: `${v.name} 방문`, date: v.visit_date, start_time: null, end_time: null, type: "visit", location: cat, memo: null, source: src, editable: false, is_done: false });
    if (v.reserved_date) push({ id: null, title: `${v.name} 예약일`, date: v.reserved_date, start_time: null, end_time: null, type: "appointment", location: cat, memo: null, source: src, editable: false, is_done: false });
  }

  const hm = data.honeymoon[0];
  if (hm) {
    const src = { table: "honeymoon" as const, id: hm.id, href: "/honeymoon" };
    const where = [hm.country, hm.city].filter(Boolean).join(" ");
    if (hm.depart_date) push({ id: null, title: "신혼여행 출발", date: hm.depart_date, start_time: null, end_time: null, type: "travel", location: where || null, memo: null, source: src, editable: false, is_done: false });
    if (hm.return_date) push({ id: null, title: "신혼여행 귀국", date: hm.return_date, start_time: null, end_time: null, type: "travel", location: where || null, memo: null, source: src, editable: false, is_done: false });
  }
  for (const it of data.honeymoon_items) {
    if (it.kind === "itinerary" && it.date)
      push({ id: null, title: it.title, date: it.date, start_time: it.time, end_time: null, type: "travel", location: null, memo: it.memo, source: { table: "honeymoon_items", id: it.id, href: "/honeymoon" }, editable: false, is_done: it.done });
  }

  for (const m of data.invitation_meetings) {
    if (!m.date || m.status === "canceled") continue;
    if (m.event_id && data.events.some((e) => e.id === m.event_id)) continue;
    push({ id: null, title: m.title, date: m.date, start_time: m.time, end_time: null, type: "meeting", location: m.place, memo: m.memo, source: { table: "invitation_meetings", id: m.id, href: "/guests?tab=meetings" }, editable: false, is_done: m.status === "done" });
  }

  if (opts.includeTasks) {
    for (const t of data.tasks) {
      if (!t.due_date) continue;
      push({
        id: null,
        title: t.title,
        date: t.due_date,
        start_time: null,
        end_time: null,
        type: "task",
        location: t.category,
        memo: t.memo,
        source: { table: "tasks", id: t.id, href: "/plan" },
        editable: false,
        is_done: t.status === "done",
      });
    }
  }

  const itemById = new Map(data.budget_items.map((i) => [i.id, i]));
  for (const p of data.payments) {
    if (p.paid || !p.due_date) continue;
    const item = itemById.get(p.budget_item_id);
    if (!item) continue;
    push({ id: null, title: `${item.name} ${p.title}`, date: p.due_date, start_time: null, end_time: null, type: "payment", location: null, memo: formatKRW(p.amount), source: { table: "budget_items", id: item.id, href: "/budget?tab=items" }, editable: false, is_done: false });
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.start_time ?? "99").localeCompare(b.start_time ?? "99"));
}

export function hrefFor(sourceType: string): string {
  switch (sourceType) {
    case "tasks":
      return "/plan";
    case "budget_items":
      return "/budget?tab=items";
    case "vendors":
      return "/wedding?tab=beauty";
    case "venues":
      return "/wedding?tab=venue";
    case "outfit_items":
      return "/wedding?tab=outfit";
    case "invitation_meetings":
      return "/guests?tab=meetings";
    case "honeymoon":
    case "honeymoon_items":
      return "/honeymoon";
    default:
      return "/plan?tab=calendar";
  }
}

export function upcomingEvents(events: UnifiedEvent[], limit = 5, today = todayISO()) {
  return events.filter((e) => e.date >= today && !e.is_done).slice(0, limit);
}

export function eventsThisWeek(events: UnifiedEvent[], today = todayISO()) {
  const { start, end } = thisWeekRange(today);
  return events.filter((e) => e.date >= start && e.date <= end);
}

export function nearestEventDays(events: UnifiedEvent[], today = todayISO()): number | null {
  const next = events.find((e) => e.date >= today && !e.is_done);
  return next ? daysUntil(next.date, today) : null;
}
