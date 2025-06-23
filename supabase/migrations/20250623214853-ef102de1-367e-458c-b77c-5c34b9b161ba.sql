
-- Add cost column to mobile_homes table
ALTER TABLE public.mobile_homes 
ADD COLUMN cost NUMERIC DEFAULT 0;

-- Add cost column to services table  
ALTER TABLE public.services
ADD COLUMN cost NUMERIC DEFAULT 0;

-- Create customer_markups table to store individual customer markup percentages
CREATE TABLE public.customer_markups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  markup_percentage NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on customer_markups table
ALTER TABLE public.customer_markups ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage all customer markups
CREATE POLICY "Admins can view all customer markups" 
  ON public.customer_markups 
  FOR SELECT 
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert customer markups" 
  ON public.customer_markups 
  FOR INSERT 
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update customer markups" 
  ON public.customer_markups 
  FOR UPDATE 
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete customer markups" 
  ON public.customer_markups 
  FOR DELETE 
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Allow users to view their own markup (so we can calculate their pricing)
CREATE POLICY "Users can view their own markup" 
  ON public.customer_markups 
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);
