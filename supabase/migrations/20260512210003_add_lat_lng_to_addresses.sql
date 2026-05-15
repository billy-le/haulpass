ALTER TABLE public.addresses
  ADD COLUMN lat FLOAT8 GENERATED ALWAYS AS (ST_Y(geolocation::geometry)) STORED,
  ADD COLUMN lng FLOAT8 GENERATED ALWAYS AS (ST_X(geolocation::geometry)) STORED;
