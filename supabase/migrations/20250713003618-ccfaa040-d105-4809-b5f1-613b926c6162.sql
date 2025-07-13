-- Create trigger to automatically update invoice balance when payment is made
CREATE TRIGGER update_invoice_balance_on_payment
  AFTER INSERT OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_balance();