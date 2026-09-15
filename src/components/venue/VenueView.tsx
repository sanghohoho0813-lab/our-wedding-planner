"use client";
import { Building2, ExternalLink, Phone, Plus } from "lucide-react";
import { useState } from "react";
import { daysUntil, formatDDay, formatKoreanDate, formatTime, todayISO } from "@/lib/date";
import { formatKRW } from "@/lib/money";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { EntityCard } from "@/components/shared/EntityCard";
import { EntitySheet } from "@/components/shared/EntitySheet";
import type { FieldDef } from "@/components/shared/SchemaForm";

const FIELDS: FieldDef[] = [
  { key: "name", label: "식장 이름", type: "text", required: true, placeholder: "예: 더채플 앳 청담" },
  { key: "is_contracted", label: "계약 완료", type: "toggle", hint: "계약한 식장은 홈과 일정에 표시돼요" },
  { key: "address", label: "위치", type: "text", placeholder: "주소 또는 지역" },
  { key: "event_date", label: "예식 날짜", type: "date", half: true },
  { key: "event_time", label: "예식 시간", type: "time", half: true },
  { key: "hall_fee", label: "대관료", type: "money", half: true },
  { key: "meal_cost", label: "식대 (1인)", type: "money", half: true },
  { key: "guaranteed_guests", label: "보증 인원", type: "stepper", half: true, max: 2000 },
  { key: "expected_guests", label: "예상 하객", type: "stepper", half: true, max: 2000 },
  { key: "deposit", label: "계약금", type: "money", half: true },
  { key: "balance", label: "잔금", type: "money", half: true },
  { key: "parking", label: "주차", type: "text", placeholder: "예: 300대, 2시간 무료" },
  { key: "transport", label: "교통", type: "text", placeholder: "예: 2호선 역삼역 3번 출구 도보 5분" },
  { key: "contact_name", label: "담당자", type: "text", half: true },
  { key: "phone", label: "연락처", type: "phone", half: true },
  { key: "url", label: "URL", type: "url" },
  { key: "notes", label: "특이사항", type: "textarea", placeholder: "홀 조건, 옵션, 제한 사항 등" },
  { key: "memo", label: "메모", type: "textarea" },
];

export function VenueView({ embedded }: { embedded?: boolean } = {}) {
  const venues = useWeddingStore((s) => s.data!.venues);
  const wedding = useWeddingStore((s) => s.data!.wedding);
  const patch = useWeddingStore((s) => s.patch);
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const today = todayISO();
  const contracted = venues.find((v) => v.is_contracted);
  const sorted = [...venues].sort((a, b) => Number(b.is_contracted) - Number(a.is_contracted) || a.created_at.localeCompare(b.created_at));

  const estTotal = (v: (typeof venues)[number]) => v.hall_fee + v.meal_cost * Math.max(v.guaranteed_guests, v.expected_guests);

  return (
    <div>
      <PageHeader
        compact={embedded}
        title="식장"
        description="후보 식장을 비교하고 계약 정보를 관리해요"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> 식장 추가
          </Button>
        }
      />
      {contracted && (
        <Card className="mb-4 overflow-hidden">
          <div className="hero-gradient p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Badge tone="success">계약 완료</Badge>
                <h2 className="mt-2 text-[1.375rem] font-bold text-fg">{contracted.name}</h2>
                <p className="text-[0.9375rem] text-fg-2">
                  {formatKoreanDate(contracted.event_date ?? wedding.wedding_date)}
                  {contracted.event_time ? ` · ${formatTime(contracted.event_time)}` : ""}
                </p>
                {contracted.address && <p className="mt-1 text-[0.875rem] text-fg-3">{contracted.address}</p>}
              </div>
              <div className="text-right">
                <p className="text-[0.8125rem] text-fg-3">예식까지</p>
                <p className="font-script text-[2.25rem] leading-none text-accent-text">{formatDDay(daysUntil(contracted.event_date ?? wedding.wedding_date, today))}</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["예상 총 비용", formatKRW(estTotal(contracted))],
                ["식대 총액", `${formatKRW(contracted.meal_cost * Math.max(contracted.guaranteed_guests, contracted.expected_guests))}`],
                ["보증 / 예상 인원", `${contracted.guaranteed_guests} / ${contracted.expected_guests}명`],
                ["잔금", formatKRW(contracted.balance)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-[12px] bg-surface/70 px-3 py-2">
                  <dt className="text-[0.75rem] text-fg-3">{k}</dt>
                  <dd className="tabular text-[1rem] font-semibold text-fg">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              {contracted.phone && (
                <a href={`tel:${contracted.phone}`} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-[0.875rem] font-medium text-fg hover:border-line-strong">
                  <Phone className="size-4" /> 전화
                </a>
              )}
              {contracted.url && (
                <a href={contracted.url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-[0.875rem] font-medium text-fg hover:border-line-strong">
                  <ExternalLink className="size-4" /> 홈페이지
                </a>
              )}
              <Button variant="soft" size="sm" className="h-10" onClick={() => setEditId(contracted.id)}>
                상세 · 수정
              </Button>
            </div>
          </div>
        </Card>
      )}

      {venues.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Building2 />} title="아직 등록된 식장이 없어요" description="투어한 식장을 후보로 등록하고 비교해 보세요." actionLabel="첫 식장 추가" onAction={() => setCreating(true)} />
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {sorted.map((v) => (
            <EntityCard
              key={v.id}
              title={v.name}
              highlight={v.is_contracted}
              badges={v.is_contracted ? <Badge tone="success">계약</Badge> : <Badge>후보</Badge>}
              subtitle={[v.address, v.event_date ? formatKoreanDate(v.event_date, { year: false }) : null].filter(Boolean).join(" · ") || undefined}
              stats={[
                { label: "예상 총 비용", value: formatKRW(estTotal(v)) },
                { label: "식대 (1인)", value: formatKRW(v.meal_cost), tone: "muted" },
                { label: "보증 인원", value: `${v.guaranteed_guests}명`, tone: "muted" },
              ]}
              footer={[v.parking ? `주차 ${v.parking}` : null, v.contact_name].filter(Boolean).join(" · ") || undefined}
              favorite={v.is_favorite}
              onFavorite={(f) => patch("venues", v.id, { is_favorite: f }, { log: false })}
              onClick={() => setEditId(v.id)}
            />
          ))}
        </ul>
      )}

      <EntitySheet table="venues" open={!!editId || creating} onClose={() => { setEditId(null); setCreating(false); }} rowId={editId} fields={FIELDS} titleCreate="식장 추가" titleEdit="식장 정보" requiredKey="name" favoriteKey="is_favorite" size="lg" initial={{ event_date: wedding.wedding_date }} />
    </div>
  );
}
