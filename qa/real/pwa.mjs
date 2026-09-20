/**
 * 실제 환경 — PWA (Phase 1.6 / 12번)
 *
 *   BASE=http://localhost:3001 node qa/real/pwa.mjs
 *
 * 자동으로 확인할 수 있는 것만 본다.
 * 홈 화면 설치 · standalone 실행감 · iOS 동작은 실기기가 있어야 한다(보고서에 '미검증'으로 남긴다).
 */
import { APP, check, finish } from "./_env.mjs";
import { launch, newClient, setupPair } from "./_pair.mjs";

const errors = [];
const browser = await launch();

// 로그인하지 않은 상태에서도 서비스 워커 · 매니페스트는 받을 수 있어야 한다
{
  const c = await newClient(browser, "손님", errors);
  const sw = await c.page.request.get(`${APP}/sw.js`);
  check("로그인 전에도 sw.js 를 그대로 받는다 (리다이렉트 없음)", sw.status() === 200 && !/login/.test(sw.url()), `${sw.status()} ${sw.url()}`);
  const mf = await c.page.request.get(`${APP}/manifest.webmanifest`);
  const manifest = mf.status() === 200 ? await mf.json() : null;
  check("매니페스트를 받을 수 있다", mf.status() === 200, String(mf.status()));
  if (manifest) {
    check("standalone 으로 열리게 되어 있다", manifest.display === "standalone", manifest.display);
    check("이름 · 시작 주소 · 언어가 있다", !!manifest.name && !!manifest.start_url && manifest.lang === "ko", `${manifest.name} · ${manifest.start_url} · ${manifest.lang}`);
    const sizes = (manifest.icons ?? []).map((i) => i.sizes);
    check("아이콘 192 · 512 와 maskable 이 있다", sizes.includes("192x192") && sizes.includes("512x512") && (manifest.icons ?? []).some((i) => i.purpose === "maskable"), sizes.join(", "));
    for (const icon of manifest.icons ?? []) {
      const r = await c.page.request.get(APP + icon.src);
      if (r.status() !== 200) check(`아이콘 ${icon.src} 을 받을 수 있다`, false, String(r.status()));
    }
    check("모든 아이콘 파일이 실제로 있다", true);
  }
  await c.ctx.close();
}

// 실제 계정으로 들어가 서비스 워커가 등록되는지, 끊겼을 때 앱이 열리는지
const { A } = await setupPair(browser, errors, { tag: "pwa" });
{
  await A.page.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
  await A.page.waitForTimeout(3000);
  const reg = await A.page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return { ok: false, why: "지원 안 함" };
    const r = await navigator.serviceWorker.getRegistration();
    return { ok: !!r, scope: r?.scope ?? null, active: !!r?.active };
  });
  check("서비스 워커가 등록된다", reg.ok, JSON.stringify(reg));

  // 캐시가 찼는지 (오프라인 진입의 전제)
  await A.page.goto(`${APP}/guests`, { waitUntil: "domcontentloaded" });
  await A.page.waitForTimeout(2000);
  await A.page.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
  await A.page.waitForTimeout(2500);
  const cached = await A.page.evaluate(async () => {
    const names = await caches.keys();
    const out = {};
    for (const n of names) out[n] = (await (await caches.open(n)).keys()).length;
    return out;
  });
  check("화면 · 정적 파일이 캐시에 쌓인다", Object.values(cached).some((n) => n > 0), JSON.stringify(cached));

  // 끊긴 채로 '홈 화면에서 다시 열기' (주소창 새로고침과 같은 상황)
  await A.ctx.setOffline(true);
  await A.page.waitForTimeout(400);
  let offlineOk = false;
  let body = "";
  try {
    await A.page.goto(`${APP}/`, { waitUntil: "domcontentloaded", timeout: 20000 });
    body = await A.page.locator("body").innerText();
    offlineOk = /우리|결혼|할 일|하객|로그인/.test(body);
  } catch (e) {
    body = String(e).slice(0, 80);
  }
  check("끊긴 채로 앱을 다시 열어도 화면이 뜬다 (오프라인 지원)", offlineOk, body.slice(0, 80).replace(/\n+/g, " "));
  await A.ctx.setOffline(false);
}

console.log(`\n콘솔 오류: ${errors.length ? errors.join("\n") : "없음"}`);
await browser.close();
finish();
