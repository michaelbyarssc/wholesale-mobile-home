import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Trash2, RefreshCw } from 'lucide-react';
import { useSessionManager } from '@/contexts/SessionManagerContext';
import { useSessionRecovery } from '@/hooks/useSessionRecovery';
import { useToast } from '@/hooks/use-toast';

export const SessionDebugPanel: React.FC = () => {
  const { sessions } = useSessionManager();
  const { forceCleanSpecificUser, emergencyCleanup } = useSessionRecovery();
  const { toast } = useToast();
  const [userEmailToClean, setUserEmailToClean] = useState('');

  // Group sessions by user
  const sessionsByUser = sessions.reduce((acc, session) => {
    const userEmail = session.user.email || 'unknown';
    if (!acc[userEmail]) {
      acc[userEmail] = [];
    }
    acc[userEmail].push(session);
    return acc;
  }, {} as Record<string, any[]>);

  // Find users with multiple sessions
  const duplicateUsers = Object.entries(sessionsByUser).filter(([_, sessions]) => sessions.length > 1);

  const handleCleanSpecificUser = () => {
    if (!userEmailToClean.trim()) {
      toast({
        title: "Error",
        description: "Please enter a user email",
        variant: "destructive"
      });
      return;
    }

    const userSessions = Object.entries(sessionsByUser).find(([email, _]) => 
      email.toLowerCase() === userEmailToClean.toLowerCase()
    );

    if (!userSessions) {
      toast({
        title: "User not found",
        description: "No sessions found for this user",
        variant: "destructive"
      });
      return;
    }

    const userId = userSessions[1][0].user.id;
    const success = forceCleanSpecificUser(userId);

    if (success) {
      toast({
        title: "Success",
        description: `Cleaned all sessions for ${userEmailToClean}`,
      });
      setUserEmailToClean('');
    } else {
      toast({
        title: "Error",
        description: "Failed to clean user sessions",
        variant: "destructive"
      });
    }
  };

  const handleEmergencyCleanup = () => {
    emergencyCleanup();
    toast({
      title: "Emergency Cleanup",
      description: "Clearing all sessions and reloading...",
      variant: "destructive"
    });
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Session Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Session Overview */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Session Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted p-3 rounded-lg">
              <div className="text-2xl font-bold">{sessions.length}</div>
              <div className="text-sm text-muted-foreground">Total Sessions</div>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <div className="text-2xl font-bold">{Object.keys(sessionsByUser).length}</div>
              <div className="text-sm text-muted-foreground">Unique Users</div>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <div className="text-2xl font-bold text-destructive">{duplicateUsers.length}</div>
              <div className="text-sm text-muted-foreground">Users with Duplicates</div>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <div className="text-2xl font-bold text-warning">
                {duplicateUsers.reduce((sum, [_, sessions]) => sum + sessions.length - 1, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Excess Sessions</div>
            </div>
          </div>
        </div>

        {/* Duplicate Users */}
        {duplicateUsers.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-destructive">
              Users with Multiple Sessions
            </h3>
            <div className="space-y-2">
              {duplicateUsers.map(([userEmail, sessions]) => (
                <div key={userEmail} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{userEmail}</div>
                    <div className="text-sm text-muted-foreground">
                      {sessions.length} sessions active
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">{sessions.length} sessions</Badge>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        const success = forceCleanSpecificUser(sessions[0].user.id);
                        if (success) {
                          toast({
                            title: "Success",
                            description: `Cleaned sessions for ${userEmail}`,
                          });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual User Cleanup */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Clean Specific User</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Enter user email"
              value={userEmailToClean}
              onChange={(e) => setUserEmailToClean(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleCleanSpecificUser} variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Clean User
            </Button>
          </div>
        </div>

        {/* Emergency Actions */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Emergency Actions</h3>
          <div className="flex gap-2">
            <Button
              onClick={handleEmergencyCleanup}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Emergency Cleanup (All Sessions)
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Page
            </Button>
          </div>
        </div>

        {/* All Sessions List */}
        <div>
          <h3 className="text-lg font-semibold mb-3">All Active Sessions</h3>
          <div className="space-y-2">
            {Object.entries(sessionsByUser).map(([userEmail, userSessions]) => (
              <div key={userEmail} className="border rounded-lg p-3">
                <div className="font-medium">{userEmail}</div>
                <div className="text-sm text-muted-foreground">
                  {userSessions.map((session, index) => (
                    <div key={session.id} className="mt-1">
                      Session {index + 1}: {session.id} (Created: {new Date(session.createdAt).toLocaleString()})
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};