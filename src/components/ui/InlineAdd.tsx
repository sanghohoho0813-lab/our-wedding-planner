"use client";
import { Plus } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { useSpeech } from "@/lib/speech";
import { cn } from "@/lib/utils";
import { MicButton } from "./MicButton";
import { inputCls } from "./Field";

/**
 * 한 줄 추가.
 * 시트를 열지 않고 제목만 쳐서 엔터를 누르면 바로 들어간다.
 * 자세한 내용은 나중에 항목을 눌러 채우면 된다. (매일 쓰는 동작은 가장 짧아야 한다)
 */
export function InlineAdd({
  placeholder,
  onAdd,
  className,
  label = "추가",
  trailing,
  voice,
}: {
  placeholder: string;
  onAdd: (text: string) => void;
  className?: string;
  label?: string;
  /** 같은 줄 끝에 붙일 것 (예: 자세히 입력하는 시트 열기) */
  trailing?: ReactNode;
  /** 말로 입력하는 마이크 버튼을 붙인다 */
  voice?: boolean;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  // 말한 내용은 입력칸에 채워만 준다. 바로 저장하지 않는다 —
  // 사람 이름·가게 이름은 곧잘 틀리게 알아들어서, 눈으로 보고 고칠 틈이 있어야 한다.
  const speech = useSpeech({ onPhrase: (t) => setText((prev) => (prev ? `${prev} ${t}` : t)) });

  const submit = () => {
    const v = text.trim();
    if (!v) return;
    onAdd(v);
    setText("");
    ref.current?.focus();
  };

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Plus className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-3" />
          <input
            ref={ref}
            value={speech.interim ? (text ? `${text} ${speech.interim}` : speech.interim) : text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
              if (e.key === "Escape") setText("");
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            enterKeyHint="done"
            className={cn(inputCls, "h-11 rounded-full pl-10")}
          />
        </div>
        {/* 항상 자리를 지킨다. 글자를 치는 순간 입력칸이 줄어들면 커서가 튄다. */}
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim()}
          className={cn(
            "h-11 shrink-0 rounded-full px-4 text-[0.9375rem] font-medium transition-colors",
            text.trim() ? "bg-accent text-accent-fg hover:bg-accent-strong" : "bg-surface-2 text-fg-3",
          )}
        >
          {label}
        </button>
        {voice && speech.supported && (
          <MicButton listening={speech.listening} onClick={speech.toggle} />
        )}
        {trailing}
      </div>
      {speech.error && <p className="px-3 text-[0.8125rem] text-danger">{speech.error}</p>}
      {speech.listening && !speech.error && (
        <p className="px-3 text-[0.8125rem] text-fg-3">
          듣고 있어요. 말한 내용을 확인하고 추가를 누르세요.
          {speech.oneShot && " (아이폰은 한 마디마다 다시 눌러주세요)"}
        </p>
      )}
    </div>
  );
}
