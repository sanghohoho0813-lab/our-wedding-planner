"use client";
import { markEdited, takeSnapshot } from "@/lib/backup";
import { LOCAL_USER_ID, LOCAL_WEDDING_ID } from "@/lib/config";
import { nowISO } from "@/lib/utils";
import type { ChangeEvent, DataAdapter, RealtimeStatus } from "./adapter";
import { applyDataFixups, buildMigratedData, emptyData, migratedWedding } from "./migration";
import { TABLE_NAMES, type TableMap, type TableName, type Wedding, type WeddingData } from "./types";

// v2: 원본 결혼계획표 이관 데이터로 교체하면서 키를 올렸다(옛 샘플 데이터와 섞이지 않게).
const KEY = (wid: string) => `owp:data:v2:${wid}`;
const LEGACY_KEY = (wid: string) => `owp:data:${wid}`;

export const emptyWeddingData = emptyData;

export function createLocalWedding(): Wedding {
  return migratedWedding(LOCAL_WEDDING_ID, LOCAL_USER_ID);
}

export class LocalAdapter implements DataAdapter {
  readonly mode = "local" as const;

  private read(wid: string): WeddingData | null {
    try {
      const raw = localStorage.getItem(KEY(wid));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as WeddingData;
      for (const t of TABLE_NAMES) if (!Array.isArray(parsed[t])) (parsed as unknown as Record<string, unknown[]>)[t] = [];
      return parsed;
    } catch {
      return null;
    }
  }

  private write(wid: string, data: WeddingData) {
    localStorage.setItem(KEY(wid), JSON.stringify(data));
  }

  async loadWedding(weddingId: string): Promise<WeddingData> {
    let data = this.read(weddingId);
    if (data) {
      const fixed = applyDataFixups(data);
      if (fixed.changed) {
        data = fixed.data;
        this.write(weddingId, data);
      }
    }
    if (!data) {
      data = buildMigratedData(weddingId, LOCAL_USER_ID);
      this.write(weddingId, data);
      try {
        localStorage.removeItem(LEGACY_KEY(weddingId));
      } catch {
        /* 옛 키 정리는 실패해도 무시 */
      }
    }
    return data;
  }

  private mutate(wid: string, fn: (d: WeddingData) => void) {
    const data = this.read(wid);
    if (!data) throw new Error("로컬 데이터를 찾을 수 없습니다.");
    // 하루의 첫 수정 직전 상태를 남겨 둔다(그날 아침으로 되돌리기용)
    takeSnapshot(wid, data, "daily", "하루의 첫 수정 전 자동 저장");
    fn(data);
    this.write(wid, data);
    markEdited();
  }

  async insert<T extends TableName>(table: T, row: TableMap[T]) {
    this.mutate(row.wedding_id, (d) => {
      const list = d[table] as TableMap[T][];
      if (!list.some((r) => r.id === row.id)) list.push(row);
    });
  }

  async update<T extends TableName>(table: T, id: string, patch: Partial<TableMap[T]>) {
    const wid = this.findWedding(table, id);
    if (!wid) return;
    this.mutate(wid, (d) => {
      const list = d[table] as TableMap[T][];
      const idx = list.findIndex((r) => r.id === id);
      if (idx >= 0) list[idx] = { ...list[idx], ...patch };
    });
  }

  async remove(table: TableName, id: string) {
    const wid = this.findWedding(table, id);
    if (!wid) return;
    this.mutate(wid, (d) => {
      const list = d[table] as { id: string }[];
      const idx = list.findIndex((r) => r.id === id);
      if (idx >= 0) list.splice(idx, 1);
    });
  }

  async updateWedding(id: string, patch: Partial<Wedding>) {
    this.mutate(id, (d) => {
      d.wedding = { ...d.wedding, ...patch, updated_at: nowISO() };
    });
  }

  async replaceAll(weddingId: string, data: WeddingData) {
    const before = this.read(weddingId);
    if (before) takeSnapshot(weddingId, before, "before-replace", "되돌리기 · 비우기 · 복원 직전 자동 저장");
    this.write(weddingId, data);
    markEdited();
  }

  subscribe(weddingId: string, handler: (e: ChangeEvent) => void, onStatus?: (s: RealtimeStatus) => void) {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY(weddingId)) handler({ type: "reload" });
    };
    window.addEventListener("storage", onStorage);
    onStatus?.("off");
    return () => window.removeEventListener("storage", onStorage);
  }

  private findWedding(table: TableName, id: string): string | null {
    // 단일 사용자 로컬 모드: 저장된 웨딩은 하나뿐이다.
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("owp:data:v2:")) {
        const data = this.read(k.slice("owp:data:v2:".length));
        if (data && (data[table] as { id: string }[]).some((r) => r.id === id)) return data.wedding.id;
      }
    }
    return null;
  }
}
