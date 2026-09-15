"use client";
import { nowISO, uid } from "@/lib/utils";
import { MIGRATION_AUDIT, MIGRATION_WARNINGS, ORIGINAL_ROWS, ORIGINAL_WEDDING } from "./original-data";
import { TABLE_NAMES, type TableMap, type TableName, type Wedding, type WeddingData } from "./types";

export { MIGRATION_AUDIT, MIGRATION_WARNINGS, ORIGINAL_WEDDING };
export const MIGRATED_TABLES = Object.keys(ORIGINAL_ROWS) as TableName[];

export function emptyData(wedding: Wedding): WeddingData {
  const base = { wedding } as WeddingData;
  for (const t of TABLE_NAMES) (base as unknown as Record<string, unknown[]>)[t] = [];
  return base;
}

export function migratedWedding(id: string, createdBy: string | null, inviteCode = "LOCAL"): Wedding {
  const ts = nowISO();
  return {
    id,
    name: ORIGINAL_WEDDING.name,
    wedding_date: ORIGINAL_WEDDING.wedding_date,
    wedding_time: ORIGINAL_WEDDING.wedding_time,
    groom_name: ORIGINAL_WEDDING.groom_name,
    bride_name: ORIGINAL_WEDDING.bride_name,
    total_budget: ORIGINAL_WEDDING.total_budget,
    details: { ...ORIGINAL_WEDDING.details },
    invite_code: inviteCode,
    created_by: createdBy,
    created_at: ts,
    updated_at: ts,
  };
}

/** 원본 스프레드시트에서 이관한 데이터로 채운 워크스페이스를 만든다. */
export function buildMigratedData(weddingId: string, createdBy: string | null = null): WeddingData {
  const ts = nowISO();
  const data = emptyData(migratedWedding(weddingId, createdBy));
  for (const table of MIGRATED_TABLES) {
    const rows = ORIGINAL_ROWS[table] ?? [];
    (data as unknown as Record<string, unknown[]>)[table] = rows.map((row) => ({
      ...(row as object),
      wedding_id: weddingId,
      created_at: ts,
      updated_at: ts,
    })) as TableMap[TableName][];
  }
  data.activity_logs = [
    {
      id: uid(),
      wedding_id: weddingId,
      user_id: createdBy,
      entity_type: "wedding",
      entity_id: weddingId,
      action: "create",
      description: `원본 결혼계획표에서 ${MIGRATION_TOTAL}건을 불러왔어요.`,
      created_at: ts,
    },
  ];
  return data;
}

/** 이미 있는 워크스페이스에 원본 데이터를 얹을 때 쓸 행 목록 (id 는 그대로라 중복 실행해도 같은 행) */
export function migratedRows(weddingId: string): { table: TableName; rows: TableMap[TableName][] }[] {
  const ts = nowISO();
  return MIGRATED_TABLES.map((table) => ({
    table,
    rows: (ORIGINAL_ROWS[table] ?? []).map((row) => ({
      ...(row as object),
      wedding_id: weddingId,
      created_at: ts,
      updated_at: ts,
    })) as TableMap[TableName][],
  }));
}

export const MIGRATION_TOTAL = MIGRATED_TABLES.reduce((n, t) => n + (ORIGINAL_ROWS[t]?.length ?? 0), 0);
