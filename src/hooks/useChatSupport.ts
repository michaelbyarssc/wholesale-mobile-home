import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type ChatSession = Tables<'chat_sessions'>;
type ChatMessage = Tables<'chat_messages'>;
type SupportTicket = Tables<'support_tickets'>;

interface ChatSessionWithMessages extends ChatSession {
  chat_messages: ChatMessage[];
}

export const useChatSupport = (userId?: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<ChatSessionWithMessages | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const { toast } = useToast();

  // Initialize chat session
  const initializeChat = useCallback(async (subject?: string, department?: string, customerInfo?: { name: string; phone: string }) => {
    if (!userId && !customerInfo) {
      toast({
        title: "Information Required",
        description: "Please provide your name and phone number to start a chat.",
        variant: "destructive"
      });
      return null;
    }

    setIsLoading(true);
    try {
      // Check for existing active session (only for authenticated users)
      if (userId) {
        console.log('Checking for existing session for authenticated user:', userId);
        const { data: existingSession } = await supabase
          .from('chat_sessions')
          .select('*, chat_messages(*)')
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('created_at', { referencedTable: 'chat_messages', ascending: true })
          .maybeSingle();

        console.log('Existing session found:', existingSession);
        if (existingSession) {
          setCurrentSession(existingSession);
          setMessages(existingSession.chat_messages || []);
          setIsConnected(true);
          console.log('Reusing existing session with', existingSession.chat_messages?.length || 0, 'messages');
          return existingSession;
        }
      }

      // Create new session
      const sessionToken = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const sessionMetadata = customerInfo ? {
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        anonymous: true
      } : {};

      const { data: newSession, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId || null,
          session_token: sessionToken,
          subject: subject || 'General Inquiry',
          department: department || 'general',
          status: 'active',
          metadata: sessionMetadata
        })
        .select('*, chat_messages(*)')
        .single();

      if (error) throw error;

      // Store anonymous user information in dedicated table if provided
      if (customerInfo) {
        await supabase
          .from('anonymous_chat_users')
          .insert({
            session_id: newSession.id,
            customer_name: customerInfo.name,
            customer_phone: customerInfo.phone
          });
      }

      // Send welcome message after session is created
      const welcomeMessage = customerInfo 
        ? `Hello ${customerInfo.name}! How can we help you today?`
        : "Hello! How can we help you today?";
      
      // Send the welcome message directly without using the sendMessage callback
      await supabase
        .from('chat_messages')
        .insert({
          session_id: newSession.id,
          sender_type: 'system',
          sender_id: null,
          content: welcomeMessage,
          message_type: 'text'
        });

      setCurrentSession(newSession);
      setMessages(newSession.chat_messages || []);
      setIsConnected(true);

      toast({
        title: "Chat Started",
        description: "You're now connected with our support team."
      });

      return newSession;
    } catch (error) {
      console.error('Error initializing chat:', error);
      toast({
        title: "Error",
        description: "Failed to start chat session. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId, toast]);

  // Send message
  const sendMessage = useCallback(async (content: string, senderType: 'user' | 'agent' | 'ai' | 'system' = 'user') => {
    if (!currentSession || !content.trim()) return null;

    try {
      console.log('Sending message for session:', currentSession.id, 'user:', userId, 'content:', content.substring(0, 50) + '...');
      const { data: message, error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: currentSession.id,
          sender_type: senderType,
          sender_id: senderType === 'user' ? userId || null : null,
          content: content.trim(),
          message_type: 'text'
        })
        .select()
        .single();

      if (error) throw error;
      console.log('Message sent successfully:', message.id);

      // If this is a user message and we have AI enabled, trigger AI response
      if (senderType === 'user' && content.trim()) {
        // Small delay to make conversation feel natural
        setTimeout(() => {
          handleAIResponse(content);
        }, 1000);
      }

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  }, [currentSession, userId, toast]);

  // Handle AI response with duplicate prevention
  const handleAIResponse = useCallback(async (userMessage: string) => {
    if (!currentSession) return;

    // Prevent AI from responding to AI or system messages
    const recentMessages = messages.slice(-2);
    const lastMessage = recentMessages[recentMessages.length - 1];
    if (lastMessage && (lastMessage.sender_type === 'ai' || lastMessage.sender_type === 'system')) {
      return;
    }

    try {
      // Call edge function for AI response
      const { data, error } = await supabase.functions.invoke('ai-chat-response', {
        body: {
          sessionId: currentSession.id,
          userMessage,
          chatHistory: messages.slice(-5) // Last 5 messages for context
        }
      });

      if (error) throw error;

      if (data?.response) {
        // Send AI response without triggering another AI response
        await supabase
          .from('chat_messages')
          .insert({
            session_id: currentSession.id,
            sender_type: 'ai',
            sender_id: null,
            content: data.response,
            message_type: 'text'
          });
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      // Fallback to predefined responses
      const fallbackResponses = [
        "Thank you for your message. An agent will be with you shortly.",
        "I understand you need assistance. Let me connect you with someone who can help.",
        "Your inquiry is important to us. Please hold while I find the best person to assist you."
      ];
      const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      // Send fallback response without triggering another AI response
      await supabase
        .from('chat_messages')
        .insert({
          session_id: currentSession.id,
          sender_type: 'ai',
          sender_id: null,
          content: randomResponse,
          message_type: 'text'
        });
    }
  }, [currentSession, messages, sendMessage]);

  // End chat session
  const endChat = useCallback(async () => {
    if (!currentSession) return;

    try {
      // Before ending, extract data and save to CRM if we have enough conversation
      if (messages.length > 2) {
        const anonymousUser = currentSession.user_id === null;
        
        let customerInfo = null;
        
        if (anonymousUser) {
          // For anonymous users, get info from anonymous_chat_users table
          const { data: anonUser } = await supabase
            .from('anonymous_chat_users')
            .select('customer_name, customer_phone')
            .eq('session_id', currentSession.id)
            .single();
          
          if (anonUser) {
            customerInfo = {
              name: anonUser.customer_name,
              phone: anonUser.customer_phone,
              email: null
            };
          }
        } else if (userId) {
          // For authenticated users, we could get more info from profiles
          customerInfo = {
            name: 'Authenticated User',
            email: null, // You might want to get actual email from user profile
            phone: null
          };
        }

        // Extract data and save to CRM if we have customer info
        if (customerInfo) {
          try {
            await supabase.functions.invoke('extract-chat-data', {
              body: {
                chatSessionId: currentSession.id,
                messages: messages,
                customerInfo: customerInfo,
                pageSource: window.location.pathname
              }
            });
            console.log('Chat data extracted and saved to CRM');
          } catch (extractError) {
            console.error('Failed to extract chat data:', extractError);
            // Don't block chat ending if extraction fails
          }
        }
      }

      await supabase
        .from('chat_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', currentSession.id);

      setCurrentSession(null);
      setMessages([]);
      setIsConnected(false);

      toast({
        title: "Chat Ended",
        description: "Thank you for contacting us. Your conversation has been saved."
      });
    } catch (error) {
      console.error('Error ending chat:', error);
      toast({
        title: "Error",
        description: "Failed to end chat session properly.",
        variant: "destructive"
      });
    }
  }, [currentSession, messages, userId, toast]);

  // Create support ticket
  const createSupportTicket = useCallback(async (title: string, description: string, category: string = 'general', priority: string = 'medium') => {
    if (!userId) return null;

    try {
      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: userId,
          title,
          description,
          category,
          priority,
          chat_session_id: currentSession?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Support Ticket Created",
        description: `Ticket #${ticket.id.slice(-8)} has been created and assigned to our team.`
      });

      return ticket;
    } catch (error) {
      console.error('Error creating support ticket:', error);
      toast({
        title: "Error",
        description: "Failed to create support ticket. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  }, [userId, currentSession, toast]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!currentSession) return;

    const messagesChannel = supabase
      .channel(`chat-messages-${currentSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${currentSession.id}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          // Prevent duplicate messages
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${currentSession.id}`
        },
        (payload) => {
          const updatedMessage = payload.new as ChatMessage;
          setMessages(prev => prev.map(msg => 
            msg.id === updatedMessage.id ? updatedMessage : msg
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [currentSession]);

  // Load existing session on mount
  useEffect(() => {
    if (!userId) return;

    const loadExistingSession = async () => {
      try {
        console.log('Loading existing session for user:', userId);
        const { data: session } = await supabase
          .from('chat_sessions')
          .select('*, chat_messages(*)')
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('created_at', { referencedTable: 'chat_messages', ascending: true })
          .maybeSingle();

        console.log('Found existing session:', session);
        if (session) {
          console.log('Setting session with messages:', session.chat_messages?.length || 0);
          setCurrentSession(session);
          setMessages(session.chat_messages || []);
          setIsConnected(true);
        } else {
          console.log('No existing active session found for user');
        }
      } catch (error) {
        console.error('Error loading existing session:', error);
      }
    };

    loadExistingSession();
  }, [userId]);

  return {
    isLoading,
    currentSession,
    messages,
    isConnected,
    typingUsers,
    initializeChat,
    sendMessage,
    endChat,
    createSupportTicket
  };
};