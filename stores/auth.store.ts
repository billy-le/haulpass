import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import type { Role } from "@/types/auth.types";

interface AuthState {
  initialized: boolean;
  role: Role | null;
  session: Session | null;
  userId: string | null;
  userName: string | null;
  isOnboarded: boolean;
  setRole: (role: Role) => void;
  setSession: (session: Session | null) => void;
  setUser: (id: string, name: string) => void;
  setOnboarded: (val: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  initialized: false,
  role: null,
  session: null,
  userId: null,
  userName: null,
  isOnboarded: false,
  setRole: (role) => set({ role }),
  setSession: (session) => {
    const meta = session?.user.user_metadata ?? {};
    set({
      initialized: true,
      session,
      userId: session?.user.id ?? null,
      userName: meta["full_name"] ?? null,
      role: (meta["role"] as Role) ?? null,
      isOnboarded: meta["onboarding_complete"] === true,
    });
  },
  setUser: (userId, userName) => set({ userId, userName }),
  setOnboarded: (val) => set({ isOnboarded: val }),
  clear: () =>
    set({
      role: null,
      session: null,
      userId: null,
      userName: null,
      isOnboarded: false,
    }),
}));
