import { supabase } from "@/services/supabase";
import { ApiClient } from "./api-client";

/**
 * `ApiClient` configured for Supabase Edge Functions.
 *
 * Injects the active session token as `Authorization: Bearer` on every request.
 *
 * @example
 * const haul = await supabaseApiClient.post<Haul>("create-haul", payload);
 */
export const supabaseApiClient = new ApiClient({
  baseUrl: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`,
  getToken: () => supabase.auth.getSession().then(({ data }) => data.session?.access_token ?? null),
});
