"use client";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLockBodyScroll, useMediaQuery, useMounted } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { IconButton } from "./Button";

const DepthContext = createContext(0);

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  headerRight?: ReactNode;
  bodyClassName?: string;
}

/** 모바일: Bottom Sheet / 데스크톱: 중앙 모달 */
export function Sheet({ open, onClose, title, description, children, footer, size = "md", headerRight, bodyClassName }: SheetProps) {
  const mounted = useMounted();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const reduce = useReducedMotion();
  const depth = useContext(DepthContext);
  const controls = useDragControls();
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;
  const z = 50 + depth * 2;
  const maxW = size === "lg" ? "max-w-2xl" : size === "sm" ? "max-w-sm" : "max-w-lg";

  const header = (title || headerRight) && (
    <div className="flex items-start justify-between gap-3 px-5 pt-3 pb-2 md:pt-5">
      <div className="min-w-0 pt-1.5">
        {title && <h2 className="text-[1.0625rem] font-semibold text-fg leading-snug">{title}</h2>}
        {description && <p className="mt-0.5 text-[0.8125rem] text-fg-3">{description}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0 -mr-2">
        {headerRight}
        <IconButton label="닫기" onClick={onClose}>
          <X className="size-5" />
        </IconButton>
      </div>
    </div>
  );

  const body = <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 pb-5 overscroll-contain", bodyClassName)}>{children}</div>;
  const foot = footer && <div className="border-t border-line px-5 py-3 bg-surface rounded-b-[22px] safe-bottom md:rounded-b-[22px]">{footer}</div>;

  return createPortal(
    <DepthContext.Provider value={depth + 1}>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 bg-[var(--overlay)] backdrop-blur-[2px]"
              style={{ zIndex: z }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onClose}
            />
            {isDesktop ? (
              <div className="fixed inset-0 flex items-center justify-center p-6 pointer-events-none" style={{ zIndex: z + 1 }}>
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  className={cn("pointer-events-auto flex w-full flex-col rounded-[22px] bg-surface border border-line max-h-[85vh]", maxW)}
                  style={{ boxShadow: "var(--shadow-lg)" }}
                  initial={reduce ? { opacity: 1 } : { opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                >
                  {header}
                  {body}
                  {foot}
                </motion.div>
              </div>
            ) : (
              <motion.div
                role="dialog"
                aria-modal="true"
                className="fixed inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-[22px] bg-surface"
                style={{ zIndex: z + 1, boxShadow: "var(--shadow-lg)" }}
                initial={reduce ? { y: 0 } : { y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={reduce ? { duration: 0 } : { type: "spring", damping: 32, stiffness: 340 }}
                drag="y"
                dragListener={false}
                dragControls={controls}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.7 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 110 || info.velocity.y > 700) onClose();
                }}
              >
                <div
                  className="touch-none cursor-grab select-none"
                  onPointerDown={(e) => controls.start(e)}
                >
                  <div className="mx-auto mt-2.5 mb-1 h-1.5 w-10 rounded-full bg-line-strong" />
                  {header}
                </div>
                {body}
                {foot ?? <div className="safe-bottom" />}
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </DepthContext.Provider>,
    document.body,
  );
}

export function SheetFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex items-center gap-2 [&>*]:flex-1", className)}>{children}</div>;
}
