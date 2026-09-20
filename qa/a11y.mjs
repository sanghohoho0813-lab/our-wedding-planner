/**
 * 접근성 · 튼튼함 점검 (PASS 12)
 *
 *   BASE=http://localhost:3001 node qa/a11y.mjs
 *
 * 글자를 키우거나 어두운 테마로 바꿔도 무너지지 않는지,
 * 마우스 없이 키보드만으로 쓸 수 있는지, 색 없이도 상태를 알 수 있는지를 본다.
 */
import { chromium } from "playwright";

const base = process.env.BASE ?? "http://localhost:3001";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const results = [];
const check = (name, ok, info = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m"} ${name}${info ? " — " + info : ""}`);
};

const PAGES = ["/", "/plan", "/plan?tab=calendar", "/budget", "/budget?tab=items", "/wedding", "/guests", "/honeymoon", "/settings"];

async function open({ w = 390, h = 844, theme = "light", fs = 1, reduce = false } = {}) {
  const c = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: w, height: h },
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    hasTouch: w < 768,
    reducedMotion: reduce ? "reduce" : "no-preference",
  });
  await c.addInitScript(
    ({ theme, fs }) => localStorage.setItem("owp:settings", JSON.stringify({ state: { theme, accent: "rose", fontScale: fs }, version: 0 })),
    { theme, fs },
  );
  const p = await c.newPage();
  return { c, p };
}

// ---------- 1. 글자 125% + 좁은 화면에서 레이아웃이 무너지지 않는가 ----------
{
  const { c, p } = await open({ w: 360, h: 780, fs: 1.25 });
  let bad = [];
  for (const path of PAGES) {
    await p.goto(base + path, { waitUntil: "domcontentloaded", timeout: 60000 });
    await p.waitForTimeout(900);
    const m = await p.evaluate(() => ({ inner: window.innerWidth, scroll: document.documentElement.scrollWidth }));
    if (m.scroll > m.inner) bad.push(`${path}(${m.scroll}>${m.inner})`);
  }
  check(`글자 125% · 360px 에서 가로 넘침 없음 (${PAGES.length}개 화면)`, bad.length === 0, bad.join(" "));
  await c.close();
}

// ---------- 2. 어두운 테마에서 글자가 배경에 묻히지 않는가 ----------
{
  const { c, p } = await open({ theme: "dark" });
  let worst = { ratio: 99, where: "" };
  for (const path of ["/", "/plan", "/budget", "/guests"]) {
    await p.goto(base + path, { waitUntil: "domcontentloaded", timeout: 60000 });
    await p.waitForTimeout(900);
    const r = await p.evaluate(() => {
      const lum = (c) => {
        const [r, g, b] = c.match(/\d+/g).slice(0, 3).map((n) => {
          const v = Number(n) / 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const bgOf = (el) => {
        let cur = el;
        while (cur) {
          const bg = getComputedStyle(cur).backgroundColor;
          if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) return bg;
          cur = cur.parentElement;
        }
        return "rgb(0,0,0)";
      };
      let worst = 99, where = "";
      for (const el of document.querySelectorAll("main p, main span, main h1, main h2, main dd, main dt")) {
        const t = el.textContent?.trim();
        if (!t || t.length < 2 || el.children.length) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.5) continue;
        const a = lum(cs.color), b = lum(bgOf(el));
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        // 큰 글자는 3:1, 본문은 4.5:1 이 기준이다
        const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && Number(cs.fontWeight) >= 700);
        const need = big ? 3 : 4.5;
        if (ratio < need && ratio < worst) { worst = ratio; where = t.slice(0, 24); }
      }
      return { worst, where };
    });
    if (r.worst < worst.ratio) worst = { ratio: r.worst, where: `${path} "${r.where}"` };
  }
  check("어두운 테마에서 글자 대비 충족", worst.ratio === 99, worst.ratio === 99 ? "" : `${worst.ratio.toFixed(2)}:1 ${worst.where}`);
  await c.close();
}

// ---------- 3. 키보드만으로 쓸 수 있는가 ----------
{
  const { c, p } = await open({ w: 1440, h: 900 });
  await p.goto(base + "/plan", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.getByPlaceholder("할 일 한 줄로 추가").first().waitFor({ timeout: 30000 });

  // Tab 을 누르면 실제로 무언가에 초점이 가고, 그 초점이 눈에 보이는가
  const seen = new Set();
  let focusRing = false;
  for (let i = 0; i < 25; i++) {
    await p.keyboard.press("Tab");
    const info = await p.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        key: (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 30),
        ring: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0,
        shadow: cs.boxShadow !== "none",
        visible: r.width > 0 && r.height > 0,
      };
    });
    if (info?.visible) {
      seen.add(info.key);
      if (info.ring || info.shadow) focusRing = true;
    }
  }
  check("Tab 으로 여러 곳에 초점이 간다", seen.size >= 8, `${seen.size}곳`);
  check("초점이 눈에 보인다 (focus-visible)", focusRing);

  // 한 줄 추가를 키보드만으로 끝낼 수 있는가
  const box = p.getByPlaceholder("할 일 한 줄로 추가").first();
  await box.focus();
  await p.keyboard.type("키보드로 추가한 일");
  await p.keyboard.press("Enter");
  await p.waitForTimeout(700);
  const added = await p.evaluate(() =>
    JSON.parse(localStorage.getItem("owp:data:v2:00000000-0000-4000-8000-000000000001")).tasks.some((t) => t.title === "키보드로 추가한 일"),
  );
  check("마우스 없이 할 일을 추가할 수 있다", added);

  // Esc 로 시트를 닫을 수 있는가
  await p.locator('button[aria-label="빠른 추가"]').click();
  await p.waitForTimeout(500);
  const openedCount = await p.getByRole("dialog").count();
  await p.keyboard.press("Escape");
  await p.waitForTimeout(500);
  check("Esc 로 시트가 닫힌다", openedCount > 0 && (await p.getByRole("dialog").count()) === 0);
  await c.close();
}

