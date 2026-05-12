ALTER TABLE public.hauls
  DROP COLUMN pickup_lat,
  DROP COLUMN pickup_lng,
  DROP COLUMN general_location;

ALTER TABLE public.hauls
  RENAME COLUMN item_name TO name;

-- Update proximity RPC to derive coords from pickup address geolocation
CREATE OR REPLACE FUNCTION public.fetch_available_hauls_for_pro(p_pro_id UUID)
RETURNS SETOF public.hauls LANGUAGE sql STABLE AS $$
  SELECT h.* FROM public.hauls h
  JOIN public.addresses pickup_addr ON pickup_addr.id = h.pickup_address_id
  WHERE h.status = 'pending'
    AND pickup_addr.geolocation IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.pass_pro_service_areas sa
      WHERE sa.pro_id = p_pro_id
        AND sa.lat IS NOT NULL AND sa.lng IS NOT NULL
        AND (6371 * acos(LEAST(1.0,
          cos(radians(sa.lat)) * cos(radians(ST_Y(pickup_addr.geolocation::geometry))) *
          cos(radians(ST_X(pickup_addr.geolocation::geometry)) - radians(sa.lng)) +
          sin(radians(sa.lat)) * sin(radians(ST_Y(pickup_addr.geolocation::geometry)))
        ))) <= sa.radius_km
    )
  ORDER BY h.created_at DESC;
$$;
