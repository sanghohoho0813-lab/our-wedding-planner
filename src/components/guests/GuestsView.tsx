"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, MessageCircle, Plus, Search, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { Guest, GuestSide, Rsvp } from "@/lib/db/types";
import { computeGuestStats } from "@/lib/compute";
import { RSVP } from "@/lib/labels";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { inputCls } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { PageHeader } from "@/components/layout/PageHeader";
import { GuestSheet } from "./GuestSheet";

type SideFilter = "all" | GuestSide;
type RsvpFilter = "all" | Rsvp | "uninvited";

const RSVP_STYLE: Record<Rsvp, string> = {
  yes: "bg-success-soft text-success",
  maybe: "bg-surface-2 text-fg-2",
  no: "bg-danger-soft text-danger",
};

function GuestRow({ g, onOpen }: { g: Guest; onOpen: (id: string) => void }) {
  const patch = useWeddingStore((s) => s.patch);
  const people = 1 + g.companions;
  return (
    <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 px-3 py-2.5 hover:bg-surface-2 sm:px-4">
      <button type="button" onClick={() => onOpen(g.id)} className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2">
          <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[0.75rem] font-bold", g.side === "groom" ? "bg-info-soft text-info" : "bg-accent-soft text-accent-text")}>
            {g.side === "groom" ? "신랑" : "신부"}
          </span>
          <span className="truncate text-[0.9375rem] font-medium text-fg">{g.name}</span>
          {people > 1 && <span className="shrink-0 text-[0.75rem] text-fg-3">+{g.companions}</span>}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 pl-10 text-[0.75rem] text-fg-3">
          {g.relation && <span>{g.relation}</span>}
          {g.contacted && <MessageCircle className="size-3 text-success" aria-label="연락 완료" />}
          {g.invitation_sent && <Mail className="size-3 text-success" aria-label="청첩장 전달" />}
          {g.memo && <span className="truncate">· {g.memo}</span>}
        </span>
      </button>
      <div className="flex shrink-0 gap-1" role="radiogroup" aria-label={`${g.name} 참석 여부`}>
        {RSVP.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={g.rsvp === o.value}
            onClick={() => patch("guests", g.id, { rsvp: o.value })}
            className={cn(
              "h-9 min-w-11 rounded-full px-2.5 text-[0.75rem] font-semibold transition-colors",
              g.rsvp === o.value ? RSVP_STYLE[o.value] : "text-fg-3 hover:bg-surface-3",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </motion.li>
  );
}

export function GuestsView() {
  const params = useSearchParams();
  const guests = useWeddingStore((s) => s.data!.guests);
  const [side, setSide] = useState<SideFilter>("all");
  const [rsvp, setRsvp] = useState<RsvpFilter>("all");
  const [q, setQ] = useState(params.get("q") ?? "");
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const stats = computeGuestStats(guests);

  const list = useMemo(() => {
    let l = guests;
    if (side !== "all") l = l.filter((g) => g.side === side);
    if (rsvp === "uninvited") l = l.filter((g) => !g.invitation_sent);
    else if (rsvp !== "all") l = l.filter((g) => g.rsvp === rsvp);
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      l = l.filter((g) => g.name.toLowerCase().includes(t) || (g.relation ?? "").toLowerCase().includes(t) || (g.memo ?? "").toLowerCase().includes(t));
    }
    return [...l].sort((a, b) => a.side.localeCompare(b.side) || (a.relation ?? "").localeCompare(b.relation ?? "") || a.name.localeCompare(b.name, "ko"));
  }, [guests, side, rsvp, q]);

  const groups = useMemo(() => {
    const m = new Map<string, Guest[]>();
    for (const g of list) {
      const k = `${g.side}:${g.relation ?? "기타"}`;
      m.set(k, [...(m.get(k) ?? []), g]);
    }
    return [...m.entries()].map(([k, items]) => ({ key: k, side: k.split(":")[0] as GuestSide, relation: k.split(":")[1], items }));
  }, [list]);

  return (
    <div>
      <PageHeader
        title="하객 목록"
        description={`총 ${stats.total}명 · 참석 확정 ${stats.confirmed}명 · 예상 총 ${stats.expectedPeople}명`}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> 하객 추가
          </Button>
        }
      >
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[
            ["총 하객", `${stats.total}명`],
            ["신랑측", `${stats.groom}명`],
            ["신부측", `${stats.bride}명`],
            ["참석 확정", `${stats.confirmed}명`],
            ["미정", `${stats.maybe}명`],
            ["예상 총 인원", `${stats.expectedPeople}명`],
          ].map(([k, v]) => (
            <div key={k} className="card px-3 py-2.5">
              <p className="text-[0.6875rem] text-fg-3">{k}</p>
              <p className="tabular text-[1.0625rem] font-bold text-fg">{v}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Segmented
            options={[
              { value: "all", label: "전체" },
              { value: "groom", label: "신랑측" },
              { value: "bride", label: "신부측" },
            ]}
            value={side}
            onChange={setSide}
            className="max-w-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[10rem] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-3" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 · 관계 검색" className={`${inputCls} h-10 rounded-full pl-10`} />
            </label>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
              {([
                ["all", "모두"],
                ["yes", "참석"],
                ["maybe", "미정"],
                ["no", "불참"],
                ["uninvited", "청첩장 미전달"],
              ] as [RsvpFilter, string][]).map(([v, l]) => (
                <Chip key={v} size="sm" tone="neutral" active={rsvp === v} onClick={() => setRsvp(v)}>
                  {l}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </PageHeader>

      {list.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Users />}
            title={guests.length === 0 ? "아직 등록된 하객이 없어요" : "조건에 맞는 하객이 없어요"}
            description="이름만 입력하고 [신랑측/신부측], [참석/미정/불참]을 눌러 빠르게 기록해요."
            actionLabel="첫 하객 추가"
            onAction={() => setCreating(true)}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.key} className="card overflow-hidden">
              <h2 className="flex items-center justify-between border-b border-line px-4 py-2 text-[0.75rem] font-semibold text-fg-3">
                <span>
                  {g.side === "groom" ? "신랑측" : "신부측"} · {g.relation}
                </span>
                <span className="tabular">{g.items.length}명</span>
              </h2>
              <ul className="divide-y divide-line">
                <AnimatePresence initial={false}>
                  {g.items.map((guest) => (
                    <GuestRow key={guest.id} g={guest} onOpen={setEditId} />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ))}
        </div>
      )}

      <GuestSheet open={!!editId || creating} onClose={() => { setEditId(null); setCreating(false); }} guestId={editId} initial={side !== "all" ? { side } : undefined} />
    </div>
  );
}
