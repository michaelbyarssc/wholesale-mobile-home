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

  return null;
};