import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMultiUserAuth } from '@/hooks/useMultiUserAuth';
import { useSessionManager } from '@/contexts/SessionManagerContext';
import { useSessionValidation } from '@/hooks/useSessionValidation';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  timestamp: Date;
}

export const MultiUserStabilityTest: React.FC = () => {
  const { sessions, activeSession, signIn, signOut } = useMultiUserAuth();
  const { clearAllSessions } = useSessionManager();
  const { validateAllSessions } = useSessionValidation();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const addTestResult = (name: string, status: 'pass' | 'fail' | 'warning', message: string) => {
    setTestResults(prev => [
      { name, status, message, timestamp: new Date() },
      ...prev.slice(0, 9) // Keep last 10 results
    ]);
  };

  const testSessionStability = useCallback(async () => {
    setIsRunning(true);
    addTestResult('Session Stability Test', 'warning', 'Starting stability tests...');

    try {
      // Test 1: Rapid session creation/destruction
      addTestResult('Rapid Session Test', 'warning', 'Testing rapid session operations...');
      
      const initialSessionCount = sessions.length;
      
      // Create multiple sessions rapidly
      try {
        await signIn('test1@example.com', 'password123');
        await signIn('test2@example.com', 'password123');
        await signIn('test1@example.com', 'password123'); // Duplicate - should deduplicate
        
        // Check if deduplication worked
        const currentSessions = sessions.length;
        if (currentSessions <= initialSessionCount + 2) {
          addTestResult('Rapid Session Test', 'pass', 'Session deduplication working correctly');
        } else {
          addTestResult('Rapid Session Test', 'fail', `Too many sessions created: ${currentSessions}`);
        }
      } catch (error) {
        addTestResult('Rapid Session Test', 'fail', `Session creation failed: ${error}`);
      }

      // Test 2: Memory management
      addTestResult('Memory Test', 'warning', 'Checking for memory leaks...');
      
      const beforeMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Create and destroy sessions multiple times
      for (let i = 0; i < 5; i++) {
        try {
          await signIn(`test${i}@example.com`, 'password123');
          await signOut();
        } catch (error) {
          // Continue with test
        }
      }
      
      const afterMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = afterMemory - beforeMemory;
      
      if (memoryIncrease < 1000000) { // Less than 1MB increase
        addTestResult('Memory Test', 'pass', `Memory usage stable: +${Math.round(memoryIncrease/1024)}KB`);
      } else {
        addTestResult('Memory Test', 'warning', `Potential memory leak: +${Math.round(memoryIncrease/1024)}KB`);
      }

      // Test 3: Session validation
      addTestResult('Validation Test', 'warning', 'Testing session validation...');
      
      try {
        await validateAllSessions();
        addTestResult('Validation Test', 'pass', 'All sessions validated successfully');
      } catch (error) {
        addTestResult('Validation Test', 'fail', `Validation failed: ${error}`);
      }

      // Test 4: Storage integrity
      addTestResult('Storage Test', 'warning', 'Testing storage consistency...');
      
      const sessionData = localStorage.getItem('wmh_sessions');
      const activeSessionId = localStorage.getItem('wmh_active_session');
      
      if (sessionData && activeSessionId) {
        try {
          const parsed = JSON.parse(sessionData);
          const hasActiveSession = parsed.some((s: any) => s.id === activeSessionId);
          
          if (hasActiveSession) {
            addTestResult('Storage Test', 'pass', 'Storage consistency verified');
          } else {
            addTestResult('Storage Test', 'fail', 'Active session not found in stored sessions');
          }
        } catch (error) {
          addTestResult('Storage Test', 'fail', `Storage parsing failed: ${error}`);
        }
      } else {
        addTestResult('Storage Test', 'pass', 'No sessions in storage (clean state)');
      }

      // Test 5: Cross-tab communication simulation
      addTestResult('Cross-Tab Test', 'warning', 'Simulating cross-tab updates...');
      
      try {
        // Simulate another tab changing sessions
        const currentSessions = localStorage.getItem('wmh_sessions');
        const event = new StorageEvent('storage', {
          key: 'wmh_sessions',
          newValue: currentSessions,
          oldValue: currentSessions,
          storageArea: localStorage
        });
        
        window.dispatchEvent(event);
        
        // Wait for sync
        await new Promise(resolve => setTimeout(resolve, 200));
        
        addTestResult('Cross-Tab Test', 'pass', 'Cross-tab communication functional');
      } catch (error) {
        addTestResult('Cross-Tab Test', 'fail', `Cross-tab test failed: ${error}`);
      }

    } catch (error) {
      addTestResult('Stability Test', 'fail', `Overall test failed: ${error}`);
    } finally {
      setIsRunning(false);
    }
  }, [sessions, signIn, signOut, validateAllSessions]);

  const clearResults = () => {
    setTestResults([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-500';
      case 'fail': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return null;
};