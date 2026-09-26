/**
 * 실제 Supabase — 결혼 공간이 엇갈렸을 때 (사용자 신고: PC 에서 적은 게 폰에 안 나온다)
 *
 *   BASE=http://localhost:3001 node qa/real/spaces.mjs
 *
 * 흔한 사고: 상대가 '초대 코드로 참여' 대신 '새로 만들기' 를 눌러 자기 공간을 만든다.
 * 그러면 둘은 서로 다른 공간을 보게 되고, 한쪽 화면은 늘 비어 있다.
 * 앱이 이 상황을 알려주고, 설정에서 상대 공간으로 옮겨갈 수 있어야 한다.
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
const go = async (c, p) => { await c.page.goto(APP + p, { waitUntil: "domcontentloaded" }); await c.page.waitForTimeout(2000); };
const makeSpace = async (c, name) => {
  await c.page.getByLabel("공간 이름").fill(name);
  await c.page.getByRole("radio", { name: /빈 상태로 시작/ }).click();
  await c.page.getByRole("button", { name: "시작하기" }).click();
  await c.page.waitForURL((u) => !/onboarding/.test(u.pathname), { timeout: 60000 });
  await c.page.waitForTimeout(1500);
};

// 상호: 공간을 만들고 기록을 남긴다
const A = await newClient(browser, "상호", errors);
await signUp(A, testEmail("trapA" + stamp), "상호");
await makeSpace(A, "상호의 공간");
await go(A, "/plan");
const i = A.page.locator("main").getByPlaceholder("할 일 한 줄로 추가");
await i.fill("상호가 적은 할 일");
await i.press("Enter");
await A.page.waitForTimeout(2000);
await go(A, "/settings/account");
const codeA = (await A.page.locator("code").first().innerText()).trim();

// 지윤: 실수로 '새로 만들기' 로 자기 공간을 먼저 만든다
const B = await newClient(browser, "지윤", errors, { viewport: { width: 390, height: 844 } });
await signUp(B, testEmail("trapB" + stamp), "지윤");
await makeSpace(B, "지윤이 실수로 만든 공간");

// 그 뒤 상호의 초대 코드로 참여를 시도한다 (앱에 그 길이 있는가?)
await go(B, "/settings/account");
const acct = await mainText(B);
check("참여 후에도 '다른 공간 참여' 길이 설정에 있는가", /초대 코드로 참여|참여하기|공간 참여/.test(acct), acct.split("\n").slice(0, 8).join(" · "));

// 온보딩 주소로 직접 들어가 참여를 시도해 본다 (이미 공간이 있으면 막히는지)
await B.page.goto(`${APP}/onboarding?code=${codeA}`, { waitUntil: "domcontentloaded" });
await B.page.waitForTimeout(2500);
check("이미 공간이 있으면 온보딩은 홈으로 되돌린다", !/onboarding/.test(B.page.url()), B.page.url());

// 설정 화면에서 상대 초대 코드로 참여할 수 있어야 한다 (핵심)
{
  await go(B, "/settings/account");
  const t0 = await mainText(B);
  check("혼자인 공간이면 '나 혼자' 라고 알려준다", /이 공간에는 아직 나 혼자/.test(t0), t0.split("\n").slice(0, 6).join(" · "));
  const box = B.page.getByLabel("상대의 초대 코드");
  check("설정에서 상대 초대 코드를 넣을 수 있다", (await box.count()) > 0);
  await box.fill(codeA);
  await B.page.getByRole("button", { name: "참여", exact: true }).click();
  await B.page.waitForTimeout(6000);
  await go(B, "/plan");
  const t1 = await mainText(B);
  check("참여하면 상대 기록이 바로 보인다", /상호가 적은 할 일/.test(t1), t1.split("\n").slice(0, 4).join(" · "));
  await go(B, "/settings/account");
  const t2 = await mainText(B);
  check("내가 속한 공간 두 곳을 골라서 열 수 있다", /내가 속한 공간 2곳/.test(t2), (t2.match(/내가 속한 공간[^\n]*/) ?? [""])[0]);
}

// RPC 로 직접 참여시킨 뒤, 앱이 어느 공간을 보여주는지 (핵심)
const joined = await B.page.evaluate(async ({ url, key, code }) => {
  const jar = Object.fromEntries(document.cookie.split(";").map((x) => x.trim().split(/=(.*)/s).slice(0, 2)));
  const b = Object.keys(jar).find((k) => /^sb-.*-auth-token(\.\d+)?$/.test(k) && !/verifier/.test(k));
  let raw = "";
  if (b && /\.\d+$/.test(b)) { const stem = b.replace(/\.\d+$/, ""); for (let n = 0; jar[`${stem}.${n}`]; n++) raw += decodeURIComponent(jar[`${stem}.${n}`]); }
  else if (b) raw = decodeURIComponent(jar[b]);
  const token = JSON.parse(raw.startsWith("base64-") ? atob(raw.slice(7)) : raw).access_token;
  const res = await fetch(`${url}/rest/v1/rpc/join_wedding_by_code`, {
    method: "POST", headers: { apikey: key, Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ p_code: code }),
  });
  return { status: res.status, body: (await res.text()).slice(0, 120) };
}, { url: "http://127.0.0.1:54321", key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0", code: codeA });
check("상대 공간 참여 자체는 된다", joined.status === 200, JSON.stringify(joined));

await go(B, "/plan");
const t = await mainText(B);
check("참여했으면 상대의 기록이 보여야 한다", /상호가 적은 할 일/.test(t), `보이는 화면: ${t.split("\n").slice(0, 4).join(" · ")}`);

// 잘못 만든 공간에서 나갈 수 있어야 한다 (한 공간에 두 명까지라, 빈 자리를 만들어 줘야 한다)
{
  await go(B, "/settings/account");
  const btn = B.page.getByRole("button", { name: /지금 보는 공간에서 나가기/ });
  check("잘못 만든 공간에서 나갈 수 있다", (await btn.count()) > 0);
}

console.log(`\n콘솔 오류: ${errors.length ? errors.join("\n") : "없음"}`);
await browser.close();
finish();
