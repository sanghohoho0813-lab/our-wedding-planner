"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedProps<T extends string> {
  options: { value: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  full?: boolean;
  ariaLabel?: string;
}

export function Segmented<T extends string>({ options, value, onChange, className, size = "md", full = true, ariaLabel }: SegmentedProps<T>) {
  const id = useId();
  const reduce = useReducedMotion();
  const h = size === "lg" ? "h-12" : size === "md" ? "h-11" : "h-9";
  const text = size === "lg" ? "text-[1rem]" : size === "md" ? "text-[0.9375rem]" : "text-[0.875rem]";
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("relative inline-flex rounded-[12px] bg-surface-2 p-1 border border-line/70", full && "w-full", h, className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex-1 min-w-0 rounded-[9px] px-2 font-medium transition-colors duration-150 inline-flex items-center justify-center gap-1.5 whitespace-nowrap",
              text,
              active ? "text-fg" : "text-fg-2 hover:text-fg",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
                className="absolute inset-0 rounded-[9px] bg-surface shadow-sm border border-line/60"
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5 truncate">
              {o.icon}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
