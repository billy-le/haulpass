export type HaulStatus = "pending" | "matched" | "in_transit" | "completed" | "cancelled";
export type HaulQuoteStatus = "pending" | "accepted" | "rejected" | "outbid" | "expired";
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
  distance_miles: number | null;
  status: HaulStatus;
  created_at: string;
  haul_quotes?: Array<Pick<HaulQuote, "id" | "status">>;
}

export interface ProHaulAddress {
  id: string;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
}

export type ProHaul = Omit<Haul, "pickup_address" | "dropoff_address"> & {
  pickup_address: ProHaulAddress | null;
  dropoff_address: ProHaulAddress | null;
};

export interface HaulQuoteWithPro extends HaulQuote {
  pro_profile: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  } | null;
  pass_pro: {
    company_name: string | null;
    vehicle_make: string;
    vehicle_model: string;
  } | null;
}

export interface ProQuoteWithHaul extends HaulQuote {
  haul: ProHaul;
}

export interface ProDashboardData {
  activeHauls: ProHaul[];
  jobOffers: ProQuoteWithHaul[];
  availableHauls: ProHaul[];
  outbidQuotes: ProQuoteWithHaul[];
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
