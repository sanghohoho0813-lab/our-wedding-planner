"use client";
import { Building2, Camera, Flower2, Music, Scissors, Shirt, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { daysUntil, formatDDay, formatShortDate, todayISO } from "@/lib/date";
import { useTabs } from "@/lib/hooks";
import { MUSIC_SLOT } from "@/lib/labels";
import { formatKRW } from "@/lib/money";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { cn } from "@/lib/utils";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { TabBar } from "@/components/layout/TabBar";
import { MusicView } from "@/components/music/MusicView";
import { OutfitView } from "@/components/outfit/OutfitView";
import { VenueView } from "@/components/venue/VenueView";
import { VendorsView } from "@/components/vendors/VendorsView";
import { VENDOR_PAGES } from "@/components/vendors/vendorConfig";

const TABS = ["all", "venue", "photo", "outfit", "beauty", "bouquet", "coordination", "music"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABEL: Record<Tab, string> = {
  all: "전체",
  venue: "식장",
  photo: "사진 · 영상",
  outfit: "예복",
  beauty: "헤어 · 메이크업",
  bouquet: "부케",
  coordination: "코디네이션",
  music: "음악",
};

function SummaryCard({
  icon,
  title,
  status,
  tone = "neutral",
  lines,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  status: string;
  tone?: BadgeTone;
  lines: string[];
  onClick: () => void;
}) {
  return (
    <Card hover className="h-full">
      <button type="button" onClick={onClick} className="flex h-full w-full flex-col p-5 text-left">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text [&>svg]:size-[1.125rem]">{icon}</span>
          <span className="text-[1.0625rem] font-semibold text-fg">{title}</span>
          <Badge tone={tone} className="ml-auto">{status}</Badge>
        </div>
        <ul className="mt-3 space-y-1">
          {lines.map((l) => (
            <li key={l} className="truncate text-[0.9375rem] text-fg-2">
              {l}
            </li>
          ))}
        </ul>
      </button>
    </Card>
  );
}

export function WeddingHub() {
  const [tab, setTab] = useTabs<Tab>(TABS, "all");
  const data = useWeddingStore((s) => s.data!);
  const today = todayISO();
  const details = (data.wedding.details ?? {}) as Record<string, number>;

  const venue = data.venues.find((v) => v.is_contracted);
  const photo = data.vendors.filter((v) => v.category === "photo");
  const beauty = data.vendors.filter((v) => v.category === "beauty");
  const bouquet = data.vendors.filter((v) => v.category === "bouquet");
  const coord = data.vendors.filter((v) => v.category === "coordination");
  const fittings = data.outfit_items.filter((o) => o.fitting_date);
  const nextFitting = fittings.filter((o) => o.fitting_date! >= today).sort((a, b) => a.fitting_date!.localeCompare(b.fitting_date!))[0];
  const confirmedSongs = data.music_items.filter((m) => m.is_confirmed).length;

  const cards = [
    {
      key: "venue" as Tab,
      icon: <Building2 />,
      title: "식장",
      status: venue ? "계약 완료" : `후보 ${data.venues.length}곳`,
      tone: (venue ? "success" : "neutral") as BadgeTone,
      lines: venue
        ? [venue.name, `대관료 ${formatKRW(venue.hall_fee)}`, venue.event_date ? `예식 ${formatShortDate(venue.event_date)} · ${formatDDay(daysUntil(venue.event_date, today))}` : "예식일 미정"]
        : [`등록된 후보 ${data.venues.length}곳`, "계약한 식장이 없어요"],
    },
    {
      key: "photo" as Tab,
      icon: <Camera />,
      title: "사진 · 영상",
      status: `${photo.length}곳`,
      tone: (photo.some((v) => v.status === "contracted") ? "success" : "neutral") as BadgeTone,
      lines: photo.length ? photo.slice(0, 3).map((v) => `${v.name} · ${formatKRW(v.total_amount)}`) : ["등록된 업체가 없어요"],
    },
    {
      key: "outfit" as Tab,
      icon: <Shirt />,
      title: "예복",
      status: `${data.outfit_items.length}건`,
      tone: "neutral" as BadgeTone,
      lines: data.outfit_items.length
        ? [
            ...data.outfit_items.slice(0, 2).map((o) => `${o.kind} · ${o.vendor_name ?? "업체 미정"}`),
            nextFitting ? `다음 피팅 ${formatShortDate(nextFitting.fitting_date!)} · ${formatDDay(daysUntil(nextFitting.fitting_date!, today))}` : "예정된 피팅 없음",
          ]
        : ["등록된 예복이 없어요"],
    },
    {
      key: "beauty" as Tab,
      icon: <Sparkles />,
      title: "헤어 · 메이크업",
      status: `${beauty.length}곳`,
      tone: (beauty.length ? "success" : "neutral") as BadgeTone,
      lines: beauty.length
        ? beauty.slice(0, 3).map((v) => `${v.name}${(v.details as { scope?: string })?.scope ? ` · ${(v.details as { scope?: string }).scope}` : ""}`)
        : ["등록된 샵이 없어요"],
    },
    {
      key: "bouquet" as Tab,
      icon: <Flower2 />,
      title: "부케",
      status: bouquet.length ? `${bouquet.length}곳` : "업체 미정",
      tone: (bouquet.length ? "success" : "warning") as BadgeTone,
      lines: [
        `필요 수량 · 부케 ${details.bouquet_count ?? 0}개 · 부토니에르 ${details.boutonniere_count ?? 0}개`,
        ...(bouquet.length ? bouquet.slice(0, 2).map((v) => v.name) : ["원본 계획표에 업체가 아직 없어요"]),
      ],
    },
    {
      key: "coordination" as Tab,
      icon: <Scissors />,
      title: "코디네이션",
      status: coord.length ? "진행 중" : "미정",
      tone: (coord.length ? "success" : "neutral") as BadgeTone,
      lines: coord.length ? coord.map((v) => `${v.name}${v.phone ? ` · ${v.phone}` : ""}`) : ["등록된 담당자가 없어요"],
    },
    {
      key: "music" as Tab,
      icon: <Music />,
      title: "음악",
      status: `확정 ${confirmedSongs}곡`,
      tone: (confirmedSongs ? "success" : "warning") as BadgeTone,
      lines: [`식순 구간 ${MUSIC_SLOT.length - 1}개`, data.music_items.length ? `후보곡 ${data.music_items.length}곡` : "후보곡이 아직 없어요"],
    },
  ];

  return (
    <div>
      <div className="mb-4">
        <h1 className="hidden text-[1.75rem] font-bold tracking-tight text-fg lg:block">웨딩 준비</h1>
        <p className="text-[0.9375rem] text-fg-3">식장 · 스드메 · 예복 · 음악을 한곳에서</p>
      </div>
      <TabBar className="mb-4" tabs={TABS.map((t) => ({ value: t, label: TAB_LABEL[t] }))} value={tab} onChange={setTab} />

      {tab === "all" && (
        <ul className={cn("grid gap-3 md:grid-cols-2 xl:grid-cols-3")}>
          {cards.map((c) => (
            <li key={c.key}>
              <SummaryCard icon={c.icon} title={c.title} status={c.status} tone={c.tone} lines={c.lines} onClick={() => setTab(c.key)} />
            </li>
          ))}
        </ul>
      )}
      {tab === "venue" && <VenueView embedded />}
      {tab === "photo" && <VendorsView cfg={VENDOR_PAGES.photo} embedded />}
      {tab === "outfit" && <OutfitView embedded />}
      {tab === "beauty" && <VendorsView cfg={VENDOR_PAGES.beauty} embedded />}
      {tab === "bouquet" && <VendorsView cfg={VENDOR_PAGES.bouquet} embedded />}
      {tab === "coordination" && <VendorsView cfg={VENDOR_PAGES.coordination} embedded />}
      {tab === "music" && <MusicView embedded />}
    </div>
  );
}
