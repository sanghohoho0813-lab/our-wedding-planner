"use client";
import { Download, FileJson, FileSpreadsheet, RotateCcw, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { isSupabaseConfigured } from "@/lib/config";
import type { DataTable } from "@/lib/db/defaults";
import { emptyWeddingData } from "@/lib/db/local";
import { seedWeddingData } from "@/lib/db/seed";
import type { TableName } from "@/lib/db/types";
import { CSV_TABLE_LABEL, csvTemplate, csvToRows, download, parseJSONBackup, toCSV, toJSONBackup } from "@/lib/export";
import { todayISO } from "@/lib/date";
import { toast } from "@/lib/store/ui-store";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChipSelect } from "@/components/ui/Chip";
import { ConfirmSheet } from "@/components/ui/Confirm";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsNav } from "./SettingsNav";

const CSV_TABLES = Object.keys(CSV_TABLE_LABEL) as TableName[];
const IMPORT_TABLES: DataTable[] = ["tasks", "budget_items", "guests", "gifts", "events", "invitation_meetings", "vendors", "venues", "music_items", "outfit_items", "honeymoon_items", "memos"];

export function DataSettings() {
  const data = useWeddingStore((s) => s.data!);
  const add = useWeddingStore((s) => s.add);
  const replaceAll = useWeddingStore((s) => s.replaceAll);
  const [csvTable, setCsvTable] = useState<TableName>("tasks");
  const [importTable, setImportTable] = useState<DataTable>("tasks");
  const [confirm, setConfirm] = useState<null | "restore" | "reset">(null);
  const [pendingJSON, setPendingJSON] = useState<string | null>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const counts = Object.entries(CSV_TABLE_LABEL).map(([t, label]) => [label, (data[t as TableName] as unknown[]).length] as const);

  const onJSONFile = async (f: File | undefined) => {
    if (!f) return;
    setPendingJSON(await f.text());
    setConfirm("restore");
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

  const reset = async () => {
    const fresh = seedWeddingData(emptyWeddingData({ ...data.wedding, total_budget: 0 }), data.wedding.wedding_date);
    await replaceAll(fresh);
    toast("초기화했어요.", { tone: "success" });
  };

  return (
    <div>
      <PageHeader title="데이터 관리" description="백업, 내보내기, 가져오기" />
      <SettingsNav />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="저장 방식" action={<Badge tone={isSupabaseConfigured ? "success" : "warning"}>{isSupabaseConfigured ? "Supabase 연결됨" : "로컬 저장 모드"}</Badge>} />
          <div className="px-5 pb-5 text-[0.875rem] text-fg-2">
            {isSupabaseConfigured ? (
              <p>데이터는 Supabase 데이터베이스에 저장되고, 같은 공간의 두 사람에게 실시간으로 공유돼요.</p>
            ) : (
              <p>
                Supabase 환경변수가 없어 <b>이 브라우저에만</b> 저장돼요. 브라우저 데이터를 지우면 사라질 수 있으니 주기적으로 JSON 백업을 받아두세요. Vercel 배포 시 환경변수를 설정하면 자동으로 DB 모드로 전환돼요.
              </p>
            )}
            <dl className="mt-4 grid grid-cols-3 gap-2 text-[0.75rem]">
              {counts.map(([label, n]) => (
                <div key={label} className="rounded-[10px] bg-surface-2 px-2.5 py-1.5">
                  <dt className="text-fg-3">{label}</dt>
                  <dd className="tabular font-semibold text-fg">{n}건</dd>
                </div>
              ))}
            </dl>
          </div>
        </Card>

        <Card>
          <CardHeader title="JSON 백업" icon={<FileJson />} subtitle="모든 데이터를 하나의 파일로" />
          <div className="space-y-2 px-5 pb-5">
            <Button full variant="outline" onClick={() => download(`our-wedding-backup-${todayISO()}.json`, toJSONBackup(data), "application/json;charset=utf-8")}>
              <Download className="size-4" /> JSON 백업 내려받기
            </Button>
            <input ref={jsonRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onJSONFile(e.target.files?.[0])} />
            <Button full variant="secondary" onClick={() => jsonRef.current?.click()}>
              <Upload className="size-4" /> JSON 백업 복원
            </Button>
            <p className="text-[0.75rem] text-fg-3">복원하면 {isSupabaseConfigured ? "백업의 항목이 현재 데이터에 추가돼요." : "현재 데이터가 백업 내용으로 교체돼요."}</p>
          </div>
        </Card>

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
          <CardHeader title="CSV 가져오기" icon={<Upload />} subtitle="기존 스프레드시트 옮기기" />
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
            <p className="text-[0.75rem] text-fg-3">첫 줄은 헤더여야 해요. 템플릿의 한국어 헤더(제목, 마감일 …)나 영문 키 모두 인식해요. 상태·참석 등은 한국어 값(완료, 참석 …)도 변환돼요.</p>
          </div>
        </Card>

        {!isSupabaseConfigured && (
          <Card>
            <CardHeader title="초기화" icon={<RotateCcw />} />
            <div className="space-y-2 px-5 pb-5">
              <p className="text-[0.875rem] text-fg-2">모든 기록을 지우고 기본 카테고리와 체크리스트만 남겨요. 먼저 JSON 백업을 받아두세요.</p>
              <Button variant="danger" onClick={() => setConfirm("reset")}>
                로컬 데이터 초기화
              </Button>
            </div>
          </Card>
        )}
      </div>

      <ConfirmSheet
        open={confirm === "restore"}
        onClose={() => { setConfirm(null); setPendingJSON(null); }}
        onConfirm={restore}
        title="백업을 복원할까요?"
        message={isSupabaseConfigured ? "백업 파일의 항목이 현재 데이터에 추가돼요. 중복될 수 있어요." : "현재 브라우저의 데이터가 백업 내용으로 완전히 교체돼요."}
        confirmLabel="복원"
        danger
      />
      <ConfirmSheet open={confirm === "reset"} onClose={() => setConfirm(null)} onConfirm={reset} title="정말 초기화할까요?" message="되돌릴 수 없어요. JSON 백업을 먼저 받았는지 확인해 주세요." confirmLabel="초기화" danger />
    </div>
  );
}
