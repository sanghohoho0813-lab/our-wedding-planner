"use client";
import { Delete } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { Sheet } from "./Sheet";

/**
 * 숫자(인원 · 개수) 키패드.
 *
 * 보증 인원 200명을 [+] 로 200번 누르게 하면 안 된다.
 * 금액 칸에는 키패드가 있었는데 인원 칸에는 없어서, 큰 수를 넣을 방법이 사실상 없었다.
 * 자주 쓰는 폭(+10 · +50 · +100)도 같이 둔다.
 */
const QUICK = [10, 50, 100, -10];

export function CountSheet({
  open,
  onClose,
  value,
  onApply,
  title = "숫자 입력",
  suffix = "명",
  min = 0,
  max = 9999,
}: {
  open: boolean;
  onClose: () => void;
  value: number;
  onApply: (v: number) => void;
  title?: string;
  suffix?: string;
  min?: number;
  max?: number;
}) {
  const [cur, setCur] = useState(String(value || ""));
  const [fresh, setFresh] = useState(true);

  useEffect(() => {
    if (open) {
      setCur(value ? String(Math.round(value)) : "");
      setFresh(true);
    }
  }, [open, value]);

  const num = Number(cur || 0);
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n)));

  const press = (d: string) => {
    setFresh(false);
    setCur((c) => {
      const base = fresh ? "" : c;
      const next = (base + d).replace(/^0+(?=\d)/, "");
      return Number(next) > max || next.length > 6 ? base : next;
    });
  };

  const key = "h-12 rounded-[12px] bg-surface-2 text-[1.25rem] font-semibold text-fg hover:bg-surface-3 active:scale-[0.97] transition tabular";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-none px-5" onClick={() => { setCur(""); setFresh(true); }}>
            지우기
          </Button>
          <Button
            full
            onClick={() => {
              onApply(clamp(num));
              onClose();
            }}
          >
            적용
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="rounded-[16px] bg-surface-2 px-4 py-3 text-right">
          <div className="h-5 text-[0.875rem] text-fg-3">지금</div>
          <div className="text-[1.875rem] font-bold leading-tight tabular text-fg">
            {num.toLocaleString("ko-KR")}
            {suffix}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => { setFresh(false); setCur(String(clamp(num + q))); }}
              className="h-10 rounded-[10px] border border-line bg-surface text-[0.875rem] font-medium tabular text-fg hover:bg-surface-2 active:scale-[0.97] transition"
            >
              {q > 0 ? `+${q}` : q}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {["7", "8", "9", "4", "5", "6", "1", "2", "3"].map((d) => (
            <button key={d} type="button" onClick={() => press(d)} className={key}>
              {d}
            </button>
          ))}
          <button type="button" onClick={() => press("00")} className={key}>00</button>
          <button type="button" onClick={() => press("0")} className={key}>0</button>
          <button type="button" onClick={() => setCur((c) => c.slice(0, -1))} className={cn(key, "inline-flex items-center justify-center")} aria-label="한 글자 지우기">
            <Delete className="size-5" />
          </button>
        </div>
      </div>
    </Sheet>
  );
}
