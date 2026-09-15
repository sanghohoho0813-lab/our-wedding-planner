"use client";
import { motion, useReducedMotion } from "framer-motion";
import { Calendar, CheckSquare, Plus, StickyNote, Users, Wallet } from "lucide-react";
import { useState } from "react";
import { useUIStore } from "@/lib/store/ui-store";
import { Sheet } from "@/components/ui/Sheet";
import { TaskSheet } from "@/components/tasks/TaskSheet";
import { BudgetItemSheet } from "@/components/budget/BudgetItemSheet";
import { EventSheet } from "@/components/calendar/EventSheet";
import { GuestSheet } from "@/components/guests/GuestSheet";
import { MemoSheet } from "@/components/memos/MemoSheet";

type Kind = "task" | "budget" | "event" | "guest" | "memo";

const ACTIONS: { kind: Kind; label: string; desc: string; icon: React.ReactNode }[] = [
  { kind: "task", label: "할 일 추가", desc: "마감일과 상태를 함께", icon: <CheckSquare /> },
  { kind: "budget", label: "비용 추가", desc: "견적 · 실제 금액", icon: <Wallet /> },
  { kind: "event", label: "일정 추가", desc: "피팅, 방문, 촬영", icon: <Calendar /> },
  { kind: "guest", label: "하객 추가", desc: "신랑측 · 신부측", icon: <Users /> },
  { kind: "memo", label: "메모 추가", desc: "떠오른 생각 바로 기록", icon: <StickyNote /> },
];

export function QuickAdd() {
  const open = useUIStore((s) => s.quickAddOpen);
  const setOpen = useUIStore((s) => s.setQuickAdd);
  const [kind, setKind] = useState<Kind | null>(null);
  const reduce = useReducedMotion();

  const pick = (k: Kind) => {
    setOpen(false);
    setTimeout(() => setKind(k), 120);
  };

  return (
    <>
      <motion.button
        type="button"
        aria-label="빠른 추가"
        onClick={() => setOpen(true)}
        whileTap={reduce ? undefined : { scale: 0.94 }}
        className="fixed right-4 z-30 inline-flex size-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-[var(--shadow-md)] transition-colors hover:bg-accent-strong lg:right-8 lg:bottom-8"
        style={{ bottom: "calc(var(--nav-h) + 1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <Plus className="size-6" strokeWidth={2.4} />
      </motion.button>

      <Sheet open={open} onClose={() => setOpen(false)} title="빠른 추가" size="sm">
        <ul className="grid gap-2">
          {ACTIONS.map((a) => (
            <li key={a.kind}>
              <button
                type="button"
                onClick={() => pick(a.kind)}
                className="flex w-full items-center gap-3 rounded-[14px] border border-line bg-surface px-4 py-3 text-left transition hover:border-line-strong hover:bg-surface-2 active:scale-[0.99]"
              >
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text [&>svg]:size-5">{a.icon}</span>
                <span className="min-w-0">
                  <span className="block text-[0.9375rem] font-semibold text-fg">{a.label}</span>
                  <span className="block text-[0.75rem] text-fg-3">{a.desc}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>

      <TaskSheet open={kind === "task"} onClose={() => setKind(null)} />
      <BudgetItemSheet open={kind === "budget"} onClose={() => setKind(null)} />
      <EventSheet open={kind === "event"} onClose={() => setKind(null)} />
      <GuestSheet open={kind === "guest"} onClose={() => setKind(null)} />
      <MemoSheet open={kind === "memo"} onClose={() => setKind(null)} />
    </>
  );
}
