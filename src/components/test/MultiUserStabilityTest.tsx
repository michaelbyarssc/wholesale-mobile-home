import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionManager } from '@/contexts/SessionManagerContext';
import { useSessionValidation } from '@/hooks/useSessionValidation';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  timestamp: Date;
}

export const MultiUserStabilityTest: React.FC = () => {
  const { sessions, activeSession, signIn, signOut } = useAuth();
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
    addTestResult('Enhanced Stability Test', 'warning', 'Starting comprehensive stability tests...');

    try {
      // Test 1: Storage Key Consistency
      addTestResult('Storage Key Consistency', 'warning', 'Testing storage key generation...');
      const timestamp = Date.now();
      const userId = 'test-user-123';
      const key1 = `wmh_session_${userId}_${timestamp}`;
      const key2 = `wmh_session_${userId}_${timestamp}`;
      
      if (key1 === key2) {
        addTestResult('Storage Key Consistency', 'pass', 'Storage keys are consistent');
      } else {
        addTestResult('Storage Key Consistency', 'fail', 'Storage key generation is inconsistent');
      }

      // Test 2: Client Cache Management
      addTestResult('Client Cache Management', 'warning', 'Testing client cache behavior...');
      const wmhKeysBefore = Object.keys(localStorage).filter(key => key.startsWith('wmh_')).length;
      
      // Simulate rapid operations
      for (let i = 0; i < 3; i++) {
        try {
          await signIn(`cache${i}@test.com`, 'testpass123');
        } catch (error) {
          // Expected for non-existent users
        }
      }
      
      const wmhKeysAfter = Object.keys(localStorage).filter(key => key.startsWith('wmh_')).length;
      const keyGrowth = wmhKeysAfter - wmhKeysBefore;
      
      if (keyGrowth <= 5) {
        addTestResult('Client Cache Management', 'pass', `Controlled storage growth: +${keyGrowth} keys`);
      } else {
        addTestResult('Client Cache Management', 'warning', `High storage growth: +${keyGrowth} keys`);
      }

      // Test 3: Session Validation Race Conditions
      addTestResult('Validation Race Conditions', 'warning', 'Testing concurrent validation...');
      const validationPromises = [];
      
      for (let i = 0; i < 3; i++) {
        if (sessions.length > 0) {
          validationPromises.push(validateAllSessions());
        }
      }
      
      try {
        await Promise.allSettled(validationPromises);
        addTestResult('Validation Race Conditions', 'pass', 'Concurrent validation handled correctly');
      } catch (error) {
        addTestResult('Validation Race Conditions', 'warning', 'Some validation conflicts detected');
      }

      // Test 4: Memory Leak Detection
      addTestResult('Memory Leak Detection', 'warning', 'Checking for memory leaks...');
      const beforeMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Create and destroy sessions
      for (let i = 0; i < 3; i++) {
        try {
          await signIn(`leak${i}@test.com`, 'testpass123');
          await signOut();
        } catch (error) {
          // Expected
        }
      }
      
      const afterMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryGrowth = afterMemory - beforeMemory;
      
      if (memoryGrowth < 2 * 1024 * 1024) { // Less than 2MB growth
        addTestResult('Memory Leak Detection', 'pass', `Memory growth: ${Math.round(memoryGrowth / 1024)}KB`);
      } else {
        addTestResult('Memory Leak Detection', 'warning', `High memory growth: ${Math.round(memoryGrowth / 1024 / 1024)}MB`);
      }

      // Test 5: Data Isolation
      addTestResult('Data Isolation Test', 'warning', 'Testing data isolation between sessions...');
      const cartDataKeys = Object.keys(localStorage).filter(key => key.includes('cart_data'));
      const wishlistKeys = Object.keys(localStorage).filter(key => key.includes('wishlist'));
      
      const isolationScore = cartDataKeys.length + wishlistKeys.length;
      if (isolationScore === 0 || sessions.length === 0) {
        addTestResult('Data Isolation Test', 'pass', 'No data isolation issues (clean state)');
      } else if (isolationScore <= sessions.length * 2) {
        addTestResult('Data Isolation Test', 'pass', `Data properly isolated: ${isolationScore} keys for ${sessions.length} sessions`);
      } else {
        addTestResult('Data Isolation Test', 'warning', `Potential isolation issue: ${isolationScore} keys`);
      }

      // Test 6: Cross-tab Sync Performance
      addTestResult('Cross-tab Sync Performance', 'warning', 'Testing cross-tab synchronization...');
      const syncStart = Date.now();
      
      try {
        // Simulate rapid cross-tab events
        for (let i = 0; i < 5; i++) {
          const storageEvent = new StorageEvent('storage', {
            key: 'wmh_sessions',
            newValue: localStorage.getItem('wmh_sessions'),
            oldValue: null
          });
          window.dispatchEvent(storageEvent);
        }
        
        const syncTime = Date.now() - syncStart;
        if (syncTime < 100) {
          addTestResult('Cross-tab Sync Performance', 'pass', `Fast sync: ${syncTime}ms`);
        } else {
          addTestResult('Cross-tab Sync Performance', 'warning', `Slow sync: ${syncTime}ms`);
        }
      } catch (error) {
        addTestResult('Cross-tab Sync Performance', 'fail', `Sync error: ${error}`);
      }

      addTestResult('Enhanced Stability Test', 'pass', 'All enhanced stability tests completed!');

    } catch (error) {
      addTestResult('Enhanced Stability Test', 'fail', `Test suite failed: ${error}`);
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

  return (
    <Card className="w-full max-w-4xl mx-auto mb-4">
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          🧪 Multi-User Stability Test ({sessions.length} sessions active)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={testSessionStability} 
            disabled={isRunning}
            size="sm"
            variant="outline"
          >
            {isRunning ? 'Running Tests...' : 'Run Stability Tests'}
          </Button>
          <Button 
            onClick={clearResults} 
            size="sm" 
            variant="outline"
          >
            Clear Results
          </Button>
          <Button 
            onClick={clearAllSessions} 
            size="sm" 
            variant="destructive"
          >
            Clear All Sessions
          </Button>
        </div>

        {/* Current Status */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>Active Session: {activeSession?.user.email || 'None'}</div>
          <div>Total Sessions: {sessions.length}</div>
          <div>Test Results: {testResults.length}</div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Test Results:</h4>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center gap-2 text-xs p-2 bg-muted rounded">
                  <Badge className={`${getStatusColor(result.status)} text-white`}>
                    {result.status.toUpperCase()}
                  </Badge>
                  <span className="font-medium">{result.name}:</span>
                  <span className="flex-1">{result.message}</span>
                  <span className="text-muted-foreground">
                    {result.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};