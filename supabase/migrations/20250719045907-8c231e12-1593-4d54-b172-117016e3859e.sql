-- Check if the approve_estimate function exists
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'approve_estimate';

-- Test the function with a simple call to see what error we get
-- Let's also check what estimates are available
SELECT id, status, approved_at, customer_name
FROM estimates 
WHERE status = 'pending_review'
LIMIT 5;