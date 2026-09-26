/**
 * 실제 Supabase — **같은 계정, 두 기기** (사용자 신고: PC 에서 저장한 게 폰에 안 나온다)
 *
 *   BASE=http://localhost:3001 node qa/real/twodevices.mjs
 *
 * PC(컨텍스트 1) 에서 적고, 폰(컨텍스트 2) 에서 같은 계정으로 로그인해 보이는지 본다.
 * 그리고 폰에서 실수로 '새로 만들기' 를 눌렀을 때 어떻게 되는지도 확인한다.
 */
import { APP, PASSWORD, check, finish, stamp, testEmail } from "./_env.mjs";
import { launch, mainText, newClient } from "./_pair.mjs";

const errors = [];
const browser = await launch();

const signUp = async (c, email, name) => {
  await c.page.goto(`${APP}/signup`, { waitUntil: "domcontentloaded" });
  await c.page.getByLabel("이름").fill(name);
  await c.page.getByLabel("이메일").fill(email);
  await c.page.getByLabel("비밀번호").fill(PASSWORD);
  await c.page.getByRole("button", { name: "가입하기" }).click();
  await c.page.waitForURL(/onboarding|\/$/, { timeout: 60000 });
  await c.page.waitForTimeout(800);
};
const signIn = async (c, email) => {
  await c.page.goto(`${APP}/login`, { waitUntil: "domcontentloaded" });
  await c.page.getByLabel("이메일").fill(email);
  await c.page.getByLabel("비밀번호").fill(PASSWORD);
  await c.page.getByRole("button", { name: "로그인", exact: true }).click();
  await c.page.waitForURL((u) => !/login/.test(u.pathname), { timeout: 60000 });
  await c.page.waitForTimeout(2000);
};
const go = async (c, path) => {
  await c.page.goto(APP + path, { waitUntil: "domcontentloaded" });
  await c.page.waitForTimeout(2000);
};
const code = async (c) => {
  await go(c, "/settings/account");
  return (await c.page.locator("code").first().innerText()).trim();
};

// ── PC: 가입하고 공간을 만든 뒤 할 일을 적는다
const PC = await newClient(browser, "PC", errors);
const email = testEmail("dev" + stamp);
await signUp(PC, email, "상호");
await PC.page.getByLabel("공간 이름").fill("두 기기 검사");
await PC.page.getByRole("radio", { name: /빈 상태로 시작/ }).click();
await PC.page.getByRole("button", { name: "시작하기" }).click();
await PC.page.waitForURL((u) => !/onboarding/.test(u.pathname), { timeout: 60000 });
await go(PC, "/plan");
const input = PC.page.locator("main").getByPlaceholder("할 일 한 줄로 추가");
await input.fill("PC 에서 적은 할 일");
await input.press("Enter");
await PC.page.waitForTimeout(2500);
check("PC 에서 적은 것이 PC 화면에 보인다", /PC 에서 적은 할 일/.test(await mainText(PC)));
const pcCode = await code(PC);

// ── 폰: 같은 계정으로 로그인 (기기만 다르다)
const PHONE = await newClient(browser, "폰", errors, { viewport: { width: 390, height: 844 } });
await signIn(PHONE, email);
{
  await go(PHONE, "/plan");
  const t = await mainText(PHONE);
  check("폰에서 같은 계정으로 로그인하면 PC 기록이 보인다", /PC 에서 적은 할 일/.test(t), t.split("\n").slice(0, 4).join(" · "));
  const phoneCode = await code(PHONE);
  check("두 기기가 같은 결혼 공간을 본다 (초대 코드 동일)", phoneCode === pcCode, `PC ${pcCode} · 폰 ${phoneCode}`);
}

// ── 폰에서 적은 것도 PC 로 간다
{
  await go(PHONE, "/plan");
  const pin = PHONE.page.locator("main").getByPlaceholder("할 일 한 줄로 추가");
  await pin.fill("폰에서 적은 할 일");
  await pin.press("Enter");
  await PHONE.page.waitForTimeout(2500);
  await go(PC, "/plan");
  check("폰에서 적은 것도 PC 에 보인다", /폰에서 적은 할 일/.test(await mainText(PC)));
}

// ── 흔한 실수: 폰에서 '초대 코드로 참여' 대신 '새로 만들기' 를 눌렀다면?
{
  const OTHER = await newClient(browser, "폰(다른 계정)", errors, { viewport: { width: 390, height: 844 } });
  const email2 = testEmail("dev2" + stamp);
  await signUp(OTHER, email2, "지윤");
  await OTHER.page.getByLabel("공간 이름").fill("실수로 새로 만든 공간");
  await OTHER.page.getByRole("radio", { name: /빈 상태로 시작/ }).click();
  await OTHER.page.getByRole("button", { name: "시작하기" }).click();
  await OTHER.page.waitForURL((u) => !/onboarding/.test(u.pathname), { timeout: 60000 });
  await go(OTHER, "/plan");
  const t = await mainText(OTHER);
  check("다른 계정으로 새 공간을 만들면 상대 기록은 안 보인다 (정상)", !/PC 에서 적은 할 일/.test(t));
  const otherCode = await code(OTHER);
  check("이때 초대 코드가 다르다 — 이걸로 구분할 수 있다", otherCode !== pcCode, `상호 ${pcCode} · 다른 공간 ${otherCode}`);

  // 지금 앱이 이 상황을 사용자에게 설명해 주는가?
  await go(OTHER, "/settings/data");
  const card = await mainText(OTHER);
  check("설정 화면이 '어느 공간에 있는지' 를 알려준다", /공간|초대 코드/.test(card), (card.match(/지금 저장되는 곳[\s\S]{0,120}/) ?? [""])[0].replace(/\n+/g, " · "));
}

console.log(`\n콘솔 오류: ${errors.length ? errors.join("\n") : "없음"}`);
await browser.close();
finish();
