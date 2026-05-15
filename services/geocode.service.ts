import { mapboxApiClient } from "@/lib/mapbox-api-client";
import type { MapboxDirectionsResponse, MapboxGeocodeResponse } from "@/types/mapbox.types";

/** Normalized geocoded address returned by `geocodeAddress`. */
export interface GeocodedAddress {
  lat: number;
  lng: number;
  /** Full human-readable address string as resolved by Mapbox. */
  resolvedAddress?: string;
  street1?: string;
  city?: string;
  /** Two-letter state/region code, e.g. `"TX"`. */
  state?: string;
  zip?: string;
  /** ISO 3166-1 alpha-2 country code, e.g. `"US"`. */
  country?: string;
}

/**
 * Returns the driving distance in miles between two coordinates.
 *
 * Returns `null` on any failure — network error, missing token, no route found —
 * so callers can treat distance as optional without crashing.
 *
 * @param from - Origin coordinate.
 * @param to - Destination coordinate.
 * @returns Distance in miles rounded to one decimal, or `null` if unavailable.
 */
export async function getDrivingDistanceMiles(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<number | null> {
  try {
    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const data = await mapboxApiClient.get<MapboxDirectionsResponse>(
      `directions/v5/mapbox/driving/${coords}`,
      { params: { overview: "false" } },
    );
    const meters = data?.routes?.[0]?.distance;
    if (!meters) return null;
    return Math.round((meters / 1609.344) * 10) / 10;
  } catch {
    return null;
  }
}

/**
 * Forward-geocodes a free-text address string to coordinates and structured components.
 *
 * Returns `null` on any failure — network error, missing token, no match found —
 * so callers can treat geocoding as optional without crashing.
 *
 * @param address - Free-text address to geocode, e.g. `"1600 Amphitheatre Pkwy, Mountain View, CA"`.
 * @returns Resolved coordinates and structured address components, or `null` if unavailable.
 */
export async function geocodeAddress(address: string): Promise<GeocodedAddress | null> {
  try {
    const data = await mapboxApiClient.get<MapboxGeocodeResponse>(`search/geocode/v6/forward`, {
      params: { q: encodeURIComponent(address), limit: "1" },
    });
    const feature = data?.features?.[0];
    if (!feature) return null;
    const [lng, lat] = feature.geometry.coordinates;
    const ctx = feature.properties?.context ?? {};
    const streetNum = ctx.address?.address_number ?? "";
    const streetName = ctx.address?.street_name ?? "";
    const street1 =
      streetNum && streetName ? `${streetNum} ${streetName}` : streetNum || streetName || undefined;
    return {
      lat,
      lng,
      resolvedAddress: feature.properties?.full_address,
      street1,
      city: ctx.place?.name,
      state: ctx.region?.region_code,
      zip: ctx.postcode?.name,
      country: ctx.country?.country_code,
    };
  } catch {
    return null;
  }
}
