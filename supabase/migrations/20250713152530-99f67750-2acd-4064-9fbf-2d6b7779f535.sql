-- Add sample driver for testing if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.drivers WHERE email = 'driver@test.com') THEN
    INSERT INTO public.drivers (
      first_name, last_name, email, phone, status, hire_date
    ) VALUES (
      'John', 'Driver', 'driver@test.com', '555-0123', 'available', CURRENT_DATE
    );
  END IF;
END $$;

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
) 
SELECT 
  d.id as delivery_id,
  dr.id as driver_id,
  vals.latitude,
  vals.longitude,
  vals.accuracy_meters,
  vals.speed_mph,
  vals.heading,
  vals.timestamp,
  vals.address
FROM deliveries d
CROSS JOIN drivers dr
CROSS JOIN (
  VALUES 
    (39.7392, -94.6906, 5.0, 55.0, 90.0, NOW() - INTERVAL '2 minutes', 'Kansas City, MO'),
    (39.7392, -94.6900, 5.0, 58.0, 90.0, NOW() - INTERVAL '1 minute', 'Kansas City, MO'),
    (39.7392, -94.6890, 5.0, 60.0, 90.0, NOW(), 'Kansas City, MO')
) AS vals(latitude, longitude, accuracy_meters, speed_mph, heading, timestamp, address)
WHERE d.delivery_number = 'DEL-001000' 
  AND dr.email = 'driver@test.com'
  AND NOT EXISTS (
    SELECT 1 FROM delivery_gps_tracking 
    WHERE delivery_id = d.id AND driver_id = dr.id
  );