import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Building2,
  Calendar,
  CheckSquare,
  Database,
  Flower2,
  Gift,
  Home,
  Mail,
  Music,
  Palette,
  PieChart,
  Plane,
  Scissors,
  Search,
  Shirt,
  Sparkles,
  StickyNote,
  User,
  Users,
  Wallet,
  Camera,
  Star,
  Activity,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}
export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "준비 현황",
    items: [
      { href: "/", label: "홈", icon: Home },
      { href: "/tasks", label: "할 일", icon: CheckSquare },
      { href: "/calendar", label: "일정", icon: Calendar },
    ],
  },
  {
    title: "비용",
    items: [
      { href: "/budget", label: "예산 대시보드", icon: PieChart },
      { href: "/budget/items", label: "상세 예산", icon: Wallet },
    ],
  },
  {
    title: "결혼 준비",
    items: [
      { href: "/venue", label: "식장", icon: Building2 },
      { href: "/outfit", label: "예복", icon: Shirt },
      { href: "/vendors/beauty", label: "헤어 & 메이크업", icon: Sparkles },
      { href: "/vendors/bouquet", label: "부케", icon: Flower2 },
      { href: "/vendors/photo", label: "사진 / 영상", icon: Camera },
      { href: "/vendors/coordination", label: "코디네이션", icon: Scissors },
      { href: "/music", label: "음악", icon: Music },
    ],
  },
  {
    title: "사람",
    items: [
      { href: "/guests", label: "하객 목록", icon: Users },
      { href: "/meetings", label: "청첩장 모임", icon: Mail },
      { href: "/gifts", label: "선물", icon: Gift },
    ],
  },
  {
    title: "여행",
    items: [{ href: "/honeymoon", label: "신혼여행", icon: Plane }],
  },
  {
    title: "기록",
    items: [
      { href: "/memos", label: "메모함", icon: StickyNote },
      { href: "/favorites", label: "즐겨찾기", icon: Star },
      { href: "/activity", label: "최근 활동", icon: Activity },
      { href: "/search", label: "검색", icon: Search },
    ],
  },
  {
    title: "설정",
    items: [
      { href: "/settings", label: "디자인 · 글자 크기", icon: Palette },
      { href: "/settings/data", label: "데이터 관리", icon: Database },
      { href: "/settings/account", label: "계정", icon: User },
    ],
  },
];

export const BOTTOM_NAV: NavItem[] = [
  { href: "/", label: "홈", icon: Home },
  { href: "/tasks", label: "할 일", icon: CheckSquare },
  { href: "/budget", label: "예산", icon: Wallet },
  { href: "/calendar", label: "일정", icon: Calendar },
];

export const PAGE_TITLES: Record<string, string> = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.href, i.label])),
);

export const NotifIcon = Bell;
