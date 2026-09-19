"use client";
import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

/** 말하기 버튼. 듣는 중에는 빨갛게 맥박이 뛴다(녹음 중이라는 걸 숨기지 않는다). */
export function MicButton({
  listening,
  onClick,
  className,
  label = "말로 입력",
}: {
  listening: boolean;
  onClick: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={listening ? "말하기 멈추기" : label}
      aria-pressed={listening}
      className={cn(
        "relative inline-flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors",
        listening ? "border-danger bg-danger text-white" : "border-line text-fg-2 hover:border-line-strong hover:text-fg",
        className,
      )}
    >
      {/* 맥박은 버튼 뒤에서 퍼진다. 위에 깔리면 아이콘이 흐려 보인다. */}
      {listening && (
        <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 animate-ping rounded-full bg-danger/40" />
      )}
      {listening ? <Square className="size-4 fill-current" /> : <Mic className="size-[1.125rem]" />}
    </button>
  );
}
