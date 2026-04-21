import { apiClient } from "@/lib/api-client";

interface AuthUser {
  token: string;
  user: {
    id: number;
    email_address: string;
  };
}

class AuthService {
  public async signIn({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    try {
      const res = await apiClient<AuthUser>("/session", {
        method: "post",
        body: JSON.stringify({
          email_address: email,
          password,
        }),
      });
      return { success: true, data: res, error: null };
    } catch (err) {
      return { success: false, data: null, error: err } as const;
    }
  }

  public async signUp({
    email,
    password,
    confirmPassword,
  }: {
    email: string;
    password: string;
    confirmPassword: string;
  }) {
    try {
      const res = await apiClient<AuthUser>("/registration", {
        method: "post",
        body: JSON.stringify({
          email_address: email,
          password,
          confirm_password: confirmPassword,
        }),
      });
      console.log({ res });
      return { success: true, data: res, error: null };
    } catch (err) {
      return { success: false, data: null, error: err } as const;
    }
  }

  public async signOut() {
    try {
      const res = await apiClient("/session", {
        method: "DELETE",
      });

      console.log("delete", res);
    } catch (err) {
      console.log(err);
    }
  }

  public async getProfile() {
    try {
      const res = await apiClient<AuthUser>("/profile", {
        method: "get",
      });

      console.log(res);

      return { sucess: true, data: {}, error: null };
    } catch (err) {
      return { sucess: false, data: null, error: err };
    }
  }
}

export const authService = new AuthService();
