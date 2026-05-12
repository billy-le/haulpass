CREATE TABLE public.haul_quotes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  haul_id      uuid        NOT NULL REFERENCES public.hauls(id) ON DELETE CASCADE,
  pro_id       uuid        NOT NULL REFERENCES public.pass_pros(id) ON DELETE CASCADE,
  amount_cents integer     NOT NULL CHECK (amount_cents > 0),
  status       text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (haul_id, pro_id)
);

ALTER TABLE public.haul_quotes ENABLE ROW LEVEL SECURITY;

-- Buyer sees all quotes on their hauls
CREATE POLICY "haul_quotes_buyer_read" ON public.haul_quotes
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.hauls h WHERE h.id = haul_id AND h.buyer_id = auth.uid())
  );

-- Pro sees only their own quotes
CREATE POLICY "haul_quotes_pro_read" ON public.haul_quotes
  FOR SELECT TO authenticated
  USING (auth.uid() = pro_id);

-- Pro inserts their own quote on pending hauls
CREATE POLICY "haul_quotes_pro_insert" ON public.haul_quotes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = pro_id
    AND EXISTS (SELECT 1 FROM public.hauls h WHERE h.id = haul_id AND h.status = 'pending')
  );

-- Pro can update their own pending quote (revise price/note)
CREATE POLICY "haul_quotes_pro_update" ON public.haul_quotes
  FOR UPDATE TO authenticated
  USING (auth.uid() = pro_id AND status = 'pending');
