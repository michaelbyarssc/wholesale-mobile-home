-- Phase 1: Clean up old/unused database functions safely
-- First, let's see what payment-related functions we have
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    p.prosrc LIKE '%payments%' as touches_payments_table
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND (p.proname LIKE '%payment%' OR p.proname LIKE '%invoice%')
ORDER BY p.proname;

-- Drop old unused payment functions (keeping only the optimized one)
DROP FUNCTION IF EXISTS public.record_invoice_payment(UUID, NUMERIC, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.record_invoice_payment_simple(UUID, NUMERIC, TEXT, TEXT);

-- Clean up any old invoice functions that might be duplicated
DROP FUNCTION IF EXISTS public.process_payment(UUID, NUMERIC, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_invoice_payment(UUID, NUMERIC);