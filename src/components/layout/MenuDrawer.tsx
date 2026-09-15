"use client";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLockBodyScroll, useMounted } from "@/lib/hooks";
import { useUIStore } from "@/lib/store/ui-store";
import { IconButton } from "@/components/ui/Button";
import { Logo } from "./Logo";
import { NavList } from "./Sidebar";

export function MenuDrawer() {
  const open = useUIStore((s) => s.drawerOpen);
  const setOpen = useUIStore((s) => s.setDrawer);
  const mounted = useMounted();
  const reduce = useReducedMotion();
  const router = useRouter();
  const [q, setQ] = useState("");
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-[var(--overlay)] backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="전체 메뉴"
            className="fixed inset-y-0 left-0 z-40 flex w-[min(20rem,86vw)] flex-col bg-surface shadow-[var(--shadow-lg)]"
            initial={reduce ? { x: 0 } : { x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={reduce ? { duration: 0 } : { type: "spring", damping: 30, stiffness: 320 }}
            style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          >
            <div className="flex items-start justify-between px-5 pt-5 pb-3">
              <Logo />
              <IconButton label="닫기" onClick={() => setOpen(false)} className="-mr-2 -mt-1">
                <X className="size-5" />
              </IconButton>
            </div>
            <form
              className="px-4 pb-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!q.trim()) return;
                setOpen(false);
                router.push(`/search?q=${encodeURIComponent(q.trim())}`);
              }}
            >
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-3" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="검색"
                  className="h-11 w-full rounded-full border border-line bg-surface-2 pl-10 pr-4 text-[0.9375rem] outline-none placeholder:text-fg-3 focus:border-accent"
                />
              </label>
            </form>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 safe-bottom">
              <NavList onNavigate={() => setOpen(false)} />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
