
-- Drop the existing enum constraint and convert series to text
ALTER TABLE mobile_homes ALTER COLUMN series TYPE text;

-- Drop the enum type since we're making it flexible
DROP TYPE IF EXISTS mobile_home_series;

-- Add a check constraint to ensure series is not empty
ALTER TABLE mobile_homes ADD CONSTRAINT series_not_empty CHECK (length(trim(series)) > 0);
