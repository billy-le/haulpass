-- Hauls: store geocoded pickup coordinates
ALTER TABLE public.hauls
  ADD COLUMN pickup_lat FLOAT8,
  ADD COLUMN pickup_lng FLOAT8;

-- Service areas: store geocoded center + service radius
ALTER TABLE public.pass_pro_service_areas
  ADD COLUMN lat FLOAT8,
  ADD COLUMN lng FLOAT8,
  ADD COLUMN radius_km FLOAT8 NOT NULL DEFAULT 25;

-- RPC: return pending hauls within any of a pro's service area radii
CREATE OR REPLACE FUNCTION public.fetch_available_hauls_for_pro(p_pro_id UUID)
RETURNS SETOF public.hauls
LANGUAGE sql STABLE AS $$
  SELECT h.*
  FROM public.hauls h
  WHERE h.status = 'pending'
    AND h.pickup_lat IS NOT NULL
    AND h.pickup_lng IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.pass_pro_service_areas sa
      WHERE sa.pro_id = p_pro_id
        AND sa.lat IS NOT NULL
        AND sa.lng IS NOT NULL
        AND (
          6371 * acos(
            LEAST(1.0,
              cos(radians(sa.lat)) * cos(radians(h.pickup_lat)) *
              cos(radians(h.pickup_lng) - radians(sa.lng)) +
              sin(radians(sa.lat)) * sin(radians(h.pickup_lat))
            )
          )
        ) <= sa.radius_km
    )
  ORDER BY h.created_at DESC;
$$;
