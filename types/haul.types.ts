export type HaulStatus = "pending" | "matched" | "in_transit" | "completed" | "cancelled";

export interface Haul {
  id: string;
  buyer_id: string;
  item_name: string;
  pickup_location: string;
  dropoff_location: string;
  photo_urls: string[];
  listing_url: string | null;
  notes: string | null;
  status: HaulStatus;
  created_at: string;
}
