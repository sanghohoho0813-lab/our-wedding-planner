"use client";
import { create } from "zustand";
import type { ChangeEvent, DataAdapter, RealtimeStatus } from "@/lib/db/adapter";
import { DEFAULTS, type DataTable, type RowValues } from "@/lib/db/defaults";
import type { ActivityLog, TableMap, Wedding, WeddingData } from "@/lib/db/types";
import { ENTITY_LABEL, VENDOR_CATEGORY_LABEL } from "@/lib/labels";
import { formatKRW } from "@/lib/money";
import { josa, nowISO, uid } from "@/lib/utils";
import { toast } from "./ui-store";

type Status = "idle" | "loading" | "ready" | "error";

export interface MutateOpts {
  /** 활동 로그 설명. false면 기록하지 않음, 생략하면 자동 생성 */
  log?: string | false;
  /** 삭제 시 실행 취소 토스트 표시 */
  undo?: boolean;
  silent?: boolean;
}

interface WeddingState {
  status: Status;
  error: string | null;
  data: WeddingData | null;
  weddingId: string | null;
  userId: string | null;
  adapter: DataAdapter | null;
  pending: number;
  lastSavedAt: number | null;
  realtime: RealtimeStatus;
  init: (adapter: DataAdapter, weddingId: string, userId: string) => Promise<void>;
  reload: () => Promise<void>;
  add: <T extends DataTable>(table: T, values: Partial<RowValues<T>> & { id?: string }, opts?: MutateOpts) => TableMap[T];
  patch: <T extends DataTable>(table: T, id: string, patch: Partial<RowValues<T>>, opts?: MutateOpts) => void;
  remove: (table: DataTable, id: string, opts?: MutateOpts) => void;
  restore: <T extends DataTable>(table: T, row: TableMap[T]) => void;
  updateWedding: (patch: Partial<Wedding>, opts?: MutateOpts) => void;
  log: (description: string, entity_type: string, entity_id: string | null, action: ActivityLog["action"]) => void;
  replaceAll: (data: WeddingData) => Promise<void>;
}

const lastLogged = new Map<string, number>();
let unsubscribe: (() => void) | null = null;

function nameOf(table: DataTable, row: Record<string, unknown>): string {
  const candidates = ["title", "name", "recipient", "content", "kind"];
  for (const k of candidates) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v.trim().length > 24 ? v.trim().slice(0, 23) + "…" : v.trim();
  }
  return ENTITY_LABEL[table] ?? table;
}

