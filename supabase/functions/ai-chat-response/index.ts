import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const response = generateAIResponse(userMessage, chatHistory)

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

function generateAIResponse(userMessage: string, chatHistory: any[]): string {
  const message = userMessage.toLowerCase()
  
  // Mobile home specific responses
  if (message.includes('price') || message.includes('cost') || message.includes('pricing')) {
    return "I'd be happy to help you with pricing information! Our mobile homes range from budget-friendly options to luxury models. To give you the most accurate pricing, I'll need to know more about your preferences. What size home are you looking for, and do you have any specific features in mind?"
  }
  
  if (message.includes('financing') || message.includes('loan') || message.includes('payment')) {
    return "We offer several financing options to make your mobile home purchase affordable. Our partners provide competitive rates and flexible terms. Would you like me to connect you with our financing specialist, or would you prefer to use our financing calculator to estimate your monthly payments?"
  }
  
  if (message.includes('delivery') || message.includes('shipping') || message.includes('transport')) {
    return "Mobile home delivery is included in our service! The delivery timeline and cost depend on your location and the specific home you choose. We handle all the logistics including permits, setup, and connection to utilities. Where would you like your home delivered?"
  }
  
  if (message.includes('size') || message.includes('bedroom') || message.includes('bathroom') || message.includes('sqft') || message.includes('square feet')) {
    return "We have mobile homes in various sizes! Our inventory includes single-wide homes (typically 14-18 feet wide, 600-1,300 sq ft) and double-wide homes (typically 20-32 feet wide, 1,000-2,300 sq ft). We offer 1-4 bedroom configurations. What size family are you planning for?"
  }
  
  if (message.includes('location') || message.includes('where') || message.includes('deliver') || message.includes('area')) {
    return "We deliver throughout the region! Delivery costs vary based on distance from our factory partners. To provide you with accurate delivery information and timeline, could you share your zip code or general area?"
  }
  
  if (message.includes('manufacturer') || message.includes('brand') || message.includes('quality')) {
    return "We work with reputable manufacturers who build quality, HUD-compliant mobile homes. Our current inventory includes homes from Clayton, Champion, and other trusted brands. All homes meet or exceed federal housing standards. Are you interested in any specific features or style preferences?"
  }
  
  if (message.includes('warranty') || message.includes('guarantee')) {
    return "All our mobile homes come with manufacturer warranties that typically cover structural components, appliances, and workmanship. The specific warranty terms vary by manufacturer and model. I can provide detailed warranty information once you've selected a home you're interested in."
  }
  
  if (message.includes('setup') || message.includes('installation') || message.includes('foundation')) {
    return "We provide complete setup services including site preparation, foundation work, utility connections, and final inspections. Our experienced crews ensure your home is properly installed and ready for occupancy. Do you already have a prepared site, or will you need assistance with site preparation?"
  }
  
  if (message.includes('inventory') || message.includes('available') || message.includes('stock') || message.includes('homes')) {
    return "Our inventory is updated daily with new arrivals and availability. You can browse our current selection on our website, where you'll find detailed information, photos, and pricing for each home. Would you like me to help you find homes that match specific criteria?"
  }
  
  if (message.includes('estimate') || message.includes('quote')) {
    return "I can help you get a detailed estimate! Our estimates include the home price, delivery costs, setup fees, and any optional services. To provide an accurate estimate, I'll need to know your location and which home you're interested in. Would you like to start the estimate process?"
  }
  
  // Greeting responses
  if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
    return "Hello! Welcome to our mobile home dealership. I'm here to help you find the perfect home for your needs. Are you looking for information about our inventory, pricing, financing, or do you have specific questions about mobile homes?"
  }
  
  // General help
  if (message.includes('help') || message.includes('assist') || message.includes('support')) {
    return "I'm here to help! I can assist you with information about our mobile homes, pricing, financing options, delivery, and the purchasing process. What would you like to know more about?"
  }
  
  // Contact information requests
  if (message.includes('phone') || message.includes('call') || message.includes('contact')) {
    return "You can reach us by phone at 1-800-555-HOMES (1-800-555-4663). Our hours are Monday-Friday 8AM-8PM EST, and Saturday-Sunday 9AM-5PM EST. Is there something specific you'd like to discuss over the phone?"
  }
  
  // Thank you responses
  if (message.includes('thank') || message.includes('thanks')) {
    return "You're very welcome! I'm glad I could help. Is there anything else you'd like to know about our mobile homes or services?"
  }
  
  // Default response for unrecognized queries
  const defaultResponses = [
    "That's a great question! Let me connect you with one of our specialists who can provide you with detailed information. In the meantime, is there anything specific about our mobile homes you'd like to know?",
    "I want to make sure I give you the most accurate information. Could you provide a bit more detail about what you're looking for? Our team is experts in mobile home sales, financing, and delivery.",
    "I'm here to help you find the perfect mobile home! Could you tell me more about your specific needs or questions? Are you interested in pricing, features, delivery, or financing options?",
    "Thank you for your question! To provide you with the best assistance, could you share more details about what you're looking for? Our mobile homes come in various sizes and styles, and I'd love to help you find the right fit."
  ]
  
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)]
}