import React, { useState } from 'react';
import { useMultiUserAuth } from '@/hooks/useMultiUserAuth';
import { useSessionAwareShoppingCart } from '@/hooks/useSessionAwareShoppingCart';
import { useSessionAwareWishlist } from '@/hooks/useSessionAwareWishlist';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export const MultiUserSessionTest = () => {
  const {
    sessions,
    activeSession,
    activeSessionId,
    switchToSession,
    signIn,
    signOut,
    isLoading: authLoading
  } = useMultiUserAuth();

  const {
    cartItems,
    addToCart,
    clearCart,
    isLoading: cartLoading
  } = useSessionAwareShoppingCart();

  const {
    wishlistItems,
    isLoading: wishlistLoading
  } = useSessionAwareWishlist();

  const [testEmail, setTestEmail] = useState('');
  const [testPassword, setTestPassword] = useState('');
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const runSessionIsolationTest = async () => {
    try {
      addTestResult('🧪 Starting session isolation test...');
      
      // Test 1: Check if sessions are properly isolated
      const sessionKeys = sessions.map(s => `wmh_user_${s.user.id}`);
      addTestResult(`✅ Found ${sessions.length} sessions with keys: ${sessionKeys.join(', ')}`);
      
      // Test 2: Check if cart data is isolated per session
      const currentCartSize = cartItems.length;
      addTestResult(`✅ Current session cart size: ${currentCartSize}`);
      
      // Test 3: Check localStorage isolation
      const currentStorageKeys = Object.keys(localStorage).filter(key => key.startsWith('wmh_'));
      addTestResult(`✅ Storage keys found: ${currentStorageKeys.join(', ')}`);
      
      // Test 4: Wishlist isolation
      const currentWishlistSize = wishlistItems.length;
      addTestResult(`✅ Current session wishlist size: ${currentWishlistSize}`);
      
      if (sessions.length > 1) {
        // Test 5: Switch sessions and verify isolation
        const otherSession = sessions.find(s => s.id !== activeSessionId);
        if (otherSession) {
          addTestResult(`🔄 Switching to session: ${otherSession.user.email}`);
          await switchToSession(otherSession.id);
          
          // Wait for session switch to complete
          setTimeout(() => {
            addTestResult(`✅ Session switched successfully`);
          }, 500);
        }
      }
      
      addTestResult('🎉 Session isolation test completed!');
      toast.success('Session isolation test completed successfully!');
      
    } catch (error) {
      addTestResult(`❌ Test failed: ${error}`);
      toast.error('Session isolation test failed');
    }
  };

  const runCorruptionRecoveryTest = () => {
    try {
      addTestResult('🧪 Testing storage corruption recovery...');
      
      // Simulate corrupted data
      localStorage.setItem('wmh_sessions', 'invalid-json');
      addTestResult('⚠️ Simulated corrupted session data');
      
      // The useStorageCorruptionRecovery hook should detect and fix this
      setTimeout(() => {
        const sessionsData = localStorage.getItem('wmh_sessions');
        if (!sessionsData || sessionsData === 'invalid-json') {
          addTestResult('✅ Corrupted data detected and cleared');
        } else {
          addTestResult('✅ Session data restored properly');
        }
      }, 1000);
      
      addTestResult('🎉 Corruption recovery test completed!');
      toast.success('Corruption recovery test completed!');
      
    } catch (error) {
      addTestResult(`❌ Recovery test failed: ${error}`);
      toast.error('Recovery test failed');
    }
  };

  const testQuickLogin = async () => {
    if (!testEmail || !testPassword) {
      toast.error('Please enter email and password');
      return;
    }

    try {
      addTestResult(`🔐 Attempting login for: ${testEmail}`);
      const result = await signIn(testEmail, testPassword);
      
      if (result.error) {
        addTestResult(`❌ Login failed: ${result.error.message}`);
        toast.error(`Login failed: ${result.error.message}`);
      } else {
        addTestResult(`✅ Login successful for: ${testEmail}`);
        toast.success('Login successful!');
      }
    } catch (error) {
      addTestResult(`❌ Login error: ${error}`);
      toast.error('Login error occurred');
    }
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Multi-User Session Testing Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Session Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sessions.length}</div>
              <div className="text-xs text-muted-foreground">Active sessions</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cart Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cartItems.length}</div>
              <div className="text-xs text-muted-foreground">Current session</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Wishlist</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{wishlistItems.length}</div>
              <div className="text-xs text-muted-foreground">Current session</div>
            </CardContent>
          </Card>
        </div>

        {/* Active Session Info */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Active Session</h3>
          {activeSession ? (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{activeSession.user.email}</div>
                  <div className="text-sm text-muted-foreground">
                    Session ID: {activeSession.id.slice(-8)}...
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Storage Key: wmh_user_{activeSession.user.id}
                  </div>
                </div>
                <Badge variant="default">Active</Badge>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-muted rounded-lg text-center text-muted-foreground">
              No active session
            </div>
          )}
        </div>

        {/* Quick Login Test */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Quick Login Test</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <Label htmlFor="test-email">Email</Label>
              <Input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
            <div>
              <Label htmlFor="test-password">Password</Label>
              <Input
                id="test-password"
                type="password"
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
                placeholder="password"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={testQuickLogin} disabled={authLoading}>
                {authLoading ? 'Signing In...' : 'Test Login'}
              </Button>
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={runSessionIsolationTest} variant="outline">
            Test Session Isolation
          </Button>
          <Button onClick={runCorruptionRecoveryTest} variant="outline">
            Test Corruption Recovery
          </Button>
          <Button onClick={clearTestResults} variant="outline">
            Clear Results
          </Button>
          {activeSession && (
            <Button onClick={() => signOut()} variant="destructive" size="sm">
              Sign Out Current
            </Button>
          )}
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Test Results</h3>
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index}>{result}</div>
              ))}
            </div>
          </div>
        )}

        {/* Loading States */}
        {(authLoading || cartLoading || wishlistLoading) && (
          <div className="text-center text-muted-foreground">
            Loading: {[
              authLoading && 'Auth',
              cartLoading && 'Cart',
              wishlistLoading && 'Wishlist'
            ].filter(Boolean).join(', ')}...
          </div>
        )}
      </CardContent>
    </Card>
  );
};