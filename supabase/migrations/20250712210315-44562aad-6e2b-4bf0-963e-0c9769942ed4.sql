-- Create estimate_line_items table for detailed itemization
CREATE TABLE public.estimate_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- 'mobile_home', 'service', 'option'
  item_id UUID, -- Reference to mobile_homes, services, or home_options
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  category TEXT, -- For grouping items
  sku TEXT, -- For inventory tracking
  metadata JSONB DEFAULT '{}', -- For additional item-specific data
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.estimate_line_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all estimate line items" 
ON public.estimate_line_items 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view line items for their estimates" 
ON public.estimate_line_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.estimates 
    WHERE estimates.id = estimate_line_items.estimate_id 
    AND estimates.user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_estimate_line_items_estimate_id ON public.estimate_line_items(estimate_id);
CREATE INDEX idx_estimate_line_items_item_type ON public.estimate_line_items(item_type);
CREATE INDEX idx_estimate_line_items_display_order ON public.estimate_line_items(display_order);

-- Create trigger for updated_at
CREATE TRIGGER update_estimate_line_items_updated_at
  BEFORE UPDATE ON public.estimate_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();