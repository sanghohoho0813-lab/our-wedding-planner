"use client";
import { CalendarDays, CheckSquare, Wallet } from "lucide-react";
import { todayISO } from "@/lib/date";
import { useSpeech } from "@/lib/speech";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { toast } from "@/lib/store/ui-store";
import { Button } from "@/components/ui/Button";
import { FieldRow, TextArea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { useEntityForm } from "@/components/shared/useEntityForm";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { MicButton } from "@/components/ui/MicButton";

const LABEL = { tasks: "할 일", events: "일정", budget_items: "비용" } as const;

export function MemoSheet({ open, onClose, memoId }: { open: boolean; onClose: () => void; memoId?: string | null }) {
  const row = useWeddingStore((s) => (memoId ? s.data?.memos.find((t) => t.id === memoId) ?? null : null));
  const remove = useWeddingStore((s) => s.remove);
  const add = useWeddingStore((s) => s.add);
  const patch = useWeddingStore((s) => s.patch);
  const { values, set, commit, isEdit } = useEntityForm("memos", row, undefined, open);
  // 메모는 '운전 중에 떠올랐다' 같은 상황이 많아서 말로 적는 게 제일 잘 맞는다.
  const speech = useSpeech({ onPhrase: (t) => set("content", values.content ? `${values.content} ${t}` : t) });

  const submit = () => {
    if (!values.content.trim()) return toast("내용을 입력해 주세요.");
    commit({ content: values.content.trim() });
    toast("메모가 저장되었어요.", { tone: "success" });
    onClose();
  };

  /**
   * 메모를 할 일 · 일정 · 비용으로 옮긴다.
   *
   * 메모함은 "일단 적어두는 곳" 이라, 나중에 제자리로 옮기는 게 원래 쓰임새다.
   * 옮길 때 다시 타이핑하게 하면 메모를 적은 의미가 없어서, 내용을 그대로 들고 간다.
   * 원본은 지우지 않고 '옮김' 으로 표시만 한다 — 잘못 옮겼을 때 되돌릴 수 있어야 한다.
   */
  const convert = (to: "tasks" | "events" | "budget_items") => {
    const text = values.content.trim();
    if (!text) return;
    // 메모는 길 수 있는데 제목은 짧아야 한다. 첫 줄만 제목으로 쓰고 나머지는 메모로 남긴다.
    const [first, ...rest] = text.split("\n");
    const title = first.trim().slice(0, 80) || text.slice(0, 80);
    const memo = [first.trim().length > 80 ? first.trim() : null, ...rest].filter(Boolean).join("\n") || null;

    if (to === "tasks") add("tasks", { title, memo });
    else if (to === "events") add("events", { title, date: todayISO(), memo, type: "other" });
    else add("budget_items", { name: title, memo });

    if (row) patch("memos", row.id, { converted_to: to }, { log: false });
    toast(`${LABEL[to]}(으)로 옮겼어요.`, {
      tone: "success",
      duration: 6000,
      action: row ? { label: "실행 취소", onClick: () => patch("memos", row.id, { converted_to: null }, { log: false }) } : undefined,
    });
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
            <DeleteButton
              onDelete={() => {
                if (row) remove("memos", row.id);
                onClose();
              }}
            />
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
      {/* 적어둔 메모를 제자리로 옮긴다. 다시 타이핑하지 않게 내용을 그대로 들고 간다. */}
      {isEdit && !row?.converted_to && values.content.trim() && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-[0.875rem] font-medium text-fg-2">이 메모를 옮기기</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {([
              ["tasks", "할 일", <CheckSquare key="t" className="size-4" />],
              ["events", "일정", <CalendarDays key="e" className="size-4" />],
              ["budget_items", "비용", <Wallet key="b" className="size-4" />],
            ] as const).map(([to, label, icon]) => (
              <button
                key={to}
                type="button"
                onClick={() => convert(to)}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[12px] border border-line bg-surface text-[0.9375rem] font-medium text-fg transition-colors hover:border-line-strong hover:bg-surface-2 active:scale-[0.98]"
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {row?.converted_to && (
        <p className="mt-4 rounded-[12px] bg-surface-2 px-4 py-3 text-[0.875rem] text-fg-2">
          이 메모는 <b className="text-fg">{LABEL[row.converted_to as keyof typeof LABEL] ?? row.converted_to}</b>(으)로 옮겼어요.
        </p>
      )}
      {speech.supported && (
        <div className="mt-3 flex items-center gap-3">
          <MicButton listening={speech.listening} onClick={speech.toggle} label="말로 메모" />
          <p className="min-w-0 flex-1 text-[0.875rem] text-fg-3">
            {speech.error ? (
              <span className="text-danger">{speech.error}</span>
            ) : speech.listening ? (
              speech.interim || "듣고 있어요…"
            ) : (
              "마이크를 누르고 말하면 여기에 받아 적어요."
            )}
          </p>
        </div>
      )}
    </Sheet>
  );
}
