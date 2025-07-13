-- First, let's verify the pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a default company first (with conflict handling)
INSERT INTO companies (name, active, created_by)
VALUES ('Default Company', true, null)
ON CONFLICT (name) DO NOTHING;

-- Create the order manually for this delivery
INSERT INTO orders (
  company_id,
  customer_name,
  customer_email,
  customer_phone,
  mobile_home_id,
  total_value,
  status,
  created_by
) 
SELECT 
  c.id,
  'Michael Byars',
  'michaelbyarssc@gmail.com',
  '8646804030',
  '3ce226fc-0e1a-4584-9067-547246097d3c'::uuid,
  0,
  'confirmed',
  null
FROM companies c
WHERE c.name = 'Default Company'
AND NOT EXISTS (
  SELECT 1 FROM orders o 
  WHERE o.customer_email = 'michaelbyarssc@gmail.com'
);

-- Create tracking session with a simple manual token first
INSERT INTO customer_tracking_sessions (
  order_id,
  session_token,
  expires_at,
  active
)
SELECT 
  o.id,
  'track_' || encode(gen_random_bytes(20), 'base64url'),
  now() + interval '90 days',
  true
FROM orders o
WHERE o.customer_email = 'michaelbyarssc@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM customer_tracking_sessions cts 
  WHERE cts.order_id = o.id AND cts.active = true
);