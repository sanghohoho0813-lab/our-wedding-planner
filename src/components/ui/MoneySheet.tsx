"use client";
import { Delete } from "lucide-react";
import { useEffect, useState } from "react";
import { formatKRW, formatNumber } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { Sheet } from "./Sheet";

type Op = "+" | "-" | "×" | "÷";

const QUICK = [
  { label: "+1만", v: 10000 },
  { label: "+5만", v: 50000 },
  { label: "+10만", v: 100000 },
  { label: "+50만", v: 500000 },
  { label: "+100만", v: 1000000 },
  { label: "-1만", v: -10000 },
  { label: "-10만", v: -100000 },
];

function calc(a: number, op: Op, b: number) {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? a : a / b;
  }
}

export function MoneySheet({
  open,
  onClose,
  value,
  onApply,
  title = "금액 입력",
}: {
  open: boolean;
  onClose: () => void;
  value: number;
  onApply: (v: number) => void;
  title?: string;
}) {
  const [cur, setCur] = useState(String(value || ""));
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [fresh, setFresh] = useState(true);

  useEffect(() => {
    if (open) {
      setCur(value ? String(Math.round(value)) : "");
      setAcc(null);
      setOp(null);
      setFresh(true);
    }
  }, [open, value]);

  const curNum = Number(cur || 0);

  const press = (d: string) => {
    setFresh(false);
    setCur((c) => {
      const base = fresh ? "" : c;
      const next = (base + d).replace(/^0+(?=\d)/, "");
      return next.length > 12 ? base : next;
    });
  };
  const back = () => setCur((c) => c.slice(0, -1));
  const quick = (v: number) => {
    setFresh(false);
    setCur(String(Math.max(0, Math.round(curNum + v))));
  };
  const pressOp = (o: Op) => {
    if (acc !== null && op && !fresh) {
      const r = Math.max(0, Math.round(calc(acc, op, curNum)));
      setAcc(r);
      setCur(String(r));
    } else {
      setAcc(curNum);
    }
    setOp(o);
    setFresh(true);
  };
  const equals = () => {
    if (acc === null || !op) return;
    const r = Math.max(0, Math.round(calc(acc, op, curNum)));
    setCur(String(r));
    setAcc(null);
    setOp(null);
    setFresh(true);
  };
  const clear = () => {
    setCur("");
    setAcc(null);
    setOp(null);
    setFresh(true);
  };

  const key = "h-12 rounded-[12px] bg-surface-2 text-[1.125rem] font-semibold text-fg hover:bg-surface-3 active:scale-[0.97] transition tabular";
  const opKey = (o: Op) => cn(key, "bg-accent-softer text-accent-text", op === o && fresh && "bg-accent text-accent-fg");

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={clear} className="flex-none px-5">
            지우기
          </Button>
          <Button
            full
            onClick={() => {
              const finalValue = acc !== null && op ? Math.max(0, Math.round(calc(acc, op, curNum))) : curNum;
              onApply(Math.max(0, Math.round(finalValue)));
              onClose();
            }}
          >
            {acc !== null && op ? "계산 결과 적용" : "적용"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="rounded-[16px] bg-surface-2 px-4 py-3 text-right">
          <div className="h-5 text-[0.8125rem] text-fg-3 tabular">
            {acc !== null && op ? `${formatNumber(acc)} ${op}${!fresh ? ` ${formatNumber(curNum)}` : ""}` : "현재 금액"}
          </div>
          <div className="text-[1.75rem] font-bold tabular text-fg leading-tight">{formatKRW(curNum)}</div>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {QUICK.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => quick(q.v)}
              className={cn(
                "h-10 rounded-[10px] border text-[0.8125rem] font-medium tabular active:scale-[0.97] transition",
                q.v > 0 ? "border-line bg-surface text-fg hover:bg-surface-2" : "border-line bg-surface text-fg-2 hover:bg-surface-2",
              )}
            >
              {q.label}
            </button>
          ))}
          <button type="button" onClick={() => quick(-curNum)} className="h-10 rounded-[10px] border border-line bg-surface text-[0.8125rem] font-medium text-fg-3 hover:bg-surface-2">
            0으로
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {["7", "8", "9"].map((d) => (
            <button key={d} type="button" onClick={() => press(d)} className={key}>{d}</button>
          ))}
          <button type="button" onClick={() => pressOp("÷")} className={opKey("÷")} aria-label="나누기">÷</button>
          {["4", "5", "6"].map((d) => (
            <button key={d} type="button" onClick={() => press(d)} className={key}>{d}</button>
          ))}
          <button type="button" onClick={() => pressOp("×")} className={opKey("×")} aria-label="곱하기">×</button>
          {["1", "2", "3"].map((d) => (
            <button key={d} type="button" onClick={() => press(d)} className={key}>{d}</button>
          ))}
          <button type="button" onClick={() => pressOp("-")} className={opKey("-")} aria-label="빼기">−</button>
          <button type="button" onClick={() => press("00")} className={key}>00</button>
          <button type="button" onClick={() => press("0")} className={key}>0</button>
          <button type="button" onClick={back} className={cn(key, "inline-flex items-center justify-center")} aria-label="지우기">
            <Delete className="size-5" />
          </button>
          <button type="button" onClick={() => pressOp("+")} className={opKey("+")} aria-label="더하기">+</button>
          <button type="button" onClick={() => press("000")} className={cn(key, "col-span-3 text-[0.9375rem]")}>000</button>
          <button type="button" onClick={equals} className={cn(key, "bg-accent-soft text-accent-text")} aria-label="계산">=</button>
        </div>
      </div>
    </Sheet>
  );
}
