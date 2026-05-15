-- Pro can delete (withdraw) their own pending quote
CREATE POLICY "haul_quotes_pro_delete" ON public.haul_quotes
  FOR DELETE TO authenticated
  USING (auth.uid() = pro_id AND status = 'pending');
