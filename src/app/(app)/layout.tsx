import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { isSupabaseConfigured, LOCAL_USER_ID, LOCAL_WEDDING_ID } from "@/lib/config";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) {
    return (
      <AppShell mode="local" weddingId={LOCAL_WEDDING_ID} userId={LOCAL_USER_ID}>
        {children}
      </AppShell>
    );
  }
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase
    .from("wedding_members")
    .select("wedding_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/onboarding");
  return (
    <AppShell mode="supabase" weddingId={membership.wedding_id} userId={user.id} userEmail={user.email}>
      {children}
    </AppShell>
  );
}
