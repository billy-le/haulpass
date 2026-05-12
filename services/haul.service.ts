import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import { supabase } from "./supabase";
import type { ExtractedListing, Haul, HaulQuote, Payment } from "@/types/haul.types";

function mimeTypeFromUri(uri: string): string {
  const ext = uri.split(".").pop()?.split("?")[0]?.toLowerCase() ?? "jpg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Storage structure: {userId}/{sessionId}/{uuid}.{ext} — sessionId groups images per upload batch
export async function uploadHaulImages(userId: string, uris: string[]): Promise<string[]> {
  const folder = `${userId}/${Crypto.randomUUID()}`;

  return Promise.all(
    uris.map(async (uri) => {
      const mimeType = mimeTypeFromUri(uri);
      const ext = uri.split(".").pop()?.split("?")[0]?.toLowerCase() ?? "jpg";
      const path = `${folder}/${Crypto.randomUUID()}.${ext}`;

      const file = new File(uri);
      const bytes = await file.bytes();

      const { error } = await supabase.storage.from("haul-images").upload(path, bytes, {
        contentType: mimeType,
        upsert: false,
      });
      if (error) throw error;

      const { data } = supabase.storage.from("haul-images").getPublicUrl(path);
      return data.publicUrl;
    }),
  );
}

export async function analyzeImages(localUris: string[]): Promise<ExtractedListing> {
  const images = await Promise.all(
    localUris.map(async (uri) => {
      const mimeType = mimeTypeFromUri(uri);
      const file = new File(uri);
      const bytes = await file.bytes();
      const data = bytesToBase64(bytes);
      return { data, mimeType };
    }),
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/analyze-image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ images }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<ExtractedListing>;
}

export async function deleteHaul(id: string): Promise<void> {
  const { error } = await supabase.from("hauls").delete().eq("id", id);
  if (error) throw error;
}

const HAUL_WITH_ADDRESSES = `
  *,
  pickup_address:addresses!pickup_address_id(*),
  dropoff_address:addresses!dropoff_address_id(*)
` as const;

export async function fetchHaulById(id: string): Promise<Haul> {
  const { data, error } = await supabase
    .from("hauls")
    .select(HAUL_WITH_ADDRESSES)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Haul;
}

export async function updateHaul(
  id: string,
  payload: Partial<
    Pick<
      Haul,
      | "name"
      | "description"
      | "notes"
      | "make"
      | "model"
      | "height"
      | "width"
      | "length"
      | "dimension_unit"
      | "weight"
      | "weight_unit"
      | "pickup_address_id"
      | "dropoff_address_id"
    >
  >,
): Promise<Haul> {
  const { data, error } = await supabase
    .from("hauls")
    .update(payload)
    .eq("id", id)
    .select(HAUL_WITH_ADDRESSES)
    .single();
  if (error) throw error;
  return data as Haul;
}

export async function fetchAvailableHaulsForPro(proId: string): Promise<Haul[]> {
  const { data: rpcData, error: rpcError } = await supabase.rpc("fetch_available_hauls_for_pro", {
    p_pro_id: proId,
  });
  if (rpcError) throw rpcError;
  if (!rpcData?.length) return [];

  const ids = (rpcData as { id: string }[]).map((h) => h.id);
  const { data, error } = await supabase
    .from("hauls")
    .select(HAUL_WITH_ADDRESSES)
    .in("id", ids)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Haul[];
}

export async function fetchBuyerHauls(buyerId: string): Promise<Haul[]> {
  const { data, error } = await supabase
    .from("hauls")
    .select(HAUL_WITH_ADDRESSES)
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Haul[];
}

export async function fetchHaulQuotes(haulId: string): Promise<HaulQuote[]> {
  const { data, error } = await supabase
    .from("haul_quotes")
    .select("*")
    .eq("haul_id", haulId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as HaulQuote[];
}

export async function submitQuote(
  haulId: string,
  amountCents: number,
  note?: string,
): Promise<HaulQuote> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("haul_quotes")
    .insert({ haul_id: haulId, pro_id: user!.id, amount_cents: amountCents, note: note ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as HaulQuote;
}

export async function acceptQuote(quoteId: string): Promise<Payment> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/accept-quote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ quote_id: quoteId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<Payment>;
}

export async function createHaul(payload: {
  name: string;
  pickup_address_id: string;
  dropoff_address_id: string;
  photo_urls?: string[];
  notes?: string;
  description?: string;
  make?: string;
  model?: string;
  height?: number;
  width?: number;
  length?: number;
  dimension_unit?: string;
  weight?: number;
  weight_unit?: string;
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
