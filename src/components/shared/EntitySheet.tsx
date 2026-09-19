"use client";
import type { ReactNode } from "react";
import type { DataTable, RowValues } from "@/lib/db/defaults";
import type { TableMap } from "@/lib/db/types";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { toast } from "@/lib/store/ui-store";
import { Button } from "@/components/ui/Button";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { Sheet } from "@/components/ui/Sheet";
import { useEntityForm } from "./useEntityForm";
import { SchemaForm, type FieldDef } from "./SchemaForm";
import { DeleteButton } from "@/components/ui/DeleteButton";

export interface EntitySheetProps<T extends DataTable> {
  table: T;
  open: boolean;
  onClose: () => void;
  rowId?: string | null;
  initial?: Partial<RowValues<T>>;
  fields: FieldDef[];
  titleCreate: string;
  titleEdit: string;
  requiredKey: string; // 생성 시 필수 값 (예: name/title)
  favoriteKey?: string;
  size?: "sm" | "md" | "lg";
  extra?: (row: TableMap[T]) => ReactNode; // 편집 모드에서 폼 아래 추가 영역
  onCreated?: (row: TableMap[T]) => void;
  description?: string;
}

export function EntitySheet<T extends DataTable>({
  table,
  open,
  onClose,
  rowId,
  initial,
  fields,
  titleCreate,
  titleEdit,
  requiredKey,
  favoriteKey,
  size = "md",
  extra,
  onCreated,
  description,
}: EntitySheetProps<T>) {
  const row = useWeddingStore((s) => (rowId ? ((s.data?.[table] as TableMap[T][] | undefined)?.find((r) => r.id === rowId) ?? null) : null));
  const remove = useWeddingStore((s) => s.remove);
  const { values, set, commit, isEdit } = useEntityForm(table, row, initial, open);
  const rec = values as unknown as Record<string, unknown>;

  const get = (key: string) => {
    if (key.startsWith("details.")) return ((rec.details as Record<string, unknown>) ?? {})[key.slice(8)];
    return rec[key];
  };
  const setKey = (key: string, value: unknown) => {
    if (key.startsWith("details.")) {
      const details = { ...((rec.details as Record<string, unknown>) ?? {}), [key.slice(8)]: value };
      set("details" as keyof RowValues<T>, details as RowValues<T>[keyof RowValues<T>]);
    } else set(key as keyof RowValues<T>, value as RowValues<T>[keyof RowValues<T>]);
  };

  const submit = () => {
    const req = get(requiredKey);
    if (typeof req !== "string" || !req.trim()) {
      const f = fields.find((x) => x.key === requiredKey);
      return toast(`${f?.label ?? "필수 항목"}을(를) 입력해 주세요.`);
    }
    const created = commit({ [requiredKey]: req.trim() } as Partial<RowValues<T>>);
    toast("추가되었어요.", { tone: "success" });
    onCreated?.(created);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? titleEdit : titleCreate}
      description={description}
      size={size}
      headerRight={isEdit && favoriteKey ? <FavoriteButton active={Boolean(get(favoriteKey))} onChange={(v) => setKey(favoriteKey, v)} /> : undefined}
      footer={
        isEdit ? (
          <div className="flex gap-2">
            <DeleteButton
              onDelete={() => {
                if (row) remove(table, row.id);
                onClose();
              }}
            />
            <Button full variant="secondary" onClick={onClose}>
              닫기
            </Button>
          </div>
        ) : (
          <Button full size="lg" onClick={submit}>
            추가하기
          </Button>
        )
      }
    >
      <SchemaForm fields={fields} get={get} set={setKey} autoFocusFirst={!isEdit} onEnter={!isEdit ? submit : undefined}>
        {isEdit && row && extra?.(row)}
      </SchemaForm>
    </Sheet>
  );
}
