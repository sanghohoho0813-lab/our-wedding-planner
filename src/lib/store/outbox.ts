"use client";
import type { DataAdapter } from "@/lib/db/adapter";
import type { DataTable } from "@/lib/db/defaults";
import type { TableMap, TableName, Wedding } from "@/lib/db/types";
import { isTransient } from "./transient";

/**
 * 아직 서버에 못 보낸 수정들 (보낼 편지함).
 *
 * 전에는 저장이 실패하면 오류를 띄우고 `reload()` 를 불렀다. 그런데 reload 는
 * 서버 상태를 다시 읽어오는 것이라, **방금 사용자가 고친 내용을 그대로 지워 버린다.**
 * 지하철에서 잠깐 끊긴 사이에 적은 것이 사라지는 것이다 — 가장 나쁜 종류의 버그다.
 *
 * 그래서 네트워크 때문에 실패한 것은 지우지 않고 여기에 쌓아 두었다가,
 * 연결이 돌아오면 순서대로 다시 보낸다. 화면의 낙관적 수정은 그대로 둔다.
 *
 * 복잡한 병합은 하지 않는다. 같은 칸을 여러 번 고쳤으면 마지막 것만 보내고,
 * 지운 항목에 대한 수정은 버린다. 그 이상은 협업툴의 일이다.
 */

export type Op =
  // 활동 기록(activity_logs)도 끊긴 동안 쌓였다가 나가야 해서 TableName 을 쓴다
  | { kind: "insert"; table: TableName; row: TableMap[TableName] }
  | { kind: "update"; table: DataTable; id: string; patch: Record<string, unknown> }
  | { kind: "remove"; table: DataTable; id: string }
  | { kind: "wedding"; id: string; patch: Partial<Wedding> };

const KEY = "owp:outbox";

let queue: Op[] = [];
const listeners = new Set<(n: number) => void>();
const dropListeners = new Set<(d: Dropped[]) => void>();
let flushing = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let attempt = 0;

function persist() {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify(queue));
  } catch {
    /* 저장 못 해도 메모리 큐는 살아 있다 */
  }
  for (const fn of listeners) fn(queue.length);
}

/** 앱을 껐다 켜도 못 보낸 수정이 살아 있게 한다 */
export function restoreOutbox(): number {
  try {
    if (typeof localStorage === "undefined") return 0;
    const raw = localStorage.getItem(KEY);
    queue = raw ? (JSON.parse(raw) as Op[]) : [];
  } catch {
    queue = [];
  }
  return queue.length;
}

export function outboxSize(): number {
  return queue.length;
}

export function onOutboxChange(fn: (n: number) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * 끝내 못 보낸 수정이 생겼을 때 알려준다.
 * 다시 시도(타이머)에서 버려지는 경우도 있어서, 알림은 여기 한 곳으로 모은다.
 */
export function onOutboxDropped(fn: (d: Dropped[]) => void): () => void {
  dropListeners.add(fn);
  return () => dropListeners.delete(fn);
}

/**
 * 큐에 쌓을 때 같은 대상끼리는 합친다.
 * - 같은 행의 update 가 여러 번이면 한 번으로 모은다 (마지막 값이 이긴다)
 * - remove 가 들어오면 그 행에 대한 앞선 수정은 의미가 없으므로 지운다
 */
export function enqueue(op: Op): void {
  if (op.kind === "update") {
    const prev = queue.find((q) => q.kind === "update" && q.table === op.table && q.id === op.id);
    if (prev && prev.kind === "update") {
      Object.assign(prev.patch, op.patch);
      persist();
      return;
    }
  }
  if (op.kind === "remove") {
    queue = queue.filter((q) => !("id" in q && q.id === op.id && "table" in q && q.table === op.table));
  }
  if (op.kind === "wedding") {
    const prev = queue.find((q) => q.kind === "wedding");
    if (prev && prev.kind === "wedding") {
      Object.assign(prev.patch, op.patch);
      persist();
      return;
    }
  }
  queue.push(op);
  persist();
}

async function send(adapter: DataAdapter, op: Op): Promise<void> {
  if (op.kind === "insert") return adapter.insert(op.table, op.row);
  if (op.kind === "update") return adapter.update(op.table, op.id, op.patch as never);
  if (op.kind === "remove") return adapter.remove(op.table, op.id);
  return adapter.updateWedding(op.id, op.patch);
}

/** 아무리 다시 보내도 안 되는 것 — 큐에서 빼고 사용자에게 알린다 */
export interface Dropped {
  op: Op;
  error: string;
}

export interface FlushResult {
  sent: number;
  left: number;
  dropped: Dropped[];
}

/**
 * 쌓인 것을 앞에서부터 보낸다.
 *
 * - 네트워크 때문에 실패하면 거기서 멈춘다(순서를 지켜야 하므로 건너뛰지 않는다).
 * - 권한 · 제약조건처럼 **고치기 전에는 절대 성공하지 않을** 실패면 그 건만 빼낸다.
 *   안 그러면 그 하나가 뒤에 쌓인 수정 전부를 영원히 막는다. 실제로 그게 더 나쁘다.
 */
export async function flushOutbox(adapter: DataAdapter | null): Promise<FlushResult> {
  if (!adapter || flushing || queue.length === 0) return { sent: 0, left: queue.length, dropped: [] };
  flushing = true;
  let sent = 0;
  const dropped: Dropped[] = [];
  try {
    while (queue.length > 0) {
      const op = queue[0];
      try {
        await send(adapter, op);
      } catch (err) {
        if (isTransient(err)) break; // 아직 안 된다 — 여기서 멈추고 나중에
        dropped.push({ op, error: err instanceof Error ? err.message : String(err ?? "") });
        queue.shift();
        persist();
        continue;
      }
      queue.shift();
      sent++;
      persist();
    }
  } finally {
    flushing = false;
  }
  if (queue.length > 0) scheduleRetry(adapter);
  else attempt = 0;
  if (dropped.length > 0) for (const fn of dropListeners) fn(dropped);
  return { sent, left: queue.length, dropped };
}

/** 2초 → 4초 → 8초 … 최대 30초 간격으로 다시 시도한다 */
export function scheduleRetry(adapter: DataAdapter | null): void {
  if (timer || !adapter || queue.length === 0) return;
  const wait = Math.min(30000, 2000 * 2 ** attempt);
  attempt++;
  timer = setTimeout(() => {
    timer = null;
    void flushOutbox(adapter);
  }, wait);
}

export function clearOutbox(): void {
  queue = [];
  attempt = 0;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  persist();
}

/** 검사·디버그용 */
export function peekOutbox(): Op[] {
  return [...queue];
}
