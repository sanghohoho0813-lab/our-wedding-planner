"use client";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DonutSegment {
  value: number;
  color: string;
  label?: string;
}

export function Donut({
  segments,
  size = 160,
  thickness = 16,
  className,
  children,
  trackColor = "var(--surface-3)",
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  className?: string;
  children?: ReactNode;
  trackColor?: string;
}) {
  const reduce = useReducedMotion();
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  const r = (size - thickness) / 2;
  const c = size / 2;
  let offset = 0;
  return (
    <div className={cn("relative inline-flex items-center justify-center shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={c} cy={c} r={r} fill="none" stroke={trackColor} strokeWidth={thickness} />
        {total > 0 &&
          segments.map((s, i) => {
            const frac = Math.max(0, s.value) / total;
            const start = offset;
            offset += frac;
            if (frac <= 0) return null;
            return (
              <motion.circle
                key={i}
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeLinecap="butt"
                pathLength={1}
                initial={reduce ? { pathLength: frac, pathOffset: -start } : { pathLength: 0, pathOffset: -start }}
                animate={{ pathLength: Math.max(0.0001, frac - 0.004), pathOffset: -start }}
                transition={reduce ? { duration: 0 } : { duration: 0.9, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
                style={{ strokeDasharray: "1 1" }}
              />
            );
          })}
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>}
    </div>
  );
}
