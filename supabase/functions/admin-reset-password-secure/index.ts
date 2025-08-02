import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
};

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const isRateLimited = (identifier: string, maxAttempts = 5, windowMs = 300000): boolean => {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return false;
  }
  
  if (record.count >= maxAttempts) {
    return true;
  }
  
  record.count++;
  return false;
};

const validateInput = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data.user_id || typeof data.user_id !== 'string') {
    errors.push('Valid user ID is required');
  }
  
  if (!data.new_password || typeof data.new_password !== 'string') {
    errors.push('New password is required');
  } else if (data.new_password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing environment configuration');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Get and verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authorization' }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // Rate limiting check
    if (isRateLimited(user.id, 5, 300000)) { // 5 attempts per 5 minutes
      return new Response(JSON.stringify({ error: 'Too many reset attempts. Please try again later.' }), {
        status: 429,
        headers: corsHeaders
      });
    }

    // Check admin privileges
    const { data: adminCheck, error: adminError } = await supabaseAdmin.rpc('is_admin', { user_id: user.id });
    
    if (adminError || !adminCheck) {
      return new Response(JSON.stringify({ error: 'Admin privileges required' }), {
        status: 403,
        headers: corsHeaders
      });
    }

    // Parse and validate request body
    const requestBody = await req.json();
    const validation = validateInput(requestBody);
    
    if (!validation.isValid) {
      return new Response(JSON.stringify({ 
        error: 'Validation failed', 
        details: validation.errors 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const { user_id, new_password } = requestBody;

    // Generate secure password if none provided
    let finalPassword = new_password;
    if (!finalPassword) {
      const { data: generatedPassword, error: passwordError } = await supabaseAdmin
        .rpc('generate_secure_random_password');
      
      if (passwordError) {
        console.error('Error generating secure password:', passwordError);
        return new Response(
          JSON.stringify({ error: 'Failed to generate secure password' }),
          { status: 500, headers: corsHeaders }
        );
      }
      finalPassword = generatedPassword;
    }

    // Verify target user exists
    const { data: targetUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(user_id);
    
    if (userError || !targetUser.user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: corsHeaders
      });
    }

    // Update password with enhanced security
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      password: finalPassword
    });

    if (updateError) {
      console.error('Password update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update password' }), {
        status: 500,
        headers: corsHeaders
      });
    }

    // Log security event
    await supabaseAdmin.rpc('log_security_event', {
      p_action: 'password_reset',
      p_resource_type: 'user',
      p_resource_id: user_id,
      p_details: { 
        action: 'Admin password reset performed',
        admin_id: user.id,
        generated_password: !new_password
      },
      p_success: true
    });

    // Log admin action (without sensitive data)
    await supabaseAdmin.from('admin_audit_log').insert({
      admin_id: user.id,
      action: 'password_reset',
      target_user_id: user_id,
      details: { action: 'Admin password reset performed', generated_password: !new_password },
      ip_address: req.headers.get('x-forwarded-for') || 'unknown'
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Password updated successfully' 
    }), {
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Admin reset password error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});