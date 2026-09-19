"use client";
import { explainDbError } from "@/lib/db/errors";
import { Button } from "@/components/ui/Button";

export function ErrorCard({ raw, supabase, onRetry }: { raw: string | null; supabase: boolean; onRetry: () => void }) {
  const help = explainDbError(raw);
  const logout = async () => {
    const { getSupabaseBrowser } = await import("@/lib/supabase/client");
    await getSupabaseBrowser().auth.signOut();
    window.location.href = "/login";
  };
  return (
    <div className="card mx-auto mt-10 max-w-lg p-6">
      <p className="text-[1.125rem] font-semibold text-fg">{help.title}</p>
      {help.detail && <p className="mt-1 text-[0.9375rem] leading-relaxed text-fg-2">{help.detail}</p>}
      {help.steps.length > 0 && (
        <ol className="mt-4 list-decimal space-y-1.5 rounded-[12px] bg-surface-2 px-5 py-4 text-[0.9375rem] leading-relaxed text-fg-2">
          {help.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onRetry}>다시 시도</Button>
        {supabase && (
          <Button variant="ghost" onClick={logout}>
            로그아웃
          </Button>
        )}
      </div>
      {raw && help.steps.length > 0 && <p className="mt-3 text-[0.8125rem] text-fg-3">원래 오류: {raw}</p>}
    </div>
  );
}
