-- Drop text location columns — address data lives in the addresses table via FKs
ALTER TABLE public.hauls
  DROP COLUMN pickup_location,
  DROP COLUMN dropoff_location;

