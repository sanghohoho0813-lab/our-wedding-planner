import { GUEST_RELATIONS } from "@/lib/labels";
import type { GuestSide } from "@/lib/db/types";

/**
 * 말한 한 마디를 하객 한 명으로 바꾼다.
 *
 * 문장 하나를 통째로 갈라서 여러 명을 뽑아내는 건 한국어 음성 인식으로는 잘 안 된다
 * (이름 사이에 쉼표가 안 찍히고, 이름끼리 붙어 버린다).
 * 그래서 "한 번에 한 명씩, 사이를 두고 말한다" 를 전제로 한다 — 잠깐 멈출 때마다
 * 한 마디가 끝나므로, 그 한 마디를 한 명으로 본다. 훨씬 덜 틀린다.
 *
 * 말 속에 '신랑측' · '친구' · '두 명' 같은 게 섞여 있으면 거기서 떼어 내 채운다.
 */

export interface ParsedGuest {
  name: string;
  side: GuestSide | null;
  relation: string | null;
  companions: number | null;
}

const SIDE_WORDS: [RegExp, GuestSide][] = [
  [/신랑\s*측|신랑\s*쪽|신랑편|남편\s*측/g, "groom"],
  [/신부\s*측|신부\s*쪽|신부편|아내\s*측/g, "bride"],
];

// 말할 때 흔히 쓰는 말 → 관계 항목
const RELATION_WORDS: [RegExp, string][] = [
  [/직장\s*동료|회사\s*동료|직장|회사/g, "직장"],
  [/부모님\s*지인|부모님\s*친구|어머니\s*친구|아버지\s*친구/g, "부모님 지인"],
  [/학교\s*동창|동창|학교|대학|고등학교|중학교/g, "학교"],
  [/친척|사촌|이모|고모|삼촌|외삼촌/g, "친척"],
  [/가족/g, "가족"],
  [/친구/g, "친구"],
  [/지인/g, "지인"],
];

const NUM_WORD: Record<string, number> = {
  한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9, 열: 10,
};

/** 이름 앞뒤에 붙어 나오는 군더더기. 이름을 잡아먹지 않게 한 낱말씩만 본다. */
const LEADING_NOISE = /^(그리고|그다음|다음|또|음+|어+|저기|이제)\s+/;
const TRAILING_NOISE = /\s*(추가|넣어\s*줘|넣어줘|입력|해\s*줘)$/;

export function parsePhrase(raw: string): ParsedGuest | null {
  let s = ` ${raw.trim()} `;
  if (!s.trim()) return null;

  let side: GuestSide | null = null;
  for (const [re, v] of SIDE_WORDS) {
    if (new RegExp(re.source).test(s)) {
      side = v;
      s = s.replace(new RegExp(re.source, "g"), " ");
    }
  }

  let relation: string | null = null;
  for (const [re, v] of RELATION_WORDS) {
    if (new RegExp(re.source).test(s)) {
      relation = v;
      s = s.replace(new RegExp(re.source, "g"), " ");
      break;
    }
  }

  // "두 명" · "2명" · "2 명" → 동반 인원 (본인 제외라서 1을 뺀다)
  let companions: number | null = null;
  const numeric = s.match(/(\d+)\s*명/);
  if (numeric) {
    companions = Math.max(0, Number(numeric[1]) - 1);
    s = s.replace(numeric[0], " ");
  } else {
    const worded = s.match(/(한|두|세|네|다섯|여섯|일곱|여덟|아홉|열)\s*명/);
    if (worded) {
      companions = Math.max(0, NUM_WORD[worded[1]] - 1);
      s = s.replace(worded[0], " ");
    }
  }

  let name = s.replace(/[.,·]/g, " ").replace(/\s+/g, " ").trim();
  // "음 저기 이철수" 처럼 군더더기가 겹칠 수 있어 더 안 깎일 때까지 반복한다.
  // 다 깎아서 빈 값이 되면 깎기 전으로 되돌린다 (이름 자체를 지워 버리지 않게).
  for (let prev = ""; prev !== name; ) {
    prev = name;
    const next = name.replace(LEADING_NOISE, "").trim();
    if (next) name = next;
  }
  const trimmed = name.replace(TRAILING_NOISE, "").trim();
  if (trimmed) name = trimmed;
  if (!name) return null;
  return { name, side, relation, companions };
}

export const RELATION_OPTIONS = GUEST_RELATIONS;
