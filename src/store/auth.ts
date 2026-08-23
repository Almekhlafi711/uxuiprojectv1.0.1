import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import { mockApi } from "@/services/mockApi";

interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: async (email, password) => {
        const user = await mockApi.auth.login(email, password);
        set({ user, token: `mock-token-${user.id}` });
      },
      logout: () => set({ user: null, token: null }),
    }),
    { name: "erp-auth" }
  )
);