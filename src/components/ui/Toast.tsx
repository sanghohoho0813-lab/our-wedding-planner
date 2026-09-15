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
      className="pointer-events-none fixed left-1/2 z-[90] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2 bottom-[calc(var(--nav-h)+16px+env(safe-area-inset-bottom,0px))] lg:left-auto lg:right-6 lg:translate-x-0 lg:bottom-6"
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
            <span className="flex-1 text-[0.875rem] leading-snug">{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
                className="shrink-0 rounded-md px-2 py-1 text-[0.8125rem] font-semibold text-accent hover:bg-white/10"
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
