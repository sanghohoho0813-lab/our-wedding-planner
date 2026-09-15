"use client";
import type { ReactNode } from "react";
import { ChipSelect } from "@/components/ui/Chip";
import { DateField, FieldRow, PhoneField, TextArea, TextField, TimeField, UrlField } from "@/components/ui/Field";
import { MoneyField } from "@/components/ui/MoneyField";
import { Segmented } from "@/components/ui/Segmented";
import { Stepper } from "@/components/ui/Stepper";
import { Toggle } from "@/components/ui/Toggle";

export type FieldType = "text" | "textarea" | "url" | "phone" | "money" | "date" | "time" | "toggle" | "stepper" | "chips" | "segmented";

export interface FieldDef {
  key: string; // 'details.xxx' 형태면 details jsonb 안에 저장
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  half?: boolean;
  suffix?: string;
  hint?: string;
  quickDates?: boolean;
  max?: number;
  showIf?: (get: (key: string) => unknown) => boolean;
  clearable?: boolean; // chips: 다시 누르면 해제
}

export function SchemaForm({
  fields,
  get,
  set,
  autoFocusFirst,
  onEnter,
  children,
}: {
  fields: FieldDef[];
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
  autoFocusFirst?: boolean;
  onEnter?: () => void;
  children?: ReactNode;
}) {
  const visible = fields.filter((f) => !f.showIf || f.showIf(get));
  const rows: FieldDef[][] = [];
  for (const f of visible) {
    const last = rows.at(-1);
    if (f.half && last && last.length === 1 && last[0].half) last.push(f);
    else rows.push([f]);
  }
  let first = true;
  return (
    <div className="space-y-5">
      {rows.map((row) => (
        <div key={row.map((f) => f.key).join("+")} className={row.length === 2 ? "grid grid-cols-2 gap-3 [&>*]:min-w-0" : undefined}>
          {row.map((f) => {
            const v = get(f.key);
            const focus = autoFocusFirst && first && (f.type === "text" || f.type === "textarea");
            if (f.type === "text" || f.type === "textarea") first = false;
            let control: ReactNode;
            switch (f.type) {
              case "text":
                control = (
                  <TextField
                    value={(v as string | null) ?? ""}
                    onChange={(s) => set(f.key, s || null)}
                    placeholder={f.placeholder}
                    autoFocus={focus}
                    onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
                  />
                );
                break;
              case "textarea":
                control = <TextArea value={(v as string | null) ?? ""} onChange={(s) => set(f.key, s || null)} placeholder={f.placeholder} />;
                break;
              case "url":
                control = <UrlField value={(v as string | null) ?? ""} onChange={(s) => set(f.key, s || null)} />;
                break;
              case "phone":
                control = <PhoneField value={(v as string | null) ?? ""} onChange={(s) => set(f.key, s || null)} />;
                break;
              case "money":
                control = <MoneyField value={Number(v ?? 0)} onChange={(n) => set(f.key, n)} title={f.label} />;
                break;
              case "date":
                control = <DateField value={(v as string | null) ?? null} onChange={(d) => set(f.key, d)} quick={f.quickDates ?? false} />;
                break;
              case "time":
                control = <TimeField value={(v as string | null) ?? null} onChange={(t) => set(f.key, t)} />;
                break;
              case "toggle":
                return <Toggle key={f.key} checked={Boolean(v)} onChange={(b) => set(f.key, b)} label={f.label} description={f.hint} className="rounded-[14px] border border-line px-3" />;
              case "stepper":
                control = <Stepper value={Number(v ?? 0)} onChange={(n) => set(f.key, n)} suffix={f.suffix ?? "명"} max={f.max ?? 999} />;
                break;
              case "chips":
                control = (
                  <ChipSelect
                    size="sm"
                    options={f.options ?? []}
                    value={(v as string | null) ?? null}
                    onChange={(val) => set(f.key, f.clearable !== false && v === val ? null : val)}
                  />
                );
                break;
              case "segmented":
                control = <Segmented options={f.options ?? []} value={String(v ?? f.options?.[0]?.value ?? "")} onChange={(val) => set(f.key, val)} />;
                break;
            }
            return (
              <FieldRow key={f.key} label={f.label} required={f.required} hint={f.hint}>
                {control}
              </FieldRow>
            );
          })}
        </div>
      ))}
      {children}
    </div>
  );
}
