"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Mail, MessageCircle, ListPlus, Mic, Search, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMediaQuery } from "@/lib/hooks";
import type { Guest, GuestSide, Rsvp } from "@/lib/db/types";
import { computeGuestStats } from "@/lib/compute";
import { RSVP, RSVP_LABEL } from "@/lib/labels";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { FilterBar } from "@/components/ui/FilterBar";
import { SIDE_LABEL, SIDE_SHORT, SIDE_TINT } from "@/lib/guest-side";
import { parsePhrase } from "@/lib/voice-guest";
import { tint } from "@/lib/tint";
import { VoiceGuestSheet } from "./VoiceGuestSheet";
import { MealEstimateCard } from "./MealEstimateCard";
import { speechSupported } from "@/lib/speech";
import { InlineAdd } from "@/components/ui/InlineAdd";
import { SwipeHint } from "@/components/ui/SwipeHint";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { inputCls } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { PageHeader } from "@/components/layout/PageHeader";
import { MasterDetail } from "@/components/layout/MasterDetail";
import { GuestDetail } from "./GuestDetail";
import { GuestSheet } from "./GuestSheet";

type SideFilter = "all" | GuestSide;
type RsvpFilter = "all" | Rsvp | "uninvited";

const RSVP_STYLE: Record<Rsvp, string> = {
  yes: "bg-success-soft text-success",
  maybe: "bg-surface-2 text-fg-2",
  no: "bg-danger-soft text-danger",
};

