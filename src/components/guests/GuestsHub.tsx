"use client";
import { computeGuestStats } from "@/lib/compute";
import { useTabs } from "@/lib/hooks";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { TabBar } from "@/components/layout/TabBar";
import { GiftsView } from "@/components/gifts/GiftsView";
import { MeetingsView } from "@/components/meetings/MeetingsView";
import { GuestsView } from "./GuestsView";

const TABS = ["guests", "meetings", "gifts"] as const;
type Tab = (typeof TABS)[number];

export function GuestsHub() {
  const [tab, setTab] = useTabs<Tab>(TABS, "guests");
  const data = useWeddingStore((s) => s.data!);
  const stats = computeGuestStats(data.guests);

  return (
    <div>
      <div className="mb-4">
        <h1 className="hidden text-[1.75rem] font-bold tracking-tight text-fg lg:block">하객 · 초대</h1>
        <p className="text-[0.9375rem] text-fg-3">
          총 {stats.total}명 · 신랑측 {stats.groom} · 신부측 {stats.bride}
          {stats.both > 0 && <> · 공통 {stats.both}</>} · 예상 {stats.expectedPeople}명
        </p>
      </div>
      <TabBar
        className="mb-4 max-w-md"
        tabs={[
          { value: "guests", label: "하객", badge: stats.total },
          { value: "meetings", label: "청첩장 모임", badge: data.invitation_meetings.length },
          { value: "gifts", label: "선물", badge: data.gifts.length },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "guests" && <GuestsView embedded />}
      {tab === "meetings" && <MeetingsView embedded />}
      {tab === "gifts" && <GiftsView embedded />}
    </div>
  );
}
