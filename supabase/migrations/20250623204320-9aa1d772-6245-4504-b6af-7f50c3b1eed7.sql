
-- Add conditional fields to the services table
ALTER TABLE public.services 
ADD COLUMN conditions JSONB DEFAULT '{}'::jsonb,
ADD COLUMN dependencies JSONB DEFAULT '[]'::jsonb,
ADD COLUMN applicable_manufacturers JSONB DEFAULT '[]'::jsonb,
ADD COLUMN applicable_series JSONB DEFAULT '[]'::jsonb,
ADD COLUMN requires_admin BOOLEAN DEFAULT false,
ADD COLUMN conditional_pricing JSONB DEFAULT '{}'::jsonb;

-- Add comments to explain the new columns
COMMENT ON COLUMN public.services.conditions IS 'JSON object defining conditions for when this service is available';
COMMENT ON COLUMN public.services.dependencies IS 'Array of service IDs that must be selected before this service';
COMMENT ON COLUMN public.services.applicable_manufacturers IS 'Array of manufacturer names this service applies to (empty = all)';
COMMENT ON COLUMN public.services.applicable_series IS 'Array of series names this service applies to (empty = all)';
COMMENT ON COLUMN public.services.requires_admin IS 'Whether this service requires admin approval';
COMMENT ON COLUMN public.services.conditional_pricing IS 'JSON object for conditional pricing rules';
