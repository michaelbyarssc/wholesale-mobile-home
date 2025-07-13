-- First create an order if one doesn't exist for this delivery
INSERT INTO orders (
  customer_name,
  customer_email,
  customer_phone,
  mobile_home_id,
  total_value,
  status,
  created_by
) 
SELECT 
  d.customer_name,
  d.customer_email,
  d.customer_phone,
  d.mobile_home_id,
  COALESCE(d.total_delivery_cost, 0),
  'confirmed',
  d.created_by
FROM deliveries d 
WHERE d.id = '2e4090b2-7f7f-432e-a4aa-ba89f1ba4972'
AND NOT EXISTS (
  SELECT 1 FROM orders o 
  WHERE o.customer_email = d.customer_email
);

-- Create tracking session for the delivery
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