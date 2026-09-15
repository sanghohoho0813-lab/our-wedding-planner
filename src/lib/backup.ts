"use client";
import type { WeddingData } from "@/lib/db/types";
import { todayISO } from "@/lib/date";
import { nowISO } from "@/lib/utils";

/**
 * 로컬 저장 모드의 안전망.
 * - 하루의 첫 수정 직전 상태를 자동 스냅샷으로 남긴다(실수로 지워도 그날 아침으로 되돌릴 수 있게).
 * - 되돌리기 · 전체 비우기 · 백업 복원처럼 통째로 바꾸기 직전에도 한 번 남긴다.
 * - JSON 백업을 언제 받았는지 기억해 두고, 오래됐으면 홈에서 조용히 알려준다.
 */
export const SNAPSHOT_KINDS = ["daily", "before-replace"] as const;
export type SnapshotKind = (typeof SNAPSHOT_KINDS)[number];

export interface Snapshot {
  kind: SnapshotKind;
  taken_at: string;
  reason: string;
  data: WeddingData;
}

export const SNAPSHOT_LABEL: Record<SnapshotKind, string> = {
  daily: "오늘 첫 수정 전",
  "before-replace": "통째로 바꾸기 직전",
};

/** 백업이 이만큼 지났으면 다시 받으라고 알려준다 */
export const BACKUP_NUDGE_DAYS = 7;
/** 한 번도 백업이 없을 때는 첫 수정 후 이만큼 지나면 알려준다 */
export const FIRST_NUDGE_DAYS = 3;

const KEY_SNAPSHOT = (wid: string, kind: SnapshotKind) => `owp:snapshot:v2:${wid}:${kind}`;
const KEY_SNAPSHOT_DATE = (wid: string) => `owp:snapshot:v2:${wid}:daily:date`;
const KEY_LAST_BACKUP = "owp:lastBackupAt";
const KEY_LAST_EDIT = "owp:lastEditAt";
const KEY_FIRST_EDIT = "owp:firstEditAt";
const KEY_SNOOZE = "owp:backupNudgeSnoozedUntil";

function get(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function put(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 용량 초과 등은 조용히 무시한다: 스냅샷은 보조 안전망이다 */
  }
}

export function readSnapshot(wid: string, kind: SnapshotKind): Snapshot | null {
  const raw = get(KEY_SNAPSHOT(wid, kind));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Snapshot;
    if (!parsed?.data?.wedding) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function listSnapshots(wid: string): Snapshot[] {
  return SNAPSHOT_KINDS.map((k) => readSnapshot(wid, k))
    .filter((s): s is Snapshot => !!s)
    .sort((a, b) => b.taken_at.localeCompare(a.taken_at));
}

/** daily 는 하루 한 번만, before-replace 는 매번 덮어쓴다. 저장했으면 true */
export function takeSnapshot(wid: string, data: WeddingData, kind: SnapshotKind, reason: string): boolean {
  if (kind === "daily") {
    const today = todayISO();
    if (get(KEY_SNAPSHOT_DATE(wid)) === today) return false;
    put(KEY_SNAPSHOT_DATE(wid), today);
  }
  const snap: Snapshot = { kind, taken_at: nowISO(), reason, data };
  put(KEY_SNAPSHOT(wid, kind), JSON.stringify(snap));
  return true;
}

export function markEdited() {
  const now = nowISO();
  put(KEY_LAST_EDIT, now);
  if (!get(KEY_FIRST_EDIT)) put(KEY_FIRST_EDIT, now);
}

export function markBackedUp() {
  put(KEY_LAST_BACKUP, nowISO());
}

export function snoozeBackupNudge(days = BACKUP_NUDGE_DAYS) {
  put(KEY_SNOOZE, new Date(Date.now() + days * 86_400_000).toISOString());
}

export interface BackupStatus {
  lastBackupAt: string | null;
  lastEditAt: string | null;
  /** 마지막 백업 이후 수정이 있었는지 */
  dirty: boolean;
  /** 지금 홈에서 백업을 권해야 하는지 */
  shouldNudge: boolean;
  daysSinceBackup: number | null;
}

const daysSince = (iso: string | null, now: number) => (iso ? Math.floor((now - new Date(iso).getTime()) / 86_400_000) : null);

export function backupStatus(now = Date.now()): BackupStatus {
  const lastBackupAt = get(KEY_LAST_BACKUP);
  const lastEditAt = get(KEY_LAST_EDIT);
  const firstEditAt = get(KEY_FIRST_EDIT);
  const snoozedUntil = get(KEY_SNOOZE);
  const dirty = !!lastEditAt && (!lastBackupAt || lastEditAt > lastBackupAt);
  const snoozed = !!snoozedUntil && new Date(snoozedUntil).getTime() > now;
  const sinceBackup = daysSince(lastBackupAt, now);
  const sinceFirstEdit = daysSince(firstEditAt, now);
  const overdue = lastBackupAt ? (sinceBackup ?? 0) >= BACKUP_NUDGE_DAYS : (sinceFirstEdit ?? 0) >= FIRST_NUDGE_DAYS;
  return { lastBackupAt, lastEditAt, dirty, shouldNudge: dirty && overdue && !snoozed, daysSinceBackup: sinceBackup };
}
