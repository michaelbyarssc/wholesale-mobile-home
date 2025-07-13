-- Add missing columns to invoices table to match estimate details
ALTER TABLE public.invoices 
ADD COLUMN mobile_home_id UUID REFERENCES public.mobile_homes(id),
ADD COLUMN selected_services UUID[] DEFAULT '{}',
ADD COLUMN selected_home_options JSONB DEFAULT '[]',
ADD COLUMN preferred_contact TEXT,
ADD COLUMN timeline TEXT,
ADD COLUMN additional_requirements TEXT;