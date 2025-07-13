-- Insert some sample GPS tracking data for the delivery
INSERT INTO delivery_gps_tracking (
  delivery_id,
  driver_id,
  latitude,
  longitude,
  accuracy_meters,
  speed_mph,
  heading,
  battery_level,
  is_active,
  address,
  timestamp
) VALUES 
(
  '2e4090b2-7f7f-432e-a4aa-ba89f1ba4972', -- Our delivery ID
  null, -- No driver yet in the system
  35.0928, -- Latitude somewhere between pickup and delivery 
  -82.4540, -- Longitude 
  10, -- 10 meter accuracy
  55.5, -- 55.5 mph
  180, -- Heading south
  85, -- 85% battery
  true, -- Active
  'Highway I-85, Spartanburg County, SC', -- Current location description
  now() - interval '5 minutes' -- 5 minutes ago
),
(
  '2e4090b2-7f7f-432e-a4aa-ba89f1ba4972', -- Our delivery ID
  null, -- No driver yet
  35.0500, -- A bit further south
  -82.3000, -- Longitude 
  8, -- 8 meter accuracy
  58.2, -- 58.2 mph
  175, -- Heading slightly southeast
  84, -- 84% battery
  true, -- Active
  'Near Spartanburg, SC', -- Current location description
  now() -- Current time
);