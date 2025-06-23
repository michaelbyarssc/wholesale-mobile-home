
-- Add detailed specification columns to the mobile_homes table
ALTER TABLE public.mobile_homes 
ADD COLUMN IF NOT EXISTS square_footage INTEGER,
ADD COLUMN IF NOT EXISTS bedrooms INTEGER,
ADD COLUMN IF NOT EXISTS bathrooms NUMERIC(2,1),
ADD COLUMN IF NOT EXISTS length_feet INTEGER,
ADD COLUMN IF NOT EXISTS width_feet INTEGER,
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS floor_plan_image_url TEXT,
ADD COLUMN IF NOT EXISTS exterior_image_url TEXT;

-- Update existing records with sample data based on owntru.com models
-- Tru Series Models
UPDATE public.mobile_homes 
SET 
  square_footage = 1280,
  bedrooms = 3,
  bathrooms = 2.0,
  length_feet = 80,
  width_feet = 16,
  description = 'The Tru MH 16x80 offers modern living with thoughtful design and quality construction.',
  features = '["Open floor plan", "Kitchen island", "Master bedroom suite", "Energy efficient windows", "Vinyl plank flooring", "Stainless steel appliances"]'::jsonb
WHERE model = 'Tru MH 16x80';

UPDATE public.mobile_homes 
SET 
  square_footage = 1440,
  bedrooms = 3,
  bathrooms = 2.0,
  length_feet = 80,
  width_feet = 18,
  description = 'The Tru MH 18x80 provides spacious living with premium features and modern amenities.',
  features = '["Spacious great room", "Large kitchen with pantry", "Master suite with walk-in closet", "Guest bathroom", "Covered front porch", "Energy Star rated"]'::jsonb
WHERE model = 'Tru MH 18x80';

UPDATE public.mobile_homes 
SET 
  square_footage = 1600,
  bedrooms = 4,
  bathrooms = 2.0,
  length_feet = 80,
  width_feet = 20,
  description = 'The Tru MH 20x80 delivers maximum space and comfort for growing families.',
  features = '["Four bedrooms", "Two full bathrooms", "Open concept living", "Large master bedroom", "Utility room", "Front and rear porches"]'::jsonb
WHERE model = 'Tru MH 20x80';

-- Epic Series Models
UPDATE public.mobile_homes 
SET 
  square_footage = 1280,
  bedrooms = 3,
  bathrooms = 2.0,
  length_feet = 80,
  width_feet = 16,
  description = 'The Epic MH 16x80 combines luxury finishes with smart design for premium living.',
  features = '["Premium cabinetry", "Granite countertops", "Luxury vinyl flooring", "High-end fixtures", "Upgraded appliances", "Designer lighting"]'::jsonb
WHERE model = 'Epic MH 16x80';

UPDATE public.mobile_homes 
SET 
  square_footage = 1440,
  bedrooms = 3,
  bathrooms = 2.0,
  length_feet = 80,
  width_feet = 18,
  description = 'The Epic MH 18x80 offers expansive luxury living with premium appointments throughout.',
  features = '["Gourmet kitchen", "Premium finishes", "Spa-like master bath", "Coffered ceilings", "Custom cabinetry", "High-end appliances"]'::jsonb
WHERE model = 'Epic MH 18x80';

UPDATE public.mobile_homes 
SET 
  square_footage = 1600,
  bedrooms = 4,
  bathrooms = 2.0,
  length_feet = 80,
  width_feet = 20,
  description = 'The Epic MH 20x80 represents the pinnacle of mobile home luxury and sophistication.',
  features = '["Four spacious bedrooms", "Luxury master suite", "Gourmet kitchen with island", "Premium fixtures throughout", "High-end flooring", "Designer touches"]'::jsonb
WHERE model = 'Epic MH 20x80';
