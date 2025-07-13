-- Create a default company first
INSERT INTO companies (name, active, created_by)
VALUES ('Default Company', true, null)
ON CONFLICT DO NOTHING;

-- Now create the order with company_id
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
  d.customer_name,
  d.customer_email,
  d.customer_phone,
  d.mobile_home_id,
  COALESCE(d.total_delivery_cost, 0),
  'confirmed',
  d.created_by
FROM deliveries d 
CROSS JOIN companies c
WHERE d.id = '2e4090b2-7f7f-432e-a4aa-ba89f1ba4972'
AND c.name = 'Default Company'
AND NOT EXISTS (
  SELECT 1 FROM orders o 
  WHERE o.customer_email = d.customer_email
);

-- Create tracking session
INSERT INTO customer_tracking_sessions (
  order_id,
  session_token,
  expires_at,
  active
)
SELECT 
  o.id,
  generate_tracking_token(),
  now() + interval '90 days',
  true
FROM orders o
JOIN deliveries d ON d.customer_email = o.customer_email
WHERE d.id = '2e4090b2-7f7f-432e-a4aa-ba89f1ba4972'
AND NOT EXISTS (
  SELECT 1 FROM customer_tracking_sessions cts 
  WHERE cts.order_id = o.id AND cts.active = true
);