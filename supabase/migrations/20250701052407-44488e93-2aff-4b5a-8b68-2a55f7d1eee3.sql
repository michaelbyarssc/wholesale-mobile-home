
-- Part 2: Three-Tier Role System Migration (Main Implementation)
-- This migration converts the current two-tier system (admin/user) to three-tier (super_admin/admin/user)
-- SAFETY: All existing data is preserved, all existing functionality maintained
-- UPDATE: Super admin markup is now adjustable with 1% default

-- Step 1: Add created_by field to customer_markups table to track ownership hierarchy
ALTER TABLE public.customer_markups 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS tier_level TEXT DEFAULT 'user';

-- Step 2: Add created_by field to profiles table to track user creation hierarchy
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Step 3: Add super_admin_markup field to customer_markups for cascading pricing
-- This field will store the super admin's adjustable markup percentage
ALTER TABLE public.customer_markups 
ADD COLUMN IF NOT EXISTS super_admin_markup_percentage NUMERIC DEFAULT 1.0;

-- Step 4: Create a separate table to store super admin markup settings
-- This allows super admins to have their own adjustable markup percentage
CREATE TABLE IF NOT EXISTS public.super_admin_markups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    markup_percentage NUMERIC NOT NULL DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS on super_admin_markups table
ALTER TABLE public.super_admin_markups ENABLE ROW LEVEL SECURITY;

-- Super admins can manage their own markup
CREATE POLICY "Super admins can manage their own markup" 
ON public.super_admin_markups 
FOR ALL 
TO authenticated
USING (
    user_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
);

-- Step 5: Get the super admin user ID for michaelbyarssc@gmail.com
DO $$
DECLARE
    super_admin_user_id UUID;
BEGIN
    -- Find the super admin user ID
    SELECT id INTO super_admin_user_id 
    FROM auth.users 
    WHERE email = 'michaelbyarssc@gmail.com';
    
    -- Only proceed if we found the super admin user
    IF super_admin_user_id IS NOT NULL THEN
        
        -- Step 6: Convert ALL current 'admin' role users to 'super_admin'
        UPDATE public.user_roles 
        SET role = 'super_admin'
        WHERE role = 'admin';
        
        -- Step 7: Convert ALL current 'user' accounts to 'admin' role
        -- This preserves their existing markup percentages as admin markups
        UPDATE public.user_roles 
        SET role = 'admin'
        WHERE role = 'user';
        
        -- Step 8: Create super admin markup entry with default 1%
        INSERT INTO public.super_admin_markups (user_id, markup_percentage)
        SELECT super_admin_user_id, 1.0
        WHERE NOT EXISTS (
            SELECT 1 FROM public.super_admin_markups WHERE user_id = super_admin_user_id
        );
        
        -- Step 9: Update customer_markups for converted admins
        -- Set tier_level to 'admin' and assign them to super admin
        UPDATE public.customer_markups 
        SET 
            tier_level = 'admin',
            created_by = super_admin_user_id,
            super_admin_markup_percentage = 1.0
        WHERE user_id IN (
            SELECT user_id FROM public.user_roles WHERE role = 'admin'
        );
        
        -- Step 10: Update customer_markups for super admins
        UPDATE public.customer_markups 
        SET 
            tier_level = 'super_admin',
            super_admin_markup_percentage = 1.0
        WHERE user_id IN (
            SELECT user_id FROM public.user_roles WHERE role = 'super_admin'
        );
        
        -- Step 11: Update profiles to track creation hierarchy
        -- Assign all converted admin profiles to super admin
        UPDATE public.profiles 
        SET created_by = super_admin_user_id
        WHERE user_id IN (
            SELECT user_id FROM public.user_roles WHERE role = 'admin'
        );
        
        -- Step 12: Ensure super admin has proper markup entry in customer_markups
        INSERT INTO public.customer_markups (user_id, markup_percentage, tier_level, super_admin_markup_percentage)
        SELECT super_admin_user_id, 1.0, 'super_admin', 1.0
        WHERE NOT EXISTS (
            SELECT 1 FROM public.customer_markups WHERE user_id = super_admin_user_id
        );
        
        RAISE NOTICE 'Migration completed successfully. Super admin: %', super_admin_user_id;
    ELSE
        RAISE EXCEPTION 'Super admin user michaelbyarssc@gmail.com not found. Migration aborted for safety.';
    END IF;
END $$;

-- Step 13: Create indexes for performance on new fields
CREATE INDEX IF NOT EXISTS idx_customer_markups_created_by ON public.customer_markups(created_by);
CREATE INDEX IF NOT EXISTS idx_customer_markups_tier_level ON public.customer_markups(tier_level);
CREATE INDEX IF NOT EXISTS idx_profiles_created_by ON public.profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_super_admin_markups_user_id ON public.super_admin_markups(user_id);

-- Step 14: Update RLS policies for three-tier system
-- Allow super admins to manage all customer markups
DROP POLICY IF EXISTS "Super admins can manage all customer markups" ON public.customer_markups;
CREATE POLICY "Super admins can manage all customer markups" 
ON public.customer_markups 
FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
);

-- Allow admins to manage markups for users they created
DROP POLICY IF EXISTS "Admins can manage their users markups" ON public.customer_markups;
CREATE POLICY "Admins can manage their users markups" 
ON public.customer_markups 
FOR ALL 
TO authenticated
USING (
    created_by = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
    )
);

-- Update profiles policies for three-tier system
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;
CREATE POLICY "Super admins can manage all profiles" 
ON public.profiles 
FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
);

DROP POLICY IF EXISTS "Admins can manage their created users profiles" ON public.profiles;
CREATE POLICY "Admins can manage their created users profiles" 
ON public.profiles 
FOR ALL 
TO authenticated
USING (
    auth.uid() = user_id OR 
    created_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
    )
);

-- Add comments documenting the new system
COMMENT ON TABLE public.customer_markups IS 'Three-tier pricing system: super_admin (adjustable %) -> admin (existing %) -> user (50% default)';
COMMENT ON TABLE public.super_admin_markups IS 'Stores adjustable markup percentages for super admin users';
