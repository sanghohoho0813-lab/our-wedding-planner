"use client";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function CheckCircle({
  checked,
  onChange,
  label = "완료",
  size = "md",
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const reduce = useReducedMotion();
  const dim = size === "md" ? "size-6" : "size-5";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-full -m-2.5", className)}
    >
      <motion.span
        animate={checked ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={reduce ? { duration: 0 } : { duration: 0.3 }}
        className={cn(
          "inline-flex items-center justify-center rounded-full border-2 transition-colors duration-200",
          dim,
          checked ? "border-accent bg-accent" : "border-line-strong bg-surface hover:border-accent",
        )}
      >
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="var(--accent-fg)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <motion.path
            d="M5 12.5l4.5 4.5L19 7.5"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.25, ease: "easeOut" }}
          />
        </svg>
      </motion.span>
    </button>
  );
}
