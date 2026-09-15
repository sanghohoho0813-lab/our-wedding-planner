import { Hero } from "@/components/home/Hero";
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

export default function HomePage() {
  return (
    <div className="space-y-4">
      <Hero />
      <StatCards />
      <div className="grid gap-4 lg:grid-cols-3">
        <NextActions />
        <BudgetOverview />
        <CategoryRatio />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <UpcomingEvents />
        <UpcomingPayments />
        <RecentActivity />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Favorites />
        <MemoInbox />
        <QuoteCard />
      </div>
    </div>
  );
}
