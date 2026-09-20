"use client";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { createPortal } from "react-dom";
import { useMounted } from "@/lib/hooks";
import { useUIStore } from "@/lib/store/ui-store";

export function Toaster() {
  const mounted = useMounted();
  const toasts = useUIStore((s) => s.toasts);
  const dismiss = useUIStore((s) => s.dismissToast);
  if (!mounted) return null;
  return createPortal(
    <div
      aria-live="polite"
      /*
       * 오른쪽 아래 [+] 버튼 **위** 에 뜬다.
       * 전에는 같은 높이라 안내문이 [+] 를 가렸고, 하객을 연달아 추가할 때
       * 안내가 사라질 때까지(3초) 기다려야 다음 [+] 를 누를 수 있었다.
       * 높이는 [+] 와 같은 식(--nav-h + 1rem)에 버튼 높이 3.5rem 과 여백을 더한 값이라,
       * 글자 크기를 키워도 같이 올라간다. 안내문보다 다음 동작이 먼저다.
       */
      className="pointer-events-none fixed left-1/2 z-[90] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2 bottom-[calc(var(--nav-h)+5.25rem+env(safe-area-inset-bottom,0px))] lg:left-auto lg:right-6 lg:translate-x-0"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto flex items-center gap-3 rounded-[14px] bg-fg px-4 py-3 text-inverse shadow-lg"
          >
            {t.tone === "success" && <CheckCircle2 className="size-4 shrink-0 text-success" />}
            {t.tone === "error" && <AlertCircle className="size-4 shrink-0 text-danger" />}
            <span className="flex-1 text-[0.9375rem] leading-snug">{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
                className="shrink-0 rounded-md px-2 py-1 text-[0.875rem] font-semibold text-accent hover:bg-white/10"
              >
                {t.action.label}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
