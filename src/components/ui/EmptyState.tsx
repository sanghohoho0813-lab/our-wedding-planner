import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  compact,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "py-8 px-4" : "py-14 px-6", className)}>
      {icon && <div className="mb-3 inline-flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent-text [&>svg]:size-6">{icon}</div>}
      <p className="text-[0.9375rem] font-medium text-fg">{title}</p>
      {description && <p className="mt-1 text-[0.8125rem] text-fg-3 max-w-xs text-balance">{description}</p>}
      {actionLabel && onAction && (
        <Button className="mt-4" variant="soft" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
