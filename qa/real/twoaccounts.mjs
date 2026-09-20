/**
 * 실제 Supabase — 두 계정 동시 사용 (Phase 1.6)
 *
 *   npx supabase start
 *   BASE=http://localhost:3001 node qa/real/twoaccounts.mjs
 *
 * relay 가 아니라 **진짜 Supabase 스택**(Auth · PostgREST · Realtime)에 붙는다.
 * 실제 계정 2개를 화면에서 직접 가입시키고, 초대 코드로 한 공간에 묶은 뒤
 * 두 브라우저 컨텍스트로 동시에 쓴다.
 */
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { ANON_KEY, APP, SUPABASE_URL, check, finish, PASSWORD, stamp, testEmail } from "./_env.mjs";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const errors = [];

async function client(label) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "ko-KR", timezoneId: "Asia/Seoul" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
  return { ctx, page, label };
}

async function signUp(c, who, name) {
  const email = testEmail(who);
  await c.page.goto(`${APP}/signup`, { waitUntil: "domcontentloaded" });
  await c.page.getByLabel("이름").fill(name);
  await c.page.getByLabel("이메일").fill(email);
  await c.page.getByLabel("비밀번호").fill(PASSWORD);
  await c.page.getByRole("button", { name: "가입하기" }).click();
  await c.page.waitForURL(/onboarding|\/$/, { timeout: 30000 });
  return email;
}

const A = await client("신랑");
const B = await client("신부");

// ── 1. 실제 가입 · 공간 만들기 · 초대 코드로 합류
const emailA = await signUp(A, "a", "상호");
await A.page.waitForTimeout(800);
await A.page.getByLabel("공간 이름").fill(`실환경 검증 ${stamp}`);
await A.page.getByLabel("신랑 이름").fill("상호");
await A.page.getByLabel("신부 이름").fill("지윤");
await A.page.getByRole("radio", { name: /빈 상태로 시작/ }).click();
await A.page.getByRole("button", { name: "시작하기" }).click();
await A.page.waitForURL((u) => !/onboarding/.test(u.pathname), { timeout: 40000 });
await A.page.waitForTimeout(1500);
check("A 가 실제로 가입하고 결혼 공간을 만든다", !/onboarding|login/.test(A.page.url()), `${emailA} → ${A.page.url()}`);

// 초대 코드 확인 (설정 › 계정)
await A.page.goto(`${APP}/settings/account`, { waitUntil: "domcontentloaded" });
await A.page.waitForTimeout(1500);
const code = (await A.page.locator("code").first().innerText()).trim();
check("초대 코드가 화면에 나온다", /^[A-Z0-9]{6,8}$/.test(code), code);

const emailB = await signUp(B, "b", "지윤");
await B.page.waitForTimeout(800);
await B.page.getByRole("radio", { name: "초대 코드로 참여" }).click();
await B.page.waitForTimeout(400);
await B.page.getByLabel("초대 코드").fill(code);
await B.page.getByRole("button", { name: /참여/ }).last().click();
await B.page.waitForURL((u) => !/onboarding/.test(u.pathname), { timeout: 40000 });
await B.page.waitForTimeout(1500);
check("B 가 초대 코드로 같은 공간에 들어온다", !/onboarding|login/.test(B.page.url()), `${emailB} → ${B.page.url()}`);

// 실시간 연결이 붙을 때까지 기다린다
const live = async (c) => {
  for (let i = 0; i < 40; i++) {
    const s = await c.page.evaluate(() => document.querySelector('[title*="실시간"], [title*="연결"]')?.getAttribute("title") ?? "");
    if (/실시간 연결됨/.test(s)) return true;
    await c.page.waitForTimeout(250);
  }
  return false;
};
await A.page.goto(`${APP}/plan`, { waitUntil: "domcontentloaded" });
await B.page.goto(`${APP}/plan`, { waitUntil: "domcontentloaded" });
await A.page.waitForTimeout(2000);
await B.page.waitForTimeout(2000);
check("두 사람 모두 실시간 연결됨", (await live(A)) && (await live(B)));

// ── 도우미: B 의 스토어에 값이 도착할 때까지 걸린 시간
async function waitIn(c, fn, arg, timeout = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await c.page.evaluate(fn, arg).catch(() => false)) return Date.now() - t0;
    await c.page.waitForTimeout(15);
  }
  return null;
}
const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const at = (q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
  return { n: s.length, median: at(0.5), p95: at(0.95), max: s[s.length - 1] };
};

// 앱 스토어를 들여다볼 수 있게 (읽기 전용)
const peek = async (c) => c.page.evaluate(() => !!window.__owpStore);

// ── 2. A 가 할 일을 추가/완료 → B 에 반영 (+ 지연 30회 측정)
const taskLat = [];
{
  await A.page.goto(`${APP}/plan`, { waitUntil: "domcontentloaded" });
  await B.page.goto(`${APP}/plan`, { waitUntil: "domcontentloaded" });
  await A.page.waitForTimeout(1500);
  await B.page.waitForTimeout(1500);
  // 상단 검색칸도 "할 일" 을 품고 있다 — 목록 안의 한 줄 추가칸을 정확히 집는다
  const input = A.page.locator("main").getByPlaceholder("할 일 한 줄로 추가");
  for (let i = 0; i < 30; i++) {
    const title = `실환경 할 일 ${i}`;
    await input.fill(title);
    const t0 = Date.now();
    await input.press("Enter");
    const ms = await waitIn(B, (t) => (document.querySelector("main")?.innerText ?? "").includes(t), title, 8000);
    if (ms !== null) taskLat.push(Date.now() - t0);
    await A.page.waitForTimeout(120);
  }
  const s = stats(taskLat);
  check("A 의 할 일이 B 화면에 실시간으로 뜬다 (30회)", taskLat.length === 30, `${taskLat.length}/30 도착`);
  check("할 일 반영 지연: median < 500ms", s.median < 500, `median ${s.median}ms · p95 ${s.p95}ms · max ${s.max}ms`);
  check("할 일 반영 지연: p95 < 1500ms", s.p95 < 1500, `p95 ${s.p95}ms`);
}

// ── 3. 하객 참석 변경 → B 하객수 · 식대
const guestLat = [];
{
  await A.page.goto(`${APP}/guests`, { waitUntil: "domcontentloaded" });
  await B.page.goto(`${APP}/guests`, { waitUntil: "domcontentloaded" });
  await A.page.waitForTimeout(1500);
  const gin = A.page.locator("main").getByPlaceholder(/하객 (이름 )?추가/).first();
  for (let i = 0; i < 10; i++) {
    const name = `실환경하객${i}`;
    await gin.fill(name);
    const t0 = Date.now();
    await gin.press("Enter");
    const ms = await waitIn(B, (t) => (document.querySelector("main")?.innerText ?? "").includes(t), name, 8000);
    if (ms !== null) guestLat.push(Date.now() - t0);
    await A.page.waitForTimeout(120);
  }
  check("A 가 담은 하객이 B 화면에 뜬다 (10회)", guestLat.length === 10, `${guestLat.length}/10`);
  const s = stats(guestLat);
  check("하객 반영 지연: median < 500ms", s.median < 500, `median ${s.median}ms · p95 ${s.p95}ms · max ${s.max}ms`);
}

console.log(`\n콘솔 오류: ${errors.length ? errors.join("\n") : "없음"}`);
await browser.close();
finish();
