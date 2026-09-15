import { Suspense } from "react";
import { BudgetHub } from "@/components/budget/BudgetHub";
export const metadata = { title: "예산" };
export default function Page() {
  return (
    <Suspense>
      <BudgetHub />
    </Suspense>
  );
}
