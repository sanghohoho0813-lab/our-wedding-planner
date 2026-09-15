import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, hover, ...props }: HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return <div className={cn("card", hover && "card-hover", className)} {...props} />;
}

export function CardHeader({
  title,
  icon,
  action,
  href,
  actionLabel = "전체 보기",
  className,
  subtitle,
}: {
  title: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  href?: string;
  actionLabel?: string;
  className?: string;
  subtitle?: ReactNode;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-5 pt-4 pb-2", className)}>
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="text-accent shrink-0 [&>svg]:size-[1.125rem]">{icon}</span>}
        <div className="min-w-0">
          <h2 className="text-[1rem] font-semibold text-fg truncate">{title}</h2>
          {subtitle && <p className="text-[0.75rem] text-fg-3 truncate">{subtitle}</p>}
        </div>
      </div>
      {action ??
        (href && (
          <Link
            href={href}
            className="inline-flex items-center gap-0.5 text-[0.8125rem] text-fg-3 hover:text-accent transition-colors shrink-0 h-9 px-1 -mr-1"
          >
            {actionLabel}
            <ChevronRight className="size-3.5" />
          </Link>
        ))}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}
