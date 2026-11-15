"use client";
import { LOCAL_WEDDING_ID } from "@/lib/config";
import type { DataAdapter } from "./adapter";
import { TABLE_NAMES, type Guest, type TableName, type Wedding, type WeddingData } from "./types";
import { applyDataFixups } from "./migration";

/**
 * 로컬 저장 모드에서 쓰던 기록을 Supabase 공간으로 옮기는 길.
 *
 * 옮길 때 반드시 지켜야 하는 두 가지가 있다.
 *  1) 넣는 순서: Supabase 에는 외래키가 있어 예산 카테고리 → 예산 항목 → 결제 순서를 지켜야 한다.
 *     TABLE_NAMES 가 그 순서대로 정의되어 있으므로 항상 이 순서로 넣는다.
 *  2) 활동 기록의 user_id: 로컬에서는 'local-user' 라는 가짜 값이다. 그대로 올리면
 *     실제 회원을 가리키는 외래키에 걸려 저장이 통째로 실패한다. 지금 로그인한 사람으로 바꾼다.
 */

const LOCAL_KEY = `owp:data:v2:${LOCAL_WEDDING_ID}`;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface LocalSnapshot {
  data: WeddingData;
  /** 옮길 기록 수 (활동 기록 제외) */
  rows: number;
  counts: { table: TableName; n: number }[];
  updatedAt: string | null;
}

/** 이 브라우저에 쓰던 기록이 있는지 본다. 없으면 null. */
export function readLocalWorkspace(): LocalSnapshot | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LOCAL_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WeddingData;
    if (!parsed?.wedding) return null;
    for (const t of TABLE_NAMES) if (!Array.isArray(parsed[t])) (parsed as unknown as Record<string, unknown[]>)[t] = [];
    const data = applyDataFixups(parsed).data;
    const counts = TABLE_NAMES.filter((t) => t !== "activity_logs" && (data[t] as unknown[]).length > 0).map((t) => ({
      table: t,
      n: (data[t] as unknown[]).length,
    }));
    return {
      data,
      rows: counts.reduce((n, c) => n + c.n, 0),
      counts,
      updatedAt: data.wedding.updated_at ?? null,
    };
  } catch {
    return null;
  }
}

/** 옮길 행 목록. 순서 · wedding_id · 활동 기록 user_id 를 여기서 한 번에 정리한다. */
export function rowsForUpload(data: WeddingData, weddingId: string, userId: string | null) {
  return TABLE_NAMES.map((table) => {
    const src = (data[table] ?? []) as unknown as Record<string, unknown>[];
    const rows = src.map((row) => {
      const next: Record<string, unknown> = { ...row, wedding_id: weddingId };
      if (table === "activity_logs") {
        next.user_id = typeof row.user_id === "string" && UUID_RE.test(row.user_id) ? row.user_id : userId;
      }
      return next;
    });
    return { table, rows };
  }).filter((x) => x.rows.length > 0);
}

/** 결혼 기본 정보 중 '옮겨야 하는' 값만. id · 초대 코드 · 만든 사람은 새 공간 것을 유지한다. */
export function weddingFieldsForUpload(w: Wedding): Partial<Wedding> {
  return {
    name: w.name,
    wedding_date: w.wedding_date,
    wedding_time: w.wedding_time,
    groom_name: w.groom_name,
    bride_name: w.bride_name,
    total_budget: w.total_budget,
    details: w.details ?? {},
  };
}

export interface UploadProgress {
  table: TableName;
  done: number;
  total: number;
}

/**
 * 워크스페이스 하나를 통째로 올린다. 같은 id 는 덮어쓰므로 중간에 실패해도 다시 눌러 이어갈 수 있다.
 */
export async function uploadWorkspace(
  adapter: DataAdapter,
  weddingId: string,
  userId: string | null,
  data: WeddingData,
  opts: { wedding?: boolean; onProgress?: (p: UploadProgress) => void } = {},
): Promise<number> {
  if (opts.wedding !== false) {
    const fields = weddingFieldsForUpload(data.wedding);
    try {
      await adapter.updateWedding(weddingId, fields);
    } catch {
      // details 칸이 아직 없는 데이터베이스(0002 마이그레이션 전)면 나머지만 저장한다
      const rest = { ...fields };
      delete rest.details;
      await adapter.updateWedding(weddingId, rest);
    }
  }
  const groups = rowsForUpload(data, weddingId, userId);
  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  let done = 0;
  for (const { table, rows } of groups) {
    if (adapter.insertMany) await adapter.insertMany(table, rows as never);
    else for (const row of rows) await adapter.insert(table, row as never);
    done += rows.length;
    opts.onProgress?.({ table, done, total });
  }
  return total;
}

/** 하객을 같은 사람으로 볼 열쇠: 띄어쓰기를 뺀 이름 + 측 */
export function guestKey(g: Pick<Guest, "name" | "side">): string {
  return `${(g.name ?? "").replace(/\s+/g, "")}|${g.side}`;
}

/**
 * 이 브라우저에만 남아 있는 하객 중 서버에 아직 없는 사람.
 *
 * '전체 올리기' 는 할 일 · 예산 · 원래 명단까지 한 번 더 넣어서 모든 게 두 개씩 된다.
 * 실제로 필요한 건 대개 "폰에서 따로 적어 둔 하객 몇 명" 이라, 이름 · 측이 같은 사람은 빼고 남은 사람만 고른다.
 */
export function guestsMissingOnServer(local: Guest[], server: Guest[]): Guest[] {
  const have = new Set(server.map(guestKey));
  const seen = new Set<string>();
  return local.filter((g) => {
    const k = guestKey(g);
    if (!g.name?.trim() || have.has(k) || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
