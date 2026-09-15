"use client";
import { Bell, Menu, Search, Settings2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { PAGE_TITLES } from "@/lib/nav";
import { useUIStore } from "@/lib/store/ui-store";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { computeNextActions, overdueTasks } from "@/lib/compute";
import { IconButton } from "@/components/ui/Button";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

const EMPTY_TASKS: never[] = [];

function titleFor(pathname: string) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const seg = "/" + pathname.split("/").slice(1, 3).join("/");
  return PAGE_TITLES[seg] ?? PAGE_TITLES["/" + pathname.split("/")[1]] ?? "";
}

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const setDrawer = useUIStore((s) => s.setDrawer);
  const tasks = useWeddingStore((s) => s.data?.tasks ?? EMPTY_TASKS);
  const wedding = useWeddingStore((s) => s.data?.wedding);
  const [q, setQ] = useState("");
  const isHome = pathname === "/";
  const title = titleFor(pathname);
  const alerts = overdueTasks(tasks).length + computeNextActions(tasks, 3).filter((n) => n.days !== null && n.days <= 3).length;

  return (
    <header
      className="sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur-md"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-2 px-3 sm:px-6">
        <IconButton label="전체 메뉴" className="lg:hidden" onClick={() => setDrawer(true)}>
          <Menu className="size-5" />
        </IconButton>

        <div className="min-w-0 flex-1 lg:hidden">
          {isHome ? <Logo size="sm" tagline={false} /> : <h1 className="truncate text-[1.0625rem] font-semibold text-fg">{title}</h1>}
        </div>

        <form
          role="search"
          className="hidden lg:flex lg:flex-1 lg:max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
          }}
        >
          <label className="relative w-full">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-3" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="검색어를 입력하세요…"
              className="h-10 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-[0.875rem] outline-none placeholder:text-fg-3 focus:border-accent focus:ring-2 focus:ring-accent-soft"
            />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-0.5">
          <SaveIndicator className="mr-1 hidden sm:inline-flex" />
          <Link href="/search" className="lg:hidden">
            <IconButton label="검색" tabIndex={-1}>
              <Search className="size-5" />
            </IconButton>
          </Link>
          <Link href="/tasks?filter=week" className="relative">
            <IconButton label="이번 주 알림" tabIndex={-1}>
              <Bell className="size-5" />
            </IconButton>
            {alerts > 0 && (
              <span className="pointer-events-none absolute right-2 top-2 inline-flex min-w-4 h-4 items-center justify-center rounded-full bg-accent px-1 text-[0.625rem] font-bold text-accent-fg">
                {alerts > 9 ? "9+" : alerts}
              </span>
            )}
          </Link>
          <Link href="/settings" className="hidden sm:block">
            <IconButton label="설정" tabIndex={-1}>
              <Settings2 className="size-5" />
            </IconButton>
          </Link>
          <Link
            href="/settings/account"
            className={cn("ml-1 hidden items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-[0.8125rem] text-fg-2 hover:border-line-strong lg:flex")}
          >
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-accent-soft text-[0.75rem] font-bold text-accent-text">
              {(wedding?.groom_name?.[0] ?? "우") + (wedding?.bride_name?.[0] ?? "")}
            </span>
            <span className="max-w-32 truncate">{wedding?.name ?? "우리의 결혼 준비"}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
