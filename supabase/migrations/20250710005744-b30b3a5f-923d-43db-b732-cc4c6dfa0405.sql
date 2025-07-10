-- Create table for anonymous chat users
CREATE TABLE public.anonymous_chat_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add unique constraint to ensure one record per session
ALTER TABLE public.anonymous_chat_users 
ADD CONSTRAINT unique_session_id UNIQUE (session_id);

-- Enable RLS
ALTER TABLE public.anonymous_chat_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Super admins can view all anonymous chat users
CREATE POLICY "Super admins can view all anonymous chat users"
ON public.anonymous_chat_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'::app_role
  )
);

-- Admins can view anonymous chat users for sessions they are assigned to
CREATE POLICY "Admins can view assigned anonymous chat users"
ON public.anonymous_chat_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.chat_sessions cs ON cs.agent_id = ur.user_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin'::app_role, 'super_admin'::app_role)
    AND cs.id = anonymous_chat_users.session_id
  )
);

-- System can insert anonymous chat user data
CREATE POLICY "System can insert anonymous chat users"
ON public.anonymous_chat_users
FOR INSERT
WITH CHECK (true);

-- System can update anonymous chat user data
CREATE POLICY "System can update anonymous chat users"
ON public.anonymous_chat_users
FOR UPDATE
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_anonymous_chat_users_updated_at
BEFORE UPDATE ON public.anonymous_chat_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_anonymous_chat_users_session_id ON public.anonymous_chat_users(session_id);
CREATE INDEX idx_anonymous_chat_users_created_at ON public.anonymous_chat_users(created_at);