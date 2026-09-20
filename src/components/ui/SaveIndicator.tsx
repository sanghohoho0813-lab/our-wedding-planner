"use client";
import { Check, CloudOff, Loader2, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { cn } from "@/lib/utils";

/** 연결이 잠깐 끊겼다 붙는 건 흔한 일이라, 이만큼 지나야 '끊김' 이라고 말한다 */
const OFFLINE_AFTER_MS = 4000;

export function SaveIndicator({ className }: { className?: string }) {
  const pending = useWeddingStore((s) => s.pending);
  const queued = useWeddingStore((s) => s.queued);
  const flush = useWeddingStore((s) => s.flush);
  const realtime = useWeddingStore((s) => s.realtime);
  const lastSavedAt = useWeddingStore((s) => s.lastSavedAt);
  const [showSaved, setShowSaved] = useState(false);
  const [disconnected, setDisconnected] = useState(false);

  useEffect(() => {
    if (!lastSavedAt || pending > 0) return;
    setShowSaved(true);
    const t = setTimeout(() => setShowSaved(false), 2500);
    return () => clearTimeout(t);
  }, [lastSavedAt, pending]);

  // 실시간 연결이 끊긴 채로 잠시 지나면 알려준다.
  // 아무 표시가 없으면 '상대가 아무것도 안 했나 보다' 라고 오해하게 된다.
  useEffect(() => {
    if (realtime === "live" || realtime === "off") {
      setDisconnected(false);
      return;
    }
    const t = setTimeout(() => setDisconnected(true), OFFLINE_AFTER_MS);
    return () => clearTimeout(t);
  }, [realtime]);

  // 못 보낸 것이 있으면 그게 제일 중요한 소식이다. 조용히 사라지면 안 된다.
  if (queued > 0)
    return (
      <button
        type="button"
        onClick={() => void flush()}
        aria-live="polite"
        className={cn(
          "relative tap-44 inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-[0.8125rem] font-medium text-warning",
          className,
        )}
      >
        <CloudOff className="size-3.5" /> 저장 대기 {queued}건
        <span className="hidden sm:inline font-normal">· 연결되면 자동 저장</span>
      </button>
    );
  if (disconnected)
    return (
      <span
        aria-live="polite"
        title="연결이 끊겨 상대의 수정이 실시간으로 오지 않아요. 적은 내용은 연결되면 자동으로 저장돼요."
        className={cn(
          "relative inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-[0.8125rem] font-medium text-warning",
          className,
        )}
      >
        <WifiOff className="size-3.5" /> 연결 끊김
        <span className="hidden sm:inline font-normal">· 다시 연결 중</span>
      </span>
    );
  if (pending > 0)
    return (
      <span className={cn("hidden sm:inline-flex items-center gap-1 text-[0.8125rem] text-fg-3", className)} aria-live="polite">
        <Loader2 className="size-3.5 animate-spin" /> 저장 중…
      </span>
    );
  if (showSaved)
    return (
      <span className={cn("hidden sm:inline-flex items-center gap-1 text-[0.8125rem] text-success", className)} aria-live="polite">
        <Check className="size-3.5" /> 저장됨
      </span>
    );
  return null;
}
