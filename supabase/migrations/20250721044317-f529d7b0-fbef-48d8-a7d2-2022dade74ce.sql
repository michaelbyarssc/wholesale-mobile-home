-- Update deliveries table to support multiple MSO/VIN numbers
-- Remove the single mso_vin_number field and add separate fields for each section
ALTER TABLE public.deliveries 
DROP COLUMN IF EXISTS mso_vin_number;

ALTER TABLE public.deliveries 
ADD COLUMN mso_vin_section_1 TEXT,
ADD COLUMN mso_vin_section_2 TEXT;