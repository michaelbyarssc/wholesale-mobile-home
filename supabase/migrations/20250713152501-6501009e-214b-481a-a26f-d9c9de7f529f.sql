-- Add sample driver for testing
INSERT INTO public.drivers (
  first_name, last_name, email, phone, status, hire_date
) VALUES (
  'John', 'Driver', 'driver@test.com', '555-0123', 'available', CURRENT_DATE
) ON CONFLICT (email) DO NOTHING;

-- Add sample GPS tracking data for the in_transit delivery
INSERT INTO public.delivery_gps_tracking (
  delivery_id, 
  driver_id, 
  latitude, 
  longitude, 
  accuracy_meters, 
  speed_mph, 
  heading, 
  timestamp,
  address
) VALUES (
  (SELECT id FROM deliveries WHERE delivery_number = 'DEL-001000'),
  (SELECT id FROM drivers WHERE email = 'driver@test.com'),
  39.7392, -- Kansas City area (between pickup and delivery)
  -94.6906,
  5.0,
  55.0,
  90.0,
  NOW() - INTERVAL '2 minutes',
  'Kansas City, MO'
),
(
  (SELECT id FROM deliveries WHERE delivery_number = 'DEL-001000'),
  (SELECT id FROM drivers WHERE email = 'driver@test.com'),
  39.7392,
  -94.6900, -- Slightly moved
  5.0,
  58.0,
  90.0,
  NOW() - INTERVAL '1 minute',
  'Kansas City, MO'
),
(
  (SELECT id FROM deliveries WHERE delivery_number = 'DEL-001000'),
  (SELECT id FROM drivers WHERE email = 'driver@test.com'),
  39.7392,
  -94.6890, -- Current position
  5.0,
  60.0,
  90.0,
  NOW(),
  'Kansas City, MO'
);