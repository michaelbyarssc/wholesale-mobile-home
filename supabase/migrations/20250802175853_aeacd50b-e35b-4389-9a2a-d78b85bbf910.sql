-- Database performance optimizations for delivery system

-- Add strategic indexes for high-frequency GPS tracking queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_gps_tracking_delivery_timestamp 
ON delivery_gps_tracking (delivery_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_gps_tracking_driver_active 
ON delivery_gps_tracking (driver_id, is_active) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_gps_tracking_accuracy 
ON delivery_gps_tracking (accuracy_meters) 
WHERE meets_accuracy_requirement = true;

-- Add indexes for delivery photo queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_photos_delivery_category 
ON delivery_photos (delivery_id, photo_category);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_photos_taken_at 
ON delivery_photos (taken_at DESC);

-- Add indexes for delivery status tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deliveries_status_updated 
ON deliveries (status, updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_status_history_delivery_timestamp 
ON delivery_status_history (delivery_id, changed_at DESC);

-- Add indexes for customer tracking sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_tracking_sessions_token_active 
ON customer_tracking_sessions (session_token) 
WHERE active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_tracking_sessions_expires 
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
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gps_archive_delivery_timestamp 
ON delivery_gps_tracking_archive (delivery_id, timestamp DESC);

-- Create function to archive old GPS data (older than 90 days)
CREATE OR REPLACE FUNCTION archive_old_gps_data()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  archived_count INTEGER := 0;
BEGIN
  -- Move GPS data older than 90 days to archive table
  WITH archived_data AS (
    DELETE FROM delivery_gps_tracking 
    WHERE timestamp < (NOW() - INTERVAL '90 days')
    AND is_active = false
    RETURNING *
  )
  INSERT INTO delivery_gps_tracking_archive (
    delivery_id, driver_id, latitude, longitude, accuracy_meters,
    speed_mph, heading, battery_level, timestamp, is_active, meets_accuracy_requirement
  )
  SELECT 
    delivery_id, driver_id, latitude, longitude, accuracy_meters,
    speed_mph, heading, battery_level, timestamp, is_active, meets_accuracy_requirement
  FROM archived_data;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  RETURN archived_count;
END;
$$;

-- Create function for GPS batch processing
CREATE OR REPLACE FUNCTION process_gps_batch(
  p_delivery_id UUID,
  p_driver_id UUID,
  p_gps_points JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  point JSONB;
  inserted_count INTEGER := 0;
  error_count INTEGER := 0;
  result JSONB;
BEGIN
  -- Process each GPS point in the batch
  FOR point IN SELECT * FROM jsonb_array_elements(p_gps_points)
  LOOP
    BEGIN
      INSERT INTO delivery_gps_tracking (
        delivery_id,
        driver_id,
        latitude,
        longitude,
        accuracy_meters,
        speed_mph,
        heading,
        battery_level,
        timestamp,
        meets_accuracy_requirement
      ) VALUES (
        p_delivery_id,
        p_driver_id,
        (point->>'latitude')::NUMERIC,
        (point->>'longitude')::NUMERIC,
        (point->>'accuracy')::NUMERIC,
        (point->>'speed')::NUMERIC,
        (point->>'heading')::NUMERIC,
        (point->>'batteryLevel')::INTEGER,
        (point->>'timestamp')::TIMESTAMP WITH TIME ZONE,
        (point->>'accuracy')::NUMERIC <= 50
      );
      
      inserted_count := inserted_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      CONTINUE;
    END;
  END LOOP;
  
  result := jsonb_build_object(
    'inserted_count', inserted_count,
    'error_count', error_count,
    'batch_size', jsonb_array_length(p_gps_points)
  );
  
  RETURN result;
END;
$$;

-- Create performance monitoring view
CREATE OR REPLACE VIEW delivery_performance_metrics AS
SELECT 
  d.id as delivery_id,
  d.status,
  d.created_at as delivery_start,
  COUNT(gps.id) as total_gps_points,
  AVG(gps.accuracy_meters) as avg_gps_accuracy,
  COUNT(CASE WHEN gps.meets_accuracy_requirement THEN 1 END) as accurate_gps_points,
  COUNT(dp.id) as total_photos,
  COUNT(CASE WHEN dp.photo_category IN ('pickup_front', 'pickup_back', 'pickup_left', 'pickup_right') THEN 1 END) as pickup_photos,
  COUNT(CASE WHEN dp.photo_category IN ('delivery_front', 'delivery_back', 'delivery_left', 'delivery_right') THEN 1 END) as delivery_photos,
  MAX(gps.timestamp) as last_gps_update,
  EXTRACT(EPOCH FROM (MAX(gps.timestamp) - MIN(gps.timestamp))) / 3600 as tracking_duration_hours
FROM deliveries d
LEFT JOIN delivery_gps_tracking gps ON d.id = gps.delivery_id
LEFT JOIN delivery_photos dp ON d.id = dp.delivery_id
GROUP BY d.id, d.status, d.created_at;

-- Create automated cleanup job settings
INSERT INTO admin_settings (setting_key, setting_value, description) VALUES
('gps_archive_days', '90', 'Number of days after which GPS data is archived')
ON CONFLICT (setting_key) DO UPDATE SET 
setting_value = EXCLUDED.setting_value,
updated_at = NOW();

INSERT INTO admin_settings (setting_key, setting_value, description) VALUES  
('photo_cleanup_days', '365', 'Number of days after which old delivery photos are cleaned up')
ON CONFLICT (setting_key) DO UPDATE SET 
setting_value = EXCLUDED.setting_value,
updated_at = NOW();

-- Enable real-time for performance monitoring
ALTER TABLE delivery_gps_tracking REPLICA IDENTITY FULL;
ALTER TABLE delivery_photos REPLICA IDENTITY FULL;
ALTER TABLE deliveries REPLICA IDENTITY FULL;