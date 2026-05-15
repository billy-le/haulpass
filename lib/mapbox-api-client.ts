import { ApiClient } from "./api-client";

/**
 * `ApiClient` configured for the Mapbox REST API.
 *
 * Appends `EXPO_PUBLIC_MAPBOX_TOKEN` as `access_token` on every request.
 *
 * @example
 * const data = await mapboxApiClient.get<MapboxGeocodeResponse>(
 *   "search/geocode/v6/forward",
 *   { params: { q: "Austin, TX", limit: "1" } },
 * );
 */
export const mapboxApiClient = new ApiClient({
  baseUrl: "https://api.mapbox.com",
  defaultParams: { access_token: process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? "" },
});
