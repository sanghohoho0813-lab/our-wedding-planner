/** 실제 계정 2개(신랑 A · 신부 B)를 화면에서 만들어 한 결혼 공간에 묶는다 */
import { chromium } from "playwright";
import { APP, PASSWORD, stamp, testEmail } from "./_env.mjs";

export async function launch() {
  return chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
}

export async function newClient(browser, label, errors, opts = {}) {
  const ctx = await browser.newContext({
    viewport: opts.viewport ?? { width: 1280, height: 900 },
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    ...(opts.storageState ? { storageState: opts.storageState } : {}),
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
  return { ctx, page, label };
}

export async function signUp(c, who, name) {
  const email = testEmail(who);
  await c.page.goto(`${APP}/signup`, { waitUntil: "domcontentloaded" });
  await c.page.getByLabel("이름").fill(name);
  await c.page.getByLabel("이메일").fill(email);
  await c.page.getByLabel("비밀번호").fill(PASSWORD);
  await c.page.getByRole("button", { name: "가입하기" }).click();
  await c.page.waitForURL(/onboarding|\/$/, { timeout: 90000 });
  await c.page.waitForTimeout(600);
  return email;
}

/** A 가 공간을 만들고 B 가 초대 코드로 합류. seed: "empty" | "original" */
export async function setupPair(browser, errors, { seed = "empty", tag = "" } = {}) {
  const A = await newClient(browser, "신랑", errors);
  const B = await newClient(browser, "신부", errors);
  const emailA = await signUp(A, "a" + tag, "상호");
  await A.page.getByLabel("공간 이름").fill(`실환경 ${tag || stamp}`);
  await A.page.getByLabel("신랑 이름").fill("상호");
  await A.page.getByLabel("신부 이름").fill("지윤");
  await A.page.getByRole("radio", { name: seed === "original" ? /원본 결혼계획표/ : /빈 상태로 시작/ }).click();
  await A.page.getByRole("button", { name: "시작하기" }).click();
  await A.page.waitForURL((u) => !/onboarding/.test(u.pathname), { timeout: 180000 }).catch(async (e) => {
    const body = await A.page.locator("body").innerText().catch(() => "");
    throw new Error(`온보딩이 끝나지 않음: ${body.slice(0, 300).replace(/\n+/g, " | ")}`);
  });
  await A.page.waitForTimeout(2000);

  await A.page.goto(`${APP}/settings/account`, { waitUntil: "domcontentloaded" });
  await A.page.waitForTimeout(1600);
  const code = (await A.page.locator("code").first().innerText()).trim();

  const emailB = await signUp(B, "b" + tag, "지윤");
  await B.page.getByRole("radio", { name: "초대 코드로 참여" }).click();
  await B.page.waitForTimeout(400);
  await B.page.getByLabel("초대 코드").fill(code);
  await B.page.getByRole("button", { name: /참여/ }).last().click();
  await B.page.waitForURL((u) => !/onboarding/.test(u.pathname), { timeout: 40000 });
  await B.page.waitForTimeout(1500);
  return { A, B, code, emailA, emailB };
}

/** 조건이 참이 될 때까지 걸린 시간(ms). 안 되면 null */
export async function waitIn(c, fn, arg, timeout = 10000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await c.page.evaluate(fn, arg).catch(() => false)) return Date.now() - t0;
    await c.page.waitForTimeout(20);
  }
  return null;
}

export const mainText = (c) => c.page.locator("main").innerText();

export function stats(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const at = (q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
  return { n: s.length, median: at(0.5), p95: at(0.95), max: s[s.length - 1] };
}
