-- Enable PostGIS for geolocation support
CREATE EXTENSION IF NOT EXISTS postgis;

-- ─── user_profiles ────────────────────────────────────────────────
CREATE TABLE public.user_profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name  text        NOT NULL,
  last_name   text        NOT NULL,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_public_read"
  ON public.user_profiles FOR SELECT USING (true);

CREATE POLICY "user_profiles_owner_write"
  ON public.user_profiles FOR ALL USING (auth.uid() = id);

-- ─── buyers ───────────────────────────────────────────────────────
CREATE TABLE public.buyers (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyers_auth_read"
  ON public.buyers FOR SELECT TO authenticated USING (true);

CREATE POLICY "buyers_owner_write"
  ON public.buyers FOR ALL USING (auth.uid() = id);

-- ─── pass_pros ────────────────────────────────────────────────────
CREATE TABLE public.pass_pros (
  id                uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name      text,
  vehicle_make      text        NOT NULL,
  vehicle_model     text        NOT NULL,
  drivers_license   text        NOT NULL,
  service_locations jsonb       NOT NULL DEFAULT '[]',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pass_pros ENABLE ROW LEVEL SECURITY;

-- drivers_license is sensitive; restrict to authenticated users only
CREATE POLICY "pass_pros_auth_read"
  ON public.pass_pros FOR SELECT TO authenticated USING (true);

CREATE POLICY "pass_pros_owner_write"
  ON public.pass_pros FOR ALL USING (auth.uid() = id);

-- ─── addresses ────────────────────────────────────────────────────
-- No user FK — multiple buyers can share the same address row.
-- Deduplication is enforced via the unique index below.
CREATE TABLE public.addresses (
  id          uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
  street1     text                    NOT NULL,
  street2     text,
  city        text                    NOT NULL,
  state       text                    NOT NULL,
  zip         text                    NOT NULL,
  country     text                    NOT NULL DEFAULT 'US',
  geolocation geography(Point, 4326),
  created_at  timestamptz             NOT NULL DEFAULT now()
);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addresses_auth_read"
  ON public.addresses FOR SELECT TO authenticated USING (true);

-- Insert is handled via the upsert_address function (SECURITY DEFINER)
CREATE POLICY "addresses_auth_insert"
  ON public.addresses FOR INSERT TO authenticated WITH CHECK (true);

-- Case-insensitive dedup index
CREATE UNIQUE INDEX addresses_unique_idx ON public.addresses (
  LOWER(TRIM(street1)),
  LOWER(TRIM(COALESCE(street2, ''))),
  LOWER(TRIM(city)),
  LOWER(TRIM(state)),
  LOWER(TRIM(zip))
);

-- ─── buyer_addresses ──────────────────────────────────────────────
CREATE TABLE public.buyer_addresses (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id   uuid        NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
  address_id uuid        NOT NULL REFERENCES public.addresses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (buyer_id, address_id)
);

ALTER TABLE public.buyer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyer_addresses_auth_read"
  ON public.buyer_addresses FOR SELECT TO authenticated USING (true);

CREATE POLICY "buyer_addresses_owner_write"
  ON public.buyer_addresses FOR ALL USING (auth.uid() = buyer_id);

-- ─── upsert_address RPC ───────────────────────────────────────────
-- Inserts an address if it doesn't exist (deduped by normalized fields),
-- then returns the address id. Caller handles buyer_addresses link.
CREATE OR REPLACE FUNCTION public.upsert_address(
  p_street1 text,
  p_street2 text,
  p_city    text,
  p_state   text,
  p_zip     text,
  p_country text              DEFAULT 'US',
  p_lat     double precision  DEFAULT NULL,
  p_lng     double precision  DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id          uuid;
  v_geolocation geography;
BEGIN
  IF p_lat IS NOT NULL AND p_lng IS NOT NULL THEN
    v_geolocation := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;
  END IF;

  INSERT INTO public.addresses (street1, street2, city, state, zip, country, geolocation)
  VALUES (p_street1, p_street2, p_city, p_state, p_zip, p_country, v_geolocation)
  ON CONFLICT (
    LOWER(TRIM(street1)),
    LOWER(TRIM(COALESCE(street2, ''))),
    LOWER(TRIM(city)),
    LOWER(TRIM(state)),
    LOWER(TRIM(zip))
  ) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id
    FROM public.addresses
    WHERE LOWER(TRIM(street1))               = LOWER(TRIM(p_street1))
      AND LOWER(TRIM(COALESCE(street2, ''))) = LOWER(TRIM(COALESCE(p_street2, '')))
      AND LOWER(TRIM(city))                  = LOWER(TRIM(p_city))
      AND LOWER(TRIM(state))                 = LOWER(TRIM(p_state))
      AND LOWER(TRIM(zip))                   = LOWER(TRIM(p_zip));
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_address TO authenticated;
