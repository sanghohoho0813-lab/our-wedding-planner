"use client";
import { useEffect, useRef, useState } from "react";
import { DEFAULTS, type DataTable, type RowValues } from "@/lib/db/defaults";
import type { TableMap } from "@/lib/db/types";
import { useWeddingStore } from "@/lib/store/wedding-store";

/**
 * 편집 모드(row 존재): 필드 변경 즉시 스토어에 patch (자동 저장)
 * 생성 모드(row 없음): 로컬 draft 유지 후 commit 시 add
 */
export function useEntityForm<T extends DataTable>(table: T, row: TableMap[T] | null, initial: Partial<RowValues<T>> | undefined, open: boolean) {
  const patch = useWeddingStore((s) => s.patch);
  const add = useWeddingStore((s) => s.add);
  const [draft, setDraft] = useState<RowValues<T>>(() => ({ ...DEFAULTS[table], ...(initial ?? {}) }) as RowValues<T>);
  const prevOpen = useRef(false);
  const initialRef = useRef(initial);
  initialRef.current = initial;

  useEffect(() => {
    if (open && !prevOpen.current && !row) setDraft({ ...DEFAULTS[table], ...(initialRef.current ?? {}) } as RowValues<T>);
    prevOpen.current = open;
  }, [open, row, table]);

  const values = (row ?? draft) as RowValues<T>;
  const set = <K extends keyof RowValues<T>>(key: K, value: RowValues<T>[K]) => {
    if (row) patch(table, row.id, { [key]: value } as unknown as Partial<RowValues<T>>);
    else setDraft((d) => ({ ...d, [key]: value }));
  };
  const setMany = (p: Partial<RowValues<T>>) => {
    if (row) patch(table, row.id, p);
    else setDraft((d) => ({ ...d, ...p }));
  };
  const commit = (extra?: Partial<RowValues<T>>) => add(table, { ...draft, ...(extra ?? {}) } as Partial<RowValues<T>>);

  return { values, set, setMany, commit, isEdit: !!row, draft };
}
