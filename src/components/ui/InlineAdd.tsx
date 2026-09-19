"use client";
import { Plus } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
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
}: {
  placeholder: string;
  onAdd: (text: string) => void;
  className?: string;
  label?: string;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  const submit = () => {
    const v = text.trim();
    if (!v) return;
    onAdd(v);
    setText("");
    ref.current?.focus();
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative min-w-0 flex-1">
        <Plus className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-3" />
        <input
          ref={ref}
          value={text}
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
      {text.trim() && (
        <button
          type="button"
          onClick={submit}
          className="h-11 shrink-0 rounded-full bg-accent px-4 text-[0.9375rem] font-medium text-accent-fg transition-colors hover:bg-accent-strong"
        >
          {label}
        </button>
      )}
    </div>
  );
}
