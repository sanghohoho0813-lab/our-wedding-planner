"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings", label: "디자인" },
  { href: "/settings/data", label: "데이터 관리" },
  { href: "/settings/account", label: "계정" },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-4 flex gap-1 rounded-[12px] bg-surface-2 p-1" aria-label="설정 메뉴">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={cn("flex h-10 flex-1 items-center justify-center rounded-[9px] text-[0.9375rem] font-medium transition-colors", active ? "bg-surface text-fg shadow-sm" : "text-fg-2 hover:text-fg")}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
