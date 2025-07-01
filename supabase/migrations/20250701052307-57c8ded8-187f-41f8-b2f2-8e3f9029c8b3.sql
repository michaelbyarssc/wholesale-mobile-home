
-- Part 1: Add the new enum value (must be committed separately)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
