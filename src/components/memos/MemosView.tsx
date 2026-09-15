"use client";
import { Calendar, CheckSquare, Plus, StickyNote, Wallet } from "lucide-react";
import { useState } from "react";
import { relativeTime, todayISO } from "@/lib/date";
import { useNow } from "@/lib/hooks";
import { toast } from "@/lib/store/ui-store";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { truncate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { TaskSheet } from "@/components/tasks/TaskSheet";
import { EventSheet } from "@/components/calendar/EventSheet";
import { BudgetItemSheet } from "@/components/budget/BudgetItemSheet";
import { MemoSheet } from "./MemoSheet";

export function MemosView() {
  const memos = useWeddingStore((s) => s.data!.memos);
  const add = useWeddingStore((s) => s.add);
  const patch = useWeddingStore((s) => s.patch);
  const [showConverted, setShowConverted] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [opened, setOpened] = useState<{ kind: "task" | "event" | "budget"; id: string } | null>(null);
  const now = useNow(30_000);
  const list = [...memos].filter((m) => showConverted || !m.converted_to).sort((a, b) => b.created_at.localeCompare(a.created_at));

  const convert = (id: string, kind: "task" | "event" | "budget") => {
    const memo = memos.find((m) => m.id === id);
    if (!memo) return;
    const title = truncate(memo.content.split("\n")[0], 60);
    let createdId: string;
    if (kind === "task") createdId = add("tasks", { title, memo: memo.content !== title ? memo.content : null }).id;
    else if (kind === "event") createdId = add("events", { title, date: todayISO(), memo: memo.content !== title ? memo.content : null }).id;
    else createdId = add("budget_items", { name: title, memo: memo.content !== title ? memo.content : null }).id;
    patch("memos", id, { converted_to: kind }, { log: false });
    toast(`${kind === "task" ? "할 일" : kind === "event" ? "일정" : "예산 항목"}으로 변환했어요.`, { tone: "success" });
    setOpened({ kind, id: createdId });
  };

  return (
    <div>
      <PageHeader
        title="메모함"
        description="떠오른 생각을 적어두고, 할 일 · 일정 · 예산으로 바꿔요"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> 메모
          </Button>
        }
      >
        <Chip size="sm" tone="neutral" active={showConverted} onClick={() => setShowConverted((v) => !v)}>
          변환된 메모 보기
        </Chip>
      </PageHeader>
      {list.length === 0 ? (
        <div className="card">
          <EmptyState icon={<StickyNote />} title="메모가 비어 있어요" description="갑자기 떠오른 아이디어, 물어볼 것, 사야 할 것을 바로 적어두세요." actionLabel="첫 메모 작성" onAction={() => setCreating(true)} />
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((m) => (
            <li key={m.id} className="card card-hover flex flex-col">
              <button type="button" onClick={() => setEditId(m.id)} className="flex-1 p-4 text-left">
                <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-fg line-clamp-6">{m.content}</p>
                <p className="mt-2 text-[0.6875rem] text-fg-3">
                  {now ? relativeTime(m.created_at, now) : ""}
                  {m.converted_to && ` · ${m.converted_to === "task" ? "할 일" : m.converted_to === "event" ? "일정" : "예산"}으로 변환됨`}
                </p>
              </button>
              {!m.converted_to && (
                <div className="flex gap-1 border-t border-line px-2 py-1.5">
                  <Button size="sm" variant="ghost" className="flex-1" onClick={() => convert(m.id, "task")}>
                    <CheckSquare className="size-3.5" /> 할 일로
                  </Button>
                  <Button size="sm" variant="ghost" className="flex-1" onClick={() => convert(m.id, "event")}>
                    <Calendar className="size-3.5" /> 일정으로
                  </Button>
                  <Button size="sm" variant="ghost" className="flex-1" onClick={() => convert(m.id, "budget")}>
                    <Wallet className="size-3.5" /> 예산으로
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <MemoSheet open={!!editId || creating} onClose={() => { setEditId(null); setCreating(false); }} memoId={editId} />
      <TaskSheet open={opened?.kind === "task"} onClose={() => setOpened(null)} taskId={opened?.kind === "task" ? opened.id : null} />
      <EventSheet open={opened?.kind === "event"} onClose={() => setOpened(null)} eventId={opened?.kind === "event" ? opened.id : null} />
      <BudgetItemSheet open={opened?.kind === "budget"} onClose={() => setOpened(null)} itemId={opened?.kind === "budget" ? opened.id : null} />
    </div>
  );
}
