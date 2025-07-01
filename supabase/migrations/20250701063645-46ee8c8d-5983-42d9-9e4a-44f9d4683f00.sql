
-- Update support@michaelbyars.com to be created by and approved by Christina Erwin (admin)
UPDATE public.profiles 
SET 
  created_by = '91f386de-c98e-4906-b388-baa1a09af57e',  -- Christina Erwin's user_id
  approved = true,
  approved_at = now(),
  approved_by = '91f386de-c98e-4906-b388-baa1a09af57e'  -- Approved by Christina Erwin
WHERE email = 'support@michaelbyars.com' 
  AND user_id = '5183097c-a0cb-4087-b27e-cc96517705a8';
