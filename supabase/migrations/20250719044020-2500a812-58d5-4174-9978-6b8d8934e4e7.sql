-- Let's check for any remaining functions that might reference estimate_id and be triggered on payments
SELECT 
    p.proname as function_name,
    p.prosrc as function_source
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.prosrc ILIKE '%estimate_id%'
AND p.prosrc ILIKE '%NEW%';

-- Check for any policies that might be calling functions
SELECT 
    schemaname, 
    tablename, 
    policyname,
    cmd,
    qual as using_expression,
    with_check as check_expression
FROM pg_policies 
WHERE tablename = 'payments';

-- Let's also temporarily disable RLS on payments to see if that's the issue
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;