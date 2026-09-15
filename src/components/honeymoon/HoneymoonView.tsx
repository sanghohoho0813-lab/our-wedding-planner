"use client";
import { CheckSquare, Map, Plane, Plus } from "lucide-react";
import { useState } from "react";
import { daysUntil, formatDDay, formatKoreanDate, formatShortDate, formatTime, todayISO } from "@/lib/date";
import { formatKRW } from "@/lib/money";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { CheckCircle } from "@/components/ui/CheckCircle";
import { EmptyState } from "@/components/ui/EmptyState";
import { inputCls } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { PageHeader } from "@/components/layout/PageHeader";
import { EntitySheet } from "@/components/shared/EntitySheet";
import { SchemaForm, type FieldDef } from "@/components/shared/SchemaForm";

const INFO_FIELDS: FieldDef[] = [
  { key: "country", label: "국가", type: "text", half: true, placeholder: "예: 이탈리아" },
  { key: "city", label: "도시", type: "text", half: true, placeholder: "예: 로마, 피렌체" },
  { key: "depart_date", label: "출발일", type: "date", half: true },
  { key: "return_date", label: "귀국일", type: "date", half: true },
  { key: "cost", label: "총 비용", type: "money" },
  { key: "flight_info", label: "항공", type: "text", placeholder: "예: 대한항공 KE931 · 인천 13:00" },
  { key: "flight_booked", label: "항공 예약 완료", type: "toggle" },
  { key: "flight_booking_no", label: "항공 예약번호", type: "text", showIf: (g) => Boolean(g("flight_booked")) },
  { key: "hotel_name", label: "숙소", type: "text", placeholder: "호텔 / 숙소 이름" },
  { key: "hotel_booked", label: "숙소 예약 완료", type: "toggle" },
  { key: "hotel_booking_no", label: "숙소 예약번호", type: "text", showIf: (g) => Boolean(g("hotel_booked")) },
  { key: "memo", label: "메모", type: "textarea", placeholder: "비자, 환전, 보험, 로밍 등" },
];

const ITEM_FIELDS: FieldDef[] = [
  { key: "title", label: "내용", type: "text", required: true },
  { key: "date", label: "날짜", type: "date", half: true },
  { key: "time", label: "시간", type: "time", half: true },
  { key: "done", label: "완료", type: "toggle" },
  { key: "memo", label: "메모", type: "textarea" },
];

