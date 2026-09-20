"use client";
import type { RowValues } from "@/lib/db/defaults";
import { GUEST_RELATIONS, INVITATION_METHOD, MEAL, RSVP } from "@/lib/labels";
import { GUEST_SIDES } from "@/lib/guest-side";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { toast } from "@/lib/store/ui-store";
import { Button } from "@/components/ui/Button";
import { ChipSelect } from "@/components/ui/Chip";
import { FieldRow, TextArea, TextField } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { Stepper } from "@/components/ui/Stepper";
import { Toggle } from "@/components/ui/Toggle";
import { useEntityForm } from "@/components/shared/useEntityForm";
import { DeleteButton } from "@/components/ui/DeleteButton";

type GuestValues = RowValues<"guests">;

/** 시트(모바일)와 상세 패널(PC)이 함께 쓰는 입력 묶음 */
export function GuestFields({
  values,
  set,
  isEdit,
  onSubmit,
}: {
  values: GuestValues;
  set: <K extends keyof GuestValues>(k: K, v: GuestValues[K]) => void;
  isEdit: boolean;
  onSubmit?: () => void;
}) {
  return (
      <div className="space-y-5">
        <FieldRow label="이름" required>
          <TextField
            value={values.name}
            onChange={(v) => set("name", v)}
            placeholder="이름"
            autoFocus={!isEdit}
            delay={isEdit ? 400 : 0}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isEdit) onSubmit?.();
            }}
          />
        </FieldRow>
        <FieldRow label="측" hint="신랑 · 신부가 둘 다 아는 사람은 '공통'으로 두면 총원에 한 번만 세요">
          <Segmented size="lg" options={GUEST_SIDES.map((o) => ({ value: o.value, label: o.label }))} value={values.side} onChange={(v) => set("side", v)} />
        </FieldRow>
        <FieldRow label="참석">
          <Segmented size="lg" options={RSVP} value={values.rsvp} onChange={(v) => set("rsvp", v)} />
        </FieldRow>
        {/* 부부를 한 줄에 적을 때("김철수 & 이영희") 동반 1명으로 두면 총원 2명이 된다.
            숫자가 어디에 반영되는지 바로 옆에서 보여줘야 헷갈리지 않는다. */}
        <FieldRow
          label="동반 인원"
          hint="부부·가족처럼 같이 오는 사람 수예요. 본인은 빼고 적어요."
          right={<span className="text-[0.8125rem] font-semibold tabular text-accent-text">총 {1 + values.companions}명</span>}
        >
          <Stepper value={values.companions} onChange={(v) => set("companions", v)} max={20} />
        </FieldRow>
        <FieldRow label="관계">
          <ChipSelect size="sm" options={GUEST_RELATIONS.map((r) => ({ value: r, label: r }))} value={values.relation} onChange={(v) => set("relation", values.relation === v ? null : v)} />
        </FieldRow>
        <FieldRow label="식사">
          <Segmented options={MEAL} value={values.meal} onChange={(v) => set("meal", v)} />
        </FieldRow>
        <div className="space-y-1 rounded-[14px] border border-line px-3 py-1">
          <Toggle checked={values.contacted} onChange={(v) => set("contacted", v)} label="연락 완료" />
          <Toggle checked={values.invitation_sent} onChange={(v) => set("invitation_sent", v)} label="청첩장 전달" />
        </div>
        {values.invitation_sent && (
          <FieldRow label="청첩장 방식">
            <ChipSelect options={INVITATION_METHOD} value={values.invitation_method} onChange={(v) => set("invitation_method", v)} />
          </FieldRow>
        )}
        <FieldRow label="메모">
          <TextArea value={values.memo ?? ""} onChange={(v) => set("memo", v || null)} placeholder="좌석, 축의금, 특이사항 등" />
        </FieldRow>
      </div>
  );
}

export function GuestSheet({
  open,
  onClose,
  guestId,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  guestId?: string | null;
  initial?: Partial<RowValues<"guests">>;
}) {
  const row = useWeddingStore((s) => (guestId ? s.data?.guests.find((t) => t.id === guestId) ?? null : null));
  const remove = useWeddingStore((s) => s.remove);
  const { values, set, commit, isEdit } = useEntityForm("guests", row, initial, open);

  const submit = (again = false) => {
    if (!values.name.trim()) return toast("이름을 입력해 주세요.");
    commit({ name: values.name.trim() });
    toast(`${values.name.trim()}님이 추가되었어요.`, { tone: "success" });
    if (!again) onClose();
    else set("name", "");
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? "하객 정보" : "하객 추가"}
      footer={
        isEdit ? (
          <div className="flex gap-2">
            <DeleteButton
              onDelete={() => {
                if (row) remove("guests", row.id);
                onClose();
              }}
            />
            <Button full variant="secondary" onClick={onClose}>
              닫기
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-none px-4" onClick={() => submit(true)}>
              계속 추가
            </Button>
            <Button full size="lg" onClick={() => submit(false)}>
              추가하기
            </Button>
          </div>
        )
      }
    >
      <GuestFields values={values} set={set} isEdit={isEdit} onSubmit={() => submit(true)} />
    </Sheet>
  );
}
