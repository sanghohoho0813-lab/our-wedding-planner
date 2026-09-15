import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-[10px] bg-surface-3", className)} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4 p-4 sm:p-6" aria-busy="true" aria-label="불러오는 중">
      <Skeleton className="h-40 w-full rounded-[22px]" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-52 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
