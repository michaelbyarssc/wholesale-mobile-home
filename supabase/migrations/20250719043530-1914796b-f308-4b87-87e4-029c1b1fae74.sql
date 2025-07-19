-- Check for triggers using the correct system table
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'public' 
AND event_object_table = 'payments';

-- Check if there's a function called update_transaction_balance that might be the issue
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_definition LIKE '%estimate_id%';

-- Look for any triggers that call functions with estimate_id
SELECT 
    t.trigger_name,
    t.event_object_table,
    t.action_statement
FROM information_schema.triggers t
WHERE t.event_object_schema = 'public'
AND t.action_statement LIKE '%estimate_id%';