function GuestRow({ g, onOpen, selected }: { g: Guest; onOpen: (id: string) => void; selected?: boolean }) {
  const patch = useWeddingStore((s) => s.patch);
  const people = 1 + g.companions;
  return (
    <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <SwipeRow
        right={{
          icon: <Check />,
          label: g.rsvp === "yes" ? "미정으로" : "참석",
          tone: "success",
          onAction: () => patch("guests", g.id, { rsvp: g.rsvp === "yes" ? "maybe" : "yes" }),
        }}
        left={{
          icon: <Mail />,
          label: g.invitation_sent ? "전달 취소" : "청첩장",
          tone: "accent",
          onAction: () => patch("guests", g.id, { invitation_sent: !g.invitation_sent }),
        }}
      >
        <div className={cn("flex items-center gap-2 px-3 py-2.5 transition-colors hover:bg-surface-2 sm:px-4", selected && "bg-accent-softer ring-1 ring-inset ring-accent/30")}>
      <button type="button" onClick={() => onOpen(g.id)} className="flex min-h-9 min-w-0 flex-1 flex-col justify-center text-left">
        <span className="flex items-center gap-2">
          <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[0.8125rem] font-bold", tint(SIDE_TINT[g.side]).soft, tint(SIDE_TINT[g.side]).text)}>
            {SIDE_SHORT[g.side]}
          </span>
          <span className="truncate text-[1rem] font-medium text-fg">{g.name}</span>
          {/* 동반이 있으면 총 몇 명인지 바로 보여준다 ('+1' 보다 '2명' 이 셈이 쉽다) */}
          {people > 1 && <span className="shrink-0 rounded-full bg-surface-2 px-1.5 py-0.5 text-[0.75rem] font-semibold tabular text-fg-2">{people}명</span>}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 pl-10 text-[0.8125rem] text-fg-3">
          {g.relation && <span>{g.relation}</span>}
          {g.contacted && <MessageCircle className="size-3 text-success" aria-label="연락 완료" />}
          {g.memo && <span className="truncate">· {g.memo}</span>}
        </span>
      </button>
      <button
        type="button"
        aria-pressed={g.invitation_sent}
        aria-label={g.invitation_sent ? `${g.name} 청첩장 전달 취소` : `${g.name} 청첩장 전달로 표시`}
        title={g.invitation_sent ? "청첩장 전달됨" : "청첩장 전달로 표시"}
        onClick={() => patch("guests", g.id, { invitation_sent: !g.invitation_sent })}
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors",
          g.invitation_sent ? "bg-success-soft text-success" : "text-fg-3 hover:bg-surface-3 hover:text-fg",
        )}
      >
        <Mail className="size-[1.125rem]" />
      </button>
      {/* 좁은 화면에서는 상태 칩 하나(눌러서 참석 → 미정 → 불참 순환). 이름이 잘리지 않게 한다. */}
      <button
        type="button"
        aria-label={`${g.name} 참석 여부: ${RSVP_LABEL[g.rsvp]}. 눌러서 변경`}
        onClick={() => {
          const i = RSVP.findIndex((o) => o.value === g.rsvp);
          patch("guests", g.id, { rsvp: RSVP[(i + 1) % RSVP.length].value });
        }}
        className={cn("h-9 shrink-0 rounded-full px-3 text-[0.8125rem] font-semibold transition-colors sm:hidden", RSVP_STYLE[g.rsvp])}
      >
        {RSVP_LABEL[g.rsvp]}
      </button>
      <div className="hidden shrink-0 gap-1 sm:flex" role="radiogroup" aria-label={`${g.name} 참석 여부`}>
        {RSVP.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={g.rsvp === o.value}
            onClick={() => patch("guests", g.id, { rsvp: o.value })}
            className={cn(
              "h-9 min-w-11 rounded-full px-2.5 text-[0.8125rem] font-semibold transition-colors",
              g.rsvp === o.value ? RSVP_STYLE[o.value] : "text-fg-3 hover:bg-surface-3",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
        </div>
      </SwipeRow>
    </motion.li>
  );
}

export function GuestsView({ embedded }: { embedded?: boolean } = {}) {
  const params = useSearchParams();
  const guests = useWeddingStore((s) => s.data!.guests);
  const add = useWeddingStore((s) => s.add);
  const [side, setSide] = useState<SideFilter>("all");
  const [rsvp, setRsvp] = useState<RsvpFilter>("all");
  const [q, setQ] = useState(params.get("q") ?? "");
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  // 말로 입력되는 기기에서만 버튼을 보여준다 (아이폰 사파리는 들쭉날쭉하다).
  // 브라우저에서만 알 수 있으므로 마운트 후에 켠다.
  const [voiceReady, setVoiceReady] = useState(false);
  useEffect(() => setVoiceReady(speechSupported()), []);
  const wide = useMediaQuery("(min-width: 1280px)");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 43명이 한 화면에 쭉 이어지면 찾기 어렵다. 그룹을 접었다 펼 수 있게 한다.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleGroup = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const open = (id: string) => (wide ? setSelectedId(id) : setEditId(id));
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
        compact={embedded}
        title="하객 목록"
        // 탭 바깥 제목 줄에서 이미 같은 숫자를 보여준다.
        description={embedded ? undefined : `총 ${stats.total}명 · 참석 확정 ${stats.confirmed}명 · 예상 총 ${stats.expectedPeople}명`}
      >
        <InlineAdd
          voice
          placeholder={side === "all" ? "이름만 적어 하객 추가" : `${SIDE_LABEL[side]} 하객 이름 추가`}
          // 손으로 칠 때도 말할 때와 똑같이 읽는다 —
          // "양가 친구 박준영", "김철수 & 이영희 부부", "이가족 4명" 이 그대로 칸에 들어간다.
          onAdd={(text) => {
            const p = parsePhrase(text);
            if (!p) return;
            add("guests", {
              name: p.name,
              side: p.side ?? (side === "all" ? "groom" : side),
              relation: p.relation,
              companions: p.companions ?? 0,
            });
          }}
          trailing={
            <Button variant="outline" className="hidden shrink-0 sm:inline-flex" onClick={() => setCreating(true)} aria-label="자세히 입력해서 하객 추가">
              <ListPlus className="size-4" /> 자세히
            </Button>
          }
        />
        {voiceReady && (
          <button
            type="button"
            onClick={() => setVoiceOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-line py-2 text-[0.875rem] text-fg-3 transition-colors hover:border-line-strong hover:text-fg-2"
          >
            <Mic className="size-4" /> 말로 여러 명 한 번에 담기
          </button>
        )}
        {/* 총 하객 · 신랑측 · 신부측 · 청첩장 전달은 위 제목 줄에 이미 있다.
            폰에서는 거기 없는 셋만 한 줄로 두고, 넓어지면 전부 편다. */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-7">
          {[
            ["참석 확정", `${stats.confirmed}명`, true],
            ["미정", `${stats.maybe}명`, true],
            ["예상 총 인원", `${stats.expectedPeople}명`, true],
            ["총 하객", `${stats.total}명`, false],
            ["신랑측", `${stats.groom}명`, false],
            ["신부측", `${stats.bride}명`, false],
            ["공통 지인", `${stats.both}명`, false],
            ["청첩장 전달", `${stats.invited} / ${stats.total}`, false],
          ].map(([k, v, onPhone]) => (
            <div key={k as string} className={cn("card px-3 py-2.5", !onPhone && "hidden sm:block")}>
              <p className="text-[0.75rem] text-fg-3">{k}</p>
              <p className="tabular text-[1.125rem] font-bold text-fg">{v}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Segmented
            options={[
              { value: "all", label: "전체" },
              { value: "groom", label: "신랑측" },
              { value: "bride", label: "신부측" },
              { value: "both", label: "공통" },
            ]}
            value={side}
            onChange={setSide}
            className="max-w-sm"
          />
          {/* 식대는 하객 수에 바로 붙는 돈이라 명단 옆에 있어야 한다 */}
          <MealEstimateCard compact />
          <FilterBar
            label="이름 검색"
            activeCount={q.trim() ? 1 : 0}
            chips={
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
            }
          >
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-3" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 · 관계 검색" className={`${inputCls} h-10 rounded-full pl-10`} />
            </label>
          </FilterBar>
        </div>
      </PageHeader>

      <SwipeHint storageKey="owp:hint:guestSwipe" left="청첩장" right="참석" className="mb-3" />

      <MasterDetail
        detail={<GuestDetail guestId={selectedId} />}
        list={
          list.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<Users />}
                title={guests.length === 0 ? "아직 등록된 하객이 없어요" : "조건에 맞는 하객이 없어요"}
                description="이름만 입력하고 [신랑측/신부측/공통], [참석/미정/불참]을 눌러 빠르게 기록해요."
                actionLabel="첫 하객 추가"
                onAction={() => setCreating(true)}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((g) => (
                <section key={g.key} className="card overflow-hidden">
                  <h2>
                    <button
                      type="button"
                      onClick={() => toggleGroup(g.key)}
                      aria-expanded={!collapsed.has(g.key)}
                      className="flex w-full items-center justify-between gap-2 border-b border-line px-4 py-2.5 text-left text-[0.8125rem] font-semibold text-fg-3 hover:bg-surface-2"
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <ChevronDown className={cn("size-4 shrink-0 transition-transform", collapsed.has(g.key) && "-rotate-90")} />
                        <span className="truncate">
                          {SIDE_LABEL[g.side]} · {g.relation}
                        </span>
                      </span>
                      <span className="shrink-0 tabular">
                        {g.items.filter((x) => x.rsvp === "yes").length > 0 && (
                          <span className="mr-2 text-success">참석 {g.items.filter((x) => x.rsvp === "yes").length}</span>
                        )}
                        {g.items.length}명
                      </span>
                    </button>
                  </h2>
                  {!collapsed.has(g.key) && (
                    <ul className="divide-y divide-line">
                      <AnimatePresence initial={false}>
                        {g.items.map((guest) => (
                          <GuestRow key={guest.id} g={guest} onOpen={open} selected={selectedId === guest.id} />
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}
                </section>
              ))}
            </div>
          )
        }
      />

      <GuestSheet open={!!editId || creating} onClose={() => { setEditId(null); setCreating(false); }} guestId={editId} initial={side !== "all" ? { side } : undefined} />
      <VoiceGuestSheet open={voiceOpen} onClose={() => setVoiceOpen(false)} defaultSide={side === "bride" ? "bride" : "groom"} />
    </div>
  );
}
