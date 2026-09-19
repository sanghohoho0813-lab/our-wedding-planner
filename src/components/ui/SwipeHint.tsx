"use client";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useMediaQuery } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * 스와이프는 눈에 보이지 않는 동작이라, 모르면 평생 못 쓴다.
 * 처음 몇 번만 살짝 알려주고 스스로 사라진다(한 번 밀어 보면 바로 끈다).
 */
export function SwipeHint({
  storageKey,
  left,
  right,
  className,
}: {
  storageKey: string;
  left: string;
  right: string;
  className?: string;
}) {
  const touch = useMediaQuery("(pointer: coarse)");
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      setShow(localStorage.getItem(storageKey) !== "done");
    } catch {
      setShow(false);
    }
  }, [storageKey]);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(storageKey, "done");
    } catch {
      /* 무시 */
    }
  };

  if (!show || !touch) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-[12px] border border-dashed border-line-strong bg-surface-2/60 px-3 py-2 text-[0.8125rem] text-fg-2",
        className,
      )}
    >
      <ChevronLeft className="size-3.5 shrink-0 text-fg-3" />
      <span className="min-w-0 flex-1 truncate">
        밀어서 <b className="font-medium text-fg">{left}</b> · <b className="font-medium text-fg">{right}</b> 밀어서
      </span>
      <ChevronRight className="size-3.5 shrink-0 text-fg-3" />
      <button
        type="button"
        onClick={dismiss}
        aria-label="안내 닫기"
        className="-mr-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-fg-3 hover:bg-surface-3 hover:text-fg"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
