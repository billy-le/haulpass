import type { Session } from "@supabase/supabase-js";

export type { Session };

export type AuthProvider = "google" | "apple" | "email";

export type Role = "buyer" | "pro";

export type ServiceLocationType = "city" | "postal_code";

export interface ServiceArea {
  location_type: ServiceLocationType;
  value: string;
}

export interface ProProfile {
  companyName?: string;
  vehicleMake: string;
  vehicleModel: string;
  driversLicense: string;
  serviceAreas: ServiceArea[];
}
