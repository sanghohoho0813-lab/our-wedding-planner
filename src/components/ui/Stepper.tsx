"use client";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CountSheet } from "./CountSheet";

export interface StepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  className?: string;
  size?: "sm" | "md";
  /** 키패드 제목 (예: "보증 인원") */
  label?: string;
}

/**
 * 숫자 고르기.
 *
 * 가운데 숫자를 누르면 **키패드**가 열린다.
 * 보증 인원처럼 200 같은 수를 [+] 로 200번 눌러 넣을 수는 없다.
 */
export function Stepper({ value, onChange, min = 0, max = 999, step = 1, suffix = "명", className, size = "md", label }: StepperProps) {
  const [pad, setPad] = useState(false);
  const btn = size === "md" ? "size-11" : "size-9";
  return (
    <>
      <div className={cn("inline-flex items-center rounded-[12px] border border-line bg-surface", className)}>
        <button
          type="button"
          aria-label="줄이기"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - step))}
          className={cn(btn, "inline-flex items-center justify-center rounded-l-[12px] text-fg-2 hover:bg-surface-2 hover:text-fg disabled:opacity-30 active:scale-95")}
        >
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setPad(true)}
          aria-label={`${label ?? "숫자"} 직접 입력 (지금 ${value}${suffix})`}
          // 점선 밑줄 — 눌러서 고칠 수 있는 값이라는 표시
          className={cn(
            "min-w-14 px-1 text-center font-semibold tabular text-[1rem] underline decoration-dotted decoration-line-strong underline-offset-4 hover:text-accent-text hover:decoration-accent",
            size === "md" ? "h-11" : "h-9",
          )}
        >
          {value.toLocaleString("ko-KR")}
          {suffix}
        </button>
        <button
          type="button"
          aria-label="늘리기"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + step))}
          className={cn(btn, "inline-flex items-center justify-center rounded-r-[12px] text-fg-2 hover:bg-surface-2 hover:text-fg disabled:opacity-30 active:scale-95")}
        >
          <Plus className="size-4" />
        </button>
      </div>
      <CountSheet
        open={pad}
        onClose={() => setPad(false)}
        value={value}
        onApply={onChange}
        title={label ?? "숫자 입력"}
        suffix={suffix}
        min={min}
        max={max}
      />
    </>
  );
}
