export const APP_NAME = "Our Wedding";
export const APP_TAGLINE = "서로의 오늘이, 더 특별한 내일이 되도록";
export const TIMEZONE = "Asia/Seoul";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const DEFAULT_WEDDING_DATE =
  process.env.NEXT_PUBLIC_DEFAULT_WEDDING_DATE ?? "2026-12-21";

export const LOCAL_USER_ID = "local-user";
export const LOCAL_WEDDING_ID = "00000000-0000-4000-8000-000000000001";
