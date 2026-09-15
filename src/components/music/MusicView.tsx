"use client";
import { ExternalLink, Music, Plus } from "lucide-react";
import { useState } from "react";
import type { MusicSlot } from "@/lib/db/types";
import { MUSIC_SLOT, MUSIC_SLOT_LABEL } from "@/lib/labels";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { CheckCircle } from "@/components/ui/CheckCircle";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { EntitySheet } from "@/components/shared/EntitySheet";
import type { FieldDef } from "@/components/shared/SchemaForm";

const FIELDS: FieldDef[] = [
  { key: "title", label: "곡명", type: "text", required: true, placeholder: "예: Can't Help Falling in Love" },
  { key: "artist", label: "가수", type: "text", placeholder: "예: Elvis Presley" },
  { key: "slot", label: "사용 구간", type: "chips", options: MUSIC_SLOT, clearable: false },
  { key: "url", label: "YouTube / 음원 URL", type: "url" },
  { key: "section", label: "재생 구간", type: "text", placeholder: "예: 0:45 ~ 2:10" },
  { key: "is_confirmed", label: "확정", type: "toggle" },
  { key: "memo", label: "메모", type: "textarea", placeholder: "연주 여부, 편곡, 큐 시트 메모 등" },
];

export function MusicView({ embedded }: { embedded?: boolean } = {}) {
  const items = useWeddingStore((s) => s.data!.music_items);
  const patch = useWeddingStore((s) => s.patch);
  const [slot, setSlot] = useState<MusicSlot | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const confirmed = items.filter((i) => i.is_confirmed).length;
  const slots = slot ? MUSIC_SLOT.filter((s) => s.value === slot) : MUSIC_SLOT;

  return (
    <div>
      <PageHeader
        compact={embedded}
        title="음악"
        description={`${items.length}곡 · 확정 ${confirmed}곡`}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> 곡 추가
          </Button>
        }
      >
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1">
          <Chip size="sm" active={slot === null} onClick={() => setSlot(null)}>전체</Chip>
          {MUSIC_SLOT.map((s) => (
            <Chip key={s.value} size="sm" active={slot === s.value} onClick={() => setSlot(slot === s.value ? null : s.value)}>
              {s.label}
            </Chip>
          ))}
        </div>
      </PageHeader>

      {items.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Music />} title="아직 등록된 곡이 없어요" description="식전 음악부터 행진곡까지, 구간별로 후보곡을 모아보세요." actionLabel="첫 곡 추가" onAction={() => setCreating(true)} />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {slots.map((s) => {
            const list = items.filter((i) => i.slot === s.value).sort((a, b) => Number(b.is_confirmed) - Number(a.is_confirmed) || a.sort_order - b.sort_order);
            if (list.length === 0 && slot === null) return null;
            return (
              <section key={s.value} className="card overflow-hidden">
                <h2 className="flex items-center justify-between border-b border-line px-4 py-2.5 text-[1rem] font-semibold">
                  {s.label}
                  <span className="text-[0.8125rem] font-normal text-fg-3">{list.length}곡</span>
                </h2>
                {list.length === 0 ? (
                  <EmptyState compact title="후보곡이 없어요" actionLabel="곡 추가" onAction={() => { setSlot(s.value); setCreating(true); }} />
                ) : (
                  <ul className="divide-y divide-line">
                    {list.map((m) => (
                      <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
                        <CheckCircle checked={m.is_confirmed} onChange={(v) => patch("music_items", m.id, { is_confirmed: v })} label={m.is_confirmed ? "확정 해제" : "확정"} />
                        <button type="button" onClick={() => setEditId(m.id)} className="min-w-0 flex-1 text-left">
                          <span className="flex items-center gap-2">
                            <span className={cn("truncate text-[1rem] font-medium text-fg")}>{m.title}</span>
                            {m.is_confirmed && <Badge tone="success">확정</Badge>}
                          </span>
                          <span className="block truncate text-[0.8125rem] text-fg-3">{[m.artist, m.section].filter(Boolean).join(" · ") || MUSIC_SLOT_LABEL[m.slot]}</span>
                        </button>
                        {m.url && (
                          <a href={m.url} target="_blank" rel="noreferrer" aria-label="링크 열기" className="inline-flex size-10 items-center justify-center rounded-full text-fg-3 hover:bg-surface-3 hover:text-accent">
                            <ExternalLink className="size-4" />
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <EntitySheet table="music_items" open={!!editId || creating} onClose={() => { setEditId(null); setCreating(false); }} rowId={editId} fields={FIELDS} titleCreate="곡 추가" titleEdit="곡 정보" requiredKey="title" initial={{ slot: slot ?? "pre", sort_order: items.length }} />
    </div>
  );
}
