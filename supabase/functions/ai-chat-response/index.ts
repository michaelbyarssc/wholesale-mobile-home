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

// Generate response using OpenAI API
async function generateOpenAIResponse(userMessage: string, chatHistory: any[]): Promise<string> {
  if (!openAIApiKey) {
    console.error('OpenAI API key not configured')
    return "I apologize, but I'm currently unable to process your request. Please try again later or contact our support team."
  }

  try {
    // Prepare chat history for OpenAI format
    const messages = [
      {
        role: 'system',
        content: `You are a helpful AI assistant for a mobile home dealership. You help customers with:
        - Mobile home pricing and specifications
        - Financing options and payment plans
        - Delivery and setup services
        - Home customization and upgrades
        - Scheduling appointments and consultations
        - General mobile home information

        Be friendly, professional, and helpful. If you don't know specific pricing or availability, offer to connect them with a specialist. Keep responses concise but informative.
        
        When discussing pricing, mention that prices vary based on size, features, and location, and offer to help them get a personalized estimate.
        
        For complex questions about financing, delivery logistics, or specific product availability, offer to connect them with the appropriate specialist.
        
        Company details:
        - We work with reputable manufacturers like Clayton, Champion, and other trusted brands
        - We offer single-wide (600-1,300 sq ft) and double-wide (1,000-2,300 sq ft) homes
        - All homes are HUD-compliant and come with manufacturer warranties
        - We provide complete setup services including site preparation and utility connections
        - Financing options available through our partners
        - Phone: 1-800-555-HOMES (1-800-555-4663)
        - Hours: Mon-Fri 8AM-8PM EST, Sat-Sun 9AM-5PM EST`
      }
    ]

    // Add recent chat history (last 10 messages to stay within token limits)
    const recentHistory = chatHistory.slice(-10)
    for (const msg of recentHistory) {
      messages.push({
        role: msg.sender_type === 'user' ? 'user' : 'assistant',
        content: msg.content
      })
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    })

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText)
      return "I apologize, but I'm having trouble processing your request right now. Please try again in a moment."
    }

    const data = await response.json()
    return data.choices[0].message.content || "I apologize, but I couldn't generate a response. Please try rephrasing your question."

  } catch (error) {
    console.error('Error calling OpenAI API:', error)
    return "I'm sorry, but I'm experiencing technical difficulties. Please try again later or contact our support team for immediate assistance."
  }
}