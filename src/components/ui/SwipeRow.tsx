"use client";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";
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
/** 손가락이 움직인 만큼의 몇 배로 따라오나 (끝에 고무줄처럼 걸린 느낌) */
const ELASTIC = 0.55;
/** 이만큼 움직이고 나서야 '옆으로 밀기' 인지 '위아래 스크롤' 인지 정한다 */
const LOCK = 8;

interface Gesture {
  id: number;
  x0: number;
  y0: number;
  axis: "x" | "y" | null;
  dx: number;
}

/**
 * 폰에서 목록 한 줄을 좌우로 밀어 바로 처리한다.
 * 오른쪽으로 밀면 right, 왼쪽으로 밀면 left 동작.
 * 마우스로도 끌 수 있고, 움직임 최소화를 켠 사람에게는 끄기(버튼은 그대로 있다).
 *
 * framer-motion 의 drag 를 쓰지 않고 포인터 이벤트로 직접 처리한다.
 * drag 를 쓰면 줄마다 '위치를 늘 재는' 노드가 생겨서, 화면 어디서든 애니메이션이 한 번
 * 일어날 때마다 모든 줄의 위치를 다시 쟀다 (하객 300명이면 필터 한 번에 300번).
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
  // 밀 때만 뒤의 안내(참석 · 청첩장)를 그린다. 300줄이면 안 쓰는 안내가 600개였다.
  const [hint, setHint] = useState(false);
  const gesture = useRef<Gesture | null>(null);
  // 밀고 손을 떼면 그 자리의 버튼이 눌리는 일이 있다. 방금 민 직후의 클릭은 막는다.
  const justDragged = useRef(false);
  const leftOpacity = useTransform(x, [-THRESHOLD * ELASTIC, -12, 0], [1, 0.4, 0]);
  const rightOpacity = useTransform(x, [0, 12, THRESHOLD * ELASTIC], [0, 0.4, 1]);

  if (reduce || (!left && !right)) return <div className={className}>{children}</div>;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (gesture.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    gesture.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, axis: null, dx: 0 };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x0;
    const dy = e.clientY - g.y0;
    if (!g.axis) {
      if (Math.abs(dx) < LOCK && Math.abs(dy) < LOCK) return;
      g.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      // 위아래면 스크롤이다 — 브라우저에 맡긴다
      if (g.axis === "y") return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDir(dx >= 0 ? "right" : "left");
      setHint(true);
    }
    if (g.axis !== "x") return;
    g.dx = dx;
    x.set(dx * ELASTIC);
  };

  const finish = (e: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    if (g.axis !== "x") return;
    setDir(null);
    // 제자리로 돌아온 뒤에 안내를 치운다 (돌아오는 동안은 서서히 사라지는 게 보여야 한다)
    animate(x, 0, { type: "spring", stiffness: 600, damping: 40 }).then(() => {
      if (!gesture.current) setHint(false);
    });
    if (Math.abs(g.dx) > LOCK) {
      justDragged.current = true;
      setTimeout(() => {
        justDragged.current = false;
      }, 250);
    }
    if (cancelled) return;
    if (g.dx > THRESHOLD && right) right.onAction();
    else if (g.dx < -THRESHOLD && left) left.onAction();
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {hint && right && (
        <motion.div
          aria-hidden
          style={{ opacity: rightOpacity }}
          className={cn("pointer-events-none absolute inset-y-0 left-0 flex items-center gap-2 px-5 text-[0.875rem] font-medium", TONE[right.tone])}
        >
          <span className="[&>svg]:size-4">{right.icon}</span>
          {right.label}
        </motion.div>
      )}
      {hint && left && (
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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => finish(e, false)}
        onPointerCancel={(e) => finish(e, true)}
        onClickCapture={(e) => {
          if (!justDragged.current) return;
          e.preventDefault();
          e.stopPropagation();
        }}
        // 위아래 스크롤 · 확대는 브라우저가, 옆으로 미는 것만 여기서 받는다
        style={{ x, touchAction: "pan-y pinch-zoom" }}
        className={cn("relative bg-surface", dir && "select-none shadow-[var(--shadow-sm)]")}
      >
        {children}
      </motion.div>
    </div>
  );
}
