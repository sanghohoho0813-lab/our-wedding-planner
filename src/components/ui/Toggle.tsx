"use client";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, description, className, disabled }: ToggleProps) {
  const reduce = useReducedMotion();
  const sw = (
    <span
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-200",
        checked ? "bg-accent border-accent" : "bg-surface-3 border-line-strong",
      )}
    >
      <motion.span
        layout
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 600, damping: 35 }}
        className={cn("absolute size-5 rounded-full bg-white shadow-sm", checked ? "left-[calc(100%-1.4rem)]" : "left-0.5")}
      />
    </span>
  );
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-[12px] min-h-11 text-left disabled:opacity-50",
        label && "px-1 py-1.5",
        className,
      )}
    >
      {label && (
        <span className="min-w-0">
          <span className="block text-[0.9375rem] font-medium text-fg">{label}</span>
          {description && <span className="block text-[0.8125rem] text-fg-3">{description}</span>}
        </span>
      )}
      {sw}
    </button>
  );
}
