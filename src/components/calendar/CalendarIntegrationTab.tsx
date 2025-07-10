import { Calendar, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { CalendarConnectionCard } from './CalendarConnectionCard';
import { CalendarPreferencesForm } from './CalendarPreferencesForm';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';

export function CalendarIntegrationTab() {
  const {
    connections,
    preferences,
    loading,
    connecting,
    connectGoogleCalendar,
    disconnectCalendar,
    setDefaultCalendar,
    updatePreferences,
  } = useGoogleCalendar();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Calendar Integration</h2>
          <p className="text-muted-foreground">
            Connect your Google Calendar to sync appointments automatically
          </p>
        </div>
        <Button
          onClick={connectGoogleCalendar}
          disabled={connecting}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {connecting ? 'Connecting...' : 'Connect Google Calendar'}
        </Button>
      </div>

      {/* Status Alert */}
      {connections.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No calendars connected. Connect your Google Calendar to automatically sync appointments.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            {connections.length} calendar{connections.length > 1 ? 's' : ''} connected. 
            Appointments will be synced to your default calendar.
          </AlertDescription>
        </Alert>
      )}

      {/* Connected Calendars */}
      {connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Connected Calendars
            </CardTitle>
            <CardDescription>
              Manage your connected Google Calendars and set which one should be used for appointments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {connections.map((connection) => (
                <CalendarConnectionCard
                  key={connection.id}
                  connection={connection}
                  onSetDefault={setDefaultCalendar}
                  onDisconnect={disconnectCalendar}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar Preferences */}
      {connections.length > 0 && (
        <CalendarPreferencesForm
          preferences={preferences}
          onUpdatePreferences={updatePreferences}
        />
      )}

      {/* Getting Started Guide */}
      {connections.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Getting Started with Calendar Integration</CardTitle>
            <CardDescription>
              Follow these steps to connect your Google Calendar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <h4 className="font-medium">Connect Your Calendar</h4>
                <p className="text-sm text-muted-foreground">
                  Click "Connect Google Calendar" and sign in to your Google account
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <h4 className="font-medium">Configure Preferences</h4>
                <p className="text-sm text-muted-foreground">
                  Set your sync preferences and event privacy settings
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <h4 className="font-medium">Automatic Sync</h4>
                <p className="text-sm text-muted-foreground">
                  New appointments will automatically appear in your calendar
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}