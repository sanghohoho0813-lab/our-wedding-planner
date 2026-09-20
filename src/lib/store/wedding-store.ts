"use client";
import { create } from "zustand";
import type { ChangeEvent, DataAdapter, RealtimeStatus } from "@/lib/db/adapter";
import { DEFAULTS, type DataTable, type RowValues } from "@/lib/db/defaults";
import type { ActivityLog, TableMap, Wedding, WeddingData } from "@/lib/db/types";
import { ENTITY_LABEL, VENDOR_CATEGORY_LABEL } from "@/lib/labels";
import { formatKRW } from "@/lib/money";
import { josa, nowISO, particle, uid } from "@/lib/utils";
import { readMembers } from "@/lib/members";
import { explainDbError } from "@/lib/db/errors";
import { markJustAdded } from "@/lib/fresh";
import { enqueue, flushOutbox, onOutboxChange, onOutboxDropped, outboxSize, restoreOutbox, scheduleRetry, type Op } from "./outbox";
import { didITouch, fieldLabel, findClashes, forget, rememberMine, valueLabel } from "./conflict";
import { isTransient } from "./transient";
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
  /** 아직 서버에 못 보낸 수정 건수 (연결되면 자동으로 보낸다) */
  queued: number;
  /** 서버에 못 붙고 있는 상태인가 */
  offline: boolean;
  /** 못 보낸 것들을 지금 바로 다시 보낸다 */
  flush: () => Promise<void>;
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

/**
 * 상대를 부르는 말.
 * 한 공간에 두 사람뿐이라 '나 아닌 멤버' 가 곧 상대다.
 * 이름을 적어두지 않았으면 그냥 '상대' 라고 한다.
 */
function otherLabel(state: { data: WeddingData | null; userId: string | null }): string {
  const w = state.data?.wedding;
  if (!w) return "상대";
  const entry = Object.entries(readMembers(w)).find(([id]) => id !== state.userId);
  const name = entry?.[1]?.name?.trim();
  return name ? `${name}님` : "상대";
}

