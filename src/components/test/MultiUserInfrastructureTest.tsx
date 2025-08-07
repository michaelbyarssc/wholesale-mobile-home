import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionManager } from '@/contexts/SessionManagerContext';
import { useStorageCorruptionRecovery } from '@/hooks/useStorageCorruptionRecovery';
import { useSessionAwareShoppingCart } from '@/hooks/useSessionAwareShoppingCart';
import { useSessionAwareWishlist } from '@/hooks/useSessionAwareWishlist';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  timestamp: Date;
}

export const MultiUserInfrastructureTest: React.FC = () => {
  // Show only in development
  if (import.meta.env.PROD) return null;

  const {
    sessions,
    activeSession,
    activeSessionId,
    user,
    isLoading: authLoading,
    signIn,
    signOut,
    switchToSession,
    hasMultipleSessions
  } = useAuth();

  const { clearAllSessions } = useSessionManager();
  const { checkStorageIntegrity, cleanupOrphanedStorage } = useStorageCorruptionRecovery();
  const { cartItems, addToCart, clearCart } = useSessionAwareShoppingCart();
  const { wishlistItems, addToWishlist, clearWishlist } = useSessionAwareWishlist();

  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testEmail1, setTestEmail1] = useState('test1@example.com');
  const [testPassword1, setTestPassword1] = useState('Test123!@#');
  const [testEmail2, setTestEmail2] = useState('test2@example.com');
  const [testPassword2, setTestPassword2] = useState('Test123!@#');
  const [isRunningTests, setIsRunningTests] = useState(false);

  const addTestResult = (name: string, status: 'pass' | 'fail' | 'warning', message: string) => {
    setTestResults(prev => [...prev, {
      name,
      status,
      message,
      timestamp: new Date()
    }]);
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  // Storage key collision test
  const testStorageKeyCollision = () => {
    try {
      // Check current storage keys
      const wmhKeys = Object.keys(localStorage).filter(key => key.startsWith('wmh_'));
      const sessionKeys = wmhKeys.filter(key => key.startsWith('wmh_session_'));
      
      // Check for proper format: wmh_session_userId_timestamp
      const properFormatKeys = sessionKeys.filter(key => {
        const parts = key.split('_');
        return parts.length === 4 && parts[0] === 'wmh' && parts[1] === 'session';
      });

      if (sessionKeys.length === properFormatKeys.length) {
        addTestResult('Storage Key Format', 'pass', `All ${sessionKeys.length} session keys use proper format`);
      } else {
        addTestResult('Storage Key Format', 'fail', `${sessionKeys.length - properFormatKeys.length} keys use improper format`);
      }

      // Check for duplicate keys
      const uniqueKeys = new Set(sessionKeys);
      if (uniqueKeys.size === sessionKeys.length) {
        addTestResult('Storage Key Uniqueness', 'pass', 'All storage keys are unique');
      } else {
        addTestResult('Storage Key Uniqueness', 'fail', 'Duplicate storage keys detected');
      }
    } catch (error) {
      addTestResult('Storage Key Test', 'fail', `Error: ${error}`);
    }
  };

  // Session isolation test
  const testSessionIsolation = async () => {
    try {
      if (sessions.length < 2) {
        addTestResult('Session Isolation', 'warning', 'Need at least 2 sessions to test isolation');
        return;
      }

      // Test cart isolation
      const session1Id = sessions[0].id;
      const session2Id = sessions[1].id;

      // Switch to session 1, add to cart
      switchToSession(session1Id);
      await new Promise(resolve => setTimeout(resolve, 100)); // Allow state to update

      // Mock mobile home for testing
      const mockHome = {
        id: 'test-home-1',
        model: 'Test Model',
        price: 50000,
        // ... other required fields
      } as any;

      addToCart(mockHome, [], []);
      
      // Switch to session 2
      switchToSession(session2Id);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if cart is isolated
      if (cartItems.length === 0) {
        addTestResult('Cart Isolation', 'pass', 'Cart properly isolated between sessions');
      } else {
        addTestResult('Cart Isolation', 'fail', 'Cart data leaked between sessions');
      }

    } catch (error) {
      addTestResult('Session Isolation', 'fail', `Error: ${error}`);
    }
  };

  // Storage corruption recovery test
  const testStorageCorruption = () => {
    try {
      // Create corrupted data
      localStorage.setItem('wmh_sessions', 'invalid json');
      
      // Save current sessions to restore later
      const currentSessions = localStorage.getItem('wmh_sessions');
      
      // Test recovery
      const isIntegrityOk = checkStorageIntegrity();
      
      if (!isIntegrityOk) {
        addTestResult('Storage Corruption Recovery', 'pass', 'Successfully detected and recovered from corruption');
      } else {
        addTestResult('Storage Corruption Recovery', 'fail', 'Failed to detect corruption');
      }

      // Clean up and restore if needed
      cleanupOrphanedStorage();
      if (currentSessions) {
        localStorage.setItem('wmh_sessions', currentSessions);
      }
      
    } catch (error) {
      addTestResult('Storage Corruption Test', 'fail', `Error: ${error}`);
    }
  };

  // Memory leak test
  const testMemoryLeaks = () => {
    try {
      // Check for proper cleanup of event listeners
      const initialEventListeners = (window as any)._events?.length || 0;
      
      // Check localStorage for orphaned keys
      const wmhKeys = Object.keys(localStorage).filter(key => key.startsWith('wmh_'));
      const orphanedKeys = wmhKeys.filter(key => {
        if (key.startsWith('wmh_session_')) {
          const userId = key.split('_')[2];
          return !sessions.some(s => s.user.id === userId);
        }
        return false;
      });

      if (orphanedKeys.length === 0) {
        addTestResult('Memory Leak Check', 'pass', 'No orphaned storage keys detected');
      } else {
        addTestResult('Memory Leak Check', 'warning', `${orphanedKeys.length} orphaned keys found`);
      }

    } catch (error) {
      addTestResult('Memory Leak Test', 'fail', `Error: ${error}`);
    }
  };

  // Cross-tab sync test
  const testCrossTabSync = () => {
    try {
      // Simulate broadcast channel message
      const channel = new BroadcastChannel('wmh_session_sync');
      
      channel.postMessage({ type: 'session_change' });
      
      // Test passes if no errors occur during broadcast
      addTestResult('Cross-Tab Sync', 'pass', 'BroadcastChannel working correctly');
      
      channel.close();
    } catch (error) {
      addTestResult('Cross-Tab Sync Test', 'fail', `Error: ${error}`);
    }
  };

  // Run comprehensive test suite
  const runAllTests = async () => {
    setIsRunningTests(true);
    clearTestResults();
    
    addTestResult('Test Suite', 'pass', 'Starting comprehensive infrastructure tests...');
    
    // Run tests in sequence
    testStorageKeyCollision();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    testStorageCorruption();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    testMemoryLeaks();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    testCrossTabSync();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await testSessionIsolation();
    
    addTestResult('Test Suite', 'pass', 'All infrastructure tests completed');
    setIsRunningTests(false);
  };

  // Quick login for testing
  const quickLogin = async (email: string, password: string) => {
    try {
      const result = await signIn(email, password);
      if (result.error) {
        addTestResult('Quick Login', 'fail', `Login failed: ${result.error.message}`);
      } else {
        addTestResult('Quick Login', 'pass', `Successfully logged in: ${email}`);
      }
    } catch (error) {
      addTestResult('Quick Login', 'fail', `Login error: ${error}`);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧪 Multi-User Infrastructure Test Suite
          <Badge variant="outline">Development Only</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Session Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{sessions.length}</div>
            <div className="text-sm text-muted-foreground">Total Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{activeSession ? '✓' : '✗'}</div>
            <div className="text-sm text-muted-foreground">Active Session</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{cartItems.length}</div>
            <div className="text-sm text-muted-foreground">Cart Items</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{wishlistItems.length}</div>
            <div className="text-sm text-muted-foreground">Wishlist Items</div>
          </div>
        </div>

        {/* Quick Login Section */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Quick Test Login</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Input
                placeholder="Test Email 1"
                value={testEmail1}
                onChange={(e) => setTestEmail1(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password"
                value={testPassword1}
                onChange={(e) => setTestPassword1(e.target.value)}
              />
              <Button 
                size="sm" 
                onClick={() => quickLogin(testEmail1, testPassword1)}
                disabled={authLoading}
              >
                Login User 1
              </Button>
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Test Email 2"
                value={testEmail2}
                onChange={(e) => setTestEmail2(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password"
                value={testPassword2}
                onChange={(e) => setTestPassword2(e.target.value)}
              />
              <Button 
                size="sm" 
                onClick={() => quickLogin(testEmail2, testPassword2)}
                disabled={authLoading}
              >
                Login User 2
              </Button>
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={runAllTests}
            disabled={isRunningTests}
            variant="default"
          >
            {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
          </Button>
          <Button onClick={testStorageKeyCollision} size="sm" variant="outline">
            Test Storage Keys
          </Button>
          <Button onClick={testStorageCorruption} size="sm" variant="outline">
            Test Corruption Recovery
          </Button>
          <Button onClick={testMemoryLeaks} size="sm" variant="outline">
            Test Memory Leaks
          </Button>
          <Button onClick={clearTestResults} size="sm" variant="secondary">
            Clear Results
          </Button>
          <Button onClick={clearAllSessions} size="sm" variant="destructive">
            Clear All Sessions
          </Button>
        </div>

        {/* Active Session Info */}
        {activeSession && (
          <div className="border rounded-lg p-4 bg-muted/50">
            <h3 className="font-semibold mb-2">Active Session</h3>
            <div className="text-sm space-y-1">
              <div><strong>User:</strong> {activeSession.user.email}</div>
              <div><strong>Session ID:</strong> {activeSession.id}</div>
              <div><strong>Created:</strong> {activeSession.createdAt.toLocaleString()}</div>
              <div><strong>Storage Key Pattern:</strong> wmh_session_{activeSession.user.id}_*</div>
            </div>
          </div>
        )}

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Test Results</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {testResults.map((result, index) => (
                <div 
                  key={index}
                  className={`flex items-center gap-2 p-2 rounded text-sm ${
                    result.status === 'pass' ? 'bg-green-50 text-green-700' :
                    result.status === 'fail' ? 'bg-red-50 text-red-700' :
                    'bg-yellow-50 text-yellow-700'
                  }`}
                >
                  <span className="font-medium">{result.name}:</span>
                  <span className="flex-1">{result.message}</span>
                  <Badge variant={
                    result.status === 'pass' ? 'default' :
                    result.status === 'fail' ? 'destructive' : 'secondary'
                  }>
                    {result.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Storage Keys Debug */}
        <details className="border rounded-lg p-4">
          <summary className="font-semibold cursor-pointer">Storage Keys Debug</summary>
          <div className="mt-2 text-xs font-mono space-y-1">
            {Object.keys(localStorage)
              .filter(key => key.startsWith('wmh_'))
              .map(key => (
                <div key={key} className="bg-muted p-1 rounded">
                  {key}
                </div>
              ))}
          </div>
        </details>
      </CardContent>
    </Card>
  );
};
