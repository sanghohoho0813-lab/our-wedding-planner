"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 말로 입력하기 (브라우저 음성 인식).
 *
 * 브라우저가 직접 제공하는 기능이라 따로 서버나 키가 필요 없다.
 * 다만 크롬 계열은 소리를 구글 서버로 보내 글자로 바꾼다 — 하객 실명을 다루므로
 * 이 점은 화면에서 사용자에게 알린다. 아이폰 사파리는 지원이 들쭉날쭉해서
 * 안 되는 기기에서는 버튼 자체를 감춘다(키보드 마이크로 대신할 수 있다).
 */

interface SpeechAlt {
  transcript: string;
}
interface SpeechResult {
  isFinal: boolean;
  length: number;
  0: SpeechAlt;
}
interface SpeechEvent {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechResult };
}
interface SpeechErrorEvent {
  error: string;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type SpeechCtor = new () => SpeechRecognitionLike;

function ctor(): SpeechCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** 이 기기에서 말로 입력할 수 있는지 (서버 렌더 때는 false) */
export function speechSupported(): boolean {
  return ctor() !== null;
}

/**
 * 아이폰 · 아이패드인지.
 *
 * 사파리는 한 마디가 끝나면 음성 인식을 스스로 닫고, 사용자가 손으로 누르지 않은
 * 다시 켜기를 막는다. 그래서 '계속 듣기' 가 안 되고 한 명 말할 때마다 다시 눌러야 한다.
 * 기기를 알아내서 미리 그렇게 안내하려고만 쓴다(기능을 막지는 않는다).
 */
export function isAppleMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // 아이패드는 데스크톱 사파리인 척해서 UA 만으로는 모자라다 → 터치 되는 Mac 도 같이 본다
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && typeof document !== "undefined" && "ontouchend" in document);
}

const MESSAGE: Record<string, string> = {
  "not-allowed": "마이크 사용을 허용해 주세요. 주소창 왼쪽 자물쇠에서 바꿀 수 있어요.",
  "service-not-allowed": "마이크 사용을 허용해 주세요. 주소창 왼쪽 자물쇠에서 바꿀 수 있어요.",
  // 크롬 계열은 이 기능이 있다고 표시해 놓고도 실제로는 인식 서버에 못 붙는 경우가 있다
  // (일부 오픈소스 크로미움 빌드, 카톡 같은 앱 안의 브라우저). 있는지 물어보는 것만으로는 알 수 없어서
  // 눌러 봐야 알게 되므로, 그때 대신할 방법을 같이 알려준다.
  network: "이 브라우저에서는 음성 인식을 쓸 수 없어요. 크롬으로 열거나, 키보드의 마이크 버튼으로 말해 보세요.",
  "audio-capture": "마이크를 찾지 못했어요.",
  aborted: "",
  "no-speech": "",
};

export function useSpeech({
  lang = "ko-KR",
  /** 한 마디(잠깐 멈출 때마다)가 끝날 때 호출된다 */
  onPhrase,
}: {
  lang?: string;
  onPhrase?: (text: string) => void;
} = {}) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  /** 한 마디마다 다시 눌러야 하는 기기인지 (아이폰 사파리) */
  const [oneShot, setOneShot] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const wantRef = useRef(false);
  const phraseRef = useRef(onPhrase);
  phraseRef.current = onPhrase;

  // 지원 여부는 브라우저에서만 알 수 있다 (서버 렌더 결과와 어긋나지 않게 마운트 후에 켠다)
  useEffect(() => {
    setSupported(speechSupported());
    setOneShot(isAppleMobile());
  }, []);

  const stop = useCallback(() => {
    wantRef.current = false;
    setListening(false);
    setInterim("");
    recRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const C = ctor();
    if (!C) return;
    setError(null);
    const rec = new C();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0].transcript.trim();
        if (!text) continue;
        if (r.isFinal) phraseRef.current?.(text);
        else live += text;
      }
      setInterim(live);
    };
    rec.onerror = (e) => {
      const msg = MESSAGE[e.error] ?? "음성 인식에 실패했어요. 다시 해볼까요?";
      if (msg) {
        setError(msg);
        wantRef.current = false;
        setListening(false);
      }
    };
    rec.onend = () => {
      setInterim("");
      // 폰에서는 잠깐 조용하면 알아서 멈춘다. 사용자가 멈춘 게 아니면 이어서 다시 듣는다.
      if (wantRef.current) {
        try {
          rec.start();
          return;
        } catch {
          // 사파리는 손으로 누르지 않은 다시 켜기를 막는다 → 한 마디 방식으로 돌린다
          setOneShot(true);
        }
      }
      wantRef.current = false;
      setListening(false);
    };
    recRef.current = rec;
    wantRef.current = true;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("음성 인식을 시작하지 못했어요.");
      wantRef.current = false;
    }
  }, [lang]);

  useEffect(
    () => () => {
      wantRef.current = false;
      recRef.current?.abort();
    },
    [],
  );

  return { supported, oneShot, listening, interim, error, start, stop, toggle: () => (listening ? stop() : start()), clearError: () => setError(null) };
}
