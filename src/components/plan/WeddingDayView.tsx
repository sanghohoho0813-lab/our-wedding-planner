"use client";
import { Building2, Clock, Mic2, Music, Plus, Sparkles, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { collectEvents, type UnifiedEvent } from "@/lib/compute";
import { daysUntil, formatDDay, formatKoreanDate, formatTime, todayISO } from "@/lib/date";
import { toast } from "@/lib/store/ui-store";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldRow, TextField, TimeField } from "@/components/ui/Field";
import { EventSheet } from "@/components/calendar/EventSheet";
import { EventTypeIcon } from "@/components/calendar/EventTypeIcon";

type Roles = { mc?: string; speech?: string; singer?: string; bouquet?: string; officiant?: string };

const ROLE_FIELDS: { key: keyof Roles; label: string; placeholder: string; icon: React.ReactNode }[] = [
  { key: "mc", label: "사회", placeholder: "사회자", icon: <Mic2 /> },
  { key: "speech", label: "축사", placeholder: "축사해 줄 사람", icon: <Users /> },
  { key: "singer", label: "축가", placeholder: "축가 부를 사람", icon: <Music /> },
  { key: "bouquet", label: "부케 받는 사람", placeholder: "부케를 받을 친구", icon: <Sparkles /> },
  { key: "officiant", label: "주례 / 진행", placeholder: "주례 없는 결혼식이면 비워두세요", icon: <Building2 /> },
];

/** 결혼식 당일 진행표 — 원본 '일정' 시트(시간 · 항목 · 메모)를 이어받는 화면 */
export function WeddingDayView() {
  const data = useWeddingStore((s) => s.data!);
  const add = useWeddingStore((s) => s.add);
  const updateWedding = useWeddingStore((s) => s.updateWedding);
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [qTime, setQTime] = useState<string | null>(null);
  const [qTitle, setQTitle] = useState("");

  const wedding = data.wedding;
  const date = wedding.wedding_date;
  const today = todayISO();
  const venue = data.venues.find((v) => v.is_contracted);
  const roles = ((wedding.details?.roles as Roles | undefined) ?? {}) as Roles;
  const setRole = (key: keyof Roles, value: string) =>
    updateWedding({ details: { ...(wedding.details ?? {}), roles: { ...roles, [key]: value || undefined } } }, { log: `당일 역할(${ROLE_FIELDS.find((r) => r.key === key)?.label})이 수정되었어요.` });

  const timeline = useMemo(
    () =>
      collectEvents(data)
        .filter((e) => e.date === date)
        .sort((a, b) => (a.start_time ?? "99:99").localeCompare(b.start_time ?? "99:99")),
    [data, date],
  );

  const quickAdd = () => {
    if (!qTitle.trim()) return toast("항목을 입력해 주세요.");
    add("events", { title: qTitle.trim(), date, start_time: qTime, type: "other" });
    setQTitle("");
    setQTime(null);
  };

  const open = (e: UnifiedEvent) => {
    if (e.editable && e.id) setEditId(e.id);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:items-start">
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <div className="hero-gradient px-5 py-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[0.875rem] text-fg-2">결혼식 당일</p>
                <p className="text-[1.25rem] font-bold text-fg">
                  {formatKoreanDate(date)}
                  {wedding.wedding_time && <span className="whitespace-nowrap"> · {formatTime(wedding.wedding_time)}</span>}
                </p>
                {venue && <p className="text-[0.9375rem] text-fg-2">{venue.name}{venue.address ? ` · ${venue.address}` : ""}</p>}
              </div>
              <p className="font-script text-[2rem] leading-none text-accent-text">{formatDDay(daysUntil(date, today))}</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="당일 진행표"
            icon={<Clock />}
            subtitle="시간순으로 정리돼요"
            action={
              <Button size="sm" variant="soft" onClick={() => setCreating(true)}>
                <Plus className="size-3.5" /> 자세히 추가
              </Button>
            }
          />
          <div className="px-5 pb-3">
            {/* 모바일: 시간 / (내용 + 추가) 두 줄, 데스크톱: 한 줄 */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <TimeField value={qTime} onChange={setQTime} className="w-full sm:w-36 sm:shrink-0" />
              <div className="flex min-w-0 flex-1 gap-2">
                <TextField
                  value={qTitle}
                  onChange={setQTitle}
                  delay={0}
                  placeholder="예: 신부 대기실 입장"
                  onKeyDown={(e) => e.key === "Enter" && quickAdd()}
                />
                <Button className="shrink-0" onClick={quickAdd}>
                  추가
                </Button>
              </div>
            </div>
          </div>
          {timeline.length === 0 ? (
            <EmptyState compact title="아직 진행 항목이 없어요" description="헤어·메이크업 시작, 식장 도착, 본식 시작처럼 시간 순서대로 적어두면 당일에 한눈에 보여요." />
          ) : (
            <ol className="divide-y divide-line border-t border-line">
              {timeline.map((e) => (
                <li key={e.key}>
                  <button
                    type="button"
                    onClick={() => open(e)}
                    disabled={!e.editable}
                    className={cn("flex w-full items-center gap-3 px-5 py-3 text-left", e.editable && "hover:bg-surface-2")}
                  >
                    <span className="w-[4.5rem] shrink-0 tabular text-[1rem] font-semibold text-accent-text">{e.start_time ? e.start_time.slice(0, 5) : "—"}</span>
                    <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-[10px]", e.type === "wedding" ? "bg-accent-soft text-accent-text" : "bg-surface-2 text-fg-2")}>
                      <EventTypeIcon type={e.type} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[1rem] font-medium text-fg">{e.title}</span>
                      {(e.location || e.memo) && <span className="block truncate text-[0.8125rem] text-fg-3">{[e.location, e.memo].filter(Boolean).join(" · ")}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="당일 역할" icon={<Users />} subtitle="입력하면 바로 저장돼요" />
        <div className="space-y-4 px-5 pb-5">
          {ROLE_FIELDS.map((r) => (
            <FieldRow key={r.key} label={r.label}>
              <TextField value={roles[r.key] ?? ""} onChange={(v) => setRole(r.key, v)} placeholder={r.placeholder} leftIcon={r.icon} />
            </FieldRow>
          ))}
          <p className="text-[0.8125rem] text-fg-3">사회 · 축사는 원본 할 일 메모(‘사회: 강래원오빠 축사: 지언언니’)에서 옮겨왔어요.</p>
        </div>
      </Card>

      <EventSheet open={!!editId || creating} onClose={() => { setEditId(null); setCreating(false); }} eventId={editId} initial={{ date, type: "other" }} />
    </div>
  );
}
