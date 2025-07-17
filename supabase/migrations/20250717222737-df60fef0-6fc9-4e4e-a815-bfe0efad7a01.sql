-- Create an admin function to manually trigger refresh
CREATE OR REPLACE FUNCTION admin_refresh_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can refresh analytics views';
  END IF;
  
  PERFORM refresh_analytics_views();
END;
$$;

-- Set up a cron job to refresh views hourly
CREATE OR REPLACE FUNCTION scheduled_refresh_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM refresh_analytics_views();
END;
$$;

SELECT cron.schedule(
  'refresh-analytics-hourly',  -- name of the cron job
  '0 * * * *',                -- run every hour at minute 0
  'SELECT scheduled_refresh_analytics()'
);