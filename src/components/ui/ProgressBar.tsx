"use client";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  color,
  height = "h-2",
  track = "bg-surface-3",
  label,
}: {
  value: number;
  className?: string;
  color?: string;
  height?: string;
  track?: string;
  label?: string;
}) {
  const reduce = useReducedMotion();
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("w-full overflow-hidden rounded-full", track, height, className)}
    >
      <motion.div
        initial={{ width: reduce ? `${pct}%` : 0 }}
        animate={{ width: `${pct}%` }}
        transition={reduce ? { duration: 0 } : { duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className={cn("h-full rounded-full", !color && "bg-accent")}
        style={color ? { background: color } : undefined}
      />
    </div>
  );
}
