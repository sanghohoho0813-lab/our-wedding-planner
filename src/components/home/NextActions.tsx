"use client";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, CheckSquare } from "lucide-react";
import { useState } from "react";
import { computeNextActions } from "@/lib/compute";
import { formatDDay } from "@/lib/date";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { nowISO } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { CheckCircle } from "@/components/ui/CheckCircle";
import { EmptyState } from "@/components/ui/EmptyState";
import { TaskSheet } from "@/components/tasks/TaskSheet";
import { QuickDateSheet } from "@/components/tasks/QuickDateSheet";

export function NextActions({ limit = 5 }: { limit?: number }) {
  const tasks = useWeddingStore((s) => s.data!.tasks);
  const patch = useWeddingStore((s) => s.patch);
  const [editId, setEditId] = useState<string | null>(null);
  const [dateId, setDateId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const items = computeNextActions(tasks, limit);

  return (
    <Card className="flex flex-col">
      <CardHeader title="지금 해야 할 일" icon={<CheckSquare />} href="/tasks" />
      {items.length === 0 ? (
        <EmptyState compact title="남은 할 일이 없어요" description="새로운 할 일을 추가해 준비를 이어가요." actionLabel="할 일 추가" onAction={() => setCreating(true)} />
      ) : (
        <ul className="px-2 pb-2">
          <AnimatePresence initial={false}>
            {items.map(({ task, days }) => (
              <motion.li
                key={task.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 rounded-[12px] px-3 py-2 hover:bg-surface-2"
              >
                <CheckCircle
                  checked={task.status === "done"}
                  onChange={(v) => patch("tasks", task.id, { status: v ? "done" : "todo", completed_at: v ? nowISO() : null })}
                />
                <button type="button" onClick={() => setEditId(task.id)} className="min-w-0 flex-1 text-left">
                  <span className="flex items-center gap-2">
                    {days !== null && (
                      <span className={cn("shrink-0 text-[0.8125rem] font-semibold tabular", days < 0 ? "text-danger" : days <= 3 ? "text-accent-text" : "text-fg-3")}>
                        {formatDDay(days)}
                      </span>
                    )}
                    <span className="truncate text-[0.9375rem] font-medium text-fg">{task.title}</span>
                    {task.priority === "high" && <Badge tone="accent">중요</Badge>}
                  </span>
                  {(task.category || task.status === "doing") && (
                    <span className="mt-0.5 block truncate text-[0.75rem] text-fg-3">
                      {[task.status === "doing" ? "진행 중" : null, task.category].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  aria-label="마감일 변경"
                  onClick={() => setDateId(task.id)}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-fg-3 hover:bg-surface-3 hover:text-accent"
                >
                  <CalendarClock className="size-4" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      <TaskSheet open={!!editId || creating} onClose={() => { setEditId(null); setCreating(false); }} taskId={editId} />
      <QuickDateSheet taskId={dateId} onClose={() => setDateId(null)} />
    </Card>
  );
}
