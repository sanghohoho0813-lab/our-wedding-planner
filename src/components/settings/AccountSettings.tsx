"use client";
import { Check, Copy, Link2, LogOut, RefreshCw, Users, Wifi, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabaseEnvIssue } from "@/lib/config";
import { toast } from "@/lib/store/ui-store";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { useWorkspace } from "@/lib/store/workspace";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConnectionCheck } from "./ConnectionCheck";
import { SettingsNav } from "./SettingsNav";

export function AccountSettings() {
  const ws = useWorkspace();
  const email = ws.email;
  const wedding = useWeddingStore((s) => s.data!.wedding);
  const realtime = useWeddingStore((s) => s.realtime);
  const reload = useWeddingStore((s) => s.reload);
  const router = useRouter();
  const [members, setMembers] = useState<number | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void import("@/lib/supabase/client").then(async ({ getSupabaseBrowser }) => {
      const { count } = await getSupabaseBrowser().from("wedding_members").select("user_id", { count: "exact", head: true }).eq("wedding_id", wedding.id);
      setMembers(count ?? null);
    });
  }, [wedding.id]);

  const copy = async (text: string, kind: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
      toast(kind === "code" ? "초대 코드를 복사했어요." : "초대 링크를 복사했어요.", { tone: "success" });
    } catch {
      toast(text);
    }
  };

  const logout = async () => {
    const { getSupabaseBrowser } = await import("@/lib/supabase/client");
    await getSupabaseBrowser().auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  const inviteLink = typeof window !== "undefined" ? `${window.location.origin}/onboarding?code=${wedding.invite_code}` : "";
  const rt = {
    live: { tone: "success" as const, icon: <Wifi className="size-3.5" />, label: "실시간 연결됨" },
    connecting: { tone: "warning" as const, icon: <RefreshCw className="size-3.5 animate-spin" />, label: "연결 중" },
    error: { tone: "danger" as const, icon: <WifiOff className="size-3.5" />, label: "연결 끊김" },
    off: { tone: "neutral" as const, icon: <WifiOff className="size-3.5" />, label: "실시간 꺼짐" },
  }[realtime];

  return (
    <div>
      <PageHeader title="계정" description="로그인 정보와 함께 쓰기" />
      <SettingsNav />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="함께 쓰기" icon={<Users />} subtitle="두 사람이 같은 화면을 봅니다" action={isSupabaseConfigured ? <Badge tone={rt.tone} icon={rt.icon}>{rt.label}</Badge> : undefined} />
          <div className="space-y-3 px-5 pb-5 text-[0.9375rem]">
            {isSupabaseConfigured ? (
              <>
                <p className="text-fg-2">
                  현재 멤버 <b className="text-fg">{members ?? "…"}명</b> / 최대 2명. 한 사람이 고치면 상대 화면에 바로 반영돼요.
                </p>
                <div className="rounded-[14px] border border-line bg-surface-2/60 p-4">
                  <p className="text-[0.8125rem] font-medium text-fg-2">초대 코드</p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 rounded-[12px] border border-line bg-surface px-4 py-3 text-center text-[1.375rem] font-bold tracking-[0.3em] text-fg">{wedding.invite_code}</code>
                    <Button variant="secondary" onClick={() => copy(wedding.invite_code, "code")} aria-label="초대 코드 복사">
                      {copied === "code" ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                  <Button variant="ghost" full className="mt-2" onClick={() => copy(inviteLink, "link")}>
                    {copied === "link" ? <Check className="size-4" /> : <Link2 className="size-4" />} 초대 링크 복사
                  </Button>
                </div>
                <ol className="list-decimal space-y-1 pl-5 text-fg-2">
                  <li>상대에게 초대 링크를 보냅니다.</li>
                  <li>상대가 회원가입을 합니다.</li>
                  <li>코드가 미리 채워진 화면에서 참여하기를 누르면 끝입니다.</li>
                </ol>
                {realtime !== "live" && (
                  <Button variant="outline" full onClick={() => reload()}>
                    <RefreshCw className="size-4" /> 지금 새로 불러오기
                  </Button>
                )}
              </>
            ) : (
              <>
                <Badge tone="warning">로컬 저장 모드</Badge>
                {supabaseEnvIssue && (
                  <p className="rounded-[12px] border border-warning/50 bg-warning-soft px-4 py-3 text-fg">
                    <b>환경변수 값이 잘못됐어요.</b> {supabaseEnvIssue}
                    <span className="mt-1 block text-fg-2">
                      Vercel → Settings → Environment Variables 에서 고친 뒤 반드시 <b>Redeploy</b> 해야 반영돼요.
                    </span>
                  </p>
                )}
                <p className="text-fg-2">
                  지금은 이 기기에만 저장돼서 두 사람이 같이 볼 수 없어요. 함께 쓰려면 Supabase를 연결해야 합니다. 저장소의 <code className="rounded bg-surface-2 px-1">docs/SUPABASE.md</code> 에 순서대로 적어두었어요.
                </p>
                <ol className="list-decimal space-y-1 pl-5 text-fg-2">
                  <li>Supabase 프로젝트를 만듭니다 (무료).</li>
                  <li>SQL Editor 에 <code className="rounded bg-surface-2 px-1">supabase/setup.sql</code> 전체를 붙여넣고 Run 합니다.</li>
                  <li>URL 과 anon key 를 환경변수에 넣고 다시 배포합니다.</li>
                </ol>
              </>
            )}
          </div>
        </Card>

        <ConnectionCheck />

        <Card>
          <CardHeader title="내 계정" />
          <div className="space-y-3 px-5 pb-5 text-[0.9375rem]">
            {isSupabaseConfigured ? (
              <>
                <p className="text-fg-2">
                  이메일 <b className="text-fg">{email ?? "-"}</b>
                </p>
                <Button variant="outline" onClick={logout}>
                  <LogOut className="size-4" /> 로그아웃
                </Button>
              </>
            ) : (
              <p className="text-fg-2">로컬 저장 모드에서는 로그인이 필요 없어요. 데이터는 이 브라우저에만 있습니다.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
