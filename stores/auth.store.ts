import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import type { Role } from "@/types/auth.types";

interface AuthState {
  role: Role | null;
  session: Session | null;
  userId: string | null;
  userName: string | null;
  firstName: string | null;
  lastName: string | null;
  isOnboarded: boolean;
  location: { lat: number; lng: number } | null;
  setRole: (role: Role) => void;
  setSession: (session: Session | null) => void;
  setUser: (id: string, name: string) => void;
  setLocation: (location: { lat: number; lng: number }) => void;
  setOnboarded: (val: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  role: null,
  session: null,
  userId: null,
  userName: null,
  firstName: null,
  lastName: null,
  isOnboarded: false,
  location: null,
  setRole: (role) => set({ role }),
  setSession: (session) => {
    const meta = session?.user.user_metadata ?? {};
    set({
      session,
      userId: session?.user.id ?? null,
      userName: meta["full_name"] ?? null,
      firstName: meta["first_name"] ?? null,
      lastName: meta["last_name"] ?? null,
      role: (meta["role"] as Role) ?? null,
      isOnboarded: meta["onboarding_complete"] === true,
    });
  },
  setUser: (userId, userName) => set({ userId, userName }),
  setLocation: (location) => set({ location }),
  setOnboarded: (val) => set({ isOnboarded: val }),
  clear: () =>
    set({
      role: null,
      session: null,
      userId: null,
      userName: null,
      firstName: null,
      lastName: null,
      isOnboarded: false,
      location: null,
    }),
}));
