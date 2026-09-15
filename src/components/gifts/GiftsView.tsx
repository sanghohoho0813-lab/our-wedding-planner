"use client";
import { Gift, Plus } from "lucide-react";
import { useState } from "react";
import { formatKoreanDate } from "@/lib/date";
import { GUEST_RELATIONS } from "@/lib/labels";
import { formatKRW } from "@/lib/money";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { EntityCard } from "@/components/shared/EntityCard";
import { EntitySheet } from "@/components/shared/EntitySheet";
import type { FieldDef } from "@/components/shared/SchemaForm";

const FIELDS: FieldDef[] = [
  { key: "recipient", label: "대상", type: "text", required: true, placeholder: "예: 신부 어머니" },
  { key: "relation", label: "관계", type: "chips", options: ["부모님", "형제·자매", "친척", "친구", "직장", "도우미", "기타", ...GUEST_RELATIONS].filter((v, i, a) => a.indexOf(v) === i).map((r) => ({ value: r, label: r })) },
  { key: "item", label: "선물", type: "text", placeholder: "예: 한복, 상품권" },
  { key: "estimated_cost", label: "예상 비용", type: "money", half: true },
  { key: "actual_cost", label: "실제 비용", type: "money", half: true },
  { key: "is_purchased", label: "구매 완료", type: "toggle" },
  { key: "is_delivered", label: "전달 완료", type: "toggle" },
  { key: "delivered_at", label: "전달일", type: "date", showIf: (g) => Boolean(g("is_delivered")), quickDates: true },
  { key: "memo", label: "메모", type: "textarea" },
];

type Filter = "all" | "todo" | "purchased" | "delivered";

export function GiftsView({ embedded }: { embedded?: boolean } = {}) {
  const gifts = useWeddingStore((s) => s.data!.gifts);
  const [filter, setFilter] = useState<Filter>("all");
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const list = gifts.filter((g) => (filter === "todo" ? !g.is_purchased : filter === "purchased" ? g.is_purchased && !g.is_delivered : filter === "delivered" ? g.is_delivered : true));
  const est = gifts.reduce((s, g) => s + g.estimated_cost, 0);
  const act = gifts.reduce((s, g) => s + g.actual_cost, 0);
  const delivered = gifts.filter((g) => g.is_delivered).length;

  return (
    <div>
      <PageHeader
        compact={embedded}
        title="선물"
        description={`${gifts.length}개 · 전달 ${delivered}개 · 예상 ${formatKRW(est)} · 실제 ${formatKRW(act)}`}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> 선물 추가
          </Button>
        }
      >
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1">
          {([
            ["all", "전체"],
            ["todo", "구매 전"],
            ["purchased", "전달 전"],
            ["delivered", "전달 완료"],
          ] as [Filter, string][]).map(([v, l]) => (
            <Chip key={v} size="sm" active={filter === v} onClick={() => setFilter(v)}>
              {l}
            </Chip>
          ))}
        </div>
      </PageHeader>
      {list.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Gift />} title={gifts.length === 0 ? "아직 등록된 선물이 없어요" : "조건에 맞는 선물이 없어요"} description="양가 부모님, 도와주신 분들께 드릴 선물을 기록해요." actionLabel="첫 선물 추가" onAction={() => setCreating(true)} />
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((g) => (
            <EntityCard
              key={g.id}
              title={g.recipient}
              badges={g.is_delivered ? <Badge tone="success">전달 완료</Badge> : g.is_purchased ? <Badge tone="info">구매 완료</Badge> : <Badge>준비 전</Badge>}
              subtitle={[g.relation, g.item].filter(Boolean).join(" · ") || undefined}
              stats={[
                { label: "예상", value: g.estimated_cost ? formatKRW(g.estimated_cost) : "—", tone: "muted" },
                { label: "실제", value: g.actual_cost ? formatKRW(g.actual_cost) : "—" },
              ]}
              footer={g.is_delivered && g.delivered_at ? `${formatKoreanDate(g.delivered_at, { year: false })} 전달` : g.memo ?? undefined}
              onClick={() => setEditId(g.id)}
            />
          ))}
        </ul>
      )}
      <EntitySheet table="gifts" open={!!editId || creating} onClose={() => { setEditId(null); setCreating(false); }} rowId={editId} fields={FIELDS} titleCreate="선물 추가" titleEdit="선물 정보" requiredKey="recipient" />
    </div>
  );
}
