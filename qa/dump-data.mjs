// 앱이 실제로 저장하는 데이터(localStorage)를 JSON 파일로 뽑는다.
// Supabase 스키마 계약 테스트(scripts/verify_supabase_sql.sh)의 입력으로 쓴다.
// usage: BASE=http://localhost:3001 node qa/dump-data.mjs <출력경로>
import { chromium } from "playwright";
import { writeFileSync } from "fs";

const base = process.env.BASE ?? "http://localhost:3001";
const out = process.argv[2] ?? "/tmp/wedding-data.json";
const WID = "00000000-0000-4000-8000-000000000001";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, locale: "ko-KR", timezoneId: "Asia/Seoul" });
const page = await ctx.newPage();
await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.getByText("우리 결혼식까지").first().waitFor({ timeout: 30000 });
await page.waitForTimeout(800);
const data = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), `owp:data:v2:${WID}`);
await browser.close();

if (!data?.wedding) throw new Error("앱 데이터를 찾지 못했어요.");
// 표를 넣는 순서까지 함께 남긴다 — Supabase 외래키(예산 카테고리 → 항목 → 결제) 때문에 순서가 중요하다.
const ordered = { __tables: Object.keys(data).filter((k) => Array.isArray(data[k])), ...data };
writeFileSync(out, JSON.stringify(ordered, null, 1));
const counts = Object.entries(data).filter(([, v]) => Array.isArray(v)).map(([k, v]) => `${k}=${v.length}`);
console.log(`saved ${out}`);
console.log(counts.join(" "));
