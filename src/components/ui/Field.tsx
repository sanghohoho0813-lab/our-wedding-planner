"use client";
import { Link2, Phone, X } from "lucide-react";
import { cloneElement, isValidElement, useEffect, useId, useRef, type InputHTMLAttributes, type ReactElement, type ReactNode, type TextareaHTMLAttributes } from "react";
import { addDays, formatKoreanDate, nextWeekend, todayISO } from "@/lib/date";
import { useDebouncedValue } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Chip } from "./Chip";

export const inputCls =
  "h-11 w-full rounded-[12px] border border-line bg-surface px-3.5 text-[1rem] text-fg placeholder:text-fg-3 outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft disabled:opacity-50";

export function FieldRow({
  label,
  hint,
  children,
  required,
  className,
  right,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  required?: boolean;
  className?: string;
  right?: ReactNode;
}) {
  // 라벨을 눌러도 입력칸에 커서가 가도록 id 를 이어 준다(스크린리더에도 같은 이름으로 읽힌다).
  const id = useId();
  const labelText = typeof label === "string" ? label : undefined;
  const child =
    isValidElement(children) && labelText
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          id: (children as ReactElement<{ id?: string }>).props.id ?? id,
          "aria-label": (children as ReactElement<{ "aria-label"?: string }>).props["aria-label"] ?? labelText,
        })
      : children;

  return (
    <div className={cn("space-y-1.5", className)}>
      {(label || right) && (
        <div className="flex items-center justify-between">
          {label && (
            <label htmlFor={labelText ? id : undefined} className="block text-[0.875rem] font-medium text-fg-2">
              {label}
              {required && <span className="ml-0.5 text-accent">*</span>}
            </label>
          )}
          {right}
        </div>
      )}
      {child}
      {hint && <p className="text-[0.8125rem] text-fg-3">{hint}</p>}
    </div>
  );
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: string;
  onChange: (v: string) => void;
  delay?: number;
  leftIcon?: ReactNode;
}

/** 로컬 상태 즉시 반영 + 디바운스 저장 */
export function TextField({ value, onChange, delay = 400, leftIcon, className, onBlur, ...props }: TextFieldProps) {
  const [local, set, flush] = useDebouncedValue(value, onChange, delay);
  return (
    <div className="relative">
      {leftIcon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-3 [&>svg]:size-4">{leftIcon}</span>}
      <input
        {...props}
        value={local}
        onChange={(e) => set(e.target.value)}
        onBlur={(e) => {
          flush();
          onBlur?.(e);
        }}
        className={cn(inputCls, leftIcon && "pl-10", className)}
      />
    </div>
  );
}

export function UrlField(props: TextFieldProps) {
  return <TextField type="url" inputMode="url" placeholder="https://" leftIcon={<Link2 />} {...props} />;
}
export function PhoneField(props: TextFieldProps) {
  return <TextField type="tel" inputMode="tel" placeholder="010-0000-0000" leftIcon={<Phone />} {...props} />;
}

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> {
  value: string;
  onChange: (v: string) => void;
  delay?: number;
}

export function TextArea({ value, onChange, delay = 500, className, rows = 3, onBlur, ...props }: TextAreaProps) {
  const [local, set, flush] = useDebouncedValue(value, onChange, delay);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(280, el.scrollHeight)}px`;
  }, [local]);
  return (
    <textarea
      ref={ref}
      {...props}
      rows={rows}
      value={local}
      onChange={(e) => set(e.target.value)}
      onBlur={(e) => {
        flush();
        onBlur?.(e);
      }}
      className={cn(inputCls, "h-auto min-h-[5.5rem] resize-none py-2.5 leading-relaxed", className)}
    />
  );
}

/** 입력칸 아무 곳이나 눌러도 네이티브 피커가 열리도록 */
function openPicker(e: React.MouseEvent<HTMLInputElement>) {
  const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
  try {
    el.showPicker?.();
  } catch {
    /* 사용자 제스처가 아니거나 미지원 브라우저 */
  }
}

export function DateField({
  value,
  onChange,
  quick = true,
  clearable = true,
  className,
  placeholder = "날짜 선택",
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  quick?: boolean;
  clearable?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const today = todayISO();
  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <input
          type="date"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          onClick={openPicker}
          className={cn(inputCls, "native-picker min-w-0 cursor-pointer px-3 tabular text-[0.9375rem]", clearable && value && "pr-9", !value && "text-fg-3")}
          aria-label={placeholder}
        />
        {clearable && value && (
          <button
            type="button"
            aria-label="날짜 지우기"
            onClick={() => onChange(null)}
            className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-fg-3 hover:bg-surface-2 hover:text-fg"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {quick && (
        <div className="flex flex-wrap gap-1.5">
          <Chip size="sm" active={value === today} onClick={() => onChange(today)}>오늘</Chip>
          <Chip size="sm" active={value === addDays(today, 1)} onClick={() => onChange(addDays(today, 1))}>내일</Chip>
          <Chip size="sm" active={value === nextWeekend(today)} onClick={() => onChange(nextWeekend(today))}>이번 주말</Chip>
          <Chip size="sm" active={value === addDays(today, 7)} onClick={() => onChange(addDays(today, 7))}>1주 뒤</Chip>
          <Chip size="sm" active={value === addDays(today, 30)} onClick={() => onChange(addDays(today, 30))}>한 달 뒤</Chip>
        </div>
      )}
      {value && <p className="text-[0.8125rem] text-fg-3">{formatKoreanDate(value)}</p>}
    </div>
  );
}

export function TimeField({ value, onChange, className }: { value: string | null; onChange: (v: string | null) => void; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <input
        type="time"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        onClick={openPicker}
        className={cn(inputCls, "native-picker min-w-0 cursor-pointer px-3 tabular text-[0.9375rem]", !value && "text-fg-3")}
        aria-label="시간 선택"
      />
    </div>
  );
}
