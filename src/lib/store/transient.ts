"use client";

/**
 * 잠깐 그런 것(네트워크) 인가, 고쳐야 하는 것(권한 · 제약조건) 인가.
 *
 * 이 구분이 중요하다.
 * - 잠깐 그런 것: 화면을 그대로 두고 나중에 다시 보낸다.
 * - 고쳐야 하는 것: 아무리 다시 보내도 안 된다. 알려주고 넘어가야
 *   그 뒤에 쌓인 수정들이 같이 막히지 않는다.
 */
export function isTransient(err: unknown): boolean {
  const m = String(err instanceof Error ? err.message : (err ?? "")).toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("networkerror") ||
    m.includes("load failed") ||
    m.includes("fetch failed") ||
    m.includes("timeout") ||
    m.includes("503") ||
    m.includes("502") ||
    m.includes("504") ||
    m.includes("relay 5") ||
    (typeof navigator !== "undefined" && navigator.onLine === false)
  );
}
