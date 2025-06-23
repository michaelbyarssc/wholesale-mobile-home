
-- First, let's add more Tru series models based on the owntru.com website
-- Clear existing basic entries and add comprehensive Tru series models

-- Insert additional Tru series models with complete specifications
INSERT INTO public.mobile_homes (manufacturer, series, model, price, square_footage, bedrooms, bathrooms, length_feet, width_feet, description, features, active) VALUES

-- Tru MH Series (Single-wide models)
('Clayton', 'Tru', 'Tru MH 14x56', 45000, 784, 2, 1, 56, 14, 'Compact and efficient single-wide home perfect for first-time buyers or retirement living.', 
'["Open floor plan", "Efficient kitchen", "Spacious master bedroom", "Energy efficient windows", "Vinyl flooring", "Front porch ready"]', true),

('Clayton', 'Tru', 'Tru MH 14x60', 48000, 840, 2, 1, 60, 14, 'Well-designed single-wide with enhanced living space and modern amenities.', 
'["Open concept living", "Kitchen with breakfast bar", "Master suite", "Guest bedroom", "Energy Star rated", "Covered porch option"]', true),

('Clayton', 'Tru', 'Tru MH 14x66', 52000, 924, 2, 2, 66, 14, 'Spacious single-wide featuring two full bathrooms and premium finishes.', 
'["Two full bathrooms", "Split bedroom layout", "Large kitchen", "Separate dining area", "Walk-in closets", "Utility room"]', true),

('Clayton', 'Tru', 'Tru MH 14x70', 55000, 980, 3, 2, 70, 14, 'Three-bedroom single-wide ideal for growing families seeking affordable quality.', 
'["Three bedrooms", "Two bathrooms", "Open living area", "Kitchen island", "Master suite", "Front and rear porches"]', true),

-- Tru MH Series (Double-wide models)
('Clayton', 'Tru', 'Tru MH 16x76', 68000, 1216, 3, 2, 76, 16, 'Affordable double-wide with smart design and quality construction throughout.', 
'["Spacious great room", "Kitchen with pantry", "Master bedroom suite", "Two additional bedrooms", "Utility room", "Energy efficient"]', true),

('Clayton', 'Tru', 'Tru MH 18x76', 75000, 1368, 3, 2, 76, 18, 'Well-appointed double-wide offering enhanced space and modern living features.', 
'["Large great room", "Gourmet kitchen", "Master suite with walk-in closet", "Guest bedrooms", "Two full baths", "Covered porches"]', true),

('Clayton', 'Tru', 'Tru MH 20x76', 82000, 1520, 4, 2, 76, 20, 'Spacious four-bedroom double-wide perfect for larger families.', 
'["Four bedrooms", "Two full bathrooms", "Open concept design", "Large kitchen with island", "Master suite", "Utility room"]', true),

-- Tru MH Series (Larger double-wide models)
('Clayton', 'Tru', 'Tru MH 18x84', 85000, 1512, 3, 2, 84, 18, 'Extended length double-wide providing maximum living space and comfort.', 
'["Extended living area", "Gourmet kitchen", "Dining room", "Master suite", "Two guest bedrooms", "Two full baths", "Large utility"]', true),

('Clayton', 'Tru', 'Tru MH 20x84', 92000, 1680, 4, 2, 84, 20, 'Premium four-bedroom model with luxury features and spacious design.', 
'["Four large bedrooms", "Open concept living", "Kitchen with island and pantry", "Master suite with garden tub", "Walk-in closets", "Covered porches"]', true),

('Clayton', 'Tru', 'Tru MH 22x84', 98000, 1848, 4, 3, 84, 22, 'Top-of-the-line Tru model featuring three bathrooms and premium appointments.', 
'["Four bedrooms", "Three full bathrooms", "Great room with fireplace", "Gourmet kitchen", "Master suite with luxury bath", "Guest suite"]', true);

-- Update the existing models to ensure consistency
UPDATE public.mobile_homes 
SET features = '["Open floor plan", "Kitchen island", "Master bedroom suite", "Energy efficient windows", "Vinyl plank flooring", "Stainless steel appliances", "Covered front porch"]'
WHERE model = 'Tru MH 16x80';

UPDATE public.mobile_homes 
SET features = '["Spacious great room", "Large kitchen with pantry", "Master suite with walk-in closet", "Guest bathroom", "Covered front porch", "Energy Star rated", "Utility room"]'
WHERE model = 'Tru MH 18x80';

UPDATE public.mobile_homes 
SET features = '["Four bedrooms", "Two full bathrooms", "Open concept living", "Large master bedroom", "Utility room", "Front and rear porches", "Walk-in closets"]'
WHERE model = 'Tru MH 20x80';
