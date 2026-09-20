"use client";
import { SlidersHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 목록 위 조작 줄.
 *
 * 자주 쓰는 칩 한 줄만 항상 보이고, 검색 · 정렬 · 카테고리처럼 가끔 쓰는 것은 접어둔다.
 * 전부 펼쳐 두면 폰에서 목록이 화면 밖으로 밀려서, 정작 봐야 할 내용이 안 보인다.
 * 접혀 있어도 뭔가 걸려 있으면 버튼에 숫자가 떠서 "왜 안 보이지" 가 생기지 않는다.
 */
export function FilterBar({
  chips,
  activeCount = 0,
  label = "검색 · 정렬",
  children,
  scrollable = true,
}: {
  chips: ReactNode;
  /** 접힌 안쪽에 지금 걸려 있는 조건 수 (0이면 배지 없음) */
  activeCount?: number;
  label?: string;
  children?: ReactNode;
  /** 칩 줄이 옆으로 스크롤되는가. 줄바꿈으로 다 보이는 경우에는 끝 흐림을 넣지 않는다. */
  scrollable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          {chips}
          {/* 칩이 버튼 밑에서 잘리면 '깨진 것' 처럼 보인다. 끝을 흐리게 해서 '옆으로 더 있다' 로 읽히게 한다.
              (칩 줄 자체에 오른쪽 여백을 줘서, 끝까지 밀면 마지막 칩이 흐림 밖으로 나오게 한다) */}
          {scrollable && <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-bg to-transparent" />}
        </div>
        {children && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? `${label} 닫기` : `${label} 열기`}
            className={cn(
              "relative inline-flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors",
              open || activeCount > 0
                ? "border-accent bg-accent-soft text-accent-text"
                : "border-line text-fg-2 hover:border-line-strong hover:text-fg",
            )}
          >
            <SlidersHorizontal className="size-4" />
            {activeCount > 0 && !open && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex size-4 items-center justify-center rounded-full bg-accent text-[0.625rem] font-bold tabular text-accent-fg">
                {activeCount}
              </span>
            )}
          </button>
        )}
      </div>
      {open && children}
    </div>
  );
}
