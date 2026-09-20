"use client";
import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString("ko-KR"),
  className,
  duration = 0.8,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const lastStart = useRef(0);
  useEffect(() => {
    // 숫자가 연달아 바뀔 때(상대가 하객 300명을 한 번에 넣는 등)는 애니메이션을 건너뛴다.
    // 매 프레임 setState 하는 애니메이션이 겹겹이 쌓이면 React 가 "Maximum update depth"
    // 로 멈춰 버려서, 상대 화면이 얼어붙는다. 숫자를 굴리는 멋보다 안 멈추는 게 먼저다.
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const rapid = now - lastStart.current < 200;
    lastStart.current = now;
    if (reduce || rapid) {
      setDisplay(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
      onComplete: () => setDisplay(value),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, reduce, duration]);
  return (
    <span className={className} aria-label={format(value)}>
      {format(display)}
    </span>
  );
}
