CREATE TABLE hauls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  pickup_location TEXT NOT NULL,
  dropoff_location TEXT NOT NULL,
  photo_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'matched', 'in_transit', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE hauls ENABLE ROW LEVEL SECURITY;

-- All authenticated users can SELECT (pros browse available hauls)
CREATE POLICY "hauls_select_authenticated" ON hauls
  FOR SELECT TO authenticated USING (true);

-- Only the buyer can INSERT their own haul
CREATE POLICY "hauls_insert_owner" ON hauls
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);

-- Only the buyer can UPDATE their own haul
CREATE POLICY "hauls_update_owner" ON hauls
  FOR UPDATE TO authenticated USING (auth.uid() = buyer_id);

-- Only the buyer can DELETE their own haul
CREATE POLICY "hauls_delete_owner" ON hauls
  FOR DELETE TO authenticated USING (auth.uid() = buyer_id);
