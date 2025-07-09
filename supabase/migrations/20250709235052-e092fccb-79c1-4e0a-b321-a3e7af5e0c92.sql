-- Create chat support system tables

-- Create chat sessions table
CREATE TABLE public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  agent_id UUID REFERENCES auth.users(id),
  priority TEXT NOT NULL DEFAULT 'normal',
  subject TEXT,
  department TEXT DEFAULT 'general',
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'agent', 'ai', 'system')),
  sender_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat participants table (for multi-user support)
CREATE TABLE public.chat_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('participant', 'agent', 'observer')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Create support ticket system
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'pending', 'resolved', 'closed')),
  assigned_to UUID REFERENCES auth.users(id),
  chat_session_id UUID REFERENCES chat_sessions(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_agent_id ON chat_sessions(agent_id);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions(created_at);

CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_chat_messages_sender_type ON chat_messages(sender_type);

CREATE INDEX idx_chat_participants_session_id ON chat_participants(session_id);
CREATE INDEX idx_chat_participants_user_id ON chat_participants(user_id);

CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at);

-- Add updated_at triggers
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_sessions
CREATE POLICY "Users can view their own chat sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = agent_id);

CREATE POLICY "Users can create their own chat sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Agents can update assigned chat sessions"
  ON chat_sessions FOR UPDATE
  USING (auth.uid() = agent_id OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage all chat sessions"
  ON chat_sessions FOR ALL
  USING (is_admin(auth.uid()));

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their sessions"
  ON chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chat_sessions 
    WHERE chat_sessions.id = session_id 
    AND (auth.uid() = chat_sessions.user_id OR auth.uid() = chat_sessions.agent_id)
  ));

CREATE POLICY "Users can send messages in their sessions"
  ON chat_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM chat_sessions 
    WHERE chat_sessions.id = session_id 
    AND (auth.uid() = chat_sessions.user_id OR auth.uid() = chat_sessions.agent_id)
  ));

CREATE POLICY "Users can update their own messages"
  ON chat_messages FOR UPDATE
  USING (auth.uid() = sender_id);

CREATE POLICY "Admins can manage all chat messages"
  ON chat_messages FOR ALL
  USING (is_admin(auth.uid()));

-- RLS Policies for chat_participants
CREATE POLICY "Users can view participants in their sessions"
  ON chat_participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chat_sessions 
    WHERE chat_sessions.id = session_id 
    AND (auth.uid() = chat_sessions.user_id OR auth.uid() = chat_sessions.agent_id)
  ));

CREATE POLICY "Users can join sessions they're invited to"
  ON chat_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all chat participants"
  ON chat_participants FOR ALL
  USING (is_admin(auth.uid()));

-- RLS Policies for support_tickets
CREATE POLICY "Users can view their own support tickets"
  ON support_tickets FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = assigned_to);

CREATE POLICY "Users can create their own support tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own support tickets"
  ON support_tickets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Agents can manage assigned support tickets"
  ON support_tickets FOR ALL
  USING (auth.uid() = assigned_to OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage all support tickets"
  ON support_tickets FOR ALL
  USING (is_admin(auth.uid()));

-- Create function to generate session tokens
CREATE OR REPLACE FUNCTION generate_chat_session_token()
RETURNS TEXT AS $$
BEGIN
  RETURN 'chat_' || encode(gen_random_bytes(16), 'base64url');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to auto-assign chat sessions to available agents
CREATE OR REPLACE FUNCTION auto_assign_chat_session()
RETURNS TRIGGER AS $$
DECLARE
  available_agent UUID;
BEGIN
  -- Find an available agent (admin user who is not currently handling too many active sessions)
  SELECT ur.user_id INTO available_agent
  FROM user_roles ur
  WHERE ur.role IN ('admin', 'super_admin')
  AND ur.user_id NOT IN (
    SELECT agent_id 
    FROM chat_sessions 
    WHERE agent_id IS NOT NULL 
    AND status = 'active'
    GROUP BY agent_id 
    HAVING COUNT(*) >= 5  -- Max 5 concurrent sessions per agent
  )
  ORDER BY RANDOM()
  LIMIT 1;

  -- If an agent is available, assign them
  IF available_agent IS NOT NULL THEN
    NEW.agent_id = available_agent;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-assignment
CREATE TRIGGER auto_assign_chat_trigger
  BEFORE INSERT ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_chat_session();

-- Enable realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;