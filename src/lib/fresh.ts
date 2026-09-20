/**
 * 방금 내가 만든 것은 숨기지 않는다.
 *
 * 금액 없는 예산 항목은 평소엔 접어 두는 게 맞다(이관된 빈 항목이 21개나 있다).
 * 그런데 방금 "식비" 를 추가하면 금액이 0이라 곧바로 그 접힘 속으로 사라진다.
 * 사용자 입장에서는 "저장이 안 됐나?" 가 된다 — 가장 나쁜 종류의 마찰이다.
 *
 * '만든 시각이 최근인가' 로 판단하면 안 된다. 원본 이관 데이터도 처음 켠 순간
 * 전부 '방금' 이 되어 버리기 때문이다(buildMigratedData 가 지금 시각을 찍는다).
 * 그래서 시계를 보지 않고 **이 탭에서 직접 add() 한 것**만 기억한다.
 *
 * sessionStorage 에 둔다 — 새로고침해도 남고, 탭을 닫으면 알아서 사라진다.
 * 딱 "지금 작업 중인 동안" 만 필요한 정보라 그 수명이 맞다.
 */
const KEY = "owp:justAdded";
const MAX = 200;

function read(): string[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function write(ids: string[]): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(ids.slice(-MAX)));
  } catch {
    /* 사생활 보호 모드 등에서 막히면 그냥 접힘 규칙대로 동작한다 */
  }
}

export function markJustAdded(id: string): void {
  const ids = read();
  if (!ids.includes(id)) write([...ids, id]);
}

export function wasJustAdded(id: string | null | undefined): boolean {
  return !!id && read().includes(id);
}
