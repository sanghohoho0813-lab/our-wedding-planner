"use client";
import { motion, useReducedMotion } from "framer-motion";
import { CheckSquare, Plus, StickyNote, Users, Wallet } from "lucide-react";
import { useState } from "react";
import { useUIStore } from "@/lib/store/ui-store";
import { tint, type Tint } from "@/lib/tint";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/ui/Sheet";
import { AddSheet } from "@/components/plan/AddSheet";
import { BudgetItemSheet } from "@/components/budget/BudgetItemSheet";
import { GuestSheet } from "@/components/guests/GuestSheet";
import { MemoSheet } from "@/components/memos/MemoSheet";

type Kind = "plan" | "budget" | "guest" | "memo";

// 할 일과 일정은 하나로 묶는다. 시간을 적으면 일정, 아니면 할 일로 들어간다.
const ACTIONS: { kind: Kind; label: string; desc: string; icon: React.ReactNode; tint: Tint }[] = [
  { kind: "plan", label: "할 일 · 일정", desc: "시간을 적으면 일정으로", icon: <CheckSquare />, tint: "plan" },
  { kind: "budget", label: "비용", desc: "견적 · 실제 금액", icon: <Wallet />, tint: "budget" },
  { kind: "guest", label: "하객", desc: "신랑측 · 신부측", icon: <Users />, tint: "guests" },
  { kind: "memo", label: "메모", desc: "떠오른 생각 바로 기록", icon: <StickyNote />, tint: "neutral" },
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
                <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] [&>svg]:size-5", tint(a.tint).soft, tint(a.tint).fg)}>{a.icon}</span>
                <span className="min-w-0">
                  <span className="block text-[1rem] font-semibold text-fg">{a.label}</span>
                  <span className="block text-[0.8125rem] text-fg-3">{a.desc}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>

      <AddSheet open={kind === "plan"} onClose={() => setKind(null)} />
      <BudgetItemSheet open={kind === "budget"} onClose={() => setKind(null)} />
      <GuestSheet open={kind === "guest"} onClose={() => setKind(null)} />
      <MemoSheet open={kind === "memo"} onClose={() => setKind(null)} />
    </>
  );
}
