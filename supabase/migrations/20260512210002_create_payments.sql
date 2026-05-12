CREATE TABLE public.payments (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  haul_id                  uuid        NOT NULL REFERENCES public.hauls(id) ON DELETE CASCADE,
  quote_id                 uuid        NOT NULL REFERENCES public.haul_quotes(id),
  amount_cents             integer     NOT NULL CHECK (amount_cents > 0),
  currency                 text        NOT NULL DEFAULT 'usd',
  status                   text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')),
  stripe_payment_intent_id text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Buyer reads payments for their hauls
CREATE POLICY "payments_buyer_read" ON public.payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.hauls h WHERE h.id = haul_id AND h.buyer_id = auth.uid())
  );

-- Pro reads payments for hauls they accepted
CREATE POLICY "payments_pro_read" ON public.payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.hauls h WHERE h.id = haul_id AND h.pro_id = auth.uid())
  );

-- INSERT/UPDATE via service role only (edge function handles Stripe)
