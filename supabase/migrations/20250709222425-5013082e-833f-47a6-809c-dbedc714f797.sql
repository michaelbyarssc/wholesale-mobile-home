-- Create reviews table for mobile home reviews
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mobile_home_id UUID NOT NULL REFERENCES public.mobile_homes(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  verified_purchase BOOLEAN NOT NULL DEFAULT false,
  helpful_votes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create testimonials table for general customer testimonials
CREATE TABLE public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_location TEXT,
  content TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  image_url TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create review_helpful_votes table to track user votes
CREATE TABLE public.review_helpful_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(review_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_helpful_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviews
CREATE POLICY "Anyone can view approved reviews"
ON public.reviews
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own reviews"
ON public.reviews
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
ON public.reviews
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
ON public.reviews
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all reviews"
ON public.reviews
FOR ALL
USING (is_admin(auth.uid()));

-- RLS Policies for testimonials
CREATE POLICY "Anyone can view approved testimonials"
ON public.testimonials
FOR SELECT
USING (approved = true);

CREATE POLICY "Admins can manage all testimonials"
ON public.testimonials
FOR ALL
USING (is_admin(auth.uid()));

-- RLS Policies for review helpful votes
CREATE POLICY "Users can view all helpful votes"
ON public.review_helpful_votes
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own helpful votes"
ON public.review_helpful_votes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own helpful votes"
ON public.review_helpful_votes
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_reviews_mobile_home_id ON public.reviews(mobile_home_id);
CREATE INDEX idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX idx_reviews_rating ON public.reviews(rating);
CREATE INDEX idx_testimonials_featured ON public.testimonials(featured);
CREATE INDEX idx_testimonials_approved ON public.testimonials(approved);
CREATE INDEX idx_review_helpful_votes_review_id ON public.review_helpful_votes(review_id);

-- Create triggers for updated_at
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_testimonials_updated_at
BEFORE UPDATE ON public.testimonials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update helpful votes count
CREATE OR REPLACE FUNCTION public.update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reviews 
    SET helpful_votes = helpful_votes + 1 
    WHERE id = NEW.review_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reviews 
    SET helpful_votes = helpful_votes - 1 
    WHERE id = OLD.review_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for helpful votes count
CREATE TRIGGER update_helpful_votes_count
AFTER INSERT OR DELETE ON public.review_helpful_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_review_helpful_count();