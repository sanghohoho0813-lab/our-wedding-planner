"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart } from "lucide-react";
import { isActiveNav, PRIMARY_NAV, UTILITY_NAV, type NavItem } from "@/lib/nav";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

function NavLink({ item, active, onNavigate, compact }: { item: NavItem; active: boolean; onNavigate?: () => void; compact?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-[12px] px-3 font-medium transition-colors duration-150",
        compact ? "h-11 text-[0.9375rem]" : "h-12 text-[1rem]",
        active ? "bg-accent-soft font-semibold text-accent-text" : "text-fg-2 hover:bg-surface-2 hover:text-fg",
      )}
    >
      <Icon className={cn("size-5 shrink-0", active ? "text-accent-text" : "text-fg-3")} strokeWidth={active ? 2.3 : 2} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function NavList({ onNavigate, className, compact }: { onNavigate?: () => void; className?: string; compact?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={cn("space-y-1", className)} aria-label="주요 메뉴">
      {PRIMARY_NAV.map((item) => (
        <NavLink key={item.href} item={item} active={isActiveNav(pathname, item)} onNavigate={onNavigate} compact={compact} />
      ))}
      <div className="!mt-4 border-t border-line pt-3">
        {UTILITY_NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActiveNav(pathname, item)} onNavigate={onNavigate} compact={compact} />
        ))}
      </div>
    </nav>
  );
}

export function Sidebar() {
  const wedding = useWeddingStore((s) => s.data?.wedding);
  const names = [wedding?.groom_name, wedding?.bride_name].filter(Boolean).join(" & ");
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-w)] flex-col border-r border-line bg-surface/85 backdrop-blur lg:flex">
      <div className="px-5 pt-6 pb-5">
        <Logo />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 scrollbar-none">
        <NavList />
      </div>
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-[14px] bg-accent-softer px-3 py-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text">
            <Heart className="size-4 fill-current" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[0.875rem] font-semibold text-fg">{names || wedding?.name || "우리의 결혼 준비"}</p>
            <p className="text-[0.75rem] text-fg-3">우리의 특별한 날까지 함께해요</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
