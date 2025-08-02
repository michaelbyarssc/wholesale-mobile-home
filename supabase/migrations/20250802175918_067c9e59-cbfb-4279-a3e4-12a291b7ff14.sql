-- Database performance optimizations for delivery system (without CONCURRENTLY)

-- Add strategic indexes for high-frequency GPS tracking queries
CREATE INDEX IF NOT EXISTS idx_delivery_gps_tracking_delivery_timestamp 
ON delivery_gps_tracking (delivery_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_gps_tracking_driver_active 
ON delivery_gps_tracking (driver_id, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_delivery_gps_tracking_accuracy 
ON delivery_gps_tracking (accuracy_meters) 
WHERE meets_accuracy_requirement = true;

-- Add indexes for delivery photo queries
CREATE INDEX IF NOT EXISTS idx_delivery_photos_delivery_category 
ON delivery_photos (delivery_id, photo_category);

CREATE INDEX IF NOT EXISTS idx_delivery_photos_taken_at 
ON delivery_photos (taken_at DESC);

-- Add indexes for delivery status tracking
CREATE INDEX IF NOT EXISTS idx_deliveries_status_updated 
ON deliveries (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_status_history_delivery_timestamp 
ON delivery_status_history (delivery_id, changed_at DESC);

-- Add indexes for customer tracking sessions
CREATE INDEX IF NOT EXISTS idx_customer_tracking_sessions_token_active 
ON customer_tracking_sessions (session_token) 
WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_customer_tracking_sessions_expires 
ON customer_tracking_sessions (expires_at) 
WHERE active = true;

-- Create GPS data archiving table for old records
CREATE TABLE IF NOT EXISTS delivery_gps_tracking_archive (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL,
  driver_id UUID,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  accuracy_meters NUMERIC(8, 2),
  speed_mph NUMERIC(5, 2),
  heading NUMERIC(5, 2),
  battery_level INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_active BOOLEAN DEFAULT false,
  meets_accuracy_requirement BOOLEAN DEFAULT false
);

-- Create index on archived GPS data
CREATE INDEX IF NOT EXISTS idx_gps_archive_delivery_timestamp 
ON delivery_gps_tracking_archive (delivery_id, timestamp DESC);