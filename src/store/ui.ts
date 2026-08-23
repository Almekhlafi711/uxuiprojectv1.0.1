import { create } from "zustand";

export interface ToastItem {
  id: number;
  type: "success" | "error" | "warning" | "info";
  title: string;
  description?: string;
}

interface UiState {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  toasts: ToastItem[];
  toggleSidebar: () => void;
  setSidebarMobileOpen: (open: boolean) => void;
  pushToast: (toast: Omit<ToastItem, "id">) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  sidebarMobileOpen: false,
  toasts: [],
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),
  pushToast: (toast) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (title: string, description?: string) => useUiStore.getState().pushToast({ type: "success", title, description }),
  error: (title: string, description?: string) => useUiStore.getState().pushToast({ type: "error", title, description }),
  warning: (title: string, description?: string) => useUiStore.getState().pushToast({ type: "warning", title, description }),
  info: (title: string, description?: string) => useUiStore.getState().pushToast({ type: "info", title, description }),
};