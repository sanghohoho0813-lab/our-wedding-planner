import { isSupabaseConfigured } from "@/lib/config";
import { getSupabaseServer } from "@/lib/supabase/server";
import { AccountSettings } from "@/components/settings/AccountSettings";
export const metadata = { title: "계정" };
export default async function AccountPage() {
  let email: string | null = null;
  if (isSupabaseConfigured) {
    const sb = await getSupabaseServer();
    const { data } = await sb.auth.getUser();
    email = data.user?.email ?? null;
  }
  return <AccountSettings email={email} />;
}
