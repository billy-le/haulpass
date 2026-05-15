/** Response shape for the Mapbox Directions API v5. */
export type MapboxDirectionsResponse = {
  /** Ordered list of route options. Index 0 is the optimal route. */
  routes: Array<{
    /** Total route distance in meters. */
    distance: number;
  }>;
};

/** Response shape for the Mapbox Geocoding API v6 forward search. */
export type MapboxGeocodeResponse = {
  features: Array<{
    geometry: {
      /** [longitude, latitude] — note reversed order from the conventional lat/lng pair. */
      coordinates: [number, number];
    };
    properties: {
      /** Full human-readable address string, e.g. `"123 Main St, Austin, TX 78701, United States"`. */
      full_address?: string;
      /** Structured address components keyed by type. Only present keys were resolved by the geocoder. */
      context?: {
        address?: {
          /** Numeric street number, e.g. `"123"`. */
          address_number?: string;
          /** Street name without number, e.g. `"Main St"`. */
          street_name?: string;
        };
        /** City or locality. */
        place?: { name?: string };
        /** State or province. */
        region?: { region_code?: string };
        /** Postal code. */
        postcode?: { name?: string };
        /** ISO 3166-1 alpha-2 country code, e.g. `"US"`. */
        country?: { country_code?: string };
      };
    };
  }>;
};
