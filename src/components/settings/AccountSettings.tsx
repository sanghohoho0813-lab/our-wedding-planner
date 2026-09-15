"use client";
import { Copy, LogOut, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/config";
import { toast } from "@/lib/store/ui-store";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { useWorkspace } from "@/lib/store/workspace";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsNav } from "./SettingsNav";

export function AccountSettings() {
  const ws = useWorkspace();
  const email = ws.email;
  const wedding = useWeddingStore((s) => s.data!.wedding);
  const router = useRouter();
  const [members, setMembers] = useState<number | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void import("@/lib/supabase/client").then(async ({ getSupabaseBrowser }) => {
      const { count } = await getSupabaseBrowser().from("wedding_members").select("user_id", { count: "exact", head: true }).eq("wedding_id", wedding.id);
      setMembers(count ?? null);
    });
  }, [wedding.id]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(wedding.invite_code);
      toast("초대 코드를 복사했어요.", { tone: "success" });
    } catch {
      toast(`초대 코드: ${wedding.invite_code}`);
    }
  };

  const logout = async () => {
    const { getSupabaseBrowser } = await import("@/lib/supabase/client");
    await getSupabaseBrowser().auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <div>
      <PageHeader title="계정" description="로그인 정보와 파트너 초대" />
      <SettingsNav />
      <div className="grid gap-4 lg:grid-cols-2">
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
              <>
                <Badge tone="warning">로컬 저장 모드</Badge>
                <p className="text-fg-2">로그인 없이 이 기기에만 저장 중이에요. 두 사람이 함께 쓰려면 Supabase를 연결하세요.</p>
                <ol className="list-decimal space-y-1 pl-5 text-fg-2">
                  <li>Supabase 프로젝트 생성 후 SQL 편집기에서 <code className="rounded bg-surface-2 px-1">supabase/migrations/0001_init.sql</code> 실행</li>
                  <li>
                    <code className="rounded bg-surface-2 px-1">NEXT_PUBLIC_SUPABASE_URL</code>, <code className="rounded bg-surface-2 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> 환경변수 설정
                  </li>
                  <li>재배포하면 로그인 · 공유 · 실시간 동기화가 켜져요</li>
                </ol>
              </>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="파트너 초대" icon={<Users />} subtitle="같은 공간에서 함께 기록해요" />
          <div className="space-y-3 px-5 pb-5 text-[0.9375rem]">
            {isSupabaseConfigured ? (
              <>
                <p className="text-fg-2">
                  현재 멤버 <b className="text-fg">{members ?? "…"}명</b> / 최대 2명
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-[12px] border border-line bg-surface-2 px-4 py-3 text-center text-[1.375rem] font-bold tracking-[0.3em] text-fg">{wedding.invite_code}</code>
                  <Button variant="secondary" onClick={copyCode} aria-label="초대 코드 복사">
                    <Copy className="size-4" />
                  </Button>
                </div>
                <p className="text-fg-3">파트너가 회원가입 후 “초대 코드로 참여”에 이 코드를 입력하면 같은 데이터를 함께 수정할 수 있어요.</p>
              </>
            ) : (
              <p className="text-fg-2">Supabase 연결 후 초대 코드가 생성돼요.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
