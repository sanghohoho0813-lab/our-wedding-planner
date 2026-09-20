/**
 * 실제 Supabase — 권한(RLS) 검증
 *
 *   node qa/real/rls.mjs
 *
 * 실제 계정 3개를 만든다.
 *   A(신랑) · B(신부) — 같은 결혼 공간
 *   C(남)            — 다른 결혼 공간
 *
 * 브라우저가 가진 것과 똑같은 anon 키 + 각자의 로그인 토큰으로
 * 모든 표에 대해 SELECT · INSERT · UPDATE · DELETE 를 시도한다.
 * C 는 A·B 의 데이터를 **한 줄도** 읽거나 고치거나 지울 수 없어야 한다.
 */
import { createClient } from "@supabase/supabase-js";
import { ANON_KEY, SUPABASE_URL, check, finish, PASSWORD, testEmail } from "./_env.mjs";

const client = () => createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function account(who, name) {
  const sb = client();
  const email = testEmail(who);
  const { data, error } = await sb.auth.signUp({ email, password: PASSWORD, options: { data: { display_name: name } } });
  if (error) throw new Error(`${who} 가입 실패: ${error.message}`);
  if (!data.session) {
    const { error: e2 } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
    if (e2) throw new Error(`${who} 로그인 실패: ${e2.message}`);
  }
  const { data: u } = await sb.auth.getUser();
  return { sb, email, id: u.user.id, name };
}

const A = await account("a", "상호");
const B = await account("b", "지윤");
const C = await account("c", "남남");
check("실제 계정 3개 가입 · 로그인", !!(A.id && B.id && C.id), `${A.email} / ${B.email} / ${C.email}`);

// ── A 가 결혼 공간을 만들고 B 를 초대 코드로 들인다
const { data: widA, error: eA } = await A.sb.rpc("create_wedding", {
  p_name: "검증용 결혼 준비", p_wedding_date: "2026-12-20", p_groom_name: "상호", p_bride_name: "지윤", p_total_budget: 50000000,
});
check("A 가 결혼 공간을 만든다", !eA && !!widA, eA?.message ?? widA);

const { data: w } = await A.sb.from("weddings").select("invite_code").eq("id", widA).single();
const { data: joined, error: eJoin } = await B.sb.rpc("join_wedding_by_code", { p_code: w.invite_code });
check("B 가 초대 코드로 같은 공간에 들어온다", !eJoin && joined === widA, eJoin?.message ?? `코드 ${w.invite_code}`);

// C 는 자기 공간을 따로 만든다
const { data: widC } = await C.sb.rpc("create_wedding", {
  p_name: "남의 결혼 준비", p_wedding_date: "2027-05-05", p_groom_name: "남", p_bride_name: "남", p_total_budget: 1000,
});
check("C 는 별도의 공간을 가진다", !!widC && widC !== widA);

// ── A 가 각 표에 한 줄씩 넣는다 (C 가 건드릴 대상)
const ROWS = {
  tasks: { title: "실환경 검사 할 일", category: "기타", status: "todo", priority: "normal", assignee: "both" },
  guests: { name: "비밀 하객", side: "groom", relation: "친구", rsvp: "yes", companions: 1, meal: "yes" },
  budget_items: { name: "비밀 예산", estimated_amount: 1000000, actual_amount: 900000 },
  payments: { title: "비밀 결제", amount: 500000, due_date: "2026-12-01", paid: false },
  events: { title: "비밀 일정", date: "2026-12-01", type: "other" },
  memos: { content: "비밀 메모" },
  venues: { name: "비밀 식장", meal_cost: 50000, guaranteed_guests: 100 },
  vendors: { name: "비밀 업체", category: "photo", status: "candidate" },
  activity_logs: { user_id: A.id, entity_type: "tasks", action: "create", description: "검사 기록" },
};
const ids = {};
// payments.budget_item_id 는 NOT NULL 이다 — 예산 항목을 먼저 만들고 그 id 를 쓴다
{
  const { data } = await A.sb.from("budget_items").insert({ wedding_id: widA, name: "결제가 달린 항목", estimated_amount: 500000 }).select("id").single();
  ROWS.payments.budget_item_id = data.id;
}
for (const [table, row] of Object.entries(ROWS)) {
  const { data, error } = await A.sb.from(table).insert({ ...row, wedding_id: widA }).select("id").single();
  if (error) check(`A 가 ${table} 에 쓴다`, false, error.message);
  else ids[table] = data.id;
}
check("A 가 모든 표에 쓸 수 있다", Object.keys(ids).length === Object.keys(ROWS).length, `${Object.keys(ids).length}/${Object.keys(ROWS).length}개 표`);

