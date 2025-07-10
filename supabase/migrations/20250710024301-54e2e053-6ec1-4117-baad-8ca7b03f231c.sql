-- Create chat data capture settings table for future extensibility
CREATE TABLE public.chat_data_capture_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_data_capture_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage chat data capture settings"
ON public.chat_data_capture_settings
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Add chat transcript and captured data to customer_interactions
ALTER TABLE public.customer_interactions 
ADD COLUMN chat_session_id UUID REFERENCES public.chat_sessions(id),
ADD COLUMN chat_transcript TEXT,
ADD COLUMN captured_data JSONB DEFAULT '{}',
ADD COLUMN confidence_scores JSONB DEFAULT '{}',
ADD COLUMN extraction_reviewed BOOLEAN DEFAULT false,
ADD COLUMN page_source TEXT;

-- Create index for better performance
CREATE INDEX idx_customer_interactions_chat_session ON public.customer_interactions(chat_session_id);
CREATE INDEX idx_customer_interactions_extraction_reviewed ON public.customer_interactions(extraction_reviewed);

-- Add trigger for updated_at
CREATE TRIGGER update_chat_data_capture_settings_updated_at
BEFORE UPDATE ON public.chat_data_capture_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings for data capture
INSERT INTO public.chat_data_capture_settings (setting_key, setting_value, description) VALUES
('questions_config', '{"beds": {"question": "How many bedrooms are you looking for?", "type": "number", "required": true}, "baths": {"question": "How many bathrooms do you need?", "type": "number", "required": true}, "timeframe": {"question": "When are you looking to purchase?", "type": "text", "required": true}, "buyer_type": {"question": "Are you an investor or retail buyer?", "type": "select", "options": ["investor", "retail"], "required": true}, "budget": {"question": "What is your budget range?", "type": "text", "required": false}}', 'Configuration for questions the AI should ask and data to extract'),
('extraction_prompts', '{"system_prompt": "You are a helpful assistant that extracts structured data from mobile home sales conversations. Extract: number of bedrooms, bathrooms, purchase timeframe, buyer type (investor/retail), budget, and any specific mobile home interests.", "confidence_threshold": 0.7}', 'AI prompts and settings for data extraction');

-- Create function to get chat lead source based on page
CREATE OR REPLACE FUNCTION public.get_chat_lead_source(page_path TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE 
    WHEN page_path LIKE '/mobile-home/%' THEN RETURN 'Mobile Home Detail Chat'
    WHEN page_path = '/' THEN RETURN 'Homepage Chat'
    WHEN page_path LIKE '/faq%' THEN RETURN 'FAQ Chat'
    WHEN page_path LIKE '/support%' THEN RETURN 'Support Chat'
    WHEN page_path LIKE '/admin%' THEN RETURN 'Admin Chat'
    ELSE RETURN 'Website Chat'
  END;
END;
$$;