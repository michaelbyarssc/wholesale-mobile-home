import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { chatSessionId, messages, customerInfo, pageSource } = await req.json()

    console.log('Extracting data for session:', chatSessionId)

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Get extraction settings
    const { data: settings } = await supabase
      .from('chat_data_capture_settings')
      .select('setting_value')
      .eq('setting_key', 'extraction_prompts')
      .single()

    const extractionConfig = settings?.setting_value || {
      system_prompt: "Extract structured data from mobile home sales conversations.",
      confidence_threshold: 0.7
    }

    // Format conversation for AI analysis
    const conversation = messages.map((msg: any) => 
      `${msg.sender_type === 'user' ? 'Customer' : 'Agent'}: ${msg.content}`
    ).join('\n')

    // Call OpenAI for data extraction
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `${extractionConfig.system_prompt}

Extract the following data from the conversation and return as JSON:
{
  "beds": number | null,
  "baths": number | null, 
  "timeframe": string | null,
  "buyer_type": "investor" | "retail" | null,
  "budget": string | null,
  "interests": string[] | null,
  "lead_score": number (1-10),
  "confidence_scores": {
    "beds": number (0-1),
    "baths": number (0-1),
    "timeframe": number (0-1),
    "buyer_type": number (0-1),
    "budget": number (0-1),
    "interests": number (0-1),
    "lead_score": number (0-1)
  }
}

Only extract data that is explicitly mentioned. Use null for missing data.`
          },
          {
            role: 'user',
            content: `Customer info: ${JSON.stringify(customerInfo)}\n\nConversation:\n${conversation}`
          }
        ],
        temperature: 0.1,
      }),
    })

    const aiResult = await response.json()
    const extractedData = JSON.parse(aiResult.choices[0].message.content)

    console.log('Extracted data:', extractedData)

    // Check if lead exists (by email or phone)
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .or(`email.eq.${customerInfo.email},phone.eq.${customerInfo.phone}`)
      .single()

    let leadId = existingLead?.id

    // Create lead if doesn't exist
    if (!leadId && customerInfo.email) {
      const leadSource = pageSource ? `get_chat_lead_source('${pageSource}')` : 'Website Chat'
      
      const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert({
          first_name: customerInfo.name?.split(' ')[0] || '',
          last_name: customerInfo.name?.split(' ').slice(1).join(' ') || '',
          email: customerInfo.email,
          phone: customerInfo.phone,
          status: 'new',
          lead_score: extractedData.lead_score || 0,
          interests: extractedData.interests || [],
          estimated_budget: extractedData.budget ? parseFloat(extractedData.budget.replace(/[^0-9.-]+/g, '')) : null,
          estimated_timeline: extractedData.timeframe,
          notes: `Lead generated from ${leadSource}`,
        })
        .select('id')
        .single()

      if (leadError) {
        console.error('Error creating lead:', leadError)
      } else {
        leadId = newLead.id
        console.log('Created new lead:', leadId)
      }
    }

    // Generate chat transcript
    const transcript = messages.map((msg: any) => 
      `[${new Date(msg.created_at).toLocaleString()}] ${msg.sender_type === 'user' ? customerInfo.name || 'Customer' : 'Agent'}: ${msg.content}`
    ).join('\n\n')

    // Create customer interaction record
    const { data: interaction, error: interactionError } = await supabase
      .from('customer_interactions')
      .insert({
        lead_id: leadId,
        interaction_type: 'chat',
        subject: `Chat conversation with ${customerInfo.name || 'customer'}`,
        description: 'Live chat conversation captured from website',
        chat_session_id: chatSessionId,
        chat_transcript: transcript,
        captured_data: extractedData,
        confidence_scores: extractedData.confidence_scores || {},
        extraction_reviewed: false,
        page_source: pageSource,
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (interactionError) {
      console.error('Error creating interaction:', interactionError)
      throw interactionError
    }

    console.log('Created customer interaction:', interaction.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        leadId, 
        interactionId: interaction.id,
        extractedData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in extract-chat-data function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})