"use client";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { cn } from "@/lib/utils";

export function SaveIndicator({ className }: { className?: string }) {
  const pending = useWeddingStore((s) => s.pending);
  const lastSavedAt = useWeddingStore((s) => s.lastSavedAt);
  const [showSaved, setShowSaved] = useState(false);
  useEffect(() => {
    if (!lastSavedAt || pending > 0) return;
    setShowSaved(true);
    const t = setTimeout(() => setShowSaved(false), 2500);
    return () => clearTimeout(t);
  }, [lastSavedAt, pending]);
  if (pending > 0)
    return (
      <span className={cn("inline-flex items-center gap-1 text-[0.8125rem] text-fg-3", className)} aria-live="polite">
        <Loader2 className="size-3.5 animate-spin" /> 저장 중…
      </span>
    );
  if (showSaved)
    return (
      <span className={cn("inline-flex items-center gap-1 text-[0.8125rem] text-success", className)} aria-live="polite">
        <Check className="size-3.5" /> 저장됨
      </span>
    );
  return null;
}
