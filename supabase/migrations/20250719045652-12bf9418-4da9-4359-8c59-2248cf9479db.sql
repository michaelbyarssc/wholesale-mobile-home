-- Identify duplicate/unused database functions
SELECT 
    p.proname as function_name,
    p.pronargs as arg_count,
    pg_get_function_identity_arguments(p.oid) as arguments,
    p.prosrc LIKE '%estimate_id%' as references_estimate_id,
    p.prosrc LIKE '%auth.uid()%' as uses_auth
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname LIKE '%payment%'
ORDER BY p.proname;

-- Check for unused triggers
SELECT 
    t.trigger_name,
    t.event_object_table,
    t.action_statement
FROM information_schema.triggers t
WHERE t.event_object_schema = 'public'
AND t.action_statement LIKE '%estimate_id%';