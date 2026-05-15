CREATE TABLE public.reviews (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  haul_id     uuid        NOT NULL REFERENCES public.hauls(id) ON DELETE CASCADE,
  reviewer_id uuid        NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
  reviewee_id uuid        NOT NULL REFERENCES public.pass_pros(id) ON DELETE CASCADE,
  rating      integer     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (haul_id, reviewer_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_read"
  ON public.reviews FOR SELECT TO authenticated USING (true);

CREATE POLICY "reviews_insert"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM public.hauls h
      WHERE h.id = haul_id
        AND h.status = 'completed'
        AND h.buyer_id = auth.uid()
    )
  );
