ALTER TABLE hauls
  DROP COLUMN listing_url,
  ADD COLUMN description TEXT,
  ADD COLUMN price TEXT,
  ADD COLUMN general_location TEXT,
  ADD COLUMN make TEXT,
  ADD COLUMN model TEXT,
  ADD COLUMN height NUMERIC,
  ADD COLUMN width NUMERIC,
  ADD COLUMN length NUMERIC,
  ADD COLUMN dimension_unit TEXT,
  ADD COLUMN weight NUMERIC,
  ADD COLUMN weight_unit TEXT;
