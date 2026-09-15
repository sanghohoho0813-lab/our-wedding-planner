"use client";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  className?: string;
  size?: "sm" | "md";
}

export function Stepper({ value, onChange, min = 0, max = 999, step = 1, suffix = "명", className, size = "md" }: StepperProps) {
  const btn = size === "md" ? "size-11" : "size-9";
  return (
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
      <span className="min-w-14 text-center font-semibold tabular text-[0.9375rem]">
        {value}
        {suffix}
      </span>
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
  );
}
