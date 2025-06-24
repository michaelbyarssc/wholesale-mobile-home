
-- Enable real-time updates for customer_markups table
ALTER TABLE public.customer_markups REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_markups;
