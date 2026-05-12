export interface GeocodedAddress {
  lat: number;
  lng: number;
  resolvedAddress?: string;
  street1?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export async function getDrivingDistanceMiles(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<number | null> {
  const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  try {
    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const res = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?access_token=${token}&overview=false`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    const meters: number = json.routes?.[0]?.distance;
    if (!meters) return null;
    return Math.round((meters / 1609.344) * 10) / 10;
  } catch {
    return null;
  }
}

export async function geocodeAddress(address: string): Promise<GeocodedAddress | null> {
  const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch(
      `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(address)}&access_token=${token}&limit=1`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    const feature = json.features?.[0];
    if (!feature) return null;
    const [lng, lat] = feature.geometry.coordinates as [number, number];
    const ctx = feature.properties?.context ?? {};
    const streetNum: string = ctx.address?.address_number ?? "";
    const streetName: string = ctx.address?.street_name ?? "";
    const street1 =
      streetNum && streetName ? `${streetNum} ${streetName}` : streetNum || streetName || undefined;
    return {
      lat,
      lng,
      resolvedAddress: feature.properties?.full_address as string | undefined,
      street1,
      city: ctx.place?.name as string | undefined,
      state: ctx.region?.region_code as string | undefined,
      zip: ctx.postcode?.name as string | undefined,
      country: ctx.country?.country_code as string | undefined,
    };
  } catch {
    return null;
  }
}