const lastLogged = new Map<string, number>();
let unsubscribe: (() => void) | null = null;
let onlineHooked = false;

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
  /**
   * 화면은 이미 바뀌었고(낙관적 수정), 이제 서버로 보낸다.
   *
   * 실패했을 때가 중요하다.
   * - 네트워크 문제면 **화면을 되돌리지 않고** 보낼 편지함에 넣어 두었다가 나중에 보낸다.
   *   (전에는 여기서 reload() 를 불러서 방금 고친 내용을 지워 버렸다)
   * - 권한 · 표 없음처럼 고쳐야 하는 문제면 무엇을 하면 되는지 알려주고 서버 상태로 되돌린다.
   */
  const run = (op: () => Promise<void>, undoable?: Op) => {
    set((s) => ({ pending: s.pending + 1 }));
    op()
      .then(() => set((s) => ({ pending: Math.max(0, s.pending - 1), lastSavedAt: Date.now(), queued: outboxSize() })))
      .catch((err: unknown) => {
        console.error(err);
        set((s) => ({ pending: Math.max(0, s.pending - 1) }));
        if (isTransient(err)) {
          // 연결 문제다. 화면을 건드리지 않는다.
          if (undoable) {
            enqueue(undoable);
            set({ queued: outboxSize(), offline: true });
            scheduleRetry(get().adapter);
          } else {
            set({ offline: true });
          }
          return;
        }
        const help = explainDbError(err instanceof Error ? err.message : String(err ?? ""));
        toast(help.known ? `${help.title} — ${help.steps[0] ?? ""}` : "저장에 실패했어요. 다시 시도해 주세요.", {
          tone: "error",
          duration: help.known ? 10000 : 5000,
        });
        void get().reload();
      });
  };

  /**
   * 상대의 수정을 화면에 반영한다.
   *
   * 한 건씩 오면 바로 반영한다(그게 대부분이고, 빠를수록 좋다).
   * 그런데 상대가 원본 데이터를 불러오거나 하객을 한 번에 300명 넣으면 이벤트가
   * 수백 건 쏟아진다. 그때마다 화면 전체를 다시 그리면 상대 폰이 멈춘다
   * (실제로 "Maximum update depth exceeded" 가 났다).
   * 그래서 **첫 건은 즉시, 뒤이어 몰려오는 것은 한 묶음으로** 반영한다.
   */
  const BURST_MS = 80;
  let burst: ChangeEvent[] = [];
  let burstTimer: ReturnType<typeof setTimeout> | null = null;

  const applyChange = (e: ChangeEvent) => {
    if (e.type === "reload" || e.type === "wedding") {
      flushBurst();
      applyNow([e]);
      return;
    }
    if (burstTimer) {
      burst.push(e);
      return;
    }
    applyNow([e]);
    burstTimer = setTimeout(flushBurst, BURST_MS);
  };

  const flushBurst = () => {
    if (burstTimer) {
      clearTimeout(burstTimer);
      burstTimer = null;
    }
    if (burst.length === 0) return;
    const queued = burst;
    burst = [];
    applyNow(queued);
  };

  /** 여러 건을 **한 번에** 화면에 반영한다 (몰려와도 다시 그리기는 한 번) */
  const applyNow = (events: ChangeEvent[]) => {
    const { data } = get();
    if (!data) return;
    let next = data;
    const notices: (() => void)[] = [];
    let changed = false;

    for (const e of events) {
      if (e.type === "reload") {
        void get().reload();
        continue;
      }
      if (e.type === "wedding") {
        next = { ...next, wedding: e.wedding };
        changed = true;
        continue;
      }
      const list = next[e.table] as { id: string }[];
      if (e.type === "delete") {
        if (!list.some((r) => r.id === e.id)) continue;
        // 내가 방금 고치던 걸 상대가 지웠다면 말없이 사라지게 두지 않는다.
        // (내 수정은 이미 서버에 0건으로 처리돼 사라진 상태다)
        const wasMine = didITouch(e.table, e.id);
        forget(e.table, e.id);
        next = { ...next, [e.table]: list.filter((r) => r.id !== e.id) };
        changed = true;
        if (wasMine) {
          const table = e.table;
          notices.push(() => {
            const who = otherLabel(get());
            const what = ENTITY_LABEL[table] ?? "항목";
            toast(`${josa(who, "이/가")} 방금 이 ${josa(what, "을/를")} 지웠어요. 고치던 내용은 저장되지 않았어요.`, {
              tone: "error",
              duration: 9000,
            });
          });
        }
        continue;
      }
      const idx = list.findIndex((r) => r.id === e.row.id);
      const rows = [...list];
      if (idx >= 0) rows[idx] = { ...rows[idx], ...e.row };
      else rows.push(e.row);
      next = { ...next, [e.table]: rows };
      changed = true;

      // 상대가 내가 방금 쓴 칸을 다른 값으로 덮었으면 알려준다.
      // 나중 것이 이기는 규칙은 그대로 두되, 조용히 사라지지는 않게 한다.
      if (idx >= 0) {
        const clashes = findClashes(e.table, e.row.id, e.row as unknown as Record<string, unknown>);
        if (clashes.length > 0) {
          const table = e.table;
          const rowId = e.row.id;
          notices.push(() => {
            const c = clashes[0];
            const more = clashes.length > 1 ? ` 외 ${clashes.length - 1}곳` : "";
            const who = otherLabel(get());
            const what = `${fieldLabel(c.field)}${more}`;
            const val = valueLabel(table, c.field, c.theirValue);
            toast(`${josa(who, "이/가")} ${josa(what, "을/를")} '${val}'${particle(val, "(으)로")} 바꿨어요.`, {
              tone: "error",
              duration: 10000,
              action: {
                label: "내 값으로",
                onClick: () => {
                  const patch = Object.fromEntries(clashes.map((x) => [x.field, x.mineValue]));
                  get().patch(table as DataTable, rowId, patch as never, {
                    log: `${josa(ENTITY_LABEL[table] ?? "항목", "을/를")} 내가 쓴 값으로 되돌렸어요.`,
                  });
                },
              },
            });
          });
        }
      }
    }

    if (changed) set({ data: next });
    for (const n of notices) n();
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
    queued: 0,
    offline: false,
    realtime: "off",

    async init(adapter, weddingId, userId) {
      set({ status: "loading", adapter, weddingId, userId, error: null });
      try {
        const data = await adapter.loadWedding(weddingId);
        set({ data, status: "ready", queued: restoreOutbox() });
        unsubscribe?.();
        unsubscribe = adapter.subscribe?.(weddingId, applyChange, (realtime) => set({ realtime })) ?? null;
        // 껐다 켠 사이에 못 보낸 것이 있으면 지금 보낸다
        void get().flush();
        if (typeof window !== "undefined" && !onlineHooked) {
          onlineHooked = true;
          onOutboxChange((n) => set({ queued: n, offline: n > 0 ? get().offline : false }));
          onOutboxDropped((d) => {
            const help = explainDbError(d[0].error);
            toast(`저장하지 못한 수정 ${d.length}건이 있어요. ${help.known ? (help.steps[0] ?? help.title) : "화면을 새로 불러왔어요."}`, {
              tone: "error",
              duration: 10000,
            });
            void get().reload();
          });
          window.addEventListener("online", () => void get().flush());
        }
      } catch (err) {
        console.error(err);
        set({ status: "error", error: err instanceof Error ? err.message : "데이터를 불러오지 못했어요." });
      }
    },

    async flush() {
      const { adapter } = get();
      if (!adapter) return;
      const before = outboxSize();
      // 못 보낸 것에 대한 안내는 onOutboxDropped 한 곳에서 한다(자동 재시도도 거기로 온다)
      const { left, sent, dropped } = await flushOutbox(adapter);
      set({ queued: left, offline: left > 0 });
      if (sent > 0 && left === 0) {
        toast(`저장 대기 중이던 ${sent}건을 모두 저장했어요.`, { tone: "success" });
        void get().reload();
      } else if (before > 0 && left === 0 && dropped.length === 0) {
        void get().reload();
      }
    },

    /**
     * 서버 상태를 다시 읽어온다.
     *
     * 실패했을 때 **이미 보고 있던 화면을 오류 화면으로 바꾸지 않는다.**
     * 지하철에서 잠깐 끊겼다고 하객 명단이 통째로 사라지면, 그게 제일 나쁜 경험이다.
     * 첫 로딩(아직 아무것도 못 받은 상태)일 때만 오류 화면을 보여준다.
     */
    async reload() {
      const { adapter, weddingId } = get();
      if (!adapter || !weddingId) return;
      try {
        const data = await adapter.loadWedding(weddingId);
        set({ data, status: "ready", error: null, offline: outboxSize() > 0 });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "데이터를 불러오지 못했어요.";
        if (get().data) {
          set({ offline: true });
          return;
        }
        set({ status: "error", error: msg });
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
      // 끊긴 동안의 기록도 쌓아 두었다가 보낸다 (안 그러면 '누가 뭘 했는지' 가 빈다)
      run(() => adapter.insert("activity_logs", entry), { kind: "insert", table: "activity_logs", row: entry });
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
      // 방금 만든 것은 접힘·필터에 숨지 않게 표시해 둔다 (사라지면 저장이 안 된 줄 안다)
      markJustAdded(row.id);
      run(() => adapter.insert(table, row), { kind: "insert", table, row });
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
      rememberMine(table, id, fullPatch as Record<string, unknown>, list[idx] as unknown as Record<string, unknown>);
      run(() => adapter.update(table, id, fullPatch), { kind: "update", table, id, patch: fullPatch as Record<string, unknown> });
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
      run(() => adapter.remove(table, id), { kind: "remove", table, id });
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
      run(() => adapter.insert(table, row), { kind: "insert", table, row });
      toast("복원되었어요.", { tone: "success" });
    },

    updateWedding(patch, opts) {
      const { data, adapter } = get();
      if (!data || !adapter) return;
      const wedding = { ...data.wedding, ...patch, updated_at: nowISO() };
      set({ data: { ...data, wedding } });
      run(() => adapter.updateWedding(wedding.id, patch), { kind: "wedding", id: wedding.id, patch });
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
      // Supabase: **먼저 비우고** 결혼 정보를 맞춘 뒤, 외래키 순서대로 묶어 넣는다.
      // (비우지 않으면 복원이 덧붙이기가 되어 모든 값이 두 배가 된다)
      // 활동 기록의 user_id 같은 로컬 전용 값은 uploadWorkspace 가 정리한다.
      set((s) => ({ pending: s.pending + 1 }));
      try {
        const { uploadWorkspace } = await import("@/lib/db/handoff");
        await adapter.clearWedding?.(weddingId);
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
