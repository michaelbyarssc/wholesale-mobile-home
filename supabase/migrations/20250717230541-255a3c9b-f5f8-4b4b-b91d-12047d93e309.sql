-- Check what might be causing the estimate_id error in payments table
-- Remove any problematic triggers on payments table and fix the issue

-- First, let's check if there are any triggers on the payments table that reference estimate_id
-- Drop any problematic triggers that might be looking for estimate_id in payments
DROP TRIGGER IF EXISTS auto_assign_transaction_number ON payments;

-- The error indicates a trigger is looking for estimate_id field in NEW record
-- This is likely from the auto_assign_transaction_number trigger
-- Let's check and fix this trigger to work properly with payments table

-- Check what fields the payments table actually has and recreate trigger accordingly
-- The payments table has: id, invoice_id, amount, payment_date, created_by, created_at, updated_at, payment_method, notes, transaction_number

-- Since payments table doesn't have estimate_id, we need to fix or remove the trigger
-- Let's recreate the trigger to work correctly with payments table structure