
-- Add a new column for the display name from OwnTru website
ALTER TABLE public.mobile_homes 
ADD COLUMN display_name TEXT;

-- Update existing records with placeholder names (you can update these later with actual names)
UPDATE public.mobile_homes 
SET display_name = CASE 
  WHEN series = 'Tru' AND model = 'Tru MH 16x80' THEN 'Bliss'
  WHEN series = 'Tru' AND model = 'Tru MH 18x80' THEN 'Delight' 
  WHEN series = 'Tru' AND model = 'Tru MH 20x80' THEN 'Elation'
  WHEN series = 'Epic' AND model = 'Epic MH 16x80' THEN 'Triumph'
  WHEN series = 'Epic' AND model = 'Epic MH 18x80' THEN 'Victory'
  WHEN series = 'Epic' AND model = 'Epic MH 20x80' THEN 'Excellence'
  ELSE model
END;
