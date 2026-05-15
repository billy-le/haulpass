import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import { supabaseApiClient } from "@/lib/supabase-api-client";
import { supabase } from "./supabase";
import type {
  ExtractedListing,
  Haul,
  HaulQuote,
  HaulQuoteWithPro,
  Payment,
  ProDashboardData,
  ProHaul,
  ProQuoteWithHaul,
} from "@/types/haul.types";
import type { QuoteBreakdown } from "@/types/review.types";

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

  return supabaseApiClient.post<ExtractedListing>("analyze-image", { images });
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

const BUYER_HAUL_WITH_BIDS = `
  *,
  pickup_address:addresses!pickup_address_id(*),
  dropoff_address:addresses!dropoff_address_id(*),
  haul_quotes!haul_id(id, status)
` as const;

const PRO_HAUL_WITH_ADDRESSES = `
  *,
  pickup_address:addresses!pickup_address_id(id, city, state, lat, lng),
  dropoff_address:addresses!dropoff_address_id(id, city, state, lat, lng)
` as const;

export async function fetchHaulById(id: string) {
  const { data, error } = await supabase
    .from("hauls")
    .select(HAUL_WITH_ADDRESSES)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
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
) {
  const { data, error } = await supabase
    .from("hauls")
    .update(payload)
    .eq("id", id)
    .select(HAUL_WITH_ADDRESSES)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchProDashboard(proId: string): Promise<ProDashboardData> {
  const QUOTE_WITH_HAUL = `*, haul:hauls!haul_id(*, pickup_address:addresses!pickup_address_id(id, city, state, lat, lng), dropoff_address:addresses!dropoff_address_id(id, city, state, lat, lng))`;

  const [quotesRes, activeHaulsRes, rpcRes] = await Promise.all([
    supabase
      .from("haul_quotes")
      .select(QUOTE_WITH_HAUL)
      .eq("pro_id", proId)
      .order("created_at", { ascending: false }),
    supabase
      .from("hauls")
      .select(PRO_HAUL_WITH_ADDRESSES)
      .eq("pro_id", proId)
      .in("status", ["matched", "in_transit"]),
    supabase.rpc("fetch_available_hauls_for_pro", { p_pro_id: proId }),
  ]);

  if (quotesRes.error) throw quotesRes.error;
  if (activeHaulsRes.error) throw activeHaulsRes.error;
  if (rpcRes.error) throw rpcRes.error;

  const quotes = quotesRes.data as ProQuoteWithHaul[];
  const activeHauls = activeHaulsRes.data as ProHaul[];

  let availableHauls: ProHaul[] = [];
  if (rpcRes.data?.length) {
    const ids = (rpcRes.data as { id: string }[]).map((h) => h.id);
    const { data, error } = await supabase
      .from("hauls")
      .select(PRO_HAUL_WITH_ADDRESSES)
      .in("id", ids)
      .order("created_at", { ascending: false });
    if (error) throw error;
    availableHauls = data as ProHaul[];
  }

  const jobOffers: ProQuoteWithHaul[] = [];
  const outbidQuotes: ProQuoteWithHaul[] = [];
  const jobOfferHaulIds = new Set<string>();
  const activeHaulIds = new Set(activeHauls.map((h) => h.id));

  for (const quote of quotes) {
    if (quote.status === "pending") {
      jobOffers.push(quote);
      jobOfferHaulIds.add(quote.haul_id);
    } else if (
      quote.status === "outbid" ||
      quote.status === "rejected" ||
      quote.status === "expired"
    ) {
      outbidQuotes.push(quote);
    }
  }

  return {
    activeHauls,
    jobOffers,
    availableHauls: availableHauls.filter(
      (h) => !jobOfferHaulIds.has(h.id) && !activeHaulIds.has(h.id),
    ),
    outbidQuotes,
  };
}

export async function fetchHaulByIdForPro(id: string): Promise<ProHaul> {
  const { data, error } = await supabase
    .from("hauls")
    .select(PRO_HAUL_WITH_ADDRESSES)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as ProHaul;
}

export async function fetchBuyerHauls(buyerId: string): Promise<Haul[]> {
  const { data, error } = await supabase
    .from("hauls")
    .select(BUYER_HAUL_WITH_BIDS)
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

export async function fetchHaulQuotesWithProfiles(haulId: string): Promise<HaulQuoteWithPro[]> {
  const { data: quotes, error: quotesErr } = await supabase
    .from("haul_quotes")
    .select(`*, pass_pro:pass_pros!pro_id(company_name, vehicle_make, vehicle_model)`)
    .eq("haul_id", haulId)
    .order("created_at", { ascending: false });
  if (quotesErr) throw quotesErr;
  if (!quotes?.length) return [];

  const proIds = [...new Set(quotes.map((q) => q.pro_id))];
  const { data: profiles, error: profilesErr } = await supabase
    .from("user_profiles")
    .select("id, first_name, last_name, avatar_url")
    .in("id", proIds);
  if (profilesErr) throw profilesErr;

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return quotes.map((q) => ({
    ...q,
    pro_profile: profileMap.get(q.pro_id) ?? null,
  })) as HaulQuoteWithPro[];
}

export async function getQuoteBreakdown(quoteId: string): Promise<QuoteBreakdown> {
  const { data, error } = await supabase.rpc("get_quote_breakdown", { p_quote_id: quoteId });
  if (error) throw error;
  return data[0] as QuoteBreakdown;
}

export async function submitQuote(
  haulId: string,
  amountCents: number,
  note?: string,
  distanceMiles?: number,
): Promise<HaulQuote> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const distanceRpc =
    distanceMiles != null
      ? // @ts-expect-error — not in generated types until pnpm gen:types runs after migration
        supabase.rpc("update_haul_distance", { p_haul_id: haulId, p_distance_miles: distanceMiles })
      : Promise.resolve();

  const [, { data, error }] = await Promise.all([
    distanceRpc,
    supabase
      .from("haul_quotes")
      .insert({
        haul_id: haulId,
        pro_id: user!.id,
        amount_cents: amountCents,
        note: note ?? null,
      })
      .select()
      .single(),
  ]);
  if (error) throw error;
  return data as HaulQuote;
}

export async function cancelQuote(quoteId: string): Promise<void> {
  const { error } = await supabase.from("haul_quotes").delete().eq("id", quoteId);
  if (error) throw error;
}

export async function updateQuote(
  quoteId: string,
  amountCents: number,
  note?: string,
): Promise<HaulQuote> {
  const { data, error } = await supabase
    .from("haul_quotes")
    .update({ amount_cents: amountCents, note: note ?? null })
    .eq("id", quoteId)
    .select()
    .single();
  if (error) throw error;
  return data as HaulQuote;
}

export async function acceptQuote(quoteId: string): Promise<Payment> {
  return supabaseApiClient.post<Payment>("accept-quote", { quote_id: quoteId });
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
  distance_miles?: number | null;
}): Promise<Haul> {
  return supabaseApiClient.post<Haul>("create-haul", payload);
}
