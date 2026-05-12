export type HaulStatus = "pending" | "matched" | "in_transit" | "completed" | "cancelled";
export type HaulQuoteStatus = "pending" | "accepted" | "rejected" | "expired";
export type PaymentStatus = "pending" | "processing" | "succeeded" | "failed" | "refunded";

export interface HaulAddress {
  id: string;
  street1: string;
  street2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  full_address: string;
  lat: number | null;
  lng: number | null;
}

export interface HaulQuote {
  id: string;
  haul_id: string;
  pro_id: string;
  amount_cents: number;
  status: HaulQuoteStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  haul_id: string;
  quote_id: string;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Haul {
  id: string;
  buyer_id: string;
  pro_id: string | null;
  name: string;
  pickup_address_id: string | null;
  dropoff_address_id: string | null;
  pickup_address: HaulAddress | null;
  dropoff_address: HaulAddress | null;
  photo_urls: string[];
  notes: string | null;
  description: string | null;
  make: string | null;
  model: string | null;
  height: number | null;
  width: number | null;
  length: number | null;
  dimension_unit: string | null;
  weight: number | null;
  weight_unit: string | null;
  status: HaulStatus;
  created_at: string;
}

export interface ExtractedListing {
  name: string | null;
  description: string | null;
  relevant_indices: number[];
  make: string | null;
  model: string | null;
  height: number | null;
  width: number | null;
  length: number | null;
  dimension_unit: string | null;
  weight: number | null;
  weight_unit: string | null;
}
