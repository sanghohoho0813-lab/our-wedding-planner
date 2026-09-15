"use client";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface ChipProps {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md";
  tone?: "accent" | "neutral" | "success" | "warning" | "danger" | "info";
  icon?: ReactNode;
  disabled?: boolean;
}

export function Chip({ active, onClick, children, className, size = "md", tone = "accent", icon, disabled }: ChipProps) {
  const activeCls: Record<NonNullable<ChipProps["tone"]>, string> = {
    accent: "bg-accent text-accent-fg border-accent",
    neutral: "bg-fg text-inverse border-fg",
    success: "bg-success text-white border-success",
    warning: "bg-warning text-white border-warning",
    danger: "bg-danger text-white border-danger",
    info: "bg-info text-white border-info",
  };
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={onClick ? !!active : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap transition-colors duration-150 select-none",
        size === "md" ? "h-10 px-4 text-[0.9375rem]" : "h-8 px-3 text-[0.875rem]",
        onClick && "active:scale-[0.97] cursor-pointer",
        active ? activeCls[tone] : "bg-surface border-line text-fg-2 hover:bg-surface-2 hover:text-fg",
        disabled && "opacity-50 pointer-events-none",
        className,
      )}
    >
      {icon}
      {children}
    </Comp>
  );
}

export interface ChipSelectProps<T extends string> {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  tone?: ChipProps["tone"];
  className?: string;
  scroll?: boolean;
}

export function ChipSelect<T extends string>({ options, value, onChange, size = "md", tone, className, scroll }: ChipSelectProps<T>) {
  return (
    <div
      role="radiogroup"
      className={cn("flex gap-2", scroll ? "overflow-x-auto scrollbar-none -mx-1 px-1 pb-0.5" : "flex-wrap", className)}
    >
      {options.map((o) => (
        <Chip key={o.value} size={size} tone={tone} active={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </Chip>
      ))}
    </div>
  );
}
