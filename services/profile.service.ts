import { supabase } from "@/services/supabase";

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, first_name, last_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertUserProfile(
  userId: string,
  data: { first_name: string; last_name: string },
): Promise<void> {
  const { error } = await supabase
    .from("user_profiles")
    .upsert({ id: userId, ...data, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function upsertPassPro(
  userId: string,
  data: {
    company_name?: string;
    vehicle_make: string;
    vehicle_model: string;
    drivers_license: string;
    service_locations: string[];
  },
): Promise<void> {
  const { error } = await supabase
    .from("pass_pros")
    .upsert({ id: userId, ...data, updated_at: new Date().toISOString() });
  if (error) throw error;
}
