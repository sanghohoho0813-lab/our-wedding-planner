"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

export function useMediaQuery(query: string, initial = false) {
  const [matches, setMatches] = useState(initial);
  useEffect(() => {
    const m = window.matchMedia(query);
    const onChange = () => setMatches(m.matches);
    onChange();
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

/** 텍스트 입력 자동 저장: 로컬 상태는 즉시, 저장은 디바운스 */
export function useDebouncedValue<T>(value: T, onCommit: (v: T) => void, delay = 500) {
  const [local, setLocal] = useState<T>(value);
  const committed = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cb = useRef(onCommit);
  cb.current = onCommit;

  useEffect(() => {
    if (value !== committed.current) {
      committed.current = value;
      setLocal(value);
    }
  }, [value]);

  const flush = useCallback(
    (v: T) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      if (v !== committed.current) {
        committed.current = v;
        cb.current(v);
      }
    },
    [],
  );

  const set = useCallback(
    (v: T) => {
      setLocal(v);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => flush(v), delay);
    },
    [delay, flush],
  );

  useEffect(() => () => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
  }, []);

  return [local, set, () => flush(local)] as const;
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * 화면 안의 탭 상태. 라우팅을 타지 않으므로 전환이 0ms 다.
 * URL 에는 history.replaceState 로 남기고, 하단 탭처럼 링크로 ?tab= 이 바뀌어 들어와도 따라간다.
 */
export function useTabs<T extends string>(tabs: readonly T[], fallback: T, key = "tab") {
  const params = useSearchParams();
  const fromUrl = params.get(key) as T | null;
  const resolved = fromUrl && tabs.includes(fromUrl) ? fromUrl : fallback;
  const [tab, setTabState] = useState<T>(resolved);
  useEffect(() => {
    setTabState(resolved);
  }, [resolved]);
  const setTab = useCallback(
    (next: T) => {
      setTabState(next);
      const url = new URL(window.location.href);
      if (next === fallback) url.searchParams.delete(key);
      else url.searchParams.set(key, next);
      window.history.replaceState(window.history.state, "", url.toString());
    },
    [fallback, key],
  );
  return [tab, setTab] as const;
}
