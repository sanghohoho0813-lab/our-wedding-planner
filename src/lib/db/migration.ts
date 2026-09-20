"use client";
import { nowISO, uid } from "@/lib/utils";
import { MIGRATION_AUDIT, MIGRATION_WARNINGS, ORIGINAL_ROWS, ORIGINAL_WEDDING } from "./original-data";
import { TABLE_NAMES, type TableMap, type TableName, type Wedding, type WeddingData } from "./types";

export { MIGRATION_AUDIT, MIGRATION_WARNINGS, ORIGINAL_WEDDING };
/**
 * 원본 데이터를 넣는 순서.
 * Supabase 에는 외래키가 있어서 budget_categories → budget_items → payments 순서를 지켜야 한다.
 * (생성기가 만든 ORIGINAL_ROWS 의 키 순서에 기대면, 생성기를 고칠 때 조용히 깨진다.)
 * TABLE_NAMES 는 이 의존 순서대로 정의되어 있으므로 그대로 따른다.
 */
export const MIGRATED_TABLES = TABLE_NAMES.filter((t) => (ORIGINAL_ROWS[t]?.length ?? 0) > 0);


/**
 * 원본 데이터의 id 를 **이 결혼 공간 전용 id** 로 바꾼다.
 *
 * 원본 151건은 파일 안에 고정된 id 를 갖고 있다. 로컬 저장 모드에서는 문제가 없었지만
 * 실제 Supabase 에서는 **같은 id 가 이미 다른 결혼 공간에 있으면** upsert 가 남의 행을
 * 고치려 드는 셈이 되어 RLS 가 막는다("new row violates row-level security policy").
 * 그러면 원본 불러오기가 통째로 실패한다.
 *
 * 그래서 결혼 공간 id 를 섞어 새 id 를 만든다.
 * - 같은 공간에서 다시 불러오면 같은 id → 되돌리기는 그대로 덮어쓴다(중복이 안 생긴다).
 * - 다른 공간은 절대 같은 id 를 쓰지 않는다.
 */
function mix(seed: string): string {
  // 128비트를 얻기 위해 서로 다른 네 개의 32비트 해시를 만든다 (FNV-1a 변형)
  const parts: number[] = [];
  for (let k = 0; k < 4; k++) {
    let h = 0x811c9dc5 ^ (k * 0x9e3779b9);
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    parts.push(h >>> 0);
  }
  const hex = parts.map((n) => n.toString(16).padStart(8, "0")).join("");
  // UUID 모양으로 맞춘다 (버전 5, variant 10xx)
  const v = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  return v;
}

const REF_KEYS = ["category_id", "budget_item_id", "vendor_id", "venue_id", "honeymoon_id", "event_id", "source_id", "entity_id"];

/** 원본 행 하나를 이 공간용으로 바꾼다 (id 와 id 를 가리키는 칸까지) */
function localize(row: object, weddingId: string, originalIds: Set<string>, ts: string): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  const derive = (id: string) => mix(`${weddingId}:${id}`);
  if (typeof out.id === "string") out.id = derive(out.id);
  for (const k of REF_KEYS) {
    const v = out[k];
    if (typeof v === "string" && originalIds.has(v)) out[k] = derive(v);
  }
  out.wedding_id = weddingId;
  out.created_at = ts;
  out.updated_at = ts;
  return out;
}

/** 원본 파일에 들어 있는 모든 id (참조를 바꿀 때 '이게 원본 행인가' 판단용) */
const ORIGINAL_IDS: Set<string> = new Set(
  MIGRATED_TABLES.flatMap((t) => (ORIGINAL_ROWS[t] ?? []).map((r) => (r as { id?: string }).id ?? "")).filter(Boolean),
);

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
    details: { ...ORIGINAL_WEDDING.details, data_version: DATA_VERSION },
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
    (data as unknown as Record<string, unknown[]>)[table] = rows.map((row) =>
      localize(row as object, weddingId, ORIGINAL_IDS, ts),
    ) as unknown as TableMap[TableName][];
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

/** 이미 있는 워크스페이스에 원본 데이터를 얹을 때 쓸 행 목록 (같은 공간이면 id 가 같아 중복 실행해도 같은 행) */
export function migratedRows(weddingId: string): { table: TableName; rows: TableMap[TableName][] }[] {
  const ts = nowISO();
  return MIGRATED_TABLES.map((table) => ({
    table,
    rows: (ORIGINAL_ROWS[table] ?? []).map((row) => localize(row as object, weddingId, ORIGINAL_IDS, ts)) as unknown as TableMap[TableName][],
  }));
}

export const MIGRATION_TOTAL = MIGRATED_TABLES.reduce((n, t) => n + (ORIGINAL_ROWS[t]?.length ?? 0), 0);

/** 이미 저장된 데이터에 한 번만 적용하는 보정. 사용자가 고친 내용은 건드리지 않는다. */
export const DATA_VERSION = 3;

export function applyDataFixups(data: WeddingData): { data: WeddingData; changed: boolean } {
  const current = Number((data.wedding.details as { data_version?: number } | undefined)?.data_version ?? 1);
  if (current >= DATA_VERSION) return { data, changed: false };

  // v2: 결혼식 날짜를 원본과 같은 2026-12-20(일)로 맞춘다.
  const OLD = "2026-12-21";
  const NEW = ORIGINAL_WEDDING.wedding_date;
  if (data.wedding.wedding_date === OLD) {
    data.wedding = { ...data.wedding, wedding_date: NEW, wedding_time: data.wedding.wedding_time ?? ORIGINAL_WEDDING.wedding_time };
  }
  data.venues = data.venues.map((v) => (v.event_date === OLD ? { ...v, event_date: NEW } : v));
  data.events = data.events.map((e) => (e.date === OLD ? { ...e, date: NEW } : e));
  // v3: 결혼식 당일 역할(사회·축사)을 원본 메모에서 채운다. 이미 적어둔 값은 유지.
  const details = { ...(data.wedding.details ?? {}) } as Record<string, unknown>;
  const originalRoles = (ORIGINAL_WEDDING.details as { roles?: Record<string, string> }).roles ?? {};
  details.roles = { ...originalRoles, ...((details.roles as Record<string, string> | undefined) ?? {}) };
  data.wedding = { ...data.wedding, details: { ...details, data_version: DATA_VERSION } };
  return { data, changed: true };
}
