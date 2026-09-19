import { Hero } from "@/components/home/Hero";
import { Notices } from "@/components/home/Notices";
import { TodayCard } from "@/components/home/TodayCard";
import { StatCards } from "@/components/home/StatCards";
import { NextActions } from "@/components/home/NextActions";
import { BudgetOverview } from "@/components/home/BudgetOverview";
import { CategoryRatio } from "@/components/home/CategoryRatio";
import { UpcomingEvents } from "@/components/home/UpcomingEvents";
import { UpcomingPayments } from "@/components/home/UpcomingPayments";
import { RecentActivity } from "@/components/home/RecentActivity";
import { Favorites } from "@/components/home/Favorites";
import { QuoteCard } from "@/components/home/QuoteCard";
import { MemoInbox } from "@/components/home/MemoInbox";

/**
 * 홈은 "지금 뭘 해야 하는지" 를 위에서부터 답한다.
 * 폰에서는 스크롤이 길어지지 않도록, 자세한 분석 카드는 큰 화면에서만 펼친다.
 * (숨긴 카드도 메뉴 › 기록 에서 언제든 볼 수 있다)
 */
export default function HomePage() {
  return (
    <div className="space-y-4">
      <Notices />
      <Hero />
      <TodayCard />
      <StatCards />
      <div className="grid gap-4 lg:grid-cols-3">
        <NextActions />
        <BudgetOverview />
        <CategoryRatio className="hidden lg:block" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <UpcomingEvents />
        <UpcomingPayments />
        <RecentActivity />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Favorites className="hidden lg:block" />
        <MemoInbox />
        <QuoteCard className="hidden lg:block" />
      </div>
    </div>
  );
}
