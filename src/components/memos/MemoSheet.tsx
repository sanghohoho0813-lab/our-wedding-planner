"use client";
import { Trash2 } from "lucide-react";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { toast } from "@/lib/store/ui-store";
import { Button } from "@/components/ui/Button";
import { FieldRow, TextArea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { useEntityForm } from "@/components/shared/useEntityForm";

export function MemoSheet({ open, onClose, memoId }: { open: boolean; onClose: () => void; memoId?: string | null }) {
  const row = useWeddingStore((s) => (memoId ? s.data?.memos.find((t) => t.id === memoId) ?? null : null));
  const remove = useWeddingStore((s) => s.remove);
  const { values, set, commit, isEdit } = useEntityForm("memos", row, undefined, open);

  const submit = () => {
    if (!values.content.trim()) return toast("내용을 입력해 주세요.");
    commit({ content: values.content.trim() });
    toast("메모가 저장되었어요.", { tone: "success" });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? "메모" : "빠른 메모"}
      description="갑자기 떠오른 생각을 적어두고, 나중에 할 일·일정·예산으로 바꿀 수 있어요."
      footer={
        isEdit ? (
          <div className="flex gap-2">
            <Button
              variant="danger"
              className="flex-none px-4"
              aria-label="삭제"
              onClick={() => {
                if (row) remove("memos", row.id);
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
            저장하기
          </Button>
        )
      }
    >
      <FieldRow label="내용">
        <TextArea value={values.content} onChange={(v) => set("content", v)} placeholder="예: 스냅 작가님께 야외 촬영 가능한지 물어보기" autoFocus rows={5} delay={isEdit ? 500 : 0} />
      </FieldRow>
    </Sheet>
  );
}
