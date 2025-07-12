-- Add QuickBooks integration columns to invoices table
ALTER TABLE public.invoices 
ADD COLUMN quickbooks_id TEXT,
ADD COLUMN quickbooks_synced_at TIMESTAMP WITH TIME ZONE;