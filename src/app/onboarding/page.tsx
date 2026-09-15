import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config";
import { getSupabaseServer } from "@/lib/supabase/server";
import { Logo } from "@/components/layout/Logo";
import { OnboardingForm } from "@/components/shared/OnboardingForm";

export const metadata = { title: "시작하기" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  if (!isSupabaseConfigured) redirect("/");
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase.from("wedding_members").select("wedding_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (membership) redirect("/");
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 hero-gradient">
      <div className="mb-8 text-center">
        <Logo size="lg" className="inline-block" />
      </div>
      <div className="card w-full max-w-md p-6 sm:p-7">
        <OnboardingForm />
      </div>
    </div>
  );
}
