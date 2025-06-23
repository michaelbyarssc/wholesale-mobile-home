
-- Create a table to store multiple images for each mobile home
CREATE TABLE public.mobile_home_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mobile_home_id UUID NOT NULL REFERENCES public.mobile_homes(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type TEXT NOT NULL DEFAULT 'exterior', -- 'exterior', 'interior', 'floorplan'
  display_order INTEGER NOT NULL DEFAULT 0,
  alt_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for better query performance
CREATE INDEX idx_mobile_home_images_home_id ON public.mobile_home_images(mobile_home_id);
CREATE INDEX idx_mobile_home_images_type_order ON public.mobile_home_images(mobile_home_id, image_type, display_order);

-- Enable Row Level Security (RLS) - making it public readable since this is for public showcase
ALTER TABLE public.mobile_home_images ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to images
CREATE POLICY "Allow public read access to mobile home images" 
  ON public.mobile_home_images 
  FOR SELECT 
  USING (true);

-- Create policy to allow authenticated users to insert images (for admin purposes)
CREATE POLICY "Allow authenticated users to insert mobile home images" 
  ON public.mobile_home_images 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to update images (for admin purposes)
CREATE POLICY "Allow authenticated users to update mobile home images" 
  ON public.mobile_home_images 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to delete images (for admin purposes)
CREATE POLICY "Allow authenticated users to delete mobile home images" 
  ON public.mobile_home_images 
  FOR DELETE 
  USING (auth.role() = 'authenticated');
