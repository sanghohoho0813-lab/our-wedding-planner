"use client";
import { Plus, Shirt } from "lucide-react";
import { useState } from "react";
import { daysUntil, formatDDay, formatShortDate, todayISO } from "@/lib/date";
import { OUTFIT_KINDS } from "@/lib/labels";
import { formatKRW } from "@/lib/money";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { EntityCard } from "@/components/shared/EntityCard";
import { EntitySheet } from "@/components/shared/EntitySheet";
import type { FieldDef } from "@/components/shared/SchemaForm";

const FIELDS: FieldDef[] = [
  { key: "kind", label: "종류", type: "chips", options: OUTFIT_KINDS.map((k) => ({ value: k, label: k })), clearable: false },
  { key: "vendor_name", label: "업체", type: "text", required: true, placeholder: "예: OO드레스" },
  { key: "reserve_date", label: "예약일", type: "date" },
  { key: "fitting_date", label: "피팅일", type: "date", half: true },
  { key: "pickup_date", label: "수령일", type: "date", half: true },
  { key: "cost", label: "비용", type: "money" },
  { key: "is_paid", label: "결제 완료", type: "toggle" },
  { key: "memo", label: "메모", type: "textarea", placeholder: "사이즈, 옵션, 수선 내용 등" },
];

export function OutfitView() {
  const items = useWeddingStore((s) => s.data!.outfit_items);
  const patch = useWeddingStore((s) => s.patch);
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const today = todayISO();
  const total = items.reduce((s, i) => s + i.cost, 0);
  const sorted = [...items].sort((a, b) => (a.fitting_date ?? a.pickup_date ?? "9999").localeCompare(b.fitting_date ?? b.pickup_date ?? "9999"));

  const nextDate = (o: (typeof items)[number]) => {
    const cands = [
      o.reserve_date ? { label: "예약", date: o.reserve_date } : null,
      o.fitting_date ? { label: "피팅", date: o.fitting_date } : null,
      o.pickup_date ? { label: "수령", date: o.pickup_date } : null,
    ].filter((x): x is { label: string; date: string } => !!x && x.date >= today);
    return cands.sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
  };

  return (
    <div>
      <PageHeader
        title="예복"
        description={`${items.length}개 · 총 ${formatKRW(total)}`}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> 예복 추가
          </Button>
        }
      />
      {items.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Shirt />} title="아직 등록된 예복이 없어요" description="신랑 예복, 드레스, 한복의 예약·피팅·수령일을 기록해 두면 홈과 일정에 자동으로 표시돼요." actionLabel="첫 예복 추가" onAction={() => setCreating(true)} />
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((o) => {
            const next = nextDate(o);
            return (
              <EntityCard
                key={o.id}
                title={o.kind}
                subtitle={o.vendor_name ?? undefined}
                badges={o.is_paid ? <Badge tone="success">결제 완료</Badge> : o.cost > 0 ? <Badge tone="warning">미결제</Badge> : null}
                stats={[
                  { label: "비용", value: o.cost ? formatKRW(o.cost) : "—" },
                  { label: "피팅", value: o.fitting_date ? formatShortDate(o.fitting_date) : "—", tone: "muted" },
                  { label: "수령", value: o.pickup_date ? formatShortDate(o.pickup_date) : "—", tone: "muted" },
                ]}
                footer={next ? `${next.label} ${formatDDay(daysUntil(next.date, today))} · ${formatShortDate(next.date)}` : undefined}
                favorite={o.is_favorite}
                onFavorite={(f) => patch("outfit_items", o.id, { is_favorite: f }, { log: false })}
                onClick={() => setEditId(o.id)}
              />
            );
          })}
        </ul>
      )}
      <EntitySheet table="outfit_items" open={!!editId || creating} onClose={() => { setEditId(null); setCreating(false); }} rowId={editId} fields={FIELDS} titleCreate="예복 추가" titleEdit="예복 정보" requiredKey="vendor_name" favoriteKey="is_favorite" />
    </div>
  );
}
