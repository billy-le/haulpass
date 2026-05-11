-- Allow buyer_id to be NULL so hauls survive account deletion
ALTER TABLE hauls ALTER COLUMN buyer_id DROP NOT NULL;

-- Switch FK from CASCADE to SET NULL — completed/in_transit hauls are preserved
ALTER TABLE hauls DROP CONSTRAINT hauls_buyer_id_fkey;
ALTER TABLE hauls
  ADD CONSTRAINT hauls_buyer_id_fkey
  FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE SET NULL;
