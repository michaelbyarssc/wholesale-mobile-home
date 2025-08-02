-- Create performance monitoring function since views aren't working with TypeScript
CREATE OR REPLACE FUNCTION get_delivery_performance_metrics()
RETURNS TABLE (
  delivery_id UUID,
  status TEXT,
  delivery_start TIMESTAMP WITH TIME ZONE,
  total_gps_points BIGINT,
  avg_gps_accuracy NUMERIC,
  accurate_gps_points BIGINT,
  total_photos BIGINT,
  pickup_photos BIGINT,
  delivery_photos BIGINT,
  tracking_duration_hours NUMERIC,
  last_gps_update TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id as delivery_id,
    d.status::TEXT,
    d.created_at as delivery_start,
    COUNT(gps.id) as total_gps_points,
    AVG(gps.accuracy_meters) as avg_gps_accuracy,
    COUNT(CASE WHEN gps.meets_accuracy_requirement THEN 1 END) as accurate_gps_points,
    COUNT(dp.id) as total_photos,
    COUNT(CASE WHEN dp.photo_category IN ('pickup_front', 'pickup_back', 'pickup_left', 'pickup_right') THEN 1 END) as pickup_photos,
    COUNT(CASE WHEN dp.photo_category IN ('delivery_front', 'delivery_back', 'delivery_left', 'delivery_right') THEN 1 END) as delivery_photos,
    EXTRACT(EPOCH FROM (MAX(gps.timestamp) - MIN(gps.timestamp))) / 3600 as tracking_duration_hours,
    MAX(gps.timestamp) as last_gps_update
  FROM deliveries d
  LEFT JOIN delivery_gps_tracking gps ON d.id = gps.delivery_id
  LEFT JOIN delivery_photos dp ON d.id = dp.delivery_id
  GROUP BY d.id, d.status, d.created_at
  ORDER BY last_gps_update DESC NULLS LAST
  LIMIT 10;
END;
$$;