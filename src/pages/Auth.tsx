
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PasswordChangeDialog } from '@/components/auth/PasswordChangeDialog';
import { AuthForm } from '@/components/auth/AuthForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { AuthNavigation } from '@/components/auth/AuthNavigation';
import { UserWelcome } from '@/components/auth/UserWelcome';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userProfile, setUserProfile] = useState<{first_name: string, last_name: string} | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      console.log('🔍 Auth: Starting initialization...');
      
      try {
        // Check if this is a password reset flow first
        const type = searchParams.get('type');
        if (type === 'recovery') {
          console.log('🔍 Auth: Password recovery flow detected');
          if (mounted) {
            setShowPasswordChange(true);
            setCheckingAuth(false);
          }
          return;
        }

        console.log('🔍 Auth: Getting current session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Auth: Error getting session:', error);
          if (mounted) {
            setCheckingAuth(false);
          }
          return;
        }

        console.log('🔍 Auth: Session check complete. User exists:', !!session?.user);

        if (!session?.user) {
          console.log('🔍 Auth: No session found - showing login form');
          if (mounted) {
            setCheckingAuth(false);
          }
          return;
        }

        // If we get here, user is logged in - check role and redirect
        console.log('🔍 Auth: User is logged in, checking role and redirecting...');
        if (mounted) {
          setCurrentUser(session.user);
        }

        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .single();

        if (mounted) {
          if (roleData) {
            console.log('🔍 Auth: Admin user - redirecting to admin');
            navigate('/admin');
          } else {
            console.log('🔍 Auth: Regular user - redirecting to home');
            navigate('/');
          }
        }
      } catch (error) {
        console.error('❌ Auth: Error in initialization:', error);
        if (mounted) {
          setCheckingAuth(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []); // Remove all dependencies to prevent infinite loops

  useEffect(() => {
    // Set up auth state listener in a separate effect
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth: Auth state changed:', event, !!session?.user);
      
      if (session?.user && event === 'SIGNED_IN') {
        setCurrentUser(session.user);
        try {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .eq('role', 'admin')
            .single();

          if (roleData) {
            navigate('/admin');
          } else {
            navigate('/');
          }
        } catch (error) {
          console.error('❌ Auth: Error checking role on auth change:', error);
          navigate('/');
        }
      } else if (!session?.user && event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setCheckingAuth(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setPhoneNumber('');
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setIsForgotPassword(false);
    resetForm();
  };

  const toggleForgotPassword = () => {
    setIsForgotPassword(!isForgotPassword);
    setIsSignUp(false);
    resetForm();
  };

  console.log('🔍 Auth: Render state - checkingAuth:', checkingAuth, 'currentUser:', !!currentUser);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
          <p className="text-xs text-gray-500 mt-2">Please wait...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">
            WholesaleMobileHome.com
          </h1>
          <UserWelcome userProfile={userProfile} />
        </div>

        {/* Auth form */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isForgotPassword ? 'Reset Password' : (isSignUp ? 'Create Account' : 'Sign In')}
            </CardTitle>
            <CardDescription>
              {isForgotPassword 
                ? 'Enter your email to receive reset instructions'
                : (isSignUp 
                  ? 'Create an account to access the platform'
                  : 'Sign in to access the platform'
                )
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isForgotPassword ? (
              <ForgotPasswordForm
                email={email}
                setEmail={setEmail}
                loading={loading}
                setLoading={setLoading}
                onBack={toggleForgotPassword}
                resetForm={resetForm}
              />
            ) : (
              <AuthForm
                isSignUp={isSignUp}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                firstName={firstName}
                setFirstName={setFirstName}
                lastName={lastName}
                setLastName={setLastName}
                phoneNumber={phoneNumber}
                setPhoneNumber={setPhoneNumber}
                loading={loading}
                setLoading={setLoading}
              />
            )}
            
            <AuthNavigation
              isSignUp={isSignUp}
              isForgotPassword={isForgotPassword}
              onToggleAuthMode={toggleAuthMode}
              onToggleForgotPassword={toggleForgotPassword}
              currentUser={currentUser}
              isAdmin={isAdmin}
              onShowPasswordChange={() => setShowPasswordChange(true)}
            />
          </CardContent>
        </Card>

        <PasswordChangeDialog
          isOpen={showPasswordChange}
          onClose={() => setShowPasswordChange(false)}
        />
      </div>
    </div>
  );
};

export default Auth;
