"use client";
import { Mail, Plus } from "lucide-react";
import { useState } from "react";
import type { MeetingStatus } from "@/lib/db/types";
import { daysUntil, formatDDay, formatKoreanDate, formatTime, todayISO } from "@/lib/date";
import { MEETING_STATUS, MEETING_STATUS_LABEL } from "@/lib/labels";
import { formatKRW } from "@/lib/money";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { EntityCard } from "@/components/shared/EntityCard";
import { EntitySheet } from "@/components/shared/EntitySheet";
import type { FieldDef } from "@/components/shared/SchemaForm";

const FIELDS: FieldDef[] = [
  { key: "title", label: "모임명", type: "text", required: true, placeholder: "예: 대학 동기 모임" },
  { key: "target", label: "대상", type: "text", placeholder: "예: 신랑 대학 친구들" },
  { key: "status", label: "상태", type: "segmented", options: MEETING_STATUS },
  { key: "date", label: "날짜", type: "date", half: true, quickDates: true },
  { key: "time", label: "시간", type: "time", half: true },
  { key: "place", label: "장소", type: "text" },
  { key: "attendee_count", label: "참석 인원", type: "stepper", max: 200 },
  { key: "attendees", label: "참석자", type: "text", placeholder: "이름을 쉼표로 구분" },
  { key: "estimated_cost", label: "예상 비용", type: "money", half: true },
  { key: "actual_cost", label: "실제 비용", type: "money", half: true },
  { key: "memo", label: "메모", type: "textarea" },
];

const TONE: Record<MeetingStatus, BadgeTone> = { planned: "accent", done: "success", canceled: "neutral" };

export function MeetingsView({ embedded }: { embedded?: boolean } = {}) {
  const meetings = useWeddingStore((s) => s.data!.invitation_meetings);
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const today = todayISO();
  const sorted = [...meetings].sort((a, b) => (a.status === "canceled" ? 1 : 0) - (b.status === "canceled" ? 1 : 0) || (a.date ?? "9999").localeCompare(b.date ?? "9999"));
  const est = meetings.reduce((s, m) => s + m.estimated_cost, 0);
  const act = meetings.reduce((s, m) => s + m.actual_cost, 0);

  return (
    <div>
      <PageHeader
        compact={embedded}
        title="청첩장 모임"
        description={`${meetings.length}개 모임 · 예상 ${formatKRW(est)} · 실제 ${formatKRW(act)}`}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> 모임 추가
          </Button>
        }
      />
      {meetings.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Mail />} title="아직 등록된 모임이 없어요" description="청첩장을 전달할 모임을 등록하면 일정 화면에도 자동으로 표시돼요." actionLabel="첫 모임 추가" onAction={() => setCreating(true)} />
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((m) => (
            <EntityCard
              key={m.id}
              title={m.title}
              badges={<Badge tone={TONE[m.status]}>{MEETING_STATUS_LABEL[m.status]}</Badge>}
              subtitle={[m.target, m.place].filter(Boolean).join(" · ") || undefined}
              stats={[
                { label: "날짜", value: m.date ? `${formatKoreanDate(m.date, { year: false })}${m.time ? ` ${formatTime(m.time)}` : ""}` : "미정" },
                { label: "인원", value: `${m.attendee_count}명`, tone: "muted" },
                { label: m.actual_cost > 0 ? "실제 비용" : "예상 비용", value: formatKRW(m.actual_cost > 0 ? m.actual_cost : m.estimated_cost), tone: "muted" },
              ]}
              footer={m.date && m.status === "planned" && m.date >= today ? `${formatDDay(daysUntil(m.date, today))}` : m.attendees ?? undefined}
              onClick={() => setEditId(m.id)}
            />
          ))}
        </ul>
      )}
      <EntitySheet table="invitation_meetings" open={!!editId || creating} onClose={() => { setEditId(null); setCreating(false); }} rowId={editId} fields={FIELDS} titleCreate="청첩장 모임 추가" titleEdit="모임 정보" requiredKey="title" />
    </div>
  );
}
