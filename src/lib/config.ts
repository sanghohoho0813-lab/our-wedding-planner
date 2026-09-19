export const APP_NAME = "Our Wedding";
export const APP_TAGLINE = "서로의 오늘이, 더 특별한 내일이 되도록";
export const TIMEZONE = "Asia/Seoul";

/**
 * Vercel 이나 .env 에 값을 붙여넣을 때 따옴표 · 앞뒤 공백 · 줄바꿈이 같이 들어오는 일이 잦다.
 * 그대로 두면 "환경변수는 넣었는데 연결이 안 되는" 상태가 되므로 여기서 한 번 정리한다.
 */
function readEnv(raw: string | undefined): string {
  if (!raw) return "";
  let v = raw.trim();
  if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

/**
 * Supabase 주소는 도메인까지만 써야 한다.
 * 뒤에 /rest/v1 같은 경로가 붙어 있으면 로그인 요청이 /rest/v1/auth/v1/token 으로 가서
 * "Invalid path specified in request URL" 이 난다. 붙어 있으면 여기서 떼어낸다.
 * https:// 가 빠진 경우도 채워 준다.
 */
function normalizeSupabaseUrl(v: string): string {
  if (!v) return "";
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return v;
    return u.origin;
  } catch {
    return v.replace(/\/+$/, "");
  }
}

const RAW_URL = readEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const RAW_KEY = readEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const SUPABASE_URL = normalizeSupabaseUrl(RAW_URL);
export const SUPABASE_ANON_KEY = RAW_KEY;

/** 화면에 "어느 프로젝트에 연결했는지" 보여줄 때 쓴다 (공개되어도 되는 값). */
export const SUPABASE_HOST = SUPABASE_URL.replace(/^https?:\/\//i, "");

/** JWT 형태의 Supabase 키에서 role 값을 꺼낸다. 형식이 다르면 null. */
function keyRole(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))) as { role?: unknown };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

/**
 * 환경변수를 넣긴 했는데 값이 잘못된 경우의 안내문. 문제가 없으면 null.
 * (둘 다 비어 있으면 '로컬 저장 모드'이므로 문제가 아니다.)
 */
export const supabaseEnvIssue: string | null = (() => {
  if (!SUPABASE_URL && !SUPABASE_ANON_KEY) return null;

  if (!SUPABASE_URL) {
    return "NEXT_PUBLIC_SUPABASE_URL 이 비어 있어요. Supabase → Project Settings → API 의 Project URL 을 넣어주세요.";
  }
  if (!SUPABASE_ANON_KEY) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY 가 비어 있어요. Supabase → Project Settings → API 의 anon public 키를 넣어주세요.";
  }
  if (/\s/.test(SUPABASE_URL) || /\s/.test(SUPABASE_ANON_KEY)) {
    return "환경변수 값에 공백이나 줄바꿈이 섞여 있어요. 앞뒤 공백 없이 한 줄로 다시 넣어주세요.";
  }
  if (!/^https:\/\//i.test(SUPABASE_URL)) {
    return `NEXT_PUBLIC_SUPABASE_URL 이 주소 형태가 아니에요 (지금: ${RAW_URL}). https://xxxx.supabase.co 를 넣어주세요.`;
  }
  if (/(^|\.)supabase\.com$/i.test(SUPABASE_HOST) || /\/dashboard|\/project\//i.test(RAW_URL)) {
    return "NEXT_PUBLIC_SUPABASE_URL 에 대시보드 주소가 들어갔어요. Project Settings → API 의 Project URL(https://xxxx.supabase.co)을 넣어주세요.";
  }
  if (SUPABASE_ANON_KEY.startsWith("sb_secret_") || keyRole(SUPABASE_ANON_KEY) === "service_role") {
    return "service_role 키가 들어갔어요. 이 키는 브라우저에 노출되면 안 됩니다. 지금 바로 지우고 anon public 키로 바꿔주세요.";
  }
  return null;
})();

/** 값이 다 있고 형식도 맞을 때만 Supabase 모드로 동작한다. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !supabaseEnvIssue);

export const DEFAULT_WEDDING_DATE =
  readEnv(process.env.NEXT_PUBLIC_DEFAULT_WEDDING_DATE) || "2026-12-20";

export const LOCAL_USER_ID = "local-user";
export const LOCAL_WEDDING_ID = "00000000-0000-4000-8000-000000000001";
