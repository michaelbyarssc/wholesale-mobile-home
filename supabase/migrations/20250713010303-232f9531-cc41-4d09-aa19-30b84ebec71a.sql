-- Update existing invoices with detailed information from their related estimates
UPDATE public.invoices 
SET 
  mobile_home_id = e.mobile_home_id,
  selected_services = e.selected_services,
  selected_home_options = e.selected_home_options,
  preferred_contact = e.preferred_contact,
  timeline = e.timeline,
  additional_requirements = e.additional_requirements,
  updated_at = now()
FROM public.estimates e
WHERE invoices.estimate_id = e.id
  AND invoices.mobile_home_id IS NULL; -- Only update invoices that don't already have these details