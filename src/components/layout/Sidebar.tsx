"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart } from "lucide-react";
import { NAV_GROUPS } from "@/lib/nav";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

export function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/budget") return pathname === "/budget";
  if (href === "/settings") return pathname === "/settings";
  return pathname === href || pathname.startsWith(href + "/");
}

export function NavList({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const pathname = usePathname();
  return (
    <nav className={cn("space-y-5", className)} aria-label="전체 메뉴">
      {NAV_GROUPS.map((g, gi) => (
        <div key={g.title}>
          {gi > 0 && <div className="mb-1.5 px-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-fg-3">{g.title}</div>}
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-11 items-center gap-3 rounded-[12px] px-3 text-[0.9375rem] transition-colors",
                      active ? "bg-accent-soft font-semibold text-accent-text" : "text-fg-2 hover:bg-surface-2 hover:text-fg",
                    )}
                  >
                    <Icon className={cn("size-[1.125rem] shrink-0", active ? "text-accent-text" : "text-fg-3")} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const wedding = useWeddingStore((s) => s.data?.wedding);
  const names = [wedding?.groom_name, wedding?.bride_name].filter(Boolean).join(" & ");
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-w)] flex-col border-r border-line bg-surface/80 backdrop-blur lg:flex">
      <div className="px-6 pt-6 pb-4">
        <Logo />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 scrollbar-none">
        <NavList />
      </div>
      <div className="border-t border-line p-4">
        <div className="flex items-center gap-3 rounded-[14px] bg-accent-softer px-3 py-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text">
            <Heart className="size-4 fill-current" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[0.8125rem] font-semibold text-fg">{names || wedding?.name || "우리의 결혼 준비"}</p>
            <p className="text-[0.6875rem] text-fg-3">우리의 특별한 날까지 함께해요</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
