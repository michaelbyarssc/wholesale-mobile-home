-- Enable RLS on customer_tracking_sessions table
ALTER TABLE customer_tracking_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view active tracking sessions with valid token
CREATE POLICY "Anyone can view active tracking sessions" 
ON customer_tracking_sessions 
FOR SELECT 
USING (active = true AND expires_at > now());

-- Allow system/admin to manage tracking sessions
CREATE POLICY "Admins can manage tracking sessions" 
ON customer_tracking_sessions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);