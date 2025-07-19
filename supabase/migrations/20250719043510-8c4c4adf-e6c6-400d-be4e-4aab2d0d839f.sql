-- Check for any remaining triggers on payments table
SELECT 
    schemaname, 
    tablename, 
    triggername, 
    triggerdef 
FROM pg_triggers 
WHERE schemaname = 'public' AND tablename = 'payments';

-- Check for any functions that might be called on payments operations
SELECT 
    p.proname as function_name,
    p.prosrc as function_body
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.prosrc LIKE '%estimate_id%';

-- Drop any remaining triggers that might exist
SELECT 'DROP TRIGGER IF EXISTS ' || triggername || ' ON ' || tablename || ';' as drop_statement
FROM pg_triggers 
WHERE schemaname = 'public' AND tablename = 'payments';