function describe(
  table: DataTable,
  action: ActivityLog["action"],
  row: Record<string, unknown>,
  patch: Record<string, unknown> | undefined,
  data: WeddingData,
): string {
  const n = nameOf(table, row);
  const has = (k: string) => !!patch && k in patch;
  const q = `'${n}'`;
  switch (table) {
    case "tasks":
      if (action === "create") return `할 일 ${josa(q, "이/가")} 추가되었어요.`;
      if (action === "delete") return `할 일 ${josa(q, "이/가")} 삭제되었어요.`;
      if (patch?.status === "done") return `${q} 할 일을 완료했어요.`;
      if (has("status")) return `${q} 할 일 상태가 변경되었어요.`;
      if (has("due_date")) return `${q} 마감일이 변경되었어요.`;
      if (has("memo")) return `${q} 할 일 메모가 추가되었어요.`;
      return `${q} 할 일이 수정되었어요.`;
    case "budget_items":
      if (action === "create") return `예산 항목 ${josa(q, "이/가")} 추가되었어요.`;
      if (action === "delete") return `예산 항목 ${josa(q, "이/가")} 삭제되었어요.`;
      if (has("actual_amount") || has("estimated_amount")) return `${q} 비용이 수정되었어요.`;
      return `${q} 예산 항목이 수정되었어요.`;
    case "payments": {
      const item = data.budget_items.find((i) => i.id === row.budget_item_id);
      const iq = item ? `'${item.name}'` : "예산 항목";
      if (action === "create")
        return row.paid
          ? `${iq} 결제 ${formatKRW(Number(row.amount))}이 기록되었어요.`
          : `${iq} 결제 예정 ${formatKRW(Number(row.amount))}이 등록되었어요.`;
      if (action === "delete") return `${iq} 결제 기록이 삭제되었어요.`;
      if (patch?.paid === true) return `${iq} ${formatKRW(Number(row.amount))} 결제가 완료되었어요.`;
      return `${iq} 결제 정보가 수정되었어요.`;
    }
    case "guests":
      if (action === "create") return `하객 ${n}님이 추가되었어요.`;
      if (action === "delete") return `하객 ${n}님이 삭제되었어요.`;
      if (patch?.rsvp === "yes") return `하객 ${n}님이 참석 확정되었어요.`;
      if (patch?.rsvp === "no") return `하객 ${n}님이 불참으로 변경되었어요.`;
      if (has("invitation_sent") && patch?.invitation_sent) return `하객 ${n}님에게 청첩장을 전달했어요.`;
      return `하객 ${n}님 정보가 수정되었어요.`;
    case "vendors": {
      const cat = VENDOR_CATEGORY_LABEL[row.category as keyof typeof VENDOR_CATEGORY_LABEL] ?? "업체";
      if (action === "create") return `${cat} 업체 ${josa(q, "이/가")} 추가되었어요.`;
      if (action === "delete") return `${cat} 업체 ${josa(q, "이/가")} 삭제되었어요.`;
      if (has("memo")) return `${q} 업체 메모가 추가되었어요.`;
      if (patch?.status === "contracted") return `${q} 업체와 계약했어요.`;
      return `${q} 업체 정보가 수정되었어요.`;
    }
    case "events":
      if (action === "create") return `${q} 일정이 등록되었어요.`;
      if (action === "delete") return `${q} 일정이 삭제되었어요.`;
      return `${q} 일정이 수정되었어요.`;
    case "invitation_meetings":
      if (action === "create") return `청첩장 모임 ${josa(q, "이/가")} 등록되었어요.`;
      if (action === "delete") return `청첩장 모임 ${josa(q, "이/가")} 삭제되었어요.`;
      return `청첩장 모임 ${josa(q, "이/가")} 수정되었어요.`;
    case "gifts":
      if (action === "create") return `${n} 선물이 추가되었어요.`;
      if (action === "delete") return `${n} 선물이 삭제되었어요.`;
      if (patch?.is_delivered) return `${n} 선물을 전달했어요.`;
      if (patch?.is_purchased) return `${n} 선물을 구매했어요.`;
      return `${n} 선물 정보가 수정되었어요.`;
    case "music_items":
      if (action === "create") return `곡 ${josa(q, "이/가")} 추가되었어요.`;
      if (action === "delete") return `곡 ${josa(q, "이/가")} 삭제되었어요.`;
      if (patch?.is_confirmed) return `곡 ${josa(q, "이/가")} 확정되었어요.`;
      return `곡 ${josa(q, "이/가")} 수정되었어요.`;
    case "outfit_items":
      if (action === "create") return `${n} 정보가 추가되었어요.`;
      if (action === "delete") return `${n} 정보가 삭제되었어요.`;
      return `${n} 정보가 수정되었어요.`;
    case "venues":
      if (action === "create") return `식장 ${josa(q, "이/가")} 추가되었어요.`;
      if (action === "delete") return `식장 ${josa(q, "이/가")} 삭제되었어요.`;
      if (patch?.is_contracted) return `식장 ${josa(q, "과/와")} 계약했어요.`;
      return `식장 ${q} 정보가 수정되었어요.`;
    case "honeymoon":
      return "신혼여행 정보가 수정되었어요.";
    case "honeymoon_items":
      if (action === "create") return `신혼여행 ${josa(q, "이/가")} 추가되었어요.`;
      if (action === "delete") return `신혼여행 ${josa(q, "이/가")} 삭제되었어요.`;
      if (patch?.done) return `신혼여행 ${q} 항목을 완료했어요.`;
      return `신혼여행 ${josa(q, "이/가")} 수정되었어요.`;
    case "memos":
      if (action === "create") return "메모가 추가되었어요.";
      if (action === "delete") return "메모가 삭제되었어요.";
      return "메모가 수정되었어요.";
    case "budget_categories":
      if (action === "create") return `예산 카테고리 ${josa(q, "이/가")} 추가되었어요.`;
      if (action === "delete") return `예산 카테고리 ${josa(q, "이/가")} 삭제되었어요.`;
      return `예산 카테고리 ${josa(q, "이/가")} 수정되었어요.`;
    default: {
      const label = ENTITY_LABEL[table] ?? table;
      const verb = action === "create" ? "추가" : action === "delete" ? "삭제" : "수정";
      return `${label} ${josa(q, "이/가")} ${verb}되었어요.`;
    }
  }
}

