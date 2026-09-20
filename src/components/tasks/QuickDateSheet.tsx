"use client";
import { useState } from "react";
import { addDays, formatKoreanDate, nextWeekend, todayISO } from "@/lib/date";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/utils";

/**
 * 마감일 빠르게 바꾸기.
 *
 * 할 일을 왼쪽으로 밀면 열린다. 대부분은 '오늘 · 내일 · 이번 주말' 중 하나라서
 * 그 셋은 **누르면 바로 적용되고 닫힌다** — 고르고 다시 '적용' 을 누르게 하면
 * 한 번 더 손이 간다. 그 밖의 날짜만 아래에서 직접 고른다.
 */
export function QuickDateSheet({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const task = useWeddingStore((s) => (taskId ? s.data?.tasks.find((t) => t.id === taskId) ?? null : null));
  const patch = useWeddingStore((s) => s.patch);
  const [value, setValue] = useState<string | null>(null);
  const current = value ?? task?.due_date ?? null;
  const today = todayISO();

  const apply = (v: string | null) => {
    if (task) patch("tasks", task.id, { due_date: v });
    setValue(null);
    onClose();
  };

  const quick: { label: string; value: string | null }[] = [
    { label: "오늘", value: today },
    { label: "내일", value: addDays(today, 1) },
    { label: "이번 주말", value: nextWeekend(today) },
    { label: "1주 뒤", value: addDays(today, 7) },
    { label: "날짜 없음", value: null },
  ];

  return (
    <Sheet
      open={!!taskId}
      onClose={() => {
        setValue(null);
        onClose();
      }}
      title="마감일 변경"
      description={task?.title}
      size="sm"
      footer={
        <Button full onClick={() => apply(current)}>
          적용
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {quick.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => apply(q.value)}
            className={cn(
              "flex h-12 flex-col items-center justify-center rounded-[12px] border text-[0.9375rem] font-medium transition-colors active:scale-[0.98]",
              task?.due_date === q.value
                ? "border-accent bg-accent-soft text-accent-text"
                : "border-line bg-surface text-fg hover:border-line-strong hover:bg-surface-2",
              q.value === null && "col-span-2 text-fg-3",
            )}
          >
            {q.label}
            {q.value && <span className="text-[0.75rem] font-normal text-fg-3">{formatKoreanDate(q.value, { weekday: true })}</span>}
          </button>
        ))}
      </div>
      <div className="mt-4 border-t border-line pt-4">
        <p className="mb-2 text-[0.875rem] font-medium text-fg-2">다른 날짜</p>
        <DateField value={current} onChange={setValue} quick={false} />
      </div>
    </Sheet>
  );
}
