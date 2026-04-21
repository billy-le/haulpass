import { secureStorage } from "@/lib/auth-storage";

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await secureStorage.getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}${endpoint}`,
    {
      ...options,
      headers,
    },
  );

  if (!response.ok) {
    throw new Error("API Request Failed");
  }

  return response.json();
}
