
-- Approve all existing users (they were created before the approval system)
UPDATE public.profiles 
SET approved = true, approved_at = now()
WHERE approved = false;

-- Add a denied status option
ALTER TABLE public.profiles 
ADD COLUMN denied BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN denied_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN denied_by UUID REFERENCES auth.users(id);
