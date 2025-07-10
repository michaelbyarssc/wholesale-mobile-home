-- Add user-admin assignment tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS assigned_admin_id UUID REFERENCES auth.users(id);

-- Create function to automatically assign users to their creating admin
CREATE OR REPLACE FUNCTION public.assign_user_to_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Set assigned_admin_id to the user who created this profile
  NEW.assigned_admin_id = NEW.created_by;
  RETURN NEW;
END;
$$;

-- Create trigger to automatically assign users to admins
DROP TRIGGER IF EXISTS assign_user_to_admin_trigger ON public.profiles;
CREATE TRIGGER assign_user_to_admin_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_user_to_admin();

-- Update existing profiles to have assigned_admin_id based on created_by
UPDATE public.profiles 
SET assigned_admin_id = created_by 
WHERE created_by IS NOT NULL AND assigned_admin_id IS NULL;

-- Update appointments to ensure they're assigned to user's admin
UPDATE public.appointments 
SET agent_id = (
  SELECT p.assigned_admin_id 
  FROM profiles p 
  WHERE p.user_id = appointments.user_id
)
WHERE agent_id IS NULL 
AND user_id IS NOT NULL;