export const useWeddingStore = create<WeddingState>((set, get) => {
  const run = (op: () => Promise<void>) => {
    set((s) => ({ pending: s.pending + 1 }));
    op()
      .then(() => set((s) => ({ pending: Math.max(0, s.pending - 1), lastSavedAt: Date.now() })))
      .catch((err: unknown) => {
        console.error(err);
        set((s) => ({ pending: Math.max(0, s.pending - 1) }));
        toast("저장에 실패했어요. 다시 시도해 주세요.", { tone: "error" });
        void get().reload();
      });
  };

  const applyChange = (e: ChangeEvent) => {
    const { data } = get();
    if (!data) return;
    if (e.type === "reload") {
      void get().reload();
      return;
    }
    if (e.type === "wedding") {
      set({ data: { ...data, wedding: e.wedding } });
      return;
    }
    const list = data[e.table] as { id: string }[];
    if (e.type === "delete") {
      if (!list.some((r) => r.id === e.id)) return;
      set({ data: { ...data, [e.table]: list.filter((r) => r.id !== e.id) } });
      return;
    }
    const idx = list.findIndex((r) => r.id === e.row.id);
    const next = [...list];
    if (idx >= 0) next[idx] = { ...next[idx], ...e.row };
    else next.push(e.row);
    set({ data: { ...data, [e.table]: next } });
  };

  return {
    status: "idle",
    error: null,
    data: null,
    weddingId: null,
    userId: null,
    adapter: null,
    pending: 0,
    lastSavedAt: null,
    realtime: "off",

    async init(adapter, weddingId, userId) {
      set({ status: "loading", adapter, weddingId, userId, error: null });
      try {
        const data = await adapter.loadWedding(weddingId);
        set({ data, status: "ready" });
        unsubscribe?.();
        unsubscribe = adapter.subscribe?.(weddingId, applyChange, (realtime) => set({ realtime })) ?? null;
      } catch (err) {
        console.error(err);
        set({ status: "error", error: err instanceof Error ? err.message : "데이터를 불러오지 못했어요." });
      }
    },

    async reload() {
      const { adapter, weddingId } = get();
      if (!adapter || !weddingId) return;
      try {
        const data = await adapter.loadWedding(weddingId);
        set({ data, status: "ready", error: null });
      } catch (err) {
        set({ status: "error", error: err instanceof Error ? err.message : "데이터를 불러오지 못했어요." });
      }
    },

    log(description, entity_type, entity_id, action) {
      const { data, adapter, userId } = get();
      if (!data || !adapter) return;
      const entry: ActivityLog = {
        id: uid(),
        wedding_id: data.wedding.id,
        user_id: userId,
        entity_type,
        entity_id,
        action,
        description,
        created_at: nowISO(),
      };
      set({ data: { ...data, activity_logs: [entry, ...data.activity_logs].slice(0, 200) } });
      run(() => adapter.insert("activity_logs", entry));
    },

    add(table, values, opts) {
      const { data, adapter } = get();
      if (!data || !adapter) throw new Error("not ready");
      const ts = nowISO();
      const row = {
        ...DEFAULTS[table],
        ...values,
        id: values.id ?? uid(),
        wedding_id: data.wedding.id,
        created_at: ts,
        updated_at: ts,
      } as TableMap[typeof table];
      set({ data: { ...data, [table]: [...(data[table] as unknown[]), row] } });
      run(() => adapter.insert(table, row));
      if (opts?.log !== false) {
        const desc = opts?.log ?? describe(table, "create", row as unknown as Record<string, unknown>, undefined, data);
        get().log(desc, table, row.id, "create");
      }
      return row;
    },

    patch(table, id, patch, opts) {
      const { data, adapter } = get();
      if (!data || !adapter) return;
      const list = data[table] as TableMap[typeof table][];
      const idx = list.findIndex((r) => r.id === id);
      if (idx < 0) return;
      const fullPatch = { ...patch, updated_at: nowISO() } as Partial<TableMap[typeof table]>;
      const nextRow = { ...list[idx], ...fullPatch } as TableMap[typeof table];
      const next = [...list];
      next[idx] = nextRow;
      set({ data: { ...data, [table]: next } });
      run(() => adapter.update(table, id, fullPatch));
      if (opts?.log !== false) {
        const key = `${table}:${id}:update`;
        const last = lastLogged.get(key) ?? 0;
        const significant =
          "status" in patch || "rsvp" in patch || "paid" in patch || "is_confirmed" in patch || "is_contracted" in patch;
        if (opts?.log || significant || Date.now() - last > 120_000) {
          lastLogged.set(key, Date.now());
          const desc =
            opts?.log ?? describe(table, "update", nextRow as unknown as Record<string, unknown>, patch as Record<string, unknown>, data);
          get().log(desc, table, id, "update");
        }
      }
    },

    remove(table, id, opts) {
      const { data, adapter } = get();
      if (!data || !adapter) return;
      const list = data[table] as TableMap[typeof table][];
      const row = list.find((r) => r.id === id);
      if (!row) return;
      set({ data: { ...data, [table]: list.filter((r) => r.id !== id) } });
      run(() => adapter.remove(table, id));
      if (opts?.log !== false) {
        const desc = opts?.log ?? describe(table, "delete", row as unknown as Record<string, unknown>, undefined, data);
        get().log(desc, table, id, "delete");
      }
      if (opts?.undo !== false && !opts?.silent) {
        const label = ENTITY_LABEL[table] ?? "항목";
        toast(`${label} 정보가 삭제되었어요.`, {
          duration: 6000,
          action: { label: "실행 취소", onClick: () => get().restore(table, row) },
        });
      }
    },

    restore(table, row) {
      const { data, adapter } = get();
      if (!data || !adapter) return;
      const list = data[table] as TableMap[typeof table][];
      if (list.some((r) => r.id === row.id)) return;
      set({ data: { ...data, [table]: [...list, row] } });
      run(() => adapter.insert(table, row));
      toast("복원되었어요.", { tone: "success" });
    },

    updateWedding(patch, opts) {
      const { data, adapter } = get();
      if (!data || !adapter) return;
      const wedding = { ...data.wedding, ...patch, updated_at: nowISO() };
      set({ data: { ...data, wedding } });
      run(() => adapter.updateWedding(wedding.id, patch));
      if (opts?.log !== false) {
        const key = "wedding:update";
        const last = lastLogged.get(key) ?? 0;
        if (Date.now() - last > 120_000) {
          lastLogged.set(key, Date.now());
          get().log(opts?.log ?? "결혼 기본 정보가 수정되었어요.", "wedding", wedding.id, "update");
        }
      }
    },

    async replaceAll(next) {
      const { adapter, weddingId } = get();
      if (!adapter || !weddingId) return;
      if (adapter.replaceAll) {
        await adapter.replaceAll(weddingId, next);
        set({ data: next });
        return;
      }
      // Supabase: 결혼 정보를 맞추고, 외래키 순서대로 묶어 넣는다(백업 복원 · 원본 재이관).
      // 활동 기록의 user_id 같은 로컬 전용 값은 uploadWorkspace 가 정리한다.
      set((s) => ({ pending: s.pending + 1 }));
      try {
        const { uploadWorkspace } = await import("@/lib/db/handoff");
        await uploadWorkspace(adapter, weddingId, get().userId, next);
        await get().reload();
      } finally {
        set((s) => ({ pending: Math.max(0, s.pending - 1), lastSavedAt: Date.now() }));
      }
    },
  };
});

export function useWeddingData(): WeddingData {
  const data = useWeddingStore((s) => s.data);
  if (!data) throw new Error("Wedding data is not loaded");
  return data;
}
