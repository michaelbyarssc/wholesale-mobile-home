-- Add admin role to existing super admins who don't have it
INSERT INTO user_roles (user_id, role)
SELECT DISTINCT ur1.user_id, 'admin'::app_role
FROM user_roles ur1 
WHERE ur1.role = 'super_admin' 
AND NOT EXISTS (
  SELECT 1 FROM user_roles ur2 
  WHERE ur2.user_id = ur1.user_id AND ur2.role = 'admin'
);

-- Create function to ensure super admins always have admin role too
CREATE OR REPLACE FUNCTION public.ensure_super_admin_has_admin_role()
RETURNS TRIGGER AS $$
BEGIN
  -- If inserting a super_admin role, also insert admin role if it doesn't exist
  IF NEW.role = 'super_admin' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically assign admin role when super_admin is assigned
CREATE TRIGGER ensure_super_admin_has_admin_role_trigger
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_super_admin_has_admin_role();