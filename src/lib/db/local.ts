"use client";
import { DEFAULT_WEDDING_DATE, LOCAL_USER_ID, LOCAL_WEDDING_ID } from "@/lib/config";
import { nowISO } from "@/lib/utils";
import type { ChangeEvent, DataAdapter } from "./adapter";
import { seedWeddingData } from "./seed";
import { TABLE_NAMES, type TableMap, type TableName, type Wedding, type WeddingData } from "./types";

const KEY = (wid: string) => `owp:data:${wid}`;

export function emptyWeddingData(wedding: Wedding): WeddingData {
  const base = { wedding } as WeddingData;
  for (const t of TABLE_NAMES) (base as unknown as Record<string, unknown[]>)[t] = [];
  return base;
}

export function createLocalWedding(): Wedding {
  const ts = nowISO();
  return {
    id: LOCAL_WEDDING_ID,
    name: "우리의 결혼 준비",
    wedding_date: DEFAULT_WEDDING_DATE,
    wedding_time: null,
    groom_name: "",
    bride_name: "",
    total_budget: 0,
    invite_code: "LOCAL",
    created_by: LOCAL_USER_ID,
    created_at: ts,
    updated_at: ts,
  };
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
    if (!data) {
      const wedding = createLocalWedding();
      wedding.id = weddingId;
      data = seedWeddingData(emptyWeddingData(wedding), wedding.wedding_date);
      this.write(weddingId, data);
    }
    return data;
  }

  private mutate(wid: string, fn: (d: WeddingData) => void) {
    const data = this.read(wid);
    if (!data) throw new Error("로컬 데이터를 찾을 수 없습니다.");
    fn(data);
    this.write(wid, data);
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
    this.write(weddingId, data);
  }

  subscribe(weddingId: string, handler: (e: ChangeEvent) => void) {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY(weddingId)) handler({ type: "reload" });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }

  private findWedding(table: TableName, id: string): string | null {
    // 단일 사용자 로컬 모드: 저장된 웨딩은 하나뿐이다.
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("owp:data:")) {
        const data = this.read(k.slice("owp:data:".length));
        if (data && (data[table] as { id: string }[]).some((r) => r.id === id)) return data.wedding.id;
      }
    }
    return null;
  }
}
