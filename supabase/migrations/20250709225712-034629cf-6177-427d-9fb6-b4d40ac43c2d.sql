
-- Create blog_categories table for organizing content
CREATE TABLE public.blog_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blog_posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image_url TEXT,
  category_id UUID REFERENCES public.blog_categories(id),
  author_id UUID,
  published BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Create policies for blog_categories
CREATE POLICY "Anyone can view active categories" 
  ON public.blog_categories 
  FOR SELECT 
  USING (active = true);

CREATE POLICY "Admins can manage categories" 
  ON public.blog_categories 
  FOR ALL 
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Create policies for blog_posts
CREATE POLICY "Anyone can view published posts" 
  ON public.blog_posts 
  FOR SELECT 
  USING (published = true);

CREATE POLICY "Admins can manage all posts" 
  ON public.blog_posts 
  FOR ALL 
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_blog_posts_published ON public.blog_posts (published, created_at DESC);
CREATE INDEX idx_blog_posts_category ON public.blog_posts (category_id);
CREATE INDEX idx_blog_posts_featured ON public.blog_posts (featured, published);
CREATE INDEX idx_blog_posts_slug ON public.blog_posts (slug);
CREATE INDEX idx_blog_categories_active ON public.blog_categories (active, display_order);

-- Create trigger for updated_at
CREATE TRIGGER update_blog_categories_updated_at
  BEFORE UPDATE ON public.blog_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.blog_categories (name, slug, description, display_order) VALUES
  ('Home Buying Guides', 'home-buying-guides', 'Comprehensive guides for purchasing mobile homes', 1),
  ('Maintenance Tips', 'maintenance-tips', 'Tips and advice for maintaining your mobile home', 2),
  ('Financing', 'financing', 'Information about mobile home financing options', 3),
  ('Community Living', 'community-living', 'Guide to mobile home community living', 4),
  ('News & Updates', 'news-updates', 'Latest news and updates in the mobile home industry', 5);