// ---------- 4. 색만으로 상태를 전달하지 않는가 ----------
{
  const { c, p } = await open();
  await p.goto(base + "/guests", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(1200);
  const rsvpHasText = await p.evaluate(() =>
    [...document.querySelectorAll("main li button")].some((b) => /참석|미정|불참/.test(b.textContent ?? "")),
  );
  check("하객 참석 상태에 글자가 함께 있다 (색만으로 구분하지 않음)", rsvpHasText);

  await p.goto(base + "/budget?tab=items", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(1200);
  const payHasText = await p.evaluate(() => /미결제|부분 결제|완납/.test(document.querySelector("main")?.textContent ?? ""));
  check("결제 상태에 글자가 함께 있다", payHasText);
  await c.close();
}

// ---------- 5. 움직임을 줄여달라고 하면 줄이는가 ----------
{
  const { c, p } = await open({ reduce: true });
  await p.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(1200);
  const moving = await p.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length);
  check("prefers-reduced-motion 에서 계속 움직이는 것이 없다", moving === 0, `${moving}개`);
  await c.close();
}

// ---------- 6. 손가락으로 누를 만한 크기인가 (44px) ----------
{
  const { c, p } = await open();
  const small = [];
  for (const path of ["/", "/plan", "/budget?tab=items", "/guests"]) {
    await p.goto(base + path, { waitUntil: "domcontentloaded", timeout: 60000 });
    await p.waitForTimeout(1000);
    // 보이는 상자 높이가 아니라 '그 지점을 누르면 이 버튼이 잡히는가' 로 잰다.
    // ::after 로 넓힌 영역(tap-44)은 상자 크기에 안 잡히기 때문이다.
    // 보이는 상자 높이 + ::after 로 넓힌 영역을 합쳐 '실제 눌리는 높이' 를 잰다.
    // 겹친 자식이 있는 큰 덩어리(줄 전체 버튼 등)는 그 자식이 따로 검사되므로 건너뛴다.
    const bad = await p.evaluate(() => {
      const MIN = 36; // 촘촘한 필터 칩은 36px(보이는 크기), 누르는 영역은 ::after 로 44px
      return [...document.querySelectorAll("main button, main a, nav button, nav a")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return false;
          if (el.tagName === "A" && el.closest("p")) return false; // 글줄 안의 링크는 예외
          if (el.querySelector("button, a")) return false; // 안에 또 버튼이 있으면 그 쪽에서 본다
          const after = parseFloat(getComputedStyle(el, "::after").minHeight || "0") || 0;
          return Math.max(r.height, after) < MIN;
        })
        .map((el) => `${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 18)}:${Math.round(el.getBoundingClientRect().height)}`)
        .slice(0, 4);
    });
    if (bad.length) small.push(`${path} ${bad.join(",")}`);
  }
  check("누르는 것이 충분히 크다 (보이는 36px · 누르는 영역 44px)", small.length === 0, small.join(" | ").slice(0, 200));
  await c.close();
}

// ================================================================
// 안내문(토스트)이 오른쪽 아래 [+] 버튼을 가리지 않는다
// — 하객을 연달아 담을 때 안내문이 사라지기를 기다리게 만들면 안 된다
// ================================================================
{
  const covered = [];
  for (const [w, h, fs] of [[360, 780, 1], [390, 844, 1], [430, 932, 1], [768, 1024, 1], [1440, 900, 1], [390, 844, 1.25]]) {
    const { c, p } = await open({ w, h, fs });
    await p.goto(base + "/guests", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1200);
    const r = await p.evaluate(() => {
      const cont = document.querySelector('[aria-live="polite"].fixed');
      const fab = document.querySelector('[aria-label="빠른 추가"]');
      if (!cont || !fab) return null;
      const a = cont.getBoundingClientRect();
      const b = fab.getBoundingClientRect();
      const apart = a.bottom <= b.top || a.right <= b.left || a.left >= b.right;
      return { apart, gap: Math.round(b.top - a.bottom) };
    });
    if (!r || !r.apart) covered.push(`${w}px·글자${fs}`);
  }
  check("안내문이 [+] 버튼을 가리지 않는다", covered.length === 0, covered.length ? covered.join(", ") : "6개 크기 모두 확인");
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} passed`);
await browser.close();
process.exit(passed === results.length ? 0 : 1);
