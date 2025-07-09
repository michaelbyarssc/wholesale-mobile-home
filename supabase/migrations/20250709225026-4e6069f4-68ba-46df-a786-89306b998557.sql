-- Create lead_sources table
CREATE TABLE public.lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost', 'nurturing')),
  lead_source_id UUID REFERENCES public.lead_sources(id),
  lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  estimated_budget NUMERIC,
  estimated_timeline TEXT,
  interests JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  assigned_to UUID,
  user_id UUID, -- If they become a registered user
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  next_follow_up_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customer_interactions table
CREATE TABLE public.customer_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('call', 'email', 'meeting', 'website_visit', 'estimate_request', 'demo', 'follow_up', 'note')),
  subject TEXT NOT NULL,
  description TEXT,
  outcome TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  attachments JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create follow_ups table
CREATE TABLE public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  follow_up_type TEXT NOT NULL CHECK (follow_up_type IN ('call', 'email', 'meeting', 'task', 'reminder')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  assigned_to UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default lead sources
INSERT INTO public.lead_sources (name, description) VALUES
('Website', 'Leads from website contact forms and inquiries'),
('Phone Call', 'Leads from direct phone inquiries'),
('Email', 'Leads from email inquiries'),
('Referral', 'Leads from customer referrals'),
('Social Media', 'Leads from social media platforms'),
('Advertisement', 'Leads from online or print advertisements'),
('Trade Show', 'Leads from trade shows and events'),
('Cold Outreach', 'Leads from cold calling or emailing'),
('Walk-in', 'Leads who visited in person'),
('Other', 'Other lead sources');

-- Enable Row Level Security
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lead_sources
CREATE POLICY "Admins can manage lead sources" ON public.lead_sources
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view active lead sources" ON public.lead_sources
FOR SELECT USING (active = true);

-- Create RLS policies for leads
CREATE POLICY "Admins can manage all leads" ON public.leads
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own leads" ON public.leads
FOR SELECT USING (auth.uid() = user_id OR auth.uid() = assigned_to);

-- Create RLS policies for customer_interactions
CREATE POLICY "Admins can manage all interactions" ON public.customer_interactions
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Users can manage interactions for their leads" ON public.customer_interactions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = customer_interactions.lead_id 
    AND (leads.user_id = auth.uid() OR leads.assigned_to = auth.uid())
  )
);

-- Create RLS policies for follow_ups
CREATE POLICY "Admins can manage all follow_ups" ON public.follow_ups
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Users can manage their assigned follow_ups" ON public.follow_ups
FOR ALL USING (auth.uid() = assigned_to OR auth.uid() = created_by);

CREATE POLICY "Users can manage follow_ups for their leads" ON public.follow_ups
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = follow_ups.lead_id 
    AND (leads.user_id = auth.uid() OR leads.assigned_to = auth.uid())
  )
);

-- Create updated_at triggers
CREATE TRIGGER update_lead_sources_updated_at
BEFORE UPDATE ON public.lead_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_interactions_updated_at
BEFORE UPDATE ON public.customer_interactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_follow_ups_updated_at
BEFORE UPDATE ON public.follow_ups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_leads_lead_source_id ON public.leads(lead_source_id);
CREATE INDEX idx_leads_next_follow_up_at ON public.leads(next_follow_up_at);
CREATE INDEX idx_customer_interactions_lead_id ON public.customer_interactions(lead_id);
CREATE INDEX idx_customer_interactions_type ON public.customer_interactions(interaction_type);
CREATE INDEX idx_follow_ups_lead_id ON public.follow_ups(lead_id);
CREATE INDEX idx_follow_ups_due_date ON public.follow_ups(due_date);
CREATE INDEX idx_follow_ups_assigned_to ON public.follow_ups(assigned_to);