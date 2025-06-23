
-- Insert admin role for the user with the correct email
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users 
WHERE email = 'michaelbyarssc@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Let's also verify the user exists by selecting the user
SELECT id, email FROM auth.users WHERE email = 'michaelbyarssc@gmail.com';
