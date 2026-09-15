"use client";
import { Bell, Menu, Search, Settings2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { computeNextActions, overdueTasks } from "@/lib/compute";
import { PAGE_TITLES } from "@/lib/nav";
import { useUIStore } from "@/lib/store/ui-store";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { isSupabaseConfigured } from "@/lib/config";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/Button";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { Logo } from "./Logo";

const EMPTY_TASKS: never[] = [];

function titleFor(pathname: string) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const seg = "/" + pathname.split("/")[1];
  return PAGE_TITLES[seg] ?? "";
}

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const setDrawer = useUIStore((s) => s.setDrawer);
  const tasks = useWeddingStore((s) => s.data?.tasks ?? EMPTY_TASKS);
  const wedding = useWeddingStore((s) => s.data?.wedding);
  const realtime = useWeddingStore((s) => s.realtime);
  const [q, setQ] = useState("");
  const isHome = pathname === "/";
  const title = titleFor(pathname);
  const alerts = overdueTasks(tasks).length + computeNextActions(tasks, 3).filter((n) => n.days !== null && n.days >= 0 && n.days <= 3).length;

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/90 backdrop-blur-md" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="page-shell flex h-15 min-h-[3.75rem] items-center gap-2 px-3 sm:px-6">
        <IconButton label="전체 메뉴" className="lg:hidden" onClick={() => setDrawer(true)}>
          <Menu className="size-5" />
        </IconButton>

        <div className="min-w-0 flex-1 lg:hidden">
          {isHome ? <Logo size="sm" tagline={false} /> : <h1 className="truncate text-[1.125rem] font-semibold text-fg">{title}</h1>}
        </div>

        <form
          role="search"
          className="hidden lg:flex lg:flex-1 lg:max-w-lg"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
          }}
        >
          <label className="relative w-full">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-[1.125rem] -translate-y-1/2 text-fg-3" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="할 일 · 업체 · 하객 · 예산 검색"
              className="h-11 w-full rounded-full border border-line bg-surface pl-11 pr-4 text-[0.9375rem] outline-none placeholder:text-fg-3 focus:border-accent focus:ring-2 focus:ring-accent-soft"
            />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-0.5">
          <SaveIndicator className="mr-1 hidden sm:inline-flex" />
          <Link href="/search" className="lg:hidden" aria-label="검색">
            <IconButton label="검색" tabIndex={-1}>
              <Search className="size-5" />
            </IconButton>
          </Link>
          <Link href="/plan?filter=week" className="relative" aria-label="이번 주 할 일">
            <IconButton label="이번 주 할 일" tabIndex={-1}>
              <Bell className="size-5" />
            </IconButton>
            {alerts > 0 && (
              <span className="pointer-events-none absolute right-1.5 top-1.5 inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-accent px-1 text-[0.6875rem] font-bold text-accent-fg">
                {alerts > 9 ? "9+" : alerts}
              </span>
            )}
          </Link>
          <Link href="/settings" className="hidden sm:block" aria-label="설정">
            <IconButton label="설정" tabIndex={-1}>
              <Settings2 className="size-5" />
            </IconButton>
          </Link>
          <Link
            href="/settings/account"
            className="ml-1 hidden items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3.5 text-[0.875rem] text-fg-2 transition-colors hover:border-line-strong hover:text-fg lg:flex"
          >
            <span className="relative inline-flex size-7 items-center justify-center rounded-full bg-accent-soft text-[0.8125rem] font-bold text-accent-text">
              {(wedding?.groom_name?.[0] ?? "우") + (wedding?.bride_name?.[0] ?? "")}
              {isSupabaseConfigured && (
                <span
                  aria-hidden
                  title={realtime === "live" ? "실시간 연결됨" : realtime === "connecting" ? "연결 중" : "연결 끊김"}
                  className={cn(
                    "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-surface",
                    realtime === "live" ? "bg-success" : realtime === "connecting" ? "bg-warning" : "bg-fg-3",
                  )}
                />
              )}
            </span>
            <span className="max-w-36 truncate">{wedding?.name ?? "우리의 결혼 준비"}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
