import { Suspense } from "react";
import { GuestsView } from "@/components/guests/GuestsView";
export const metadata = { title: "하객 목록" };
export default function GuestsPage() {
  return (
    <Suspense>
      <GuestsView />
    </Suspense>
  );
}
