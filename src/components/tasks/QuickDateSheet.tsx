"use client";
import { useState } from "react";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";

export function QuickDateSheet({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const task = useWeddingStore((s) => (taskId ? s.data?.tasks.find((t) => t.id === taskId) ?? null : null));
  const patch = useWeddingStore((s) => s.patch);
  const [value, setValue] = useState<string | null>(null);
  const current = value ?? task?.due_date ?? null;
  return (
    <Sheet
      open={!!taskId}
      onClose={onClose}
      title="마감일 변경"
      description={task?.title}
      size="sm"
      footer={
        <Button
          full
          onClick={() => {
            if (task) patch("tasks", task.id, { due_date: current });
            setValue(null);
            onClose();
          }}
        >
          적용
        </Button>
      }
    >
      <DateField value={current} onChange={setValue} />
    </Sheet>
  );
}
