"use client";
import { AlertTriangle, CheckCircle2, Loader2, Stethoscope, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, SUPABASE_URL } from "@/lib/config";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";

type Level = "ok" | "warn" | "fail";
interface Row {
  label: string;
  level: Level;
  detail: string;
  /** 문제일 때 무엇을 하면 되는지 */
  fix?: string;
}

const ICON: Record<Level, React.ReactNode> = {
  ok: <CheckCircle2 className="size-4 text-success" />,
  warn: <AlertTriangle className="size-4 text-warning" />,
  fail: <XCircle className="size-4 text-danger" />,
};

/**
 * 둘이 같이 쓰기가 안 될 때, 어디가 막혔는지 알려준다.
 * 설치 순서(표 → 보조 칸 → 실시간)를 그대로 따라가며 확인한다.
 */
export function ConnectionCheck() {
  const wedding = useWeddingStore((s) => s.data!.wedding);
  const realtime = useWeddingStore((s) => s.realtime);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    const out: Row[] = [];
    try {
      out.push({
        label: "환경변수 연결",
        level: "ok",
        detail: SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0] + ".supabase.co",
      });

      const { getSupabaseBrowser } = await import("@/lib/supabase/client");
      const sb = getSupabaseBrowser();

      const { data: auth } = await sb.auth.getUser();
      out.push(
        auth.user
          ? { label: "로그인", level: "ok", detail: auth.user.email ?? auth.user.id.slice(0, 8) }
          : { label: "로그인", level: "fail", detail: "로그인 정보가 없어요", fix: "로그아웃 후 다시 로그인해 주세요." },
      );

      const tables = await sb.from("weddings").select("id").limit(1);
      if (tables.error) {
        out.push({
          label: "표(테이블) 설치",
          level: "fail",
          detail: tables.error.message,
          fix: "Supabase SQL Editor 에서 supabase/setup.sql 전체를 붙여넣고 Run 해 주세요.",
        });
      } else {
        out.push({ label: "표(테이블) 설치", level: "ok", detail: "확인됨" });
      }

      const details = await sb.from("weddings").select("details").eq("id", wedding.id).limit(1);
      out.push(
        details.error
          ? {
              label: "보조 정보 칸(details)",
              level: "warn",
              detail: details.error.message,
              fix: "setup.sql 의 0002 부분까지 실행되었는지 확인해 주세요. 당일 역할 같은 정보가 저장되지 않아요.",
            }
          : { label: "보조 정보 칸(details)", level: "ok", detail: "확인됨" },
      );

      // 쓰기 권한: 값이 바뀌지 않는 저장을 한 번 해 본다
      const write = await sb.from("weddings").update({ name: wedding.name }).eq("id", wedding.id).select("id");
      out.push(
        write.error || (write.data?.length ?? 0) === 0
          ? {
              label: "쓰기 권한",
              level: "fail",
              detail: write.error?.message ?? "내 계정으로 저장할 수 없어요",
              fix: "이 공간의 멤버가 맞는지 확인해 주세요. 초대 링크로 참여했는지 다시 확인이 필요해요.",
            }
          : { label: "쓰기 권한", level: "ok", detail: "저장 가능" },
      );

      const { count } = await sb.from("wedding_members").select("user_id", { count: "exact", head: true }).eq("wedding_id", wedding.id);
      out.push(
        (count ?? 0) >= 2
          ? { label: "함께 쓰는 사람", level: "ok", detail: `${count}명 / 최대 2명` }
          : {
              label: "함께 쓰는 사람",
              level: "warn",
              detail: `${count ?? 0}명 — 아직 혼자예요`,
              fix: "위의 초대 링크를 상대에게 보내고, 상대가 회원가입 후 참여하기를 누르면 됩니다.",
            },
      );

      out.push(
        realtime === "live"
          ? { label: "실시간 동기화", level: "ok", detail: "연결됨 — 상대 수정이 바로 보여요" }
          : {
              label: "실시간 동기화",
              level: realtime === "connecting" ? "warn" : "fail",
              detail: realtime === "connecting" ? "연결 중" : "연결되지 않음",
              fix: "setup.sql 의 0003 부분까지 실행했는지, Supabase → Database → Replication 에서 supabase_realtime 이 켜져 있는지 확인해 주세요.",
            },
      );
    } catch (e) {
      out.push({
        label: "점검 중 오류",
        level: "fail",
        detail: e instanceof Error ? e.message : "알 수 없는 오류",
        fix: "잠시 후 다시 시도해 주세요.",
      });
    }
    setRows(out);
    setRunning(false);
  }, [wedding.id, wedding.name, realtime]);

  useEffect(() => {
    if (isSupabaseConfigured) void run();
    // 처음 한 번만 자동 점검한다. 이후에는 버튼으로.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isSupabaseConfigured) return null;

  const bad = rows?.filter((r) => r.level !== "ok") ?? [];

  return (
    <Card>
      <CardHeader
        title="연결 점검"
        icon={<Stethoscope />}
        subtitle={rows ? (bad.length === 0 ? "모두 정상이에요" : `확인할 것 ${bad.length}가지`) : "확인하는 중"}
        action={
          <Button size="sm" variant="ghost" onClick={run} loading={running}>
            다시 점검
          </Button>
        }
      />
      <div className="px-5 pb-5">
        {!rows ? (
          <p className="flex items-center gap-2 text-[0.9375rem] text-fg-3">
            <Loader2 className="size-4 animate-spin" /> 확인하는 중…
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-[12px] border border-line">
            {rows.map((r) => (
              <li key={r.label} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 shrink-0">{ICON[r.level]}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-[1rem] font-medium text-fg">
                    {r.label}
                    <span className={cn("text-[0.875rem] font-normal", r.level === "ok" ? "text-fg-3" : "text-fg-2")}>{r.detail}</span>
                  </p>
                  {r.fix && <p className="mt-1 text-[0.875rem] leading-snug text-fg-2">{r.fix}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
