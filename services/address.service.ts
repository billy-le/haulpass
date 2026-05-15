import { supabase } from "@/services/supabase";

export interface Address {
  id: string;
  street1: string;
  street2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  full_address: string;
}

export function formatAddress(address: Address): string {
  const parts = [address.street1];
  if (address.street2) parts.push(address.street2);
  parts.push(`${address.city}, ${address.state} ${address.zip}`);
  return parts.join(", ");
}

export async function fetchBuyerAddresses(buyerId: string): Promise<Address[]> {
  const { data, error } = await supabase
    .from("buyer_addresses")
    .select("addresses(id, street1, street2, city, state, zip, country)")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => row.addresses as Address);
}

export interface AddressInput {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export async function upsertAddress(input: AddressInput): Promise<string | null> {
  if (!input.street1 || !input.city || !input.state || !input.zip) return null;
  const { data, error } = await supabase.rpc("upsert_address", {
    p_street1: input.street1,
    p_street2: input.street2 ?? null,
    p_city: input.city,
    p_state: input.state,
    p_zip: input.zip,
    p_country: input.country ?? "US",
    p_lat: input.lat ?? null,
    p_lng: input.lng ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function upsertBuyerAddress(buyerId: string, input: AddressInput): Promise<void> {
  const { data: addressId, error: addrError } = await supabase.rpc("upsert_address", {
    p_street1: input.street1,
    p_street2: input.street2 ?? null,
    p_city: input.city,
    p_state: input.state,
    p_zip: input.zip,
    p_country: input.country ?? "US",
    p_lat: input.lat ?? null,
    p_lng: input.lng ?? null,
  });
  if (addrError) throw addrError;

  const { error: buyerError } = await supabase
    .from("buyers")
    .upsert({ id: buyerId }, { ignoreDuplicates: true });
  if (buyerError) throw buyerError;

  const { error: linkError } = await supabase
    .from("buyer_addresses")
    .upsert({ buyer_id: buyerId, address_id: addressId }, { ignoreDuplicates: true });
  if (linkError) throw linkError;
}
