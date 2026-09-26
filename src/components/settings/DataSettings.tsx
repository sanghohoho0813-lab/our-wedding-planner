"use client";
import { AlertTriangle, CheckCircle2, Database, Download, FileJson, FileSpreadsheet, History, RotateCcw, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { backupStatus, listSnapshots, markBackedUp, SNAPSHOT_LABEL, type Snapshot } from "@/lib/backup";
import { isSupabaseConfigured } from "@/lib/config";
import type { DataTable } from "@/lib/db/defaults";
import { emptyData } from "@/lib/db/migration";
import { buildMigratedData, MIGRATION_AUDIT, MIGRATION_TOTAL, MIGRATION_WARNINGS, migratedRows } from "@/lib/db/migration";
import type { TableName } from "@/lib/db/types";
import { CSV_TABLE_LABEL, csvTemplate, csvToRows, download, parseJSONBackup, toCSV, toJSONBackup } from "@/lib/export";
import { formatKoreanDate, relativeTime, todayISO } from "@/lib/date";
import { toast } from "@/lib/store/ui-store";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChipSelect } from "@/components/ui/Chip";
import { ConfirmSheet } from "@/components/ui/Confirm";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsNav } from "./SettingsNav";
import { StorageCard } from "./StorageCard";

const CSV_TABLES = Object.keys(CSV_TABLE_LABEL) as TableName[];
const IMPORT_TABLES: DataTable[] = ["tasks", "budget_items", "guests", "gifts", "events", "invitation_meetings", "vendors", "venues", "music_items", "outfit_items", "honeymoon_items", "memos"];

