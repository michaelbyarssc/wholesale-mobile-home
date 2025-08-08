import React from 'react';
import { useMultiUserAuth } from '@/hooks/useMultiUserAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const MultiUserDebugPanel = () => {
  const { 
    sessions, 
    activeSession, 
    activeSessionId, 
    switchToSession, 
    hasMultipleSessions,
    sessionCount 
  } = useMultiUserAuth();

  return null;
};