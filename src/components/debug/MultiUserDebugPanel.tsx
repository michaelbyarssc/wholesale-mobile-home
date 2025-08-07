import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const MultiUserDebugPanel = () => {
  const { 
    sessions, 
    activeSession, 
    activeSessionId, 
    switchToSession, 
    hasMultipleSessions
  } = useAuth();

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 bg-background/95 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Multi-User Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-xs">
          <span>Total Sessions:</span>
          <Badge variant="outline">{sessions.length}</Badge>
        </div>
        
        <div className="flex justify-between text-xs">
          <span>Multiple Sessions:</span>
          <Badge variant={hasMultipleSessions ? "default" : "secondary"}>
            {hasMultipleSessions ? "Yes" : "No"}
          </Badge>
        </div>

        <div className="text-xs">
          <span className="font-medium">Active Session:</span>
          <div className="text-muted-foreground">
            {activeSession ? `${activeSession.user.email} (${activeSessionId?.slice(-8)})` : 'None'}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-medium">All Sessions:</div>
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between text-xs">
              <span className={`truncate ${session.id === activeSessionId ? 'font-bold' : ''}`}>
                {session.user.email}
              </span>
              <div className="flex gap-1">
                <Badge variant={session.id === activeSessionId ? "default" : "outline"} className="text-xs">
                  {session.id === activeSessionId ? "Active" : "Idle"}
                </Badge>
                {session.id !== activeSessionId && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 px-2 text-xs"
                    onClick={() => switchToSession(session.id)}
                  >
                    Switch
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground">
          Storage Key: {activeSession ? `wmh_user_${activeSession.user.id}` : 'None'}
        </div>
      </CardContent>
    </Card>
  );
};