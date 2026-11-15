/**
 * 실제 Supabase — 다른 기기(연결 전 폰) 백업에서 하객 합치기
 *
 * 폰 백업은 원래 명단(43명)에서 출발해 고친 것이다. 합치면
 *  - 새 사람은 더하고, 이미 있는 사람(이름+측)은 건너뛰고
 *  - 원래 사람을 폰에서 고친 칸은 반영하되, 서버에서 이미 고친 칸은 두고
 *  - 폰에서 지운 원래 사람은 정리하고
 *  - 할 일로 이미 옮긴 메모 줄은 하객으로 넣지 않는다.
 * 되돌리기 하면 원래대로.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { APP, ANON_KEY, SUPABASE_URL, check, finish } from "./_env.mjs";
import { launch, setupPair, waitIn } from "./_pair.mjs";

const LOCAL = "00000000-0000-4000-8000-000000000001";
// src/lib/db/migration.ts 의 mix 와 같은 계산 (폰의 로컬 공간이 원래 사람에게 붙인 id)
function mix(seed) {
  const parts = [];
  for (let k = 0; k < 4; k++) {
    let h = (0x811c9dc5 ^ (k * 0x9e3779b9)) >>> 0;
    for (let i = 0; i < seed.length; i++) h = Math.imul((h ^ seed.charCodeAt(i)) >>> 0, 0x01000193) >>> 0;
    parts.push(h);
  }
  const hex = parts.map((n) => n.toString(16).padStart(8, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
const src = fs.readFileSync(new URL("../../src/lib/db/original-data.ts", import.meta.url), "utf8");
const start = src.indexOf("[", src.indexOf('"guests": ['));
let depth = 0, end = start;
for (let i = start; i < src.length; i++) { if (src[i] === "[") depth++; else if (src[i] === "]" && --depth === 0) { end = i; break; } }
const ORIGINAL = JSON.parse(src.slice(start, end + 1));

const errors = [];
const browser = await launch();
const { A, B } = await setupPair(browser, errors, { seed: "original", tag: "mg" });
const rest = (path, init) =>
  A.page.evaluate(async ({ url, key, path, init }) => {
    const jar = Object.fromEntries(document.cookie.split(";").map((c) => c.trim().split(/=(.*)/s).slice(0, 2)));
    const base = Object.keys(jar).find((k) => /^sb-.*-auth-token(\.\d+)?$/.test(k));
    let raw = "";
    if (base && /\.\d+$/.test(base)) { const stem = base.replace(/\.\d+$/, ""); for (let i = 0; jar[`${stem}.${i}`]; i++) raw += decodeURIComponent(jar[`${stem}.${i}`]); }
    else if (base) raw = decodeURIComponent(jar[base]);
    const token = JSON.parse(raw.startsWith("base64-") ? atob(raw.slice(7)) : raw).access_token;
    const res = await fetch(`${url}/rest/v1/${path}`, { ...(init ?? {}), headers: { apikey: key, Authorization: `Bearer ${token}`, "content-type": "application/json", Prefer: "return=representation" } });
    return res.status === 204 ? null : res.json();
  }, { url: SUPABASE_URL, key: ANON_KEY, path, init });

const groom = ORIGINAL.filter((g) => g.side === "groom");
const [X, Y, Z, W] = [groom[0], groom[1], groom[2], groom[3]];
const server0 = await rest("guests?select=*");
const [wedding] = await rest("weddings?select=id");
check("서버에 원래 명단 43명", server0.length === 43, `${server0.length}명`);

// 서버에서 W 의 동반을 먼저 고쳐 둔다 (폰이 같은 칸을 다르게 고쳤어도 서버 것을 지켜야 한다)
const wServer = server0.find((g) => g.name === W.name && g.side === W.side);
await rest(`guests?id=eq.${wServer.id}`, { method: "PATCH", body: JSON.stringify({ companions: 3 }) });
// 서버에 할 일 하나 (폰의 '메모 줄' 이 이미 할 일로 옮겨진 상황)
await rest("tasks", { method: "POST", body: JSON.stringify({ wedding_id: wedding.id, title: "합치기 인원 체크", category: "하객", status: "todo", priority: "normal", assignee: "both" }) });

// 폰 백업 만들기
const phone = ORIGINAL.filter((g) => g.id !== Z.id).map((g) => {
  const o = { ...g, id: mix(`${LOCAL}:${g.id}`), wedding_id: LOCAL };
  if (g.id === X.id) Object.assign(o, { name: `${X.name} 부부`, companions: 1 });
  if (g.id === Y.id) Object.assign(o, { side: "both" });
  if (g.id === W.id) Object.assign(o, { companions: 1 });
  return o;
});
const extra = (name, side = "groom") => ({ ...X, id: crypto.randomUUID(), wedding_id: LOCAL, name, side, relation: "친구", companions: 0 });
phone.push(extra("합치기새사람"), extra("합치기 인원 체크"), extra(server0.find((g) => g.side === "bride").name, "bride"));
const file = path.join(os.tmpdir(), `merge-test-${Date.now()}.json`);
fs.writeFileSync(file, JSON.stringify({ app: "our-wedding-planner", version: 1, data: { wedding: { id: LOCAL }, guests: phone, tasks: [] } }));

await A.page.goto(`${APP}/settings/data`, { waitUntil: "domcontentloaded" });
await A.page.getByText("다른 기기 백업에서 하객 합치기").waitFor({ timeout: 20000 });
await A.page.waitForTimeout(1500);
const card = A.page.locator("section, div.card, [class*=card]").filter({ hasText: "다른 기기 백업에서 하객 합치기" }).last();
await card.locator('input[type="file"]').evaluate((el, [t, n]) => {
  const dt = new DataTransfer();
  dt.items.add(new File([t], n, { type: "application/json" }));
  el.files = dt.files;
  el.dispatchEvent(new Event("change", { bubbles: true }));
}, [fs.readFileSync(file, "utf8"), "backup.json"]);
const dialog = A.page.getByRole("dialog").last();
await dialog.waitFor({ timeout: 10000 });
await A.page.waitForTimeout(600);
const t = await dialog.innerText();
check("새로 추가 1명 (이미 있는 사람 · 할 일로 옮긴 메모는 제외)", /새로 추가\s*1/.test(t) && /합치기새사람/.test(t) && !/새로 추가[\s\S]*합치기 인원 체크[\s\S]*고쳐서/.test(t));
check("고쳐서 반영 2명 (이름+인원, 측)", /고쳐서 반영\s*2/.test(t) && t.includes(`${X.name} → ${X.name} 부부`) && /1명 → 2명/.test(t));
check("폰에서 지운 사람 정리 1명", /명단에서 정리\s*1/.test(t) && t.includes(Z.name));
check("서버에서 먼저 고친 칸은 그대로 둔다고 알려준다", /이미 고친 사람은 그대로/.test(t) && t.includes(W.name));
check("할 일로 옮긴 메모는 넣지 않는다고 알려준다", /할 일로 이미 옮긴 메모/.test(t));
await dialog.getByRole("button", { name: /4건 반영하기/ }).click();
await A.page.waitForTimeout(4000);

const after = await rest("guests?select=*");
const by = (n, s) => after.filter((g) => g.name === n && (!s || g.side === s));
check("서버: 43 + 1 - 1 = 43명", after.length === 43, `${after.length}명`);
check("이름 · 인원이 바뀌었다 (같은 사람, 새로 생기지 않음)", by(`${X.name} 부부`).length === 1 && by(`${X.name} 부부`)[0].companions === 1 && by(X.name, X.side).length === 0);
check("측이 바뀌었다", by(Y.name, "both").length === 1 && by(Y.name, "groom").length === 0);
check("지운 사람은 정리됐다", by(Z.name, Z.side).length === 0);
check("서버에서 고친 동반 3 은 그대로", by(W.name, W.side)[0]?.companions === 3);
check("메모 줄은 하객으로 들어가지 않았다", by("합치기 인원 체크").length === 0);

const seen = await waitIn(B, () => document.querySelector("main") !== null, null, 1000);
await B.page.goto(`${APP}/guests`, { waitUntil: "domcontentloaded" });
const onB = await waitIn(B, (n) => (document.querySelector("main")?.innerText ?? "").includes(n), `${X.name} 부부`, 15000);
check("신부 화면에도 반영", seen !== null && onB !== null);

// 되돌리기
await A.page.getByRole("button", { name: "되돌리기" }).last().click().catch(() => {});
await A.page.waitForTimeout(4000);
const undone = await rest("guests?select=*");
check(
  "되돌리면 원래대로 (추가 취소 · 이름 복구 · 지운 사람 복구)",
  undone.length === 43 && !undone.some((g) => g.name === "합치기새사람") && undone.some((g) => g.name === X.name) && undone.some((g) => g.name === Z.name) && undone.some((g) => g.name === Y.name && g.side === "groom"),
  `${undone.length}명`,
);
check("화면 오류 없음", errors.length === 0, errors.join(" | "));
fs.rmSync(file, { force: true });
await browser.close();
finish();
