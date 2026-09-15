import { Suspense } from "react";
import { PlanView } from "@/components/plan/PlanView";
export const metadata = { title: "할 일 · 일정" };
export default function Page() {
  return (
    <Suspense>
      <PlanView />
    </Suspense>
  );
}
