ALTER TABLE public.addresses
  ADD COLUMN full_address text GENERATED ALWAYS AS (
    TRIM(
      street1
      || CASE WHEN street2 IS NOT NULL AND TRIM(street2) <> '' THEN ', ' || street2 ELSE '' END
      || ', ' || city
      || ', ' || UPPER(state)
      || ' ' || zip
    )
  ) STORED;
