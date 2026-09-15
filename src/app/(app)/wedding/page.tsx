import { Suspense } from "react";
import { WeddingHub } from "@/components/wedding/WeddingHub";
export const metadata = { title: "웨딩 준비" };
export default function Page() {
  return (
    <Suspense>
      <WeddingHub />
    </Suspense>
  );
}
