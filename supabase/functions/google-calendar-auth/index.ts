import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, code, state } = await req.json()
    
    if (action === 'get_auth_url') {
      const redirectUri = `${req.headers.get('origin')}/calendar-auth-callback`
      const scope = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events'
      
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID!)
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('scope', scope)
      authUrl.searchParams.set('access_type', 'offline')
      authUrl.searchParams.set('prompt', 'consent')
      authUrl.searchParams.set('state', crypto.randomUUID())

      return new Response(
        JSON.stringify({ auth_url: authUrl.toString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'exchange_code') {
      // Get authorization header
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        throw new Error('No authorization header')
      }

      // Create Supabase client
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
      
      // Get user from JWT
      const jwt = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
      
      if (authError || !user) {
        throw new Error('Invalid authentication')
      }

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: `${req.headers.get('origin')}/calendar-auth-callback`,
        }),
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for tokens')
      }

      const tokens = await tokenResponse.json()
      
      // Get user's calendar list
      const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      })

      if (!calendarResponse.ok) {
        throw new Error('Failed to fetch calendar list')
      }

      const calendarData = await calendarResponse.json()
      const primaryCalendar = calendarData.items.find((cal: any) => cal.primary) || calendarData.items[0]

      if (!primaryCalendar) {
        throw new Error('No calendars found')
      }

      // Get user profile for email
      const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      })

      const profile = await profileResponse.json()

      // Calculate token expiry
      const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000))

      // Store calendar connection
      const { error: insertError } = await supabase
        .from('user_calendar_connections')
        .insert({
          user_id: user.id,
          google_account_email: profile.email,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          calendar_id: primaryCalendar.id,
          calendar_name: primaryCalendar.summary,
          calendar_timezone: primaryCalendar.timeZone,
          is_primary: primaryCalendar.primary || false,
          is_default_for_appointments: true, // First calendar becomes default
        })

      if (insertError) {
        console.error('Database insert error:', insertError)
        throw new Error('Failed to save calendar connection')
      }

      return new Response(
        JSON.stringify({ success: true, calendar_name: primaryCalendar.summary }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid action')

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})