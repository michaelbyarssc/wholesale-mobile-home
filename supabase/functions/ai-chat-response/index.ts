import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sessionId, userMessage, chatHistory } = await req.json()

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      throw new Error('Session not found')
    }

    // Analyze user message and generate appropriate response
    const response = await generateOpenAIResponse(userMessage, chatHistory)

    // Return the response - let the client handle saving to database
    return new Response(
      JSON.stringify({ response }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in ai-chat-response:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

// Generate response using OpenAI Assistants API
async function generateOpenAIResponse(userMessage: string, chatHistory: any[]): Promise<string> {
  if (!openAIApiKey) {
    console.error('OpenAI API key not configured')
    return "I apologize, but I'm currently unable to process your request. Please try again later or contact our support team."
  }

  const assistantId = 'asst_B2fBwdSnxpTvBOEZs87WWrfH';

  try {
    // Create a new thread for this conversation
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({})
    });

    if (!threadResponse.ok) {
      console.error('Failed to create thread:', threadResponse.status, threadResponse.statusText)
      return "I apologize, but I'm having trouble processing your request right now. Please try again in a moment."
    }

    const thread = await threadResponse.json();
    const threadId = thread.id;

    // Add recent chat history to the thread (last 5 messages to avoid token limits)
    const recentHistory = chatHistory.slice(-5);
    for (const msg of recentHistory) {
      await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          role: msg.sender_type === 'user' ? 'user' : 'assistant',
          content: msg.content
        })
      });
    }

    // Add the current user message
    await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: userMessage
      })
    });

    // Run the assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: assistantId
      })
    });

    if (!runResponse.ok) {
      console.error('Failed to run assistant:', runResponse.status, runResponse.statusText)
      return "I apologize, but I'm having trouble processing your request right now. Please try again in a moment."
    }

    const run = await runResponse.json();
    const runId = run.id;

    // Poll for completion with increased timeout
    let runStatus = 'queued';
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max wait time
    const pollInterval = 1000; // 1 second intervals

    while (runStatus !== 'completed' && runStatus !== 'failed' && runStatus !== 'cancelled' && runStatus !== 'expired' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        runStatus = statusData.status;
        console.log(`Assistant run status: ${runStatus} (attempt ${attempts + 1}/${maxAttempts})`);
        
        // Handle specific error states
        if (runStatus === 'failed') {
          console.error('Assistant run failed:', statusData.last_error);
          return "I encountered an error while processing your request. Please try again or rephrase your question.";
        }
        
        if (runStatus === 'cancelled' || runStatus === 'expired') {
          console.error('Assistant run was cancelled or expired:', runStatus);
          return "Your request was cancelled or expired. Please try again.";
        }
      } else {
        console.error('Failed to check run status:', statusResponse.status, statusResponse.statusText);
      }
      
      attempts++;
    }

    if (runStatus !== 'completed') {
      console.error('Assistant run timed out. Final status:', runStatus, 'after', attempts, 'attempts');
      return "I'm taking longer than expected to process your request. Please try again with a simpler question or contact our support team.";
    }

    // Get the assistant's response
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!messagesResponse.ok) {
      console.error('Failed to get messages:', messagesResponse.status, messagesResponse.statusText)
      return "I apologize, but I couldn't retrieve the response. Please try again."
    }

    const messages = await messagesResponse.json();
    const assistantMessage = messages.data.find((msg: any) => msg.role === 'assistant');
    
    if (assistantMessage && assistantMessage.content && assistantMessage.content[0]) {
      return assistantMessage.content[0].text.value;
    }

    return "I apologize, but I couldn't generate a response. Please try rephrasing your question."

  } catch (error) {
    console.error('Error calling OpenAI Assistants API:', error)
    return "I'm sorry, but I'm experiencing technical difficulties. Please try again later or contact our support team for immediate assistance."
  }
}