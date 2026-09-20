/**
 * 검증용 Supabase 스택 접속 정보 (qa/real/* 공용).
 *
 * **운영 보호** — 여기서 쓰는 주소는 반드시 내 컴퓨터에서 돌아가는 스택이어야 한다.
 * 운영 주소(*.supabase.co)로는 어떤 검사도 실행되지 않는다.
 * service_role 키는 어떤 검사에서도 쓰지 않는다(브라우저가 가진 것과 같은 anon 키만 쓴다).
 */
export const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
export const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
export const APP = process.env.BASE ?? "http://localhost:3001";

const host = new URL(SUPABASE_URL).hostname;
if (!["127.0.0.1", "localhost", "::1"].includes(host)) {
  console.error(`검사는 내 컴퓨터의 Supabase 스택에서만 돌린다. 지금 주소: ${SUPABASE_URL}`);
  process.exit(1);
}
if (/service_role/.test(Buffer.from((ANON_KEY.split(".")[1] ?? ""), "base64").toString("utf8"))) {
  console.error("service_role 키로는 검사하지 않는다 (브라우저와 같은 anon 키만 쓴다).");
  process.exit(1);
}

export const results = [];
export function check(name, ok, info = "") {
  results.push({ name, ok });
  console.log(`${ok ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m"} ${name}${info ? "\n       " + info : ""}`);
}
export function finish() {
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed}/${results.length} passed`);
  process.exit(passed === results.length ? 0 : 1);
}
/** 검사 계정은 매번 새로 만든다 (남아 있는 데이터에 기대지 않는다) */
export const stamp = Date.now().toString(36);
export const testEmail = (who) => `owp-${who}-${stamp}@example.test`;
export const PASSWORD = "test-pw-0000!";