export function HoneymoonView() {
  const data = useWeddingStore((s) => s.data!);
  const add = useWeddingStore((s) => s.add);
  const patch = useWeddingStore((s) => s.patch);
  const hm = data.honeymoon[0] ?? null;
  const [tab, setTab] = useState<"itinerary" | "checklist">("checklist");
  const [quick, setQuick] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const today = todayISO();

  const ensure = () => hm ?? add("honeymoon", {}, { log: false });
  const get = (k: string) => (hm ? (hm as unknown as Record<string, unknown>)[k] : undefined);
  const set = (k: string, v: unknown) => {
    const row = ensure();
    patch("honeymoon", row.id, { [k]: v } as Partial<typeof row>);
  };

  const items = data.honeymoon_items.filter((i) => i.kind === tab).sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999") || (a.time ?? "99").localeCompare(b.time ?? "99") || a.sort_order - b.sort_order);
  const checklist = data.honeymoon_items.filter((i) => i.kind === "checklist");
  const doneCount = checklist.filter((i) => i.done).length;
  const where = [hm?.country, hm?.city].filter(Boolean).join(" · ");
  const nights = hm?.depart_date && hm?.return_date ? daysUntil(hm.return_date, hm.depart_date) : null;

  const quickAdd = () => {
    if (!quick.trim()) return;
    add("honeymoon_items", { kind: tab, title: quick.trim(), sort_order: data.honeymoon_items.length });
    setQuick("");
  };

  return (
    <div className="space-y-4">
      <PageHeader title="신혼여행" description="항공 · 숙소 · 일정 · 체크리스트를 한 곳에서" />

      <Card className="overflow-hidden">
        <div className="hero-gradient p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-[0.8125rem] text-fg-2">
                <Plane className="size-4 text-accent" /> 여행지
              </p>
              <h2 className="mt-1 text-[1.375rem] font-bold text-fg">{where || "아직 정하지 않았어요"}</h2>
              <p className="text-[0.875rem] text-fg-2">
                {hm?.depart_date ? formatKoreanDate(hm.depart_date) : "출발일 미정"}
                {hm?.return_date ? ` → ${formatKoreanDate(hm.return_date, { year: false })}` : ""}
                {nights !== null && nights > 0 ? ` · ${nights - 1 > 0 ? `${nights - 1}박 ` : ""}${nights}일` : ""}
              </p>
            </div>
            {hm?.depart_date && (
              <div className="text-right">
                <p className="text-[0.75rem] text-fg-3">출발까지</p>
                <p className="font-script text-[2.25rem] leading-none text-accent-text">{formatDDay(daysUntil(hm.depart_date, today))}</p>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone={hm?.flight_booked ? "success" : "neutral"}>{hm?.flight_booked ? "항공 예약 완료" : "항공 미예약"}</Badge>
            <Badge tone={hm?.hotel_booked ? "success" : "neutral"}>{hm?.hotel_booked ? "숙소 예약 완료" : "숙소 미예약"}</Badge>
            {hm && hm.cost > 0 && <Badge tone="accent">비용 {formatKRW(hm.cost)}</Badge>}
            {checklist.length > 0 && <Badge tone="info">체크리스트 {doneCount}/{checklist.length}</Badge>}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="여행 정보" icon={<Map />} subtitle="입력하면 바로 저장돼요" />
          <div className="px-5 pb-5">
            <SchemaForm fields={INFO_FIELDS} get={get} set={set} />
          </div>
        </Card>

        <Card className="self-start">
          <CardHeader
            title={tab === "checklist" ? "체크리스트" : "여행 일정"}
            icon={tab === "checklist" ? <CheckSquare /> : <Plane />}
            action={
              <Button size="sm" variant="soft" onClick={() => setCreating(true)}>
                <Plus className="size-3.5" /> 추가
              </Button>
            }
          />
          <div className="px-5 pb-3">
            <Segmented
              options={[
                { value: "checklist", label: `체크리스트 ${checklist.length ? `(${doneCount}/${checklist.length})` : ""}` },
                { value: "itinerary", label: "여행 일정" },
              ]}
              value={tab}
              onChange={setTab}
            />
          </div>
          <div className="px-5 pb-3">
            <div className="flex gap-2">
              <input value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => e.key === "Enter" && quickAdd()} placeholder={tab === "checklist" ? "예: 여권 만료일 확인" : "예: 콜로세움 투어"} className={`${inputCls} h-10`} />
              <Button size="sm" className="h-10 shrink-0" onClick={quickAdd}>
                추가
              </Button>
            </div>
          </div>
          {items.length === 0 ? (
            <EmptyState compact title={tab === "checklist" ? "체크리스트가 비어 있어요" : "여행 일정이 없어요"} description="위 입력창에 바로 적어 추가해 보세요." />
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
                  <CheckCircle checked={it.done} onChange={(v) => patch("honeymoon_items", it.id, { done: v })} />
                  <button type="button" onClick={() => setEditId(it.id)} className="min-w-0 flex-1 text-left">
                    <span className={cn("block truncate text-[0.9375rem] font-medium", it.done ? "text-fg-3 line-through" : "text-fg")}>{it.title}</span>
                    {(it.date || it.memo) && (
                      <span className="block truncate text-[0.75rem] text-fg-3">
                        {[it.date ? `${formatShortDate(it.date)}${it.time ? ` ${formatTime(it.time)}` : ""}` : null, it.memo].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <EntitySheet
        table="honeymoon_items"
        open={!!editId || creating}
        onClose={() => { setEditId(null); setCreating(false); }}
        rowId={editId}
        fields={ITEM_FIELDS}
        titleCreate={tab === "checklist" ? "체크리스트 추가" : "여행 일정 추가"}
        titleEdit={tab === "checklist" ? "체크리스트 항목" : "여행 일정"}
        requiredKey="title"
        initial={{ kind: tab }}
      />
    </div>
  );
}
