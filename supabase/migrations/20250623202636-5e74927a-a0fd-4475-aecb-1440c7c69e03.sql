

-- Add admin role to your user account
-- Replace 'your-email@example.com' with the actual email you used to sign up
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users 
WHERE email = 'michaelbyarssc@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

