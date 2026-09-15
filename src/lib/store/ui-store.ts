"use client";
import { create } from "zustand";
import { uid } from "@/lib/utils";

export interface Toast {
  id: string;
  message: string;
  action?: { label: string; onClick: () => void };
  duration?: number;
  tone?: "default" | "success" | "error";
}

interface UIState {
  drawerOpen: boolean;
  quickAddOpen: boolean;
  toasts: Toast[];
  setDrawer: (open: boolean) => void;
  setQuickAdd: (open: boolean) => void;
  toast: (message: string, opts?: Omit<Toast, "id" | "message">) => string;
  dismissToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  drawerOpen: false,
  quickAddOpen: false,
  toasts: [],
  setDrawer: (open) => set({ drawerOpen: open }),
  setQuickAdd: (open) => set({ quickAddOpen: open }),
  toast: (message, opts) => {
    const id = uid();
    const toast: Toast = { id, message, duration: 3200, ...opts };
    set({ toasts: [...get().toasts.slice(-2), toast] });
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => get().dismissToast(id), toast.duration);
    }
    return id;
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = (message: string, opts?: Omit<Toast, "id" | "message">) => useUIStore.getState().toast(message, opts);
