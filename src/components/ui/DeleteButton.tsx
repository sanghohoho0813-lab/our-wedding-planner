"use client";
import { Trash2 } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

/**
 * 삭제 버튼.
 *
 * 원래는 글자 없는 휴지통 아이콘이었는데, 그러면 "삭제가 없다" 고 느낀다.
 * 아이콘만으로는 아무도 못 찾는다 — 글자를 같이 쓴다.
 * 지우면 6초 동안 '실행 취소' 토스트가 뜨므로(wedding-store 의 remove) 따로 묻지 않는다.
 */
export function DeleteButton({ onDelete, label = "삭제", className }: { onDelete: () => void; label?: string; className?: string }) {
  return (
    <Button variant="danger" className={cn("flex-none px-4", className)} onClick={onDelete}>
      <Trash2 className="size-4" /> {label}
    </Button>
  );
}
