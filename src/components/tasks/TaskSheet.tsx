"use client";
import { Trash2 } from "lucide-react";
import type { RowValues } from "@/lib/db/defaults";
import { ASSIGNEE, TASK_CATEGORIES, TASK_PRIORITY, TASK_STATUS } from "@/lib/labels";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { toast } from "@/lib/store/ui-store";
import { nowISO } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { ChipSelect } from "@/components/ui/Chip";
import { DateField, FieldRow, TextArea, TextField } from "@/components/ui/Field";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { useEntityForm } from "@/components/shared/useEntityForm";

type TaskValues = RowValues<"tasks">;

/** 시트(모바일)와 상세 패널(PC)이 함께 쓰는 입력 묶음 */
export function TaskFields({
  values,
  set,
  setStatus,
  isEdit,
  onSubmit,
}: {
  values: TaskValues;
  set: <K extends keyof TaskValues>(k: K, v: TaskValues[K]) => void;
  setStatus: (s: TaskValues["status"]) => void;
  isEdit: boolean;
  onSubmit?: () => void;
}) {
  return (
    <div className="space-y-5">
      <FieldRow label="제목" required>
        <TextField
          value={values.title}
          onChange={(v) => set("title", v)}
          placeholder="예: 청첩장 주문"
          autoFocus={!isEdit}
          delay={isEdit ? 400 : 0}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isEdit) onSubmit?.();
          }}
        />
      </FieldRow>
      <FieldRow label="상태">
        <Segmented options={TASK_STATUS} value={values.status} onChange={setStatus} size="lg" />
      </FieldRow>
      <FieldRow label="마감일">
        <DateField value={values.due_date} onChange={(v) => set("due_date", v)} />
      </FieldRow>
      <FieldRow label="중요도">
        <ChipSelect options={TASK_PRIORITY} value={values.priority} onChange={(v) => set("priority", v)} />
      </FieldRow>
      <FieldRow label="카테고리">
        <ChipSelect
          size="sm"
          options={TASK_CATEGORIES.map((c) => ({ value: c, label: c }))}
          value={values.category}
          onChange={(v) => set("category", values.category === v ? null : v)}
        />
      </FieldRow>
      <FieldRow label="담당">
        <Segmented options={ASSIGNEE} value={values.assignee} onChange={(v) => set("assignee", v)} />
      </FieldRow>
      <FieldRow label="메모">
        <TextArea value={values.memo ?? ""} onChange={(v) => set("memo", v || null)} placeholder="참고할 내용을 적어두세요" />
      </FieldRow>
    </div>
  );
}

export function TaskSheet({
  open,
  onClose,
  taskId,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  taskId?: string | null;
  initial?: Partial<RowValues<"tasks">>;
}) {
  const row = useWeddingStore((s) => (taskId ? s.data?.tasks.find((t) => t.id === taskId) ?? null : null));
  const remove = useWeddingStore((s) => s.remove);
  const { values, set, setMany, commit, isEdit } = useEntityForm("tasks", row, initial, open);

  const setStatus = (status: RowValues<"tasks">["status"]) =>
    setMany({ status, completed_at: status === "done" ? nowISO() : null });

  const submit = () => {
    if (!values.title.trim()) return toast("할 일 제목을 입력해 주세요.");
    commit({ title: values.title.trim() });
    toast("할 일이 추가되었어요.", { tone: "success" });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? "할 일 수정" : "할 일 추가"}
      headerRight={isEdit ? <FavoriteButton active={values.is_favorite} onChange={(v) => set("is_favorite", v)} /> : undefined}
      footer={
        isEdit ? (
          <div className="flex gap-2">
            <Button
              variant="danger"
              className="flex-none px-4"
              aria-label="삭제"
              onClick={() => {
                if (row) remove("tasks", row.id);
                onClose();
              }}
            >
              <Trash2 className="size-4" />
            </Button>
            {values.status !== "done" ? (
              <Button full onClick={() => setStatus("done")}>
                완료로 표시
              </Button>
            ) : (
              <Button full variant="secondary" onClick={() => setStatus("todo")}>
                다시 열기
              </Button>
            )}
          </div>
        ) : (
          <Button full size="lg" onClick={submit}>
            추가하기
          </Button>
        )
      }
    >
      <TaskFields values={values} set={set} setStatus={setStatus} isEdit={isEdit} onSubmit={submit} />
    </Sheet>
  );
}
