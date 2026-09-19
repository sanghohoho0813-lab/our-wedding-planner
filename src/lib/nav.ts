import type { LucideIcon } from "lucide-react";
import { CalendarCheck, Heart, Home, Plane, Settings2, Users, Wallet } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
  /** 이 메뉴가 담당하는 경로들 (활성 표시 판정용) */
  owns?: string[];
}

/** 최상위 메뉴는 6개로 제한한다. 나머지는 각 화면 안의 탭으로 들어간다. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "홈", short: "홈", icon: Home },
  { href: "/plan", label: "할 일 · 일정", short: "할 일", icon: CalendarCheck, owns: ["/plan", "/plan?tab=calendar"] },
  { href: "/budget", label: "예산", short: "예산", icon: Wallet, owns: ["/budget?tab=items"] },
  { href: "/wedding", label: "웨딩 준비", short: "준비", icon: Heart, owns: ["/wedding?tab=venue", "/wedding?tab=outfit", "/wedding?tab=music", "/vendors"] },
  { href: "/guests", label: "하객 · 초대", short: "하객", icon: Users, owns: ["/guests?tab=meetings", "/guests?tab=gifts"] },
  { href: "/honeymoon", label: "신혼여행", short: "여행", icon: Plane },
];

export const UTILITY_NAV: NavItem[] = [{ href: "/settings", label: "설정", short: "설정", icon: Settings2 }];

/**
 * 모바일 하단 탭.
 *
 * 할 일과 일정은 한 화면이 됐으니 탭도 하나면 된다(일정은 그 안의 탭으로 간다).
 * '메뉴' 도 뺐다 — 왼쪽 위 ☰ 가 같은 서랍을 여는데 바닥에 하나 더 둘 이유가 없다.
 * 그렇게 비운 두 칸에 웨딩 준비 · 하객을 넣어서, 매일 여는 다섯 곳이 전부 바닥에 있다.
 * 신혼여행 · 설정은 ☰ 서랍에 있다.
 */
export const BOTTOM_NAV: { href: string; label: string; icon: LucideIcon; tab?: string }[] = [
  { href: "/", label: "홈", icon: Home },
  { href: "/plan", label: "할 일", icon: CalendarCheck, tab: "tasks" },
  { href: "/budget", label: "예산", icon: Wallet },
  { href: "/wedding", label: "준비", icon: Heart },
  { href: "/guests", label: "하객", icon: Users },
];

export const PAGE_TITLES: Record<string, string> = {
  "/": "홈",
  "/plan": "할 일 · 일정",
  "/budget": "예산",
  "/wedding": "웨딩 준비",
  "/guests": "하객 · 초대",
  "/honeymoon": "신혼여행",
  "/search": "검색",
  "/settings": "설정",
  "/settings/data": "데이터 관리",
  "/settings/account": "계정",
};

export function isActiveNav(pathname: string, item: NavItem) {
  if (item.href === "/") return pathname === "/";
  if (pathname === item.href || pathname.startsWith(item.href + "/")) return true;
  return (item.owns ?? []).some((p) => pathname === p || pathname.startsWith(p + "/"));
}
