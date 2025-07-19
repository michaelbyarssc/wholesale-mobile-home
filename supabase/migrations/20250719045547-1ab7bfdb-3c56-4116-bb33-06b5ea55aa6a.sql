-- Just insert the specific admin user profile data
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