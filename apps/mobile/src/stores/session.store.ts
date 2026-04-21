import { create } from "zustand";
import { authService } from "@/api/services/auth.service";
import { secureStorage } from "@/lib/auth-storage";

type SessionStatus = "idle" | "loading" | "authenticated" | "unauthenticated";
type UserProfile = {
  id: number;
  email_address: string;
};

type SessionStore = {
  status: SessionStatus;
  token: string | null;
  user: UserProfile | null;
  error: string | null;
  initialize: () => Promise<void>;
  signIn: (data: { email: string; password: string }) => Promise<boolean>;
  signUp: (data: {
    email: string;
    password: string;
    confirmPassword: string;
  }) => Promise<boolean>;
  signOut: () => Promise<void>;
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  status: "idle",
  token: null,
  user: null,
  error: null,
  initialize: async () => {
    set({ status: "loading", error: null });

    const token = await secureStorage.getToken();

    if (!token) {
      set({ status: "unauthenticated", token: null, user: null });
      return;
    }

    const res = await authService.getProfile();

    if (res.error) {
      // Token exists but is invalid/expired — clear it
      await secureStorage.deleteToken();
      set({
        status: "unauthenticated",
        token: null,
        user: null,
        error: res.error,
      });
      return;
    }

    set({ status: "authenticated", token, user: { email_address: "", id: 1 } });
  },
  signIn: async (data: { email: string; password: string }) => {
    set({ status: "loading", error: null });

    const res = await authService.signIn(data);

    if (!res.success) {
      set({ status: "unauthenticated", error: res.error });
      return false;
    }

    await secureStorage.setToken(res.data.token);
    set({
      status: "authenticated",
      token: res.data.token,
      user: res.data.user,
    });
    return true;
  },
  signUp: async (data: {
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    set({ status: "loading", error: null });

    const res = await authService.signUp(data);

    if (!res.success) {
      set({ status: "unauthenticated", error: res.error });
      return false;
    }

    await secureStorage.setToken(res.data.token);
    set({
      status: "authenticated",
      token: res.data.token,
      user: res.data.user,
    });
    return true;
  },
  signOut: async () => {
    const { token } = get();
    if (token) {
      await authService.signOut().catch(() => {});
      await secureStorage.deleteToken();
    }
    set({ status: "unauthenticated", token: null, user: null, error: null });
  },
}));
