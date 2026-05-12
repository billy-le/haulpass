ALTER TABLE public.hauls
  ADD COLUMN pickup_address_id  uuid REFERENCES public.addresses(id) ON DELETE SET NULL,
  ADD COLUMN dropoff_address_id uuid REFERENCES public.addresses(id) ON DELETE SET NULL;
