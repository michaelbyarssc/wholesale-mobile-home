-- Create a table for user wishlists/favorites
CREATE TABLE public.user_wishlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mobile_home_id UUID NOT NULL REFERENCES public.mobile_homes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, mobile_home_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_wishlists ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own wishlist items" 
ON public.user_wishlists 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add items to their own wishlist" 
ON public.user_wishlists 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove items from their own wishlist" 
ON public.user_wishlists 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_user_wishlists_updated_at
BEFORE UPDATE ON public.user_wishlists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();