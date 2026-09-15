"use client";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "soft";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-strong shadow-sm",
  secondary: "bg-surface-2 text-fg hover:bg-surface-3",
  soft: "bg-accent-soft text-accent-text hover:bg-accent-softer",
  ghost: "bg-transparent text-fg-2 hover:bg-surface-2 hover:text-fg",
  outline: "bg-surface border border-line-strong text-fg hover:bg-surface-2",
  danger: "bg-danger-soft text-danger hover:brightness-95",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-[0.8125rem] rounded-[10px] gap-1.5",
  md: "h-11 px-4 text-[0.9375rem] rounded-[12px] gap-2",
  lg: "h-12 px-5 text-base rounded-[14px] gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", full, loading, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium whitespace-nowrap select-none transition-[background-color,color,transform,box-shadow] duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        full && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : children}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: "ghost" | "surface" | "accent";
  size?: "sm" | "md";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, label, variant = "ghost", size = "md", children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition-colors duration-150 active:scale-95 disabled:opacity-40",
        size === "md" ? "size-11" : "size-9",
        variant === "ghost" && "text-fg-2 hover:bg-surface-2 hover:text-accent",
        variant === "surface" && "bg-surface border border-line text-fg-2 hover:text-accent hover:border-line-strong shadow-sm",
        variant === "accent" && "bg-accent text-accent-fg hover:bg-accent-strong shadow-md",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
