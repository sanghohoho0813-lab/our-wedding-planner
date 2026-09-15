import { Suspense } from "react";
import { CalendarView } from "@/components/calendar/CalendarView";

export const metadata = { title: "일정" };

export default function CalendarPage() {
  return (
    <Suspense>
      <CalendarView />
    </Suspense>
  );
}
