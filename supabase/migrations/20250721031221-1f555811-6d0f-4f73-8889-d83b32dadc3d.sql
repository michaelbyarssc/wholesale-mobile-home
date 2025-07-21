-- Fix duplicate triggers causing transaction number issues
-- First, drop the duplicate trigger
DROP TRIGGER IF EXISTS invoices_transaction_number_trigger ON invoices;

-- Keep only the auto_assign_transaction_number_trigger
-- Let's also check and fix all other tables to make sure they only have one trigger each

-- Drop and recreate triggers for all tables to ensure consistency
DROP TRIGGER IF EXISTS auto_assign_transaction_number_trigger ON estimates;
DROP TRIGGER IF EXISTS auto_assign_transaction_number_trigger ON invoices;
DROP TRIGGER IF EXISTS auto_assign_transaction_number_trigger ON deliveries;
DROP TRIGGER IF EXISTS auto_assign_transaction_number_trigger ON payments;
DROP TRIGGER IF EXISTS auto_assign_transaction_number_trigger ON transactions;

-- Recreate the triggers correctly
CREATE TRIGGER auto_assign_transaction_number_trigger 
  BEFORE INSERT ON estimates 
  FOR EACH ROW EXECUTE FUNCTION auto_assign_transaction_number();

CREATE TRIGGER auto_assign_transaction_number_trigger 
  BEFORE INSERT ON invoices 
  FOR EACH ROW EXECUTE FUNCTION auto_assign_transaction_number();

CREATE TRIGGER auto_assign_transaction_number_trigger 
  BEFORE INSERT ON deliveries 
  FOR EACH ROW EXECUTE FUNCTION auto_assign_transaction_number();

CREATE TRIGGER auto_assign_transaction_number_trigger 
  BEFORE INSERT ON payments 
  FOR EACH ROW EXECUTE FUNCTION auto_assign_transaction_number();

CREATE TRIGGER auto_assign_transaction_number_trigger 
  BEFORE INSERT ON transactions 
  FOR EACH ROW EXECUTE FUNCTION auto_assign_transaction_number();