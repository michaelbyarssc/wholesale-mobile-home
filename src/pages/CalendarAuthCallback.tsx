import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';

export default function CalendarAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const state = searchParams.get('state');

        if (error) {
          throw new Error(error);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Exchange code for tokens via our edge function
        const { data, error: exchangeError } = await supabase.functions.invoke('google-calendar-auth', {
          body: { action: 'exchange_code', code, state }
        });

        if (exchangeError || !data?.success) {
          throw new Error(data?.error || 'Failed to connect calendar');
        }

        // Send success message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'GOOGLE_CALENDAR_AUTH_SUCCESS',
            calendar_name: data.calendar_name
          }, window.location.origin);
          window.close();
        } else {
          // If not in popup, redirect to appointments page
          navigate('/appointments?tab=calendar&connected=true');
        }

      } catch (error) {
        console.error('Calendar auth error:', error);
        
        // Send error message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'GOOGLE_CALENDAR_AUTH_ERROR',
            error: error instanceof Error ? error.message : 'Unknown error'
          }, window.location.origin);
          window.close();
        } else {
          // If not in popup, redirect with error
          navigate('/appointments?tab=calendar&error=true');
        }
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <LoadingSpinner />
        <div>
          <h2 className="text-lg font-semibold">Connecting your calendar...</h2>
          <p className="text-muted-foreground">Please wait while we complete the setup.</p>
        </div>
      </div>
    </div>
  );
}