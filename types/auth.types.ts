import type { Session } from "@supabase/supabase-js";

export type { Session };

export type AuthProvider = "google" | "apple" | "email";

export type Role = "buyer" | "pro";

export interface BuyerLocation {
  address: string;
  lat?: number;
  lng?: number;
}

export interface ProProfile {
  companyName?: string;
  vehicleMake: string;
  vehicleModel: string;
  driversLicense: string;
  serviceLocations: string[];
}
