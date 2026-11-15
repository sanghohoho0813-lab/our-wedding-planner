/**
 * 실제 Supabase — '폰 브라우저에만 남은 하객' 을 서버로 옮기기
 *
 * 상황: Supabase 를 연결하기 전에 폰에서 신랑측 지인 10여 명을 적었다. 그 기록은 그 브라우저에만 있다.
 * 서버에는 원래 명단(43명)이 이미 있다. '전체 올리기' 를 누르면 모든 게 두 개가 된다.
 * → 서버에 없는 하객만, 고른 묶음만 올라가고, 상대(신부) 화면에 보여야 한다.
 */
import { APP, ANON_KEY, SUPABASE_URL, check, finish } from "./_env.mjs";
import { launch, setupPair, waitIn } from "./_pair.mjs";

const LOCAL_KEY = "owp:data:v2:00000000-0000-4000-8000-000000000001";
const errors = [];
const browser = await launch();
const { A, B } = await setupPair(browser, errors, { seed: "original", tag: "lo" });

// A 의 로그인 토큰으로 서버를 직접 읽는다 (확인용)
const rest = (path) =>
  A.page.evaluate(
    async ({ url, key, path }) => {
      const jar = Object.fromEntries(document.cookie.split(";").map((c) => c.trim().split(/=(.*)/s).slice(0, 2)));
      const base = Object.keys(jar).find((k) => /^sb-.*-auth-token(\.\d+)?$/.test(k));
      let raw = "";
      if (base && /\.\d+$/.test(base)) {
        const stem = base.replace(/\.\d+$/, "");
        for (let i = 0; jar[`${stem}.${i}`]; i++) raw += decodeURIComponent(jar[`${stem}.${i}`]);
      } else if (base) raw = decodeURIComponent(jar[base]);
      const token = JSON.parse(raw.startsWith("base64-") ? atob(raw.slice(7)) : raw).access_token;
      const res = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
      return res.json();
    },
    { url: SUPABASE_URL, key: ANON_KEY, path },
  );

const serverGuests = await rest("guests?select=*");
const [wedding] = await rest("weddings?select=*");
check("서버에 원래 명단이 있다", serverGuests.length === 43, `${serverGuests.length}명`);

// 폰에만 남은 기록: 원래 명단 일부(서버와 같은 사람) + 신랑측 지인 12명 + 신부측 친구 1명 + 띄어쓰기만 다른 중복 1명
const base = serverGuests[0];
const mk = (o) => ({ ...base, id: crypto.randomUUID(), wedding_id: "00000000-0000-4000-8000-000000000001", rsvp: "maybe", companions: 0, invitation_sent: false, memo: null, ...o });
const groomFriends = Array.from({ length: 12 }, (_, i) =>
  mk({ name: `신랑지인${String(i + 1).padStart(2, "0")}`, side: "groom", relation: "지인", companions: i % 3 === 0 ? 1 : 0, invitation_sent: i % 2 === 0, memo: i === 0 ? '회사 동기, "축의금" 따로' : null }),
);
const local = {
  wedding: { ...wedding, id: "00000000-0000-4000-8000-000000000001" },
  guests: [
    ...serverGuests.slice(0, 5).map((g) => mk({ name: g.name, side: g.side, relation: g.relation })),
    ...groomFriends,
    mk({ name: "신랑 지인01", side: "groom", relation: "지인" }),
    mk({ name: "신부친구01", side: "bride", relation: "친구" }),
  ],
  tasks: [],
};
await A.page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [LOCAL_KEY, local]);
await A.page.goto(`${APP}/settings/data`, { waitUntil: "domcontentloaded" });
await A.page.getByText("이 브라우저에만 남아 있는 기록").waitFor({ timeout: 20000 });
await A.page.waitForTimeout(800);

const body = await A.page.locator("main").innerText();
check("서버에 없는 하객만 센다 (원래 명단 · 띄어쓰기 중복 제외)", /서버에 없는 하객 13명/.test(body), body.match(/서버에 없는 하객 \d+명/)?.[0] ?? "카드 없음");
check("묶음으로 보여준다", /신랑측 · 지인 12명/.test(body) && /신부측 · 친구 1명/.test(body));

if (process.env.SHOT) {
  await A.page.setViewportSize({ width: 390, height: 844 });
  await A.page.waitForTimeout(500);
  const card = A.page.locator("text=서버에 없는 하객").first();
  await card.scrollIntoViewIfNeeded();
  await A.page.screenshot({ path: process.env.SHOT });
  await A.page.setViewportSize({ width: 1280, height: 900 });
}

// 신부측 묶음은 빼고 올린다
await A.page.getByRole("checkbox", { name: /신부측 · 친구/ }).click();
const btn = A.page.getByRole("button", { name: /고른 하객 12명만 서버로 올리기/ });
check("고른 묶음 수가 버튼에 나온다", (await btn.count()) === 1);
await btn.click();

const ok = await waitIn(A, () => /서버에 없는 하객 1명/.test(document.querySelector("main")?.innerText ?? ""), null, 15000);
check("올린 뒤에는 뺀 묶음만 남는다", ok !== null);

// 서버 확인
await A.page.waitForTimeout(2500);
const after = await rest("guests?select=*");
const moved = after.filter((g) => /^신랑지인\d\d$/.test(g.name));
check("서버: 원래 43 + 12명", after.length === 55, `${after.length}명`);
check("서버: 신부측 친구는 올라가지 않았다", !after.some((g) => g.name === "신부친구01"));
check("서버: 띄어쓰기만 다른 중복은 한 번만", after.filter((g) => g.name.replace(/\s+/g, "") === "신랑지인01").length === 1);
const g1 = moved.find((g) => g.name === "신랑지인01");
const g2 = moved.find((g) => g.name === "신랑지인02");
check(
  "값이 그대로 (측 · 관계 · 동반 · 청첩장 · 메모)",
  moved.every((g) => g.side === "groom" && g.relation === "지인") && g1?.companions === 1 && g1?.invitation_sent === true && g1?.memo === '회사 동기, "축의금" 따로' && g2?.invitation_sent === false,
);

// 신부 화면
await B.page.goto(`${APP}/guests`, { waitUntil: "domcontentloaded" });
const seen = await waitIn(B, () => (document.querySelector("main")?.innerText.match(/신랑지인\d\d/g) ?? []).length >= 12, null, 15000);
check("신부 화면에 12명이 보인다", seen !== null);

check("화면 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
finish();
