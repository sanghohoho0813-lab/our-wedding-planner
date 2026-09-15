"use client";
import { Trash2 } from "lucide-react";
import type { RowValues } from "@/lib/db/defaults";
import { EVENT_TYPE } from "@/lib/labels";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { toast } from "@/lib/store/ui-store";
import { Button } from "@/components/ui/Button";
import { ChipSelect } from "@/components/ui/Chip";
import { DateField, FieldRow, TextArea, TextField, TimeField } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { Toggle } from "@/components/ui/Toggle";
import { useEntityForm } from "@/components/shared/useEntityForm";

export function EventSheet({
  open,
  onClose,
  eventId,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  eventId?: string | null;
  initial?: Partial<RowValues<"events">>;
}) {
  const row = useWeddingStore((s) => (eventId ? s.data?.events.find((t) => t.id === eventId) ?? null : null));
  const remove = useWeddingStore((s) => s.remove);
  const { values, set, commit, isEdit } = useEntityForm("events", row, initial, open);

  const submit = () => {
    if (!values.title.trim()) return toast("일정 제목을 입력해 주세요.");
    if (!values.date) return toast("날짜를 선택해 주세요.");
    commit({ title: values.title.trim() });
    toast("일정이 등록되었어요.", { tone: "success" });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? "일정 수정" : "일정 추가"}
      footer={
        isEdit ? (
          <div className="flex gap-2">
            <Button
              variant="danger"
              className="flex-none px-4"
              aria-label="삭제"
              onClick={() => {
                if (row) remove("events", row.id);
                onClose();
              }}
            >
              <Trash2 className="size-4" />
            </Button>
            <Button full variant="secondary" onClick={onClose}>
              닫기
            </Button>
          </div>
        ) : (
          <Button full size="lg" onClick={submit}>
            추가하기
          </Button>
        )
      }
    >
      <div className="space-y-5">
        <FieldRow label="제목" required>
          <TextField value={values.title} onChange={(v) => set("title", v)} placeholder="예: 드레스 피팅" autoFocus={!isEdit} delay={isEdit ? 400 : 0} />
        </FieldRow>
        <FieldRow label="종류">
          <ChipSelect size="sm" options={EVENT_TYPE.filter((t) => t.value !== "wedding")} value={values.type} onChange={(v) => set("type", v)} />
        </FieldRow>
        <FieldRow label="날짜" required>
          <DateField value={values.date || null} onChange={(v) => set("date", v ?? "")} clearable={false} />
        </FieldRow>
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="시작">
            <TimeField value={values.start_time} onChange={(v) => set("start_time", v)} />
          </FieldRow>
          <FieldRow label="종료">
            <TimeField value={values.end_time} onChange={(v) => set("end_time", v)} />
          </FieldRow>
        </div>
        <FieldRow label="장소">
          <TextField value={values.location ?? ""} onChange={(v) => set("location", v || null)} placeholder="장소" />
        </FieldRow>
        {isEdit && <Toggle checked={values.is_done} onChange={(v) => set("is_done", v)} label="완료한 일정" />}
        <FieldRow label="메모">
          <TextArea value={values.memo ?? ""} onChange={(v) => set("memo", v || null)} placeholder="준비물, 주의사항 등" />
        </FieldRow>
      </div>
    </Sheet>
  );
}
