-- Add MSO/VIN number field to deliveries table
ALTER TABLE public.deliveries 
ADD COLUMN mso_vin_number TEXT;