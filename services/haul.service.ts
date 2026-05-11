import { supabase } from "./supabase";
import type { Haul } from "@/types/haul.types";

export async function fetchBuyerHauls(buyerId: string): Promise<Haul[]> {
  const { data, error } = await supabase
    .from("hauls")
    .select("*")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Haul[];
}

export async function createHaul(payload: {
  item_name: string;
  pickup_location: string;
  dropoff_location: string;
}): Promise<Haul> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-haul`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<Haul>;
}
