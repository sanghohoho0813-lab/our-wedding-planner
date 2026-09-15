"use client";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function FavoriteButton({ active, onChange, className }: { active: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!active);
      }}
      className={cn("inline-flex size-10 items-center justify-center rounded-full transition-colors hover:bg-surface-2", className)}
    >
      <Star className={cn("size-[1.125rem] transition-colors", active ? "fill-warning text-warning" : "text-fg-3")} />
    </button>
  );
}