export function DataSettings() {
  const data = useWeddingStore((s) => s.data!);
  const add = useWeddingStore((s) => s.add);
  const replaceAll = useWeddingStore((s) => s.replaceAll);
  const [csvTable, setCsvTable] = useState<TableName>("tasks");
  const [importTable, setImportTable] = useState<DataTable>("tasks");
  const [confirm, setConfirm] = useState<null | "restore" | "reset" | "remigrate" | "snapshot">(null);
  const [pendingJSON, setPendingJSON] = useState<string | null>(null);
  const [pendingSnapshot, setPendingSnapshot] = useState<Snapshot | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const refreshLocal = useCallback(() => {
    if (isSupabaseConfigured) return;
    setSnapshots(listSnapshots(data.wedding.id));
    setLastBackupAt(backupStatus().lastBackupAt);
  }, [data.wedding.id]);
  useEffect(() => {
    refreshLocal();
  }, [refreshLocal, data]);
  const jsonRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const counts = Object.entries(CSV_TABLE_LABEL).map(([t, label]) => [label, (data[t as TableName] as unknown[]).length] as const);
  const totalRows = counts.reduce((n, [, c]) => n + c, 0);

  const onJSONFile = async (f: File | undefined) => {
    if (!f) return;
    setPendingJSON(await f.text());
    setConfirm("restore");
  };

  const downloadJSON = () => {
    download(`our-wedding-backup-${todayISO()}.json`, toJSONBackup(data), "application/json;charset=utf-8");
    markBackedUp();
    refreshLocal();
    toast("JSON 백업 파일을 내려받았어요.", { tone: "success" });
  };

  const restoreSnapshot = async () => {
    if (!pendingSnapshot) return;
    try {
      await replaceAll({ ...pendingSnapshot.data, wedding: { ...pendingSnapshot.data.wedding, id: data.wedding.id } });
      toast("스냅샷 시점으로 되돌렸어요.", { tone: "success" });
    } catch (e) {
      toast(e instanceof Error ? e.message : "복원에 실패했어요.", { tone: "error" });
    } finally {
      setPendingSnapshot(null);
    }
  };

  const restore = async () => {
    if (!pendingJSON) return;
    try {
      const next = parseJSONBackup(pendingJSON, data.wedding.id, data);
      await replaceAll(next);
      toast("백업을 복원했어요.", { tone: "success" });
    } catch (e) {
      toast(e instanceof Error ? e.message : "복원에 실패했어요.", { tone: "error" });
    } finally {
      setPendingJSON(null);
      if (jsonRef.current) jsonRef.current.value = "";
    }
  };

  const onCSVFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const rows = csvToRows(importTable, await f.text(), data);
      if (rows.length === 0) return toast("가져올 행이 없어요. 첫 줄이 헤더인지 확인해 주세요.");
      for (const r of rows) add(importTable, r as never, { log: false });
      toast(`${CSV_TABLE_LABEL[importTable]} ${rows.length}건을 가져왔어요.`, { tone: "success" });
    } catch (e) {
      toast(e instanceof Error ? e.message : "가져오기에 실패했어요.", { tone: "error" });
    } finally {
      if (csvRef.current) csvRef.current.value = "";
    }
  };

  const remigrate = async () => {
    const next = buildMigratedData(data.wedding.id, data.wedding.created_by);
    next.wedding = { ...next.wedding, invite_code: data.wedding.invite_code, groom_name: data.wedding.groom_name, bride_name: data.wedding.bride_name };
    await replaceAll(next);
    toast(`원본 결혼계획표 ${MIGRATION_TOTAL}건을 다시 불러왔어요.`, { tone: "success" });
  };

  const reset = async () => {
    await replaceAll(emptyData({ ...data.wedding, total_budget: 0 }));
    toast("모든 기록을 비웠어요.", { tone: "success" });
  };

  const addMigration = async () => {
    let n = 0;
    for (const { table, rows } of migratedRows(data.wedding.id)) {
      for (const row of rows) {
        add(table as DataTable, row as never, { log: false });
        n += 1;
      }
    }
    toast(`원본 데이터 ${n}건을 추가했어요.`, { tone: "success" });
  };

  return (
    <div>
      <PageHeader title="데이터 관리" description="저장 위치, 백업, 내보내기, 원본 이관 결과" />
      <SettingsNav />

      <div className="mb-4 space-y-4">
        <StorageCard />
      </div>

      <Card className="mb-4">
        <CardHeader
          title="원본 결혼계획표 이관 결과"
          icon={<Database />}
          subtitle="Google 스프레드시트 '결혼 계획표_공유용' 기준"
          action={<Badge tone="success">{MIGRATION_TOTAL}건 이관</Badge>}
        />
        <div className="px-5 pb-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-[0.9375rem]">
              <thead>
                <tr className="border-b border-line text-left text-[0.875rem] text-fg-3">
                  <th className="py-2 pr-3 font-medium">원본 시트</th>
                  <th className="py-2 pr-3 text-right font-medium">원본</th>
                  <th className="py-2 pr-3 text-right font-medium">이관</th>
                  <th className="py-2 pr-3 text-right font-medium">제외</th>
                  <th className="py-2 font-medium">비고</th>
                </tr>
              </thead>
              <tbody>
                {MIGRATION_AUDIT.map((a) => (
                  <tr key={a.sheet} className="border-b border-line/60 align-top">
                    <td className="py-2 pr-3 font-medium text-fg whitespace-nowrap">{a.sheet}</td>
                    <td className="py-2 pr-3 text-right tabular text-fg-2">{a.source}</td>
                    <td className={cn("py-2 pr-3 text-right tabular font-semibold", a.migrated > 0 ? "text-success" : "text-fg-3")}>{a.migrated}</td>
                    <td className={cn("py-2 pr-3 text-right tabular", a.skipped > 0 ? "text-warning" : "text-fg-3")}>{a.skipped}</td>
                    <td className="py-2 text-[0.875rem] leading-snug text-fg-3">{a.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[0.875rem] text-fg-3">
            현재 이 워크스페이스에 저장된 기록은 모두 {totalRows}건입니다.
          </p>
        </div>
      </Card>

      {MIGRATION_WARNINGS.length > 0 && (
        <Card className="mb-4">
          <CardHeader title="원본 데이터에서 확인이 필요한 부분" icon={<AlertTriangle />} />
          <ul className="space-y-2 px-5 pb-5">
            {MIGRATION_WARNINGS.map((w) => (
              <li key={w.title} className={cn("rounded-[12px] border px-4 py-3", w.level === "high" ? "border-warning/40 bg-warning-soft/50" : "border-line bg-surface-2/60")}>
                <p className="text-[1rem] font-semibold text-fg">{w.title}</p>
                <p className="mt-0.5 text-[0.9375rem] leading-relaxed text-fg-2">{w.detail}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="저장 방식" action={<Badge tone={isSupabaseConfigured ? "success" : "warning"}>{isSupabaseConfigured ? "Supabase 연결됨" : "로컬 저장 모드"}</Badge>} />
          <div className="px-5 pb-5 text-[1rem] text-fg-2">
            {isSupabaseConfigured ? (
              <p>데이터는 Supabase 데이터베이스에 저장되고, 같은 공간의 두 사람에게 실시간으로 공유돼요.</p>
            ) : (
              <p>
                Supabase 환경변수가 없어 <b className="text-fg">이 브라우저에만</b> 저장돼요. 브라우저 데이터를 지우면 사라질 수 있으니 주기적으로 JSON 백업을 받아두세요.
              </p>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-2 text-[0.875rem] sm:grid-cols-3">
              {counts.map(([label, n]) => (
                <div key={label} className="rounded-[10px] bg-surface-2 px-3 py-2">
                  <dt className="text-fg-3">{label}</dt>
                  <dd className="tabular text-[1.0625rem] font-semibold text-fg">{n}건</dd>
                </div>
              ))}
            </dl>
          </div>
        </Card>

        <Card>
          <CardHeader title="원본 데이터 다시 불러오기" icon={<CheckCircle2 />} subtitle="스프레드시트 내용으로 되돌리거나 덧붙이기" />
          <div className="space-y-2 px-5 pb-5">
            <Button full variant="outline" onClick={() => setConfirm("remigrate")}>
              <RotateCcw className="size-4" /> 원본 결혼계획표로 되돌리기
            </Button>
            <Button full variant="ghost" onClick={addMigration}>
              <Upload className="size-4" /> 지금 데이터에 원본 덧붙이기
            </Button>
            <p className="text-[0.875rem] text-fg-3">
              되돌리기는 지금 기록을 모두 지우고 원본 {MIGRATION_TOTAL}건으로 교체합니다. 덧붙이기는 같은 항목이면 덮어쓰고 새 항목만 추가합니다.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="JSON 백업" icon={<FileJson />} subtitle="모든 데이터를 하나의 파일로" />
          <div className="space-y-2 px-5 pb-5">
            <Button full variant="outline" onClick={downloadJSON}>
              <Download className="size-4" /> JSON 백업 내려받기
            </Button>
            {!isSupabaseConfigured && (
              <p className="text-[0.875rem] text-fg-3">
                {lastBackupAt ? `마지막 백업: ${formatKoreanDate(lastBackupAt.slice(0, 10))} (${relativeTime(lastBackupAt)})` : "아직 백업을 받은 적이 없어요."}
              </p>
            )}
            <input ref={jsonRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onJSONFile(e.target.files?.[0])} />
            <Button full variant="secondary" onClick={() => jsonRef.current?.click()}>
              <Upload className="size-4" /> JSON 백업 복원
            </Button>
          </div>
        </Card>

        {!isSupabaseConfigured && (
          <Card>
            <CardHeader title="자동 스냅샷" icon={<History />} subtitle="실수로 지워도 되돌릴 수 있는 안전망" />
            <div className="space-y-2 px-5 pb-5">
              {snapshots.length === 0 ? (
                <p className="text-[0.9375rem] text-fg-3">아직 스냅샷이 없어요. 하루의 첫 수정 직전과 되돌리기 · 비우기 · 복원 직전에 자동으로 남겨져요.</p>
              ) : (
                <ul className="divide-y divide-line rounded-[12px] border border-line">
                  {snapshots.map((snap) => {
                    const n = (Object.keys(CSV_TABLE_LABEL) as TableName[]).reduce((sum, t) => sum + ((snap.data[t] as unknown[] | undefined)?.length ?? 0), 0);
                    return (
                      <li key={snap.kind} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[1rem] font-medium text-fg">{SNAPSHOT_LABEL[snap.kind]}</p>
                          <p className="text-[0.875rem] text-fg-3">
                            {formatKoreanDate(snap.taken_at.slice(0, 10))} · {relativeTime(snap.taken_at)} · {n}건
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => { setPendingSnapshot(snap); setConfirm("snapshot"); }}>
                          이 시점으로 복원
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="text-[0.875rem] text-fg-3">스냅샷은 이 브라우저 안에만 있어요. 기기를 바꾸거나 브라우저 데이터를 지우면 함께 사라지니 JSON 백업도 같이 받아두세요.</p>
            </div>
          </Card>
        )}

        <Card>
          <CardHeader title="CSV 내보내기" icon={<FileSpreadsheet />} subtitle="엑셀 · 구글 시트에서 열 수 있어요" />
          <div className="space-y-3 px-5 pb-5">
            <ChipSelect size="sm" options={CSV_TABLES.map((t) => ({ value: t, label: CSV_TABLE_LABEL[t]! }))} value={csvTable} onChange={setCsvTable} />
            <Button full variant="outline" onClick={() => download(`${CSV_TABLE_LABEL[csvTable]}-${todayISO()}.csv`, toCSV(csvTable, data), "text/csv;charset=utf-8")}>
              <Download className="size-4" /> {CSV_TABLE_LABEL[csvTable]} CSV 내려받기
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="CSV 가져오기" icon={<Upload />} subtitle="다른 시트 옮기기" />
          <div className="space-y-3 px-5 pb-5">
            <ChipSelect size="sm" options={IMPORT_TABLES.map((t) => ({ value: t, label: CSV_TABLE_LABEL[t]! }))} value={importTable} onChange={setImportTable} />
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-none" onClick={() => download(`${CSV_TABLE_LABEL[importTable]}-템플릿.csv`, csvTemplate(importTable), "text/csv;charset=utf-8")}>
                템플릿
              </Button>
              <input ref={csvRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onCSVFile(e.target.files?.[0])} />
              <Button full onClick={() => csvRef.current?.click()}>
                <Upload className="size-4" /> CSV 파일 선택
              </Button>
            </div>
            <p className="text-[0.875rem] text-fg-3">첫 줄은 헤더여야 해요. 한국어 헤더(제목, 마감일 …)와 한국어 값(완료, 참석 …)을 그대로 인식합니다.</p>
          </div>
        </Card>

        <Card>
          <CardHeader title="전체 비우기" icon={<RotateCcw />} />
          <div className="space-y-2 px-5 pb-5">
            <p className="text-[1rem] text-fg-2">모든 기록을 지웁니다. 되돌릴 수 없으니 JSON 백업을 먼저 받아두세요.</p>
            <Button variant="danger" onClick={() => setConfirm("reset")}>
              전체 비우기
            </Button>
          </div>
        </Card>
      </div>

      <ConfirmSheet
        open={confirm === "restore"}
        onClose={() => { setConfirm(null); setPendingJSON(null); }}
        onConfirm={restore}
        title="백업을 복원할까요?"
        message={isSupabaseConfigured ? "백업 파일의 항목이 현재 데이터에 추가돼요." : "현재 데이터가 백업 내용으로 교체돼요."}
        confirmLabel="복원"
        danger
      />
      <ConfirmSheet
        open={confirm === "remigrate"}
        onClose={() => setConfirm(null)}
        onConfirm={remigrate}
        title="원본 결혼계획표로 되돌릴까요?"
        message={`지금 기록을 모두 지우고 원본 스프레드시트 ${MIGRATION_TOTAL}건으로 교체합니다. 앱에서 추가한 내용은 사라져요.`}
        confirmLabel="되돌리기"
        danger
      />
      <ConfirmSheet
        open={confirm === "snapshot"}
        onClose={() => { setConfirm(null); setPendingSnapshot(null); }}
        onConfirm={restoreSnapshot}
        title="스냅샷 시점으로 되돌릴까요?"
        message={pendingSnapshot ? `${SNAPSHOT_LABEL[pendingSnapshot.kind]} (${relativeTime(pendingSnapshot.taken_at)}) 상태로 교체합니다. 지금 상태는 '통째로 바꾸기 직전' 스냅샷으로 남아요.` : ""}
        confirmLabel="되돌리기"
        danger
      />
      <ConfirmSheet open={confirm === "reset"} onClose={() => setConfirm(null)} onConfirm={reset} title="정말 전체를 비울까요?" message="되돌릴 수 없어요. JSON 백업을 먼저 받았는지 확인해 주세요." confirmLabel="비우기" danger />
    </div>
  );
}
