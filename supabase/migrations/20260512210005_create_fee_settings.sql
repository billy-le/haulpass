CREATE TABLE public.fee_settings (
  key         text    PRIMARY KEY,
  value       numeric NOT NULL,
  description text
);

ALTER TABLE public.fee_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fee_settings_read"
  ON public.fee_settings FOR SELECT TO authenticated USING (true);

INSERT INTO public.fee_settings (key, value, description) VALUES
  ('platform_fee_pct', 0.15, '15% platform fee on pro quote'),
  ('mileage_rate_cents', 150, '$1.50 per mile');

CREATE OR REPLACE FUNCTION get_quote_breakdown(p_quote_id uuid)
RETURNS TABLE (
  pro_amount_cents   integer,
  platform_fee_cents integer,
  mileage_fee_cents  integer,
  total_cents        integer,
  distance_miles     numeric
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    q.amount_cents AS pro_amount_cents,
    ROUND(q.amount_cents * (SELECT value FROM public.fee_settings WHERE key = 'platform_fee_pct'))::integer AS platform_fee_cents,
    ROUND(COALESCE(h.distance_miles, 0) * (SELECT value FROM public.fee_settings WHERE key = 'mileage_rate_cents'))::integer AS mileage_fee_cents,
    (
      q.amount_cents
      + ROUND(q.amount_cents * (SELECT value FROM public.fee_settings WHERE key = 'platform_fee_pct'))::integer
      + ROUND(COALESCE(h.distance_miles, 0) * (SELECT value FROM public.fee_settings WHERE key = 'mileage_rate_cents'))::integer
    )::integer AS total_cents,
    h.distance_miles
  FROM public.haul_quotes q
  JOIN public.hauls h ON h.id = q.haul_id
  WHERE q.id = p_quote_id;
$$;
