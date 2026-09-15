"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/config";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { FieldRow, inputCls } from "@/components/ui/Field";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(params.get("error") ? "로그인 링크가 만료되었거나 잘못되었어요." : null);

  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-[1rem] text-fg-2">
          Supabase가 설정되지 않아 <b>로컬 저장 모드</b>로 동작해요. 로그인 없이 이 기기에만 데이터가 저장됩니다.
        </p>
        <Button full onClick={() => router.replace("/")}>
          시작하기
        </Button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);
    const sb = getSupabaseBrowser();
    try {
      if (mode === "signup") {
        const { error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { display_name: name }, emailRedirectTo: `${location.origin}/auth/callback` },
        });
        if (error) throw error;
        setMsg("가입 확인 메일을 보냈어요. 메일의 링크를 눌러 가입을 완료해 주세요.");
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(params.get("next") ?? "/");
        router.refresh();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "문제가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };

  const magic = async () => {
    if (!email) return setErr("이메일을 입력해 주세요.");
    setLoading(true);
    setErr(null);
    const sb = getSupabaseBrowser();
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    setLoading(false);
    if (error) setErr(error.message);
    else setMsg("로그인 링크를 이메일로 보냈어요.");
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="text-[1.375rem] font-bold text-fg">{mode === "login" ? "로그인" : "회원가입"}</h1>
      {mode === "signup" && (
        <FieldRow label="이름">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="상호" autoComplete="name" />
        </FieldRow>
      )}
      <FieldRow label="이메일" required>
        <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required placeholder="you@example.com" />
      </FieldRow>
      <FieldRow label="비밀번호" required>
        <input
          className={inputCls}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={6}
          placeholder="6자 이상"
        />
      </FieldRow>
      {err && <p className="rounded-[10px] bg-danger-soft px-3 py-2 text-[0.875rem] text-danger">{err}</p>}
      {msg && <p className="rounded-[10px] bg-success-soft px-3 py-2 text-[0.875rem] text-success">{msg}</p>}
      <Button type="submit" full size="lg" loading={loading}>
        {mode === "login" ? "로그인" : "가입하기"}
      </Button>
      {mode === "login" && (
        <Button type="button" variant="ghost" full onClick={magic} disabled={loading}>
          이메일 링크로 로그인
        </Button>
      )}
      <p className="text-center text-[0.875rem] text-fg-3">
        {mode === "login" ? (
          <>
            아직 계정이 없나요?{" "}
            <Link href="/signup" className="font-medium text-accent-text hover:underline">
              회원가입
            </Link>
          </>
        ) : (
          <>
            이미 계정이 있나요?{" "}
            <Link href="/login" className="font-medium text-accent-text hover:underline">
              로그인
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
