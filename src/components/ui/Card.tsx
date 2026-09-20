import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { tint, type Tint } from "@/lib/tint";
import { cn } from "@/lib/utils";

export function Card({
  className,
  hover,
  tint: t,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { hover?: boolean; tint?: Tint }) {
  return (
    <div className={cn("card", hover && "card-hover", t && "relative overflow-hidden", className)} {...props}>
      {/* 카드 맨 위 얇은 띠 — 무슨 영역인지 색으로 먼저 알려준다 */}
      {t && <span aria-hidden className={cn("absolute inset-x-0 top-0 h-[3px]", tint(t).bar)} />}
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  icon,
  action,
  href,
  actionLabel = "전체 보기",
  className,
  subtitle,
  tint: t,
}: {
  title: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  href?: string;
  actionLabel?: string;
  className?: string;
  subtitle?: ReactNode;
  tint?: Tint;
}) {
  const c = tint(t);
  return (
    <div className={cn("flex items-center justify-between gap-3 px-5 pt-4 pb-2", className)}>
      <div className="flex items-center gap-2.5 min-w-0">
        {icon &&
          (t ? (
            <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] [&>svg]:size-[1.0625rem]", c.soft, c.fg)}>
              {icon}
            </span>
          ) : (
            <span className="text-accent shrink-0 [&>svg]:size-[1.125rem]">{icon}</span>
          ))}
        <div className="min-w-0">
          <h2 className="text-[1.0625rem] font-semibold text-fg truncate">{title}</h2>
          {subtitle && <p className="text-[0.8125rem] text-fg-3 truncate">{subtitle}</p>}
        </div>
      </div>
      {action ??
        (href && (
          <Link
            href={href}
            className="inline-flex items-center gap-0.5 text-[0.875rem] text-fg-3 hover:text-accent transition-colors shrink-0 min-h-11 px-2 -mr-2"
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
