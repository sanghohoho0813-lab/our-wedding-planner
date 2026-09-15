"use client";
import { CheckCircle2, RotateCcw, Trash2 } from "lucide-react";
import { CheckSquare } from "lucide-react";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { nowISO } from "@/lib/utils";
import type { RowValues } from "@/lib/db/defaults";
import { Button, IconButton } from "@/components/ui/Button";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { DetailCard, DetailPlaceholder } from "@/components/layout/MasterDetail";
import { useEntityForm } from "@/components/shared/useEntityForm";
import { TaskFields } from "./TaskSheet";

export function TaskDetail({ taskId }: { taskId: string | null }) {
  const row = useWeddingStore((s) => (taskId ? s.data?.tasks.find((t) => t.id === taskId) ?? null : null));
  const remove = useWeddingStore((s) => s.remove);
  const { values, set, setMany } = useEntityForm("tasks", row, undefined, true);

  if (!row) {
    return <DetailPlaceholder icon={<CheckSquare />} title="할 일을 선택해 주세요" description="왼쪽 목록에서 항목을 누르면 여기에서 바로 고칠 수 있어요." />;
  }

  const setStatus = (status: RowValues<"tasks">["status"]) => setMany({ status, completed_at: status === "done" ? nowISO() : null });

  return (
    <DetailCard
      title={row.title || "할 일"}
      actions={
        <>
          <FavoriteButton active={values.is_favorite} onChange={(v) => set("is_favorite", v)} />
          <IconButton label="삭제" onClick={() => remove("tasks", row.id)} className="hover:text-danger">
            <Trash2 className="size-[1.125rem]" />
          </IconButton>
        </>
      }
    >
      <TaskFields values={values} set={set} setStatus={setStatus} isEdit />
      <div className="mt-5">
        {values.status !== "done" ? (
          <Button full onClick={() => setStatus("done")}>
            <CheckCircle2 className="size-4" /> 완료로 표시
          </Button>
        ) : (
          <Button full variant="secondary" onClick={() => setStatus("todo")}>
            <RotateCcw className="size-4" /> 다시 열기
          </Button>
        )}
      </div>
    </DetailCard>
  );
}