// ── B 는 같은 공간이므로 다 보여야 한다
{
  const bad = [];
  for (const table of Object.keys(ids)) {
    const { data, error } = await B.sb.from(table).select("id").eq("id", ids[table]);
    if (error || (data ?? []).length !== 1) bad.push(`${table}(${error?.message ?? "0건"})`);
  }
  check("B 는 같은 공간의 데이터를 모두 읽는다", bad.length === 0, bad.join(", "));
}
{
  const { error } = await B.sb.from("tasks").update({ title: "B 가 고침" }).eq("id", ids.tasks);
  const { data } = await A.sb.from("tasks").select("title").eq("id", ids.tasks).single();
  check("B 는 같은 공간의 데이터를 고칠 수 있다", !error && data.title === "B 가 고침", error?.message ?? data.title);
}

// ── C 는 아무것도 할 수 없어야 한다 (핵심)
{
  const leaks = [];
  for (const table of Object.keys(ids)) {
    const { data } = await C.sb.from(table).select("*").eq("wedding_id", widA);
    if ((data ?? []).length > 0) leaks.push(table);
  }
  check("C 는 남의 공간 데이터를 한 줄도 못 읽는다 (SELECT)", leaks.length === 0, leaks.length ? `샜다: ${leaks.join(", ")}` : `${Object.keys(ids).length}개 표 모두 0건`);
}
{
  const leaks = [];
  for (const table of Object.keys(ids)) {
    const { data } = await C.sb.from(table).select("*").eq("id", ids[table]);
    if ((data ?? []).length > 0) leaks.push(table);
  }
  check("C 는 id 를 정확히 알아도 못 읽는다", leaks.length === 0, leaks.join(", ") || "id 직접 조회도 0건");
}
{
  const wrote = [];
  for (const [table, row] of Object.entries(ROWS)) {
    const { error } = await C.sb.from(table).insert({ ...row, wedding_id: widA, name: row.name ? "C 가 몰래" : undefined });
    if (!error) wrote.push(table);
  }
  check("C 는 남의 공간에 쓸 수 없다 (INSERT)", wrote.length === 0, wrote.length ? `들어갔다: ${wrote.join(", ")}` : "모두 거부됨");
}
{
  const changed = [];
  for (const table of Object.keys(ids)) {
    await C.sb.from(table).update({ wedding_id: widC }).eq("id", ids[table]);
    const { data } = await A.sb.from(table).select("wedding_id").eq("id", ids[table]).maybeSingle();
    if (!data || data.wedding_id !== widA) changed.push(table);
  }
  check("C 는 남의 데이터를 고칠 수 없다 (UPDATE)", changed.length === 0, changed.join(", ") || "모두 그대로");
}
{
  const gone = [];
  for (const table of Object.keys(ids)) {
    await C.sb.from(table).delete().eq("id", ids[table]);
    const { data } = await A.sb.from(table).select("id").eq("id", ids[table]).maybeSingle();
    if (!data) gone.push(table);
  }
  check("C 는 남의 데이터를 지울 수 없다 (DELETE)", gone.length === 0, gone.length ? `지워졌다: ${gone.join(", ")}` : "모두 남아 있음");
}
{
  const { data: ws } = await C.sb.from("weddings").select("id, name, invite_code");
  const sawOther = (ws ?? []).some((x) => x.id === widA);
  check("C 는 남의 결혼 공간 자체를 못 본다", !sawOther, `C 에게 보이는 공간 ${ws?.length ?? 0}개`);
}
{
  // 초대 코드를 알아내도 이미 2명이면 못 들어온다
  const { error } = await C.sb.rpc("join_wedding_by_code", { p_code: w.invite_code });
  check("이미 두 명이면 세 번째 사람은 초대 코드로도 못 들어온다", !!error, error?.message ?? "들어와졌다 ❌");
}
{
  // 로그인하지 않은 사람 (anon)
  const anon = client();
  const out = [];
  for (const table of ["tasks", "guests", "budget_items", "weddings"]) {
    const { data } = await anon.from(table).select("*").limit(1);
    if ((data ?? []).length > 0) out.push(table);
  }
  check("로그인하지 않으면 아무것도 못 읽는다", out.length === 0, out.join(", ") || "4개 표 모두 0건");
}
{
  // 남의 프로필 · 설정
  const { data: prof } = await C.sb.from("profiles").select("*").eq("id", A.id);
  const { data: st } = await C.sb.from("user_settings").select("*").eq("user_id", A.id);
  check("C 는 남의 프로필 · 설정을 못 본다", (prof ?? []).length === 0 && (st ?? []).length === 0);
}

finish();
