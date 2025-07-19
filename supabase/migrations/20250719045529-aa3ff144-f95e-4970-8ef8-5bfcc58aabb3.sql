-- Check current user and create profile entry if needed
INSERT INTO public.profiles (user_id, first_name, last_name, email)
SELECT 
  ur.user_id,
  'Admin',
  'User',
  (SELECT email FROM auth.users WHERE id = ur.user_id)
FROM user_roles ur
WHERE ur.role IN ('admin', 'super_admin')
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = now();

-- Also ensure there's data for the current admin user specifically
INSERT INTO public.profiles (user_id, first_name, last_name, email)
VALUES (
  '2cdfc4ae-d8cc-4890-a1be-132cfbdd87d0',
  'Michael',
  'Byars',
  'michaelbyarssc@gmail.com'
)
ON CONFLICT (user_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  updated_at = now();