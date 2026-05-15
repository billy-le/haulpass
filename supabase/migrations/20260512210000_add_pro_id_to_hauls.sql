ALTER TABLE public.hauls
  ADD COLUMN pro_id uuid REFERENCES public.pass_pros(id) ON DELETE SET NULL;
