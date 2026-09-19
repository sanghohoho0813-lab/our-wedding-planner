"use client";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM_NAV } from "@/lib/nav";
import { useUIStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const setDrawer = useUIStore((s) => s.setDrawer);
  const activeTab = useUIStore((s) => s.activeTab);

  const isActive = (href: string, tab?: string) => {
    const base = href.split("?")[0];
    if (base === "/") return pathname === "/";
    if (!pathname.startsWith(base)) return false;
    if (!tab) return true;
    if (base === "/plan") return tab === "calendar" ? activeTab === "calendar" : activeTab !== "calendar";
    return true;
  };

  const itemCls = (active: boolean) =>
    cn(
      "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[12px] text-[0.75rem] font-medium transition-colors min-h-12",
      active ? "text-accent-text" : "text-fg-3 hover:text-fg",
    );

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line/80 bg-surface/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex h-[var(--nav-h)] max-w-lg items-stretch px-2">
        {BOTTOM_NAV.map((item) => {
          const active = isActive(item.href, item.tab);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              prefetch
              className={itemCls(active)}
              aria-current={active ? "page" : undefined}
              onClick={(e) => {
                // 지금 보고 있는 탭을 다시 누르면 맨 위로 (앱에서 익숙한 동작)
                if (!active) return;
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <span className={cn("inline-flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-accent-soft")}>
                <Icon className="size-[1.25rem]" strokeWidth={active ? 2.4 : 2} />
              </span>
              {item.label}
            </Link>
          );
        })}
        <button type="button" onClick={() => setDrawer(true)} className={itemCls(false)} aria-label="전체 메뉴">
          <span className="inline-flex h-7 w-12 items-center justify-center rounded-full">
            <Menu className="size-[1.25rem]" />
          </span>
          메뉴
        </button>
      </div>
    </nav>
  );
}
