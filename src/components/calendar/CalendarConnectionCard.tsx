import { Calendar, Check, Settings, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface CalendarConnection {
  id: string;
  google_account_email: string;
  calendar_id: string;
  calendar_name: string;
  calendar_timezone?: string;
  is_primary: boolean;
  is_default_for_appointments: boolean;
  token_expires_at: string;
  created_at: string;
}

interface CalendarConnectionCardProps {
  connection: CalendarConnection;
  onSetDefault: (connectionId: string) => void;
  onDisconnect: (connectionId: string) => void;
  onConfigureSettings?: (connectionId: string) => void;
}

export function CalendarConnectionCard({
  connection,
  onSetDefault,
  onDisconnect,
  onConfigureSettings,
}: CalendarConnectionCardProps) {
  const isExpired = new Date(connection.token_expires_at) < new Date();

  return (
    <Card className={`transition-all ${connection.is_default_for_appointments ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">{connection.calendar_name}</CardTitle>
              <CardDescription className="text-sm">
                {connection.google_account_email}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {connection.is_primary && (
              <Badge variant="secondary" className="text-xs">
                Primary
              </Badge>
            )}
            {connection.is_default_for_appointments && (
              <Badge variant="default" className="text-xs">
                <Check className="h-3 w-3 mr-1" />
                Default
              </Badge>
            )}
            {isExpired && (
              <Badge variant="destructive" className="text-xs">
                Expired
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {connection.calendar_timezone && (
            <div className="text-sm text-muted-foreground">
              Timezone: {connection.calendar_timezone}
            </div>
          )}
          
          <div className="flex flex-wrap gap-2">
            {!connection.is_default_for_appointments && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSetDefault(connection.id)}
                className="text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Set as Default
              </Button>
            )}
            
            {onConfigureSettings && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onConfigureSettings(connection.id)}
                className="text-xs"
              >
                <Settings className="h-3 w-3 mr-1" />
                Settings
              </Button>
            )}
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Disconnect
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect Calendar</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to disconnect "{connection.calendar_name}"? 
                    This will stop syncing appointments to this calendar.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDisconnect(connection.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}