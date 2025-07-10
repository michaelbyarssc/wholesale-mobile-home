-- Update RLS policies to allow anonymous chat sessions and messages

-- Allow anonymous users to create chat sessions
DROP POLICY IF EXISTS "Users can create their own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can create chat sessions"
ON public.chat_sessions 
FOR INSERT 
WITH CHECK (
  (auth.uid() = user_id) OR 
  (user_id IS NULL AND session_token IS NOT NULL)
);

-- Allow anonymous users to view chat sessions they created
DROP POLICY IF EXISTS "Users can view their own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can view their chat sessions"
ON public.chat_sessions 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  (auth.uid() = agent_id) OR
  (user_id IS NULL AND session_token IS NOT NULL)
);

-- Allow anonymous users to send messages in their sessions
DROP POLICY IF EXISTS "Users can send messages in their sessions" ON public.chat_messages;
CREATE POLICY "Users can send messages in their sessions"
ON public.chat_messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_sessions 
    WHERE chat_sessions.id = chat_messages.session_id 
    AND (
      (auth.uid() = chat_sessions.user_id) OR 
      (auth.uid() = chat_sessions.agent_id) OR
      (chat_sessions.user_id IS NULL)
    )
  )
);

-- Allow anonymous users to view messages in their sessions
DROP POLICY IF EXISTS "Users can view messages in their sessions" ON public.chat_messages;
CREATE POLICY "Users can view messages in their sessions"
ON public.chat_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM chat_sessions 
    WHERE chat_sessions.id = chat_messages.session_id 
    AND (
      (auth.uid() = chat_sessions.user_id) OR 
      (auth.uid() = chat_sessions.agent_id) OR
      (chat_sessions.user_id IS NULL)
    )
  )
);

-- Allow system to update chat sessions for anonymous users
CREATE POLICY "System can update chat sessions"
ON public.chat_sessions 
FOR UPDATE 
USING (true);

-- Allow anonymous users to update their own messages
CREATE POLICY "Users can update their own messages in sessions"
ON public.chat_messages 
FOR UPDATE 
USING (
  (auth.uid() = sender_id) OR
  EXISTS (
    SELECT 1 FROM chat_sessions 
    WHERE chat_sessions.id = chat_messages.session_id 
    AND chat_sessions.user_id IS NULL
  )
);