"use client";
import { Calculator } from "lucide-react";
import { useState } from "react";
import { formatKRW } from "@/lib/money";
import { cn } from "@/lib/utils";
import { MoneySheet } from "./MoneySheet";

export function MoneyField({
  value,
  onChange,
  placeholder = "금액 입력",
  className,
  title,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  className?: string;
  title?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        // 한 화면에 금액 칸이 여럿이다(대관료 · 식대 · 계약금 · 잔금).
        // 이름표가 없으면 화면을 못 보는 사람에게는 전부 똑같이 "금액 입력" 으로 들린다.
        aria-label={title ? `${title} ${value ? formatKRW(value) : placeholder}` : undefined}
        className={cn(
          "flex w-full items-center justify-between rounded-[12px] border border-line bg-surface px-3.5 text-left transition-colors hover:border-line-strong focus-visible:border-accent",
          size === "lg" ? "h-13 min-h-[3.25rem]" : size === "md" ? "h-11" : "h-9",
          className,
        )}
      >
        <span className={cn("tabular font-semibold", size === "lg" ? "text-[1.375rem]" : "text-[1rem]", !value && "font-normal text-fg-3")}>
          {value ? formatKRW(value) : placeholder}
        </span>
        <Calculator className="size-4 text-fg-3" />
      </button>
      <MoneySheet open={open} onClose={() => setOpen(false)} value={value} onApply={onChange} title={title} />
    </>
  );
}
