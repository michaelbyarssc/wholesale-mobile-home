-- Create FAQ categories table
CREATE TABLE public.faq_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create FAQs table
CREATE TABLE public.faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.faq_categories(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  featured BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- RLS policies for faq_categories
CREATE POLICY "Anyone can view active FAQ categories" 
ON public.faq_categories 
FOR SELECT 
USING (active = true);

CREATE POLICY "Admins can manage FAQ categories" 
ON public.faq_categories 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- RLS policies for faqs
CREATE POLICY "Anyone can view active FAQs" 
ON public.faqs 
FOR SELECT 
USING (active = true);

CREATE POLICY "Admins can manage all FAQs" 
ON public.faqs 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_faq_categories_active_order ON public.faq_categories(active, display_order);
CREATE INDEX idx_faqs_active_category_order ON public.faqs(active, category_id, display_order);
CREATE INDEX idx_faqs_featured ON public.faqs(featured) WHERE featured = true;

-- Add update triggers
CREATE TRIGGER update_faq_categories_updated_at
  BEFORE UPDATE ON public.faq_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_faqs_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default FAQ categories
INSERT INTO public.faq_categories (name, slug, description, display_order) VALUES
('General Information', 'general', 'Basic questions about mobile homes', 1),
('Financing & Pricing', 'financing', 'Questions about costs, loans, and payment options', 2),
('Installation & Setup', 'installation', 'Questions about delivery, setup, and site preparation', 3),
('Maintenance & Care', 'maintenance', 'Questions about upkeep and maintenance', 4),
('Legal & Regulations', 'legal', 'Questions about permits, regulations, and legal requirements', 5);

-- Insert sample FAQs
INSERT INTO public.faqs (category_id, question, answer, display_order, featured) VALUES
-- General Information
((SELECT id FROM public.faq_categories WHERE slug = 'general'), 
 'What is a mobile home?', 
 'A mobile home is a prefabricated structure built in a factory and transported to a site. Modern mobile homes, also called manufactured homes, are built to HUD standards and offer quality, affordable housing options.',
 1, true),

((SELECT id FROM public.faq_categories WHERE slug = 'general'), 
 'What sizes are available?', 
 'We offer single-wide homes (typically 14-18 feet wide) and double-wide homes (typically 20-32 feet wide). Lengths vary from 40 to 80 feet depending on the model.',
 2, true),

((SELECT id FROM public.faq_categories WHERE slug = 'general'), 
 'How long do mobile homes last?', 
 'With proper maintenance, modern manufactured homes can last 50+ years. The HUD construction standards ensure durability and quality.',
 3, false),

-- Financing & Pricing
((SELECT id FROM public.faq_categories WHERE slug = 'financing'), 
 'Do you offer financing?', 
 'Yes, we work with multiple lenders to help you find financing options that fit your budget. Contact us for pre-approval assistance.',
 1, true),

((SELECT id FROM public.faq_categories WHERE slug = 'financing'), 
 'What is the typical cost range?', 
 'Prices vary based on size, features, and location. Our homes typically range from $40,000 to $150,000. Get a personalized quote using our estimate tool.',
 2, true),

((SELECT id FROM public.faq_categories WHERE slug = 'financing'), 
 'Are there additional costs beyond the home price?', 
 'Yes, additional costs may include delivery, setup, permits, utility connections, and site preparation. We provide detailed estimates including all applicable costs.',
 3, false),

-- Installation & Setup
((SELECT id FROM public.faq_categories WHERE slug = 'installation'), 
 'Do you handle delivery and setup?', 
 'Yes, we provide complete delivery and professional setup services. Our experienced team ensures your home is properly installed and ready for occupancy.',
 1, true),

((SELECT id FROM public.faq_categories WHERE slug = 'installation'), 
 'What site preparation is required?', 
 'You''ll need a level foundation, utility connections, and proper permits. We can recommend contractors for site preparation if needed.',
 2, false),

((SELECT id FROM public.faq_categories WHERE slug = 'installation'), 
 'How long does installation take?', 
 'Typical installation takes 1-3 days depending on the home size and site conditions. We''ll provide a detailed timeline with your estimate.',
 3, false),

-- Maintenance & Care
((SELECT id FROM public.faq_categories WHERE slug = 'maintenance'), 
 'What maintenance is required?', 
 'Regular maintenance includes HVAC system care, roof and gutter cleaning, caulking inspection, and skirting maintenance. We provide a detailed maintenance guide with every home.',
 1, false),

((SELECT id FROM public.faq_categories WHERE slug = 'maintenance'), 
 'Do you provide warranty coverage?', 
 'Yes, all our homes come with manufacturer warranties covering structural components, appliances, and systems. Extended warranty options are also available.',
 2, true),

-- Legal & Regulations
((SELECT id FROM public.faq_categories WHERE slug = 'legal'), 
 'What permits are needed?', 
 'Requirements vary by location but typically include building permits, electrical permits, and zoning approval. We can help you understand local requirements.',
 1, false),

((SELECT id FROM public.faq_categories WHERE slug = 'legal'), 
 'Can I place a mobile home anywhere?', 
 'Mobile homes must be placed in areas zoned for manufactured housing, such as mobile home parks or private land with proper zoning. We can help verify zoning requirements.',
 2, true);