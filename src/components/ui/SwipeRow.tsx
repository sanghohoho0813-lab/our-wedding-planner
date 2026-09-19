"use client";
import { motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from "framer-motion";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SwipeAction {
  icon: ReactNode;
  label: string;
  tone: "success" | "accent" | "danger";
  onAction: () => void;
}

const TONE: Record<SwipeAction["tone"], string> = {
  success: "bg-success-soft text-success",
  accent: "bg-accent-soft text-accent-text",
  danger: "bg-danger-soft text-danger",
};

const THRESHOLD = 72;

/**
 * 폰에서 목록 한 줄을 좌우로 밀어 바로 처리한다.
 * 오른쪽으로 밀면 right, 왼쪽으로 밀면 left 동작.
 * 마우스로도 끌 수 있고, 움직임 최소화를 켠 사람에게는 끄기(버튼은 그대로 있다).
 */
export function SwipeRow({
  left,
  right,
  children,
  className,
}: {
  left?: SwipeAction;
  right?: SwipeAction;
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const [dir, setDir] = useState<"left" | "right" | null>(null);
  const leftOpacity = useTransform(x, [-THRESHOLD, -12, 0], [1, 0.4, 0]);
  const rightOpacity = useTransform(x, [0, 12, THRESHOLD], [0, 0.4, 1]);

  if (reduce || (!left && !right)) return <div className={className}>{children}</div>;

  const end = (_: unknown, info: PanInfo) => {
    setDir(null);
    if (info.offset.x > THRESHOLD && right) right.onAction();
    else if (info.offset.x < -THRESHOLD && left) left.onAction();
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {right && (
        <motion.div
          aria-hidden
          style={{ opacity: rightOpacity }}
          className={cn("pointer-events-none absolute inset-y-0 left-0 flex items-center gap-2 px-5 text-[0.875rem] font-medium", TONE[right.tone])}
        >
          <span className="[&>svg]:size-4">{right.icon}</span>
          {right.label}
        </motion.div>
      )}
      {left && (
        <motion.div
          aria-hidden
          style={{ opacity: leftOpacity }}
          className={cn("pointer-events-none absolute inset-y-0 right-0 flex items-center gap-2 px-5 text-[0.875rem] font-medium", TONE[left.tone])}
        >
          <span className="[&>svg]:size-4">{left.icon}</span>
          {left.label}
        </motion.div>
      )}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.55}
        dragMomentum={false}
        onDragStart={(_, info) => setDir(info.offset.x >= 0 ? "right" : "left")}
        onDragEnd={end}
        style={{ x }}
        className={cn("relative bg-surface", dir && "shadow-[var(--shadow-sm)]")}
      >
        {children}
      </motion.div>
    </div>
  );
}
