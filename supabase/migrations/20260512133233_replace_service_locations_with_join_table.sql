ALTER TABLE public.pass_pros DROP COLUMN service_locations;

CREATE TABLE public.pass_pro_service_areas (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id        uuid        NOT NULL REFERENCES public.pass_pros(id) ON DELETE CASCADE,
  location_type text        NOT NULL CHECK (location_type IN ('city', 'postal_code')),
  value         text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pro_id, location_type, value)
);

CREATE INDEX idx_service_areas_value ON public.pass_pro_service_areas (value);

ALTER TABLE public.pass_pro_service_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_areas_auth_read"
  ON public.pass_pro_service_areas FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_areas_owner_write"
  ON public.pass_pro_service_areas FOR ALL USING (auth.uid() = pro_id);
