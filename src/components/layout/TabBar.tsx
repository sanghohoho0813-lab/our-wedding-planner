"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";
import { cn } from "@/lib/utils";

export interface TabDef<T extends string> {
  value: T;
  label: string;
  badge?: string | number;
}

/** 화면 안 탭. 라우팅을 타지 않으므로 전환이 즉시 일어난다. */
export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: readonly TabDef<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  const id = useId();
  const reduce = useReducedMotion();
  return (
    <div className={cn("-mx-1 overflow-x-auto scrollbar-none px-1", className)}>
      <div role="tablist" className="inline-flex min-w-full gap-1 rounded-[14px] border border-line/70 bg-surface-2 p-1">
        {tabs.map((t) => {
          const active = t.value === value;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.value)}
              className={cn(
                "relative flex-1 whitespace-nowrap rounded-[10px] px-3.5 py-2.5 text-[0.9375rem] font-medium transition-colors duration-150",
                active ? "text-fg" : "text-fg-2 hover:text-fg",
              )}
            >
              {active && (
                <motion.span
                  layoutId={`tabbar-${id}`}
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 600, damping: 44 }}
                  className="absolute inset-0 rounded-[10px] border border-line/60 bg-surface shadow-sm"
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-1.5">
                {t.label}
                {t.badge !== undefined && t.badge !== 0 && (
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[0.75rem] tabular", active ? "bg-accent-soft text-accent-text" : "bg-surface-3 text-fg-2")}>{t.badge}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
