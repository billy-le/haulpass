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
    service_areas: {
      location_type: "city" | "postal_code";
      value: string;
      lat?: number;
      lng?: number;
      radius_km?: number;
    }[];
  },
): Promise<void> {
  const { error: proError } = await supabase.from("pass_pros").upsert({
    id: userId,
    company_name: data.company_name,
    vehicle_make: data.vehicle_make,
    vehicle_model: data.vehicle_model,
    drivers_license: data.drivers_license,
    updated_at: new Date().toISOString(),
  });
  if (proError) throw proError;

  const { error: deleteError } = await supabase
    .from("pass_pro_service_areas")
    .delete()
    .eq("pro_id", userId);
  if (deleteError) throw deleteError;

  if (data.service_areas.length > 0) {
    const { error: insertError } = await supabase
      .from("pass_pro_service_areas")
      .insert(data.service_areas.map((area) => ({ pro_id: userId, ...area })));
    if (insertError) throw insertError;
  }
}
