import { Suspense } from "react";
import { BudgetItemsView } from "@/components/budget/BudgetItemsView";

export const metadata = { title: "상세 예산" };

export default function BudgetItemsPage() {
  return (
    <Suspense>
      <BudgetItemsView />
    </Suspense>
  );
}
