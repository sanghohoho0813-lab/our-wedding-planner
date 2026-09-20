// 말한 한 마디 → 하객 한 명 파서 검사 (브라우저 없이 돈다)
// src/lib/voice-guest.ts 를 그대로 가져와 돌린다. 경로 별칭 두 줄만 바꿔치기한다.
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const dir = mkdtempSync(join(tmpdir(), "owp-parse-"));
const src = readFileSync("src/lib/voice-guest.ts", "utf8")
  .replace('import { GUEST_RELATIONS } from "@/lib/labels";', 'const GUEST_RELATIONS = ["가족","친척","친구","직장","학교","지인","부모님 지인","기타"];')
  .replace('import type { GuestSide } from "@/lib/db/types";', 'type GuestSide = "groom" | "bride" | "both";');
writeFileSync(join(dir, "vg.ts"), src);
execFileSync("npx", ["tsc", join(dir, "vg.ts"), "--target", "es2022", "--module", "esnext", "--moduleResolution", "bundler", "--outDir", dir], { stdio: "pipe" });
const { parsePhrase } = await import(join(dir, "vg.js"));

const CASES = [
  ["김철수", { name: "김철수", side: null, relation: null }],
  ["신랑측 친구 김철수", { name: "김철수", side: "groom", relation: "친구" }],
  ["신부측 직장동료 이영희", { name: "이영희", side: "bride", relation: "직장" }],
  ["박민수 두 명", { name: "박민수", companions: 1 }],
  ["최지훈 3명", { name: "최지훈", companions: 2 }],
  ["신부 쪽 학교 동창 한소영", { name: "한소영", side: "bride", relation: "학교" }],
  ["그리고 정다은", { name: "정다은" }],
  ["부모님 지인 오세진 추가", { name: "오세진", relation: "부모님 지인" }],
  ["이모 김순자", { name: "김순자", relation: "친척" }],
  ["신랑측 회사 박대리 두명", { name: "박대리", side: "groom", relation: "직장", companions: 1 }],
  ["음 저기 이철수", { name: "이철수" }],
  // 이름을 통째로 깎아 먹으면 안 된다
  ["다음", { name: "다음" }],
  ["   ", null],
  // 공통 지인 (신랑 · 신부 둘 다 아는 사람)
  ["양가 친구 박준영", { name: "박준영", side: "both", relation: "친구" }],
  ["둘 다 아는 김하늘", { name: "김하늘", side: "both" }],
  ["공통 지인 최유진", { name: "최유진", side: "both", relation: "지인" }],
  // 부부 · 커플 → 동반 1명 (= 2명)
  ["김철수 & 이영희 부부", { name: "김철수 & 이영희", companions: 1 }],
  ["박민수 내외", { name: "박민수", companions: 1 }],
  ["정다은&한지우", { name: "정다은&한지우", companions: 1 }],
  // 숫자를 따로 말하면 그게 이긴다
  ["신랑측 이가족 부부 4명", { name: "이가족", side: "groom", companions: 3 }],
];

let pass = 0;
for (const [input, want] of CASES) {
  const got = parsePhrase(input);
  const ok = want === null ? got === null : !!got && Object.entries(want).every(([k, v]) => got[k] === v);
  console.log(`${ok ? "PASS" : "FAIL"}  "${input}" → ${JSON.stringify(got)}`);
  if (ok) pass++;
}
console.log(`\n${pass}/${CASES.length} passed`);
process.exit(pass === CASES.length ? 0 : 1);
