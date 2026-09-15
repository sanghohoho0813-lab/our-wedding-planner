import { Suspense } from "react";
import { SearchView } from "@/components/shared/SearchView";
export const metadata = { title: "검색" };
export default function SearchPage() {
  return (
    <Suspense>
      <SearchView />
    </Suspense>
  );